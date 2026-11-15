import { getWebSocketUrl } from '../../config/websocket';
import type { GuestbookEntry } from '../../models/types';
import { guestbookService, type GuestbookListener } from './guestbookService';

export interface MatchFoundData {
  roomId: string;
  myRole: 'p1' | 'p2';
  opponentId: string;
  opponentName: string;
}

type QueueListener = (waitingCount: number, waitingNames: string[]) => void;
type MatchListener = (data: MatchFoundData) => void;
type StatsListener = (waitingCount: number) => void;

class MatchmakingService {
  private ws: WebSocket | null = null;
  private myId: string;
  private myName: string;
  private onQueueChange: QueueListener | null = null;
  private onMatchFound: MatchListener | null = null;
  private isQueued: boolean = false;
  private statsListeners: Set<StatsListener> = new Set();
  private currentQueueCount: number = 0;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    guestbookService.bindWebSocket(
      () => this.ws,
      () => this.ensureSocket()
    );

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

  // --- Guestbook 호환 래퍼 메서드 (SRP 분리: guestbookService로 위임) ---
  public getGuestbookEntries(): GuestbookEntry[] {
    return guestbookService.getGuestbookEntries();
  }

  public async fetchGuestbookHttp(): Promise<GuestbookEntry[]> {
    return guestbookService.fetchGuestbookHttp();
  }

  public subscribeGuestbook(listener: GuestbookListener): () => void {
    return guestbookService.subscribeGuestbook(listener);
  }

  public sendGuestbookEntry(nickname: string, content: string): void {
    guestbookService.sendGuestbookEntry(nickname, content);
  }

  public deleteGuestbookEntry(id: string, adminKey: string): void {
    guestbookService.deleteGuestbookEntry(id, adminKey);
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
      if (
        this.statsListeners.size === 0 &&
        guestbookService.getListenerCount() === 0 &&
        !this.isQueued &&
        this.ws
      ) {
        this.stopHeartbeat();
        this.ws.close();
        this.ws = null;
      }
    };
  }

  /**
   * 로비 대기열 참가 (매칭 시작) - [L-3] 불필요 async 제거
   */
  public joinQueue(
    onQueueChange: QueueListener,
    onMatchFound: MatchListener
  ): void {
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

  public ensureSocket(): void {
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

          if (guestbookService.handleWebSocketMessage(data)) {
            return;
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
          }
        } catch (err) {
          console.error('[Matchmaking] Message parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.ws = null;

        // 재연결 필요 시 (대기열 또는 구독자가 있을 때)
        if (
          this.isQueued ||
          this.statsListeners.size > 0 ||
          guestbookService.getListenerCount() > 0
        ) {
          setTimeout(() => {
            if (
              this.isQueued ||
              this.statsListeners.size > 0 ||
              guestbookService.getListenerCount() > 0
            ) {
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
   * 게임 종료 또는 상대 이탈 후 대기열 재진입 - [L-3] 불필요 async 제거
   */
  public reEnterQueue(): void {
    this.isQueued = true;
    this.ensureSocket();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendJoinQueue();
    }
  }

  /**
   * 로비 나가기 - [L-3] 불필요 async 제거
   */
  public leaveQueue(): void {
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
    if (
      this.statsListeners.size === 0 &&
      guestbookService.getListenerCount() === 0 &&
      this.ws
    ) {
      this.stopHeartbeat();
      this.ws.close();
      this.ws = null;
    }
  }
}

export const matchmakingService = new MatchmakingService();
export { guestbookService };
