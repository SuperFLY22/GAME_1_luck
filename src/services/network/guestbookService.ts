import { getHttpApiUrl } from '../../config/websocket';
import type { GuestbookEntry } from '../../models/types';

export type GuestbookListener = (entries: GuestbookEntry[]) => void;

const GUESTBOOK_CACHE_KEY = 'cham_guestbook_cache';

export class GuestbookService {
  private guestbookEntries: GuestbookEntry[] = [];
  private guestbookListeners: Set<GuestbookListener> = new Set();
  private isFetchingHttp: boolean = false;
  private getWs: (() => WebSocket | null) | null = null;
  private ensureWs: (() => void) | null = null;

  constructor() {
    // 로컬 스토리지에 캐시된 방명록 즉시 로드 (0ms 초기 렌더링 지원)
    try {
      const cached = localStorage.getItem(GUESTBOOK_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          this.guestbookEntries = parsed;
        }
      }
    } catch {
      // ignore
    }

    // 초기 백그라운드 HTTP 동기화
    this.fetchGuestbookHttp();
  }

  public bindWebSocket(getWs: () => WebSocket | null, ensureWs: () => void): void {
    this.getWs = getWs;
    this.ensureWs = ensureWs;
  }

  public getGuestbookEntries(): GuestbookEntry[] {
    return this.guestbookEntries;
  }

  public getListenerCount(): number {
    return this.guestbookListeners.size;
  }

  private notifyGuestbookListeners(): void {
    try {
      localStorage.setItem(
        GUESTBOOK_CACHE_KEY,
        JSON.stringify(this.guestbookEntries.slice(0, 50))
      );
    } catch {
      // ignore storage quota error
    }
    for (const listener of this.guestbookListeners) {
      try {
        listener(this.guestbookEntries);
      } catch (err) {
        console.error('[GuestbookService] listener error:', err);
      }
    }
  }

  /**
   * HTTP REST 엔드포인트(/api/guestbook)로부터 최신 방명록 목록 비동기 조회
   */
  public async fetchGuestbookHttp(): Promise<GuestbookEntry[]> {
    if (this.isFetchingHttp) return this.guestbookEntries;
    this.isFetchingHttp = true;
    try {
      const url = getHttpApiUrl('/api/guestbook');
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const data = (await res.json()) as { success?: boolean; entries?: GuestbookEntry[] };
        if (data.success && Array.isArray(data.entries) && data.entries.length > 0) {
          this.guestbookEntries = data.entries;
          this.notifyGuestbookListeners();
        }
      }
    } catch (err) {
      console.warn('[GuestbookService] Failed to fetch guestbook via HTTP:', err);
    } finally {
      this.isFetchingHttp = false;
    }
    return this.guestbookEntries;
  }

  /**
   * 실시간 방명록 목록 구독
   */
  public subscribeGuestbook(listener: GuestbookListener): () => void {
    this.guestbookListeners.add(listener);
    if (this.guestbookEntries.length > 0) {
      listener(this.guestbookEntries);
    }

    // HTTP 최신 데이터 동기화 및 웹소켓 연결
    this.fetchGuestbookHttp();
    this.ensureWs?.();

    return () => {
      this.guestbookListeners.delete(listener);
    };
  }

  /**
   * 실시간 방명록/후기 등록 (낙관적 UI + WebSocket 실시간 전송 + HTTP POST 폴백 이중화)
   */
  public sendGuestbookEntry(nickname: string, content: string): void {
    const cleanNick = nickname.trim() || '익명 도전자';
    const cleanContent = content.trim();
    if (!cleanContent) return;

    // 1. 낙관적 업데이트 (Optimistic UI): 유저 체감 0초 반영
    const tempId = `gb_opt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticEntry: GuestbookEntry = {
      id: tempId,
      nickname: cleanNick,
      content: cleanContent,
      createdAt: Date.now(),
    };
    this.guestbookEntries = [optimisticEntry, ...this.guestbookEntries].slice(0, 50);
    this.notifyGuestbookListeners();

    // 2. WebSocket 전송 시도
    this.ensureWs?.();
    const payload = JSON.stringify({
      type: 'ADD_GUESTBOOK',
      nickname: cleanNick,
      content: cleanContent,
    });

    let sentViaWs = false;
    const ws = this.getWs?.();
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
        sentViaWs = true;
      } catch {
        sentViaWs = false;
      }
    }

    // 3. HTTP POST 폴백
    if (!sentViaWs) {
      const httpPayload = { nickname: cleanNick, content: cleanContent };
      const apiUrl = getHttpApiUrl('/api/guestbook');
      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(httpPayload),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = (await res.json()) as { success?: boolean; entry?: GuestbookEntry };
            if (data.success && data.entry) {
              this.guestbookEntries = this.guestbookEntries.map((e) =>
                e.id === tempId ? data.entry! : e
              );
              this.notifyGuestbookListeners();
            }
          }
        })
        .catch((err) => {
          console.warn('[GuestbookService] HTTP POST fallback error:', err);
        });
    }
  }

  /**
   * 관리자 권한으로 방명록 항목 삭제 (낙관적 UI + WebSocket + HTTP DELETE 폴백)
   */
  public deleteGuestbookEntry(id: string, adminKey: string): void {
    if (!id || !adminKey) return;

    // 1. 낙관적 삭제
    this.guestbookEntries = this.guestbookEntries.filter((e) => e.id !== id);
    this.notifyGuestbookListeners();

    // 2. WebSocket 전송
    this.ensureWs?.();
    const payload = JSON.stringify({
      type: 'DELETE_GUESTBOOK',
      id,
      adminKey,
    });

    let sentViaWs = false;
    const ws = this.getWs?.();
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
        sentViaWs = true;
      } catch {
        sentViaWs = false;
      }
    }

    // 3. HTTP DELETE 폴백
    if (!sentViaWs) {
      const apiUrl = getHttpApiUrl('/api/guestbook');
      fetch(apiUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, adminKey }),
      }).catch((err) => {
        console.warn('[GuestbookService] HTTP DELETE fallback error:', err);
      });
    }
  }

  /**
   * 웹소켓 수신 메시지 라우터 (MatchmakingService 소켓으로부터 위임받음)
   */
  public handleWebSocketMessage(data: Record<string, unknown>): boolean {
    if (data.type === 'GUESTBOOK_INIT') {
      if (Array.isArray(data.entries)) {
        // [H-3 Fix]: 임시 엔트리는 보존하고, 서버 엔트리는 id 기반 중복 제거로 병합
        const tempEntries = this.guestbookEntries.filter((e) => e.id.startsWith('gb_opt_'));
        const combined = [
          ...tempEntries,
          ...data.entries.filter(
            (d: GuestbookEntry) => !this.guestbookEntries.some((e) => e.id === d.id)
          ),
        ];
        this.guestbookEntries = combined.slice(0, 50);
        this.notifyGuestbookListeners();
      }
      return true;
    }

    if (data.type === 'GUESTBOOK_NEW' && data.entry) {
      const entry = data.entry as GuestbookEntry;
      const optIndex = this.guestbookEntries.findIndex(
        (e) =>
          e.id.startsWith('gb_opt_') &&
          e.content === entry.content &&
          e.nickname === entry.nickname
      );
      if (optIndex !== -1) {
        this.guestbookEntries[optIndex] = entry;
      } else if (!this.guestbookEntries.some((e) => e.id === entry.id)) {
        this.guestbookEntries = [entry, ...this.guestbookEntries].slice(0, 50);
      }
      this.notifyGuestbookListeners();
      return true;
    }

    if (data.type === 'GUESTBOOK_DELETED' && typeof data.id === 'string') {
      this.guestbookEntries = this.guestbookEntries.filter((e) => e.id !== data.id);
      this.notifyGuestbookListeners();
      return true;
    }

    return false;
  }
}

export const guestbookService = new GuestbookService();
