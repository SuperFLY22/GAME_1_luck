import { getWebSocketUrl, getHttpApiUrl } from '../../config/websocket';
import type { GuestbookEntry } from '../../models/types';

export interface MatchFoundData {
  roomId: string;
  myRole: 'p1' | 'p2';
  opponentId: string;
  opponentName: string;
}

type QueueListener = (waitingCount: number, waitingNames: string[]) => void;
type MatchListener = (data: MatchFoundData) => void;
type StatsListener = (waitingCount: number) => void;
type GuestbookListener = (entries: GuestbookEntry[]) => void;

const GUESTBOOK_CACHE_KEY = 'cham_guestbook_cache';

class MatchmakingService {
  private ws: WebSocket | null = null;
  private myId: string;
  private myName: string;
  private onQueueChange: QueueListener | null = null;
  private onMatchFound: MatchListener | null = null;
  private isQueued: boolean = false;
  private statsListeners: Set<StatsListener> = new Set();
  private guestbookListeners: Set<GuestbookListener> = new Set();
  private guestbookEntries: GuestbookEntry[] = [];
  private currentQueueCount: number = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isFetchingHttp: boolean = false;

  constructor() {
    // 탭별 고유 ID 부여 (한 브라우저에서 2개 탭으로 대전 테스트 가능)
    let storedId = sessionStorage.getItem('cham_player_id');
    if (!storedId) {
      storedId = 'user_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('cham_player_id', storedId);
    }
    this.myId = storedId;

    let storedName = localStorage.getItem('cham_player_name');
    if (!storedName) {
      const randomNick = '도전자_' + Math.floor(100 + Math.random() * 900);
      storedName = randomNick;
      localStorage.setItem('cham_player_name', storedName);
    }
    this.myName = storedName;

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

  public getMyId(): string {
    return this.myId;
  }

  public getMyName(): string {
    return this.myName;
  }

  public setMyName(name: string): void {
    this.myName = name.trim() || '도전자';
    localStorage.setItem('cham_player_name', this.myName);
    if (this.isQueued && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendJoinQueue();
    }
  }

  public getQueueCount(): number {
    return this.currentQueueCount;
  }

  public getGuestbookEntries(): GuestbookEntry[] {
    return this.guestbookEntries;
  }

  private notifyGuestbookListeners(): void {
    try {
      localStorage.setItem(GUESTBOOK_CACHE_KEY, JSON.stringify(this.guestbookEntries.slice(0, 50)));
    } catch {
      // ignore storage quota error
    }
    for (const listener of this.guestbookListeners) {
      try {
        listener(this.guestbookEntries);
      } catch (err) {
        console.error('[Matchmaking] guestbook listener error:', err);
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
      console.warn('[Matchmaking] Failed to fetch guestbook via HTTP:', err);
    } finally {
      this.isFetchingHttp = false;
    }
    return this.guestbookEntries;
  }

  /**
   * 타이틀 화면 등에서 실시간 로비 대기자 수를 구독 (큐 진입 없이 관전 모드)
   */
  public subscribeQueueStats(listener: StatsListener): () => void {
    this.statsListeners.add(listener);
    // 현재 알고 있는 최신 카운트 즉시 전달
    listener(this.currentQueueCount);

    // 소켓이 미연결 상태면 소켓만 열어 QUEUE_UPDATE 수신
    this.ensureSocket();

    return () => {
      this.statsListeners.delete(listener);
      // 만약 구독자도 없고 실제 매칭 큐에도 참여하지 않았으면 소켓 정리
      if (this.statsListeners.size === 0 && this.guestbookListeners.size === 0 && !this.isQueued && this.ws) {
        this.stopHeartbeat();
        this.ws.close();
        this.ws = null;
      }
    };
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
    this.ensureSocket();

    return () => {
      this.guestbookListeners.delete(listener);
      if (this.statsListeners.size === 0 && this.guestbookListeners.size === 0 && !this.isQueued && this.ws) {
        this.stopHeartbeat();
        this.ws.close();
        this.ws = null;
      }
    };
  }

  /**
   * 실시간 방명록/후기 등록 (낙관적 UI + WebSocket 실시간 전송 + HTTP POST 폴백 이중화)
   */
  public sendGuestbookEntry(nickname: string, content: string): void {
    const cleanNick = (nickname || this.myName).trim() || '익명 도전자';
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
    this.ensureSocket();
    const payload = JSON.stringify({
      type: 'ADD_GUESTBOOK',
      nickname: cleanNick,
      content: cleanContent,
    });

    let sentViaWs = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(payload);
        sentViaWs = true;
      } catch {
        sentViaWs = false;
      }
    }

    // 3. HTTP POST 폴백 (WebSocket 미연결이거나 전송 실패 시 확실한 데이터 영구 보존)
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
              // 임시 엔트리를 서버가 반환한 영구 ID 엔트리로 교체
              this.guestbookEntries = this.guestbookEntries.map((e) =>
                e.id === tempId ? data.entry! : e
              );
              this.notifyGuestbookListeners();
            }
          }
        })
        .catch((err) => {
          console.warn('[Matchmaking] HTTP POST guestbook fallback error:', err);
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
    this.ensureSocket();
    const payload = JSON.stringify({
      type: 'DELETE_GUESTBOOK',
      id,
      adminKey,
    });

    let sentViaWs = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(payload);
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
        console.warn('[Matchmaking] HTTP DELETE guestbook fallback error:', err);
      });
    }
  }

  /**
   * 로비 대기열 참가 (매칭 시작)
   */
  public async joinQueue(
    onQueueChange: QueueListener,
    onMatchFound: MatchListener
  ): Promise<void> {
    this.onQueueChange = onQueueChange;
    this.onMatchFound = onMatchFound;
    this.isQueued = true;

    this.ensureSocket();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendJoinQueue();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'PING' }));
        } catch {
          // ignore
        }
      }
    }, 15000); // 15초 주기 Cloudflare Edge 소켓 유지 Heartbeat
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private ensureSocket(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const url = getWebSocketUrl('lobby');
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.startHeartbeat();
        if (this.isQueued) {
          this.sendJoinQueue();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PONG') {
            return; // Heartbeat 수신
          }

          if (data.type === 'QUEUE_UPDATE') {
            const count = typeof data.count === 'number' ? data.count : 0;
            const names = Array.isArray(data.names) ? data.names : [];
            this.currentQueueCount = count;
            this.onQueueChange?.(count, names);
            for (const listener of this.statsListeners) {
              listener(count);
            }
          } else if (data.type === 'MATCH_FOUND') {
            this.onMatchFound?.({
              roomId: data.roomId,
              myRole: data.myRole,
              opponentId: data.opponentId,
              opponentName: data.opponentName,
            });
          } else if (data.type === 'GUESTBOOK_INIT') {
            if (Array.isArray(data.entries)) {
              // 임시 엔트리가 있다면 보존하고 병합
              const tempEntries = this.guestbookEntries.filter((e) => e.id.startsWith('gb_opt_'));
              const combined = [...tempEntries, ...data.entries.filter((d: GuestbookEntry) => !tempEntries.some((t) => t.content === d.content && t.nickname === d.nickname))];
              this.guestbookEntries = combined.slice(0, 50);
              this.notifyGuestbookListeners();
            }
          } else if (data.type === 'GUESTBOOK_NEW' && data.entry) {
            // 중복 방지 및 낙관적 엔트리 교체
            const optIndex = this.guestbookEntries.findIndex(
              (e) => e.id.startsWith('gb_opt_') && e.content === data.entry.content && e.nickname === data.entry.nickname
            );
            if (optIndex !== -1) {
              this.guestbookEntries[optIndex] = data.entry;
            } else if (!this.guestbookEntries.some((e) => e.id === data.entry.id)) {
              this.guestbookEntries = [data.entry, ...this.guestbookEntries].slice(0, 50);
            }
            this.notifyGuestbookListeners();
          } else if (data.type === 'GUESTBOOK_DELETED' && data.id) {
            this.guestbookEntries = this.guestbookEntries.filter((e) => e.id !== data.id);
            this.notifyGuestbookListeners();
          }
        } catch (err) {
          console.error('[Matchmaking] Message parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.ws = null;

        // 재연결 필요 시 (대기열 또는 구독자가 있을 때)
        if (this.isQueued || this.statsListeners.size > 0 || this.guestbookListeners.size > 0) {
          setTimeout(() => {
            if (this.isQueued || this.statsListeners.size > 0 || this.guestbookListeners.size > 0) {
              this.ensureSocket();
            }
          }, 2000);
        }
      };

      this.ws.onerror = (e) => {
        console.warn('[Matchmaking] WebSocket warning/error:', e);
      };
    } catch (e) {
      console.error('[Matchmaking] Failed to connect WebSocket:', e);
    }
  }

  private sendJoinQueue(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'JOIN_QUEUE',
        id: this.myId,
        name: this.myName,
      })
    );
  }

  /**
   * 게임 종료 또는 상대 이탈 후 대기열 재진입
   */
  public async reEnterQueue(): Promise<void> {
    this.isQueued = true;
    this.ensureSocket();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendJoinQueue();
    }
  }

  /**
   * 로비 나가기
   */
  public async leaveQueue(): Promise<void> {
    this.isQueued = false;
    this.onQueueChange = null;
    this.onMatchFound = null;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'LEAVE_QUEUE' }));
      } catch {
        // ignore
      }
    }

    // 만약 타이틀 화면 통계/방명록 구독자도 없다면 소켓 종료
    if (this.statsListeners.size === 0 && this.guestbookListeners.size === 0 && this.ws) {
      this.stopHeartbeat();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const matchmakingService = new MatchmakingService();
