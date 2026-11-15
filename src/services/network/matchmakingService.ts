import { getWebSocketUrl } from '../../config/websocket';
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

    this.ensureSocket();

    return () => {
      this.guestbookListeners.delete(listener);
      if (this.statsListeners.size === 0 && this.guestbookListeners.size === 0 && !this.isQueued && this.ws) {
        this.ws.close();
        this.ws = null;
      }
    };
  }

  /**
   * 실시간 방명록/후기 등록
   */
  public sendGuestbookEntry(nickname: string, content: string): void {
    const cleanNick = (nickname || this.myName).trim() || '익명 도전자';
    const cleanContent = content.trim();
    if (!cleanContent) return;

    this.ensureSocket();

    const payload = JSON.stringify({
      type: 'ADD_GUESTBOOK',
      nickname: cleanNick,
      content: cleanContent,
    });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    } else {
      // 소켓 열릴 때까지 잠시 대기 후 발송
      const pendingInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(payload);
          clearInterval(pendingInterval);
        }
      }, 200);
      setTimeout(() => clearInterval(pendingInterval), 3000);
    }
  }

  /**
   * 관리자 권한으로 방명록 항목 삭제
   */
  public deleteGuestbookEntry(id: string, adminKey: string): void {
    if (!id || !adminKey) return;
    this.ensureSocket();

    const payload = JSON.stringify({
      type: 'DELETE_GUESTBOOK',
      id,
      adminKey,
    });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
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
        if (this.isQueued) {
          this.sendJoinQueue();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
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
              this.guestbookEntries = data.entries;
              for (const listener of this.guestbookListeners) {
                listener(this.guestbookEntries);
              }
            }
          } else if (data.type === 'GUESTBOOK_NEW' && data.entry) {
            const exists = this.guestbookEntries.some((e) => e.id === data.entry.id);
            if (!exists) {
              this.guestbookEntries = [data.entry, ...this.guestbookEntries].slice(0, 50);
              for (const listener of this.guestbookListeners) {
                listener(this.guestbookEntries);
              }
            }
          } else if (data.type === 'GUESTBOOK_DELETED' && data.id) {
            this.guestbookEntries = this.guestbookEntries.filter((e) => e.id !== data.id);
            for (const listener of this.guestbookListeners) {
              listener(this.guestbookEntries);
            }
          }
        } catch (err) {
          console.error('[Matchmaking] Message parse error:', err);
        }
      };

      this.ws.onclose = () => {
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
      this.ws.close();
      this.ws = null;
    }
  }
}

export const matchmakingService = new MatchmakingService();
