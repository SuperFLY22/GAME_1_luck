/**
 * 게임 도메인 모델 및 상태 인터페이스 정의
 */

export type GameMode = '1P_CPU' | '2P_LOCAL' | 'ONLINE_MATCH';

export type GamePhase =
  | 'TITLE'
  | 'LOBBY'
  | 'READY'
  | 'RPS_INPUT'
  | 'CHAM_INPUT'
  | 'RESOLVE'
  | 'CHECK_WINNER'
  | 'GAME_OVER';

export type RPSChoice = 'ROCK' | 'SCISSORS' | 'PAPER' | null;

export type ChamDirection = 'LEFT' | 'RIGHT' | null;

export type Role = 'ATTACKER' | 'DEFENDER' | 'TIE' | null;

export type DamageLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface PlayerState {
  id: 'p1' | 'p2';
  name: string;
  damage: DamageLevel;
  rpsChoice: RPSChoice;
  chamDirection: ChamDirection;
  role: Role;
  isAi: boolean;
  score: number;
}

export interface OnlineMatchContext {
  myPlayerId: string;
  myRoleInRoom: 'p1' | 'p2';
  roomId: string | null;
  opponentName: string;
  isRematchRequested: boolean;
  opponentWantsRematch: boolean;
  opponentLeft: boolean;
}

export interface GameEngineState {
  mode: GameMode;
  phase: GamePhase;
  round: number;
  countdown: number;
  timerRemainingRatio: number; // 0.0 ~ 1.0 for progress bar
  p1: PlayerState;
  p2: PlayerState;
  lastOutcome: 'HIT' | 'DODGE' | 'TIE' | null;
  hitTarget: 'p1' | 'p2' | null;
  winner: 'p1' | 'p2' | null;
  message: string;
  online?: OnlineMatchContext;
}
