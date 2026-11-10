import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import type {
  ChamDirection,
  DamageLevel,
  RPSChoice,
  Role,
} from '../../models/types';
import { evaluateCham, evaluateRPS, incrementDamage } from '../../core/engine/rules';

export interface RoomCallbacks {
  onStartReady: () => void;
  onRpsStart: () => void;
  onRpsResult: (data: {
    p1Choice: RPSChoice;
    p2Choice: RPSChoice;
    p1Role: Role;
    p2Role: Role;
    isTie: boolean;
  }) => void;
  onChamStart: () => void;
  onChamResult: (data: {
    p1Dir: ChamDirection;
    p2Dir: ChamDirection;
    isHit: boolean;
    hitTarget: 'p1' | 'p2' | null;
    p1Damage: DamageLevel;
    p2Damage: DamageLevel;
    isGameOver: boolean;
    winner: 'p1' | 'p2' | null;
  }) => void;
  onOpponentLeft: () => void;
}

class RoomSessionService {
  private channel: RealtimeChannel | null = null;
  private roomId: string | null = null;
  private myRole: 'p1' | 'p2' = 'p1';
  private callbacks: RoomCallbacks | null = null;

  // Host 관리 상태
  private currentAttacker: 'p1' | 'p2' | null = null;
  private p1Rps: RPSChoice = null;
  private p2Rps: RPSChoice = null;
  private p1Cham: ChamDirection = null;
  private p2Cham: ChamDirection = null;
  private p1Damage: DamageLevel = 0;
  private p2Damage: DamageLevel = 0;

  public getRoomId(): string | null {
    return this.roomId;
  }

  public async joinRoom(
    roomId: string,
    myRole: 'p1' | 'p2',
    callbacks: RoomCallbacks
  ): Promise<void> {
    this.roomId = roomId;
    this.myRole = myRole;
    this.callbacks = callbacks;
    this.p1Damage = 0;
    this.p2Damage = 0;
    this.resetTurnInputs();

    if (this.channel) {
      await supabase.removeChannel(this.channel);
    }

    this.channel = supabase.channel(`cham_room_${roomId}`);

    // 브로드캐스트 이벤트 리스너 등록
    this.channel
      .on('broadcast', { event: 'GAME_READY' }, () => {
        this.callbacks?.onStartReady();
      })
      .on('broadcast', { event: 'RPS_START' }, () => {
        this.resetTurnInputs();
        this.callbacks?.onRpsStart();
      })
      .on('broadcast', { event: 'RPS_INPUT' }, ({ payload }) => {
        if (this.myRole === 'p1') {
          if (payload.role === 'p1') this.p1Rps = payload.choice;
          if (payload.role === 'p2') this.p2Rps = payload.choice;
          this.checkRpsResolution();
        }
      })
      .on('broadcast', { event: 'RPS_RESOLVED' }, ({ payload }) => {
        this.callbacks?.onRpsResult(payload);
      })
      .on('broadcast', { event: 'CHAM_START' }, () => {
        this.callbacks?.onChamStart();
      })
      .on('broadcast', { event: 'CHAM_INPUT' }, ({ payload }) => {
        if (this.myRole === 'p1') {
          if (payload.role === 'p1') this.p1Cham = payload.direction;
          if (payload.role === 'p2') this.p2Cham = payload.direction;
          this.checkChamResolution();
        }
      })
      .on('broadcast', { event: 'CHAM_RESOLVED' }, ({ payload }) => {
        this.callbacks?.onChamResult(payload);
      })
      .on('broadcast', { event: 'PLAYER_LEFT' }, () => {
        this.callbacks?.onOpponentLeft();
      });

    await this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (this.myRole === 'p1') {
          // P1이 1초 후 게임 카운트다운 시작 브로드캐스트
          setTimeout(() => {
            this.broadcast('GAME_READY', {});
          }, 800);
        }
      }
    });
  }

  private resetTurnInputs(): void {
    this.p1Rps = null;
    this.p2Rps = null;
    this.p1Cham = null;
    this.p2Cham = null;
  }

  public submitRps(choice: RPSChoice): void {
    if (!this.channel) return;
    this.broadcast('RPS_INPUT', { role: this.myRole, choice });
    if (this.myRole === 'p1') {
      this.p1Rps = choice;
      this.checkRpsResolution();
    }
  }

  public submitCham(direction: ChamDirection): void {
    if (!this.channel) return;
    this.broadcast('CHAM_INPUT', { role: this.myRole, direction });
    if (this.myRole === 'p1') {
      this.p1Cham = direction;
      this.checkChamResolution();
    }
  }

  public startRpsPhase(): void {
    if (this.myRole === 'p1') {
      this.broadcast('RPS_START', {});
    }
  }

  public startChamPhase(): void {
    if (this.myRole === 'p1') {
      this.broadcast('CHAM_START', {});
    }
  }

  private checkRpsResolution(): void {
    if (this.p1Rps !== null && this.p2Rps !== null) {
      const { p1Role, p2Role } = evaluateRPS(this.p1Rps, this.p2Rps);
      const isTie = p1Role === 'TIE';

      if (!isTie) {
        this.currentAttacker = p1Role === 'ATTACKER' ? 'p1' : 'p2';
      }

      this.broadcast('RPS_RESOLVED', {
        p1Choice: this.p1Rps,
        p2Choice: this.p2Rps,
        p1Role,
        p2Role,
        isTie,
      });

      this.resetTurnInputs();
    }
  }

  private checkChamResolution(): void {
    if (this.p1Cham !== null && this.p2Cham !== null) {
      const { isHit } = evaluateCham(this.p1Cham, this.p2Cham);

      let hitTarget: 'p1' | 'p2' | null = null;
      if (isHit) {
        // P1이 공격수였다면 피격자는 P2, 아니면 P1
        hitTarget = this.currentAttacker === 'p1' ? 'p2' : 'p1';
      }

      if (hitTarget === 'p1') this.p1Damage = incrementDamage(this.p1Damage);
      if (hitTarget === 'p2') this.p2Damage = incrementDamage(this.p2Damage);

      const isGameOver = this.p1Damage >= 5 || this.p2Damage >= 5;
      const winner = isGameOver ? (this.p1Damage >= 5 ? 'p2' : 'p1') : null;

      this.broadcast('CHAM_RESOLVED', {
        p1Dir: this.p1Cham,
        p2Dir: this.p2Cham,
        isHit,
        hitTarget,
        p1Damage: this.p1Damage,
        p2Damage: this.p2Damage,
        isGameOver,
        winner,
      });

      this.resetTurnInputs();
    }
  }

  public leaveRoom(): void {
    if (this.channel) {
      this.broadcast('PLAYER_LEFT', { role: this.myRole });
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.roomId = null;
  }

  private broadcast(event: string, payload: Record<string, unknown>): void {
    this.channel?.send({
      type: 'broadcast',
      event,
      payload,
    });
  }
}

export const roomSessionService = new RoomSessionService();
