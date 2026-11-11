import { getWebSocketUrl } from '../../config/websocket';
import type {
  ChamDirection,
  DamageLevel,
  RPSChoice,
  Role,
} from '../../models/types';
import {
  evaluateCham,
  evaluateRPS,
  incrementDamage,
  getCpuChamDirection,
} from '../../core/engine/rules';

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
  private ws: WebSocket | null = null;
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

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    const url = getWebSocketUrl(roomId);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      if (this.myRole === 'p1') {
        // P1이 접속 800ms 후 게임 시작 신호 브로드캐스트
        setTimeout(() => {
          this.broadcast('GAME_READY', {});
        }, 800);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const { event: evt, payload } = JSON.parse(event.data);

        switch (evt) {
          case 'GAME_READY':
            this.callbacks?.onStartReady();
            break;

          case 'RPS_START':
            this.resetTurnInputs();
            this.callbacks?.onRpsStart();
            break;

          case 'RPS_INPUT':
            if (this.myRole === 'p1') {
              if (payload.role === 'p1') this.p1Rps = payload.choice;
              if (payload.role === 'p2') this.p2Rps = payload.choice;
              this.checkRpsResolution();
            }
            break;

          case 'RPS_RESOLVED':
            this.callbacks?.onRpsResult(payload);
            break;

          case 'CHAM_START':
            this.resetTurnInputs();
            this.callbacks?.onChamStart();
            break;

          case 'CHAM_INPUT':
            if (this.myRole === 'p1') {
              if (payload.role === 'p1') this.p1Cham = payload.direction;
              if (payload.role === 'p2') this.p2Cham = payload.direction;
              this.checkChamResolution();
            }
            break;

          case 'CHAM_RESOLVED':
            this.callbacks?.onChamResult(payload);
            break;

          case 'PLAYER_LEFT':
            this.callbacks?.onOpponentLeft();
            break;
        }
      } catch (err) {
        console.error('[RoomSession] Message parse error:', err);
      }
    };
  }

  private resetTurnInputs(): void {
    this.p1Rps = null;
    this.p2Rps = null;
    this.p1Cham = null;
    this.p2Cham = null;
  }

  public submitRps(choice: RPSChoice): void {
    if (!this.ws) return;
    this.broadcast('RPS_INPUT', { role: this.myRole, choice });
  }

  public submitCham(direction: ChamDirection): void {
    if (!this.ws) return;
    this.broadcast('CHAM_INPUT', { role: this.myRole, direction });
  }

  public startRpsPhase(): void {
    if (this.myRole === 'p1') {
      this.resetTurnInputs();
      this.broadcast('RPS_START', {});
    }
  }

  public startChamPhase(): void {
    if (this.myRole === 'p1') {
      this.resetTurnInputs();
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
      const attackerDir =
        this.currentAttacker === 'p1' ? this.p1Cham : this.p2Cham;
      const defenderDir =
        this.currentAttacker === 'p1' ? this.p2Cham : this.p1Cham;
      const { isHit } = evaluateCham(attackerDir, defenderDir);

      let hitTarget: 'p1' | 'p2' | null = null;
      if (isHit) {
        hitTarget = this.currentAttacker === 'p1' ? 'p2' : 'p1';
      } else {
        hitTarget = null;
        this.currentAttacker = this.currentAttacker === 'p1' ? 'p2' : 'p1';
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

  public resolveChamOnTimeout(): void {
    if (this.myRole !== 'p1') return;
    const attackerCham =
      this.currentAttacker === 'p1' ? this.p1Cham : this.p2Cham;
    if (!attackerCham) {
      this.currentAttacker = this.currentAttacker === 'p1' ? 'p2' : 'p1';
      this.broadcast('CHAM_RESOLVED', {
        p1Dir: this.p1Cham,
        p2Dir: this.p2Cham,
        isHit: false,
        hitTarget: null,
        p1Damage: this.p1Damage,
        p2Damage: this.p2Damage,
        isGameOver: false,
        winner: null,
      });
      this.resetTurnInputs();
      return;
    }

    if (this.p1Cham === null) this.p1Cham = getCpuChamDirection();
    if (this.p2Cham === null) this.p2Cham = getCpuChamDirection();
    this.checkChamResolution();
  }

  public leaveRoom(): void {
    if (this.ws) {
      this.broadcast('PLAYER_LEFT', { role: this.myRole });
      this.ws.close();
      this.ws = null;
    }
    this.roomId = null;
  }

  private broadcast(event: string, payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        event,
        payload,
      })
    );
  }
}

export const roomSessionService = new RoomSessionService();
