import { getWebSocketUrl } from '../../config/websocket';

export interface MatchFoundData {
  roomId: string;
  myRole: 'p1' | 'p2';
  opponentId: string;
  opponentName: string;
}

type QueueListener = (waitingCount: number, waitingNames: string[]) => void;
type MatchListener = (data: MatchFoundData) => void;

class MatchmakingService {
  private ws: WebSocket | null = null;
  private myId: string;
  private myName: string;
  private onQueueChange: QueueListener | null = null;
  private onMatchFound: MatchListener | null = null;

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
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendJoinQueue();
    }
  }

  /**
   * 로비 대기열 참가
   */
  public async joinQueue(
    onQueueChange: QueueListener,
    onMatchFound: MatchListener
  ): Promise<void> {
    this.onQueueChange = onQueueChange;
    this.onMatchFound = onMatchFound;

    await this.leaveQueue();

    const url = getWebSocketUrl('lobby');
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.sendJoinQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'QUEUE_UPDATE') {
          this.onQueueChange?.(data.count, data.names);
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
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      if (this.onQueueChange && this.onMatchFound) {
        await this.joinQueue(this.onQueueChange, this.onMatchFound);
      }
      return;
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      this.sendJoinQueue();
    }
  }

  /**
   * 로비 나가기
   */
  public async leaveQueue(): Promise<void> {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'LEAVE_QUEUE' }));
        } catch {
          // ignore
        }
      }
      this.ws.close();
      this.ws = null;
    }
  }
}

export const matchmakingService = new MatchmakingService();
