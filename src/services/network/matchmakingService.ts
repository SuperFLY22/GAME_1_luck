import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export interface LobbyPresence {
  id: string;
  name: string;
  status: 'WAITING' | 'PLAYING';
  joinedAt: number;
  matchId?: string;
}

export interface MatchFoundData {
  roomId: string;
  myRole: 'p1' | 'p2';
  opponentId: string;
  opponentName: string;
}

type QueueListener = (waitingCount: number, waitingNames: string[]) => void;
type MatchListener = (data: MatchFoundData) => void;

class MatchmakingService {
  private channel: RealtimeChannel | null = null;
  private myId: string;
  private myName: string;
  private onQueueChange: QueueListener | null = null;
  private onMatchFound: MatchListener | null = null;
  private matchLock: boolean = false;
  private matchCheckInterval: ReturnType<typeof setInterval> | null = null;

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
    if (this.channel) {
      this.channel.track({
        id: this.myId,
        name: this.myName,
        status: 'WAITING',
        joinedAt: Date.now(),
      });
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
    this.matchLock = false;

    if (this.channel) {
      await this.leaveQueue();
    }

    this.channel = supabase.channel('cham_lobby', {
      config: {
        presence: {
          key: this.myId,
        },
      },
    });

    // 1. 대기자 명단 동기화
    this.channel.on('presence', { event: 'sync' }, () => {
      this.evaluateLobbyState();
    });

    // 2. 매칭 초대 수신
    this.channel.on('broadcast', { event: 'MATCH_INVITE' }, ({ payload }) => {
      if (payload.p2Id === this.myId && !this.matchLock) {
        this.matchLock = true;
        this.channel?.track({
          id: this.myId,
          name: this.myName,
          status: 'PLAYING',
          joinedAt: Date.now(),
          matchId: payload.roomId,
        });

        this.onMatchFound?.({
          roomId: payload.roomId,
          myRole: 'p2',
          opponentId: payload.p1Id,
          opponentName: payload.p1Name,
        });
      }
    });

    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel?.track({
          id: this.myId,
          name: this.myName,
          status: 'WAITING',
          joinedAt: Date.now(),
        });
      }
    });

    // 1.5초마다 대기열 체크 및 매칭 중재 루프
    this.matchCheckInterval = setInterval(() => {
      this.evaluateLobbyState();
    }, 1500);
  }

  /**
   * 대기자 풀 분석 및 FIFO 선두 기준 랜덤 매칭 로직
   */
  private evaluateLobbyState(): void {
    if (!this.channel || this.matchLock) return;

    const state = this.channel.presenceState<LobbyPresence>();
    const allPresences: LobbyPresence[] = [];

    Object.values(state).forEach((presList) => {
      presList.forEach((p) => {
        if (p && p.id) allPresences.push(p);
      });
    });

    // 대기 중인 플레이어만 추출
    const waitingPool = allPresences.filter((p) => p.status === 'WAITING');

    this.onQueueChange?.(
      waitingPool.length,
      waitingPool.map((p) => p.name)
    );

    if (waitingPool.length < 2) return;

    // 들어온 시간순 정렬 (FIFO 우선권)
    waitingPool.sort((a, b) => a.joinedAt - b.joinedAt);

    // 가장 먼저 들어온 유저가 매칭 리더(Matchmaker) 권한 획득하여 충돌 방지
    const leader = waitingPool[0];
    if (leader.id === this.myId) {
      this.matchLock = true;

      // 대기자 풀 중에서 무작위 1명 선발 (고정 순서 ab bc cd 탈피)
      const candidates = waitingPool.slice(1);
      const randomIndex = Math.floor(Math.random() * candidates.length);
      const chosenOpponent = candidates[randomIndex];

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 초대 브로드캐스트 발송
      this.channel.send({
        type: 'broadcast',
        event: 'MATCH_INVITE',
        payload: {
          roomId,
          p1Id: this.myId,
          p1Name: this.myName,
          p2Id: chosenOpponent.id,
          p2Name: chosenOpponent.name,
        },
      });

      this.channel.track({
        id: this.myId,
        name: this.myName,
        status: 'PLAYING',
        joinedAt: Date.now(),
        matchId: roomId,
      });

      this.onMatchFound?.({
        roomId,
        myRole: 'p1',
        opponentId: chosenOpponent.id,
        opponentName: chosenOpponent.name,
      });
    }
  }

  /**
   * 게임 종료 또는 상대 이탈 후 대기열 재진입
   */
  public async reEnterQueue(): Promise<void> {
    this.matchLock = false;
    if (this.channel) {
      await this.channel.track({
        id: this.myId,
        name: this.myName,
        status: 'WAITING',
        joinedAt: Date.now(),
      });
    }
  }

  /**
   * 로비 나가기
   */
  public async leaveQueue(): Promise<void> {
    if (this.matchCheckInterval) {
      clearInterval(this.matchCheckInterval);
      this.matchCheckInterval = null;
    }
    if (this.channel) {
      await this.channel.untrack();
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.matchLock = false;
  }
}

export const matchmakingService = new MatchmakingService();
