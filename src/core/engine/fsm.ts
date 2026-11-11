import type {
  ChamDirection,
  DamageLevel,
  GameEngineState,
  GameMode,
  PlayerState,
  RPSChoice,
  Role,
} from '../../models/types';
import { evaluateCham, evaluateRPS, incrementDamage } from './rules';

export type GameAction =
  | { type: 'START_GAME'; mode: GameMode }
  | { type: 'ENTER_LOBBY' }
  | {
      type: 'MATCH_CONFIRMED';
      roomId: string;
      myRole: 'p1' | 'p2';
      myName: string;
      opponentName: string;
    }
  | { type: 'TICK_COUNTDOWN'; countdown: number }
  | { type: 'START_RPS' }
  | { type: 'SET_RPS_INPUT'; playerId: 'p1' | 'p2'; choice: RPSChoice }
  | { type: 'RESOLVE_RPS' }
  | { type: 'START_CHAM_PHASE' }
  | { type: 'RETRY_RPS_TIE' }
  | { type: 'SET_CHAM_INPUT'; playerId: 'p1' | 'p2'; direction: ChamDirection }
  | { type: 'RESOLVE_CHAM' }
  | { type: 'START_NEXT_CHAM' }
  | {
      type: 'SYNC_ONLINE_RPS_RESULT';
      p1Choice: RPSChoice;
      p2Choice: RPSChoice;
      p1Role: Role;
      p2Role: Role;
      isTie: boolean;
    }
  | {
      type: 'SYNC_ONLINE_CHAM_RESULT';
      p1Dir: ChamDirection;
      p2Dir: ChamDirection;
      isHit: boolean;
      hitTarget: 'p1' | 'p2' | null;
      p1Damage: DamageLevel;
      p2Damage: DamageLevel;
      isGameOver: boolean;
      winner: 'p1' | 'p2' | null;
    }
  | { type: 'SET_OPPONENT_LEFT' }
  | { type: 'CHECK_ROUND_RESULT' }
  | { type: 'NEXT_ROUND' }
  | { type: 'UPDATE_TIMER'; ratio: number }
  | { type: 'RESET_TO_TITLE' };

export function createInitialPlayer(id: 'p1' | 'p2', isAi: boolean, name: string): PlayerState {
  return {
    id,
    name,
    damage: 0,
    rpsChoice: null,
    chamDirection: null,
    role: null,
    isAi,
    score: 0,
    guardCount: 0,
  };
}

export function createInitialState(mode: GameMode = '1P_CPU'): GameEngineState {
  const is1PCpu = mode === '1P_CPU';
  return {
    mode,
    phase: 'TITLE',
    round: 1,
    countdown: 3,
    timerRemainingRatio: 1.0,
    p1: createInitialPlayer('p1', false, is1PCpu ? '나 (1P)' : '나'),
    p2: createInitialPlayer('p2', is1PCpu, is1PCpu ? '알파참 (AI)' : '상대방'),
    lastOutcome: null,
    hitTarget: null,
    winner: null,
    message: '게임을 시작하세요!',
    roleReversed: false, // 초기 상태: 공수 전환 없음
  };
}

export function gameReducer(state: GameEngineState, action: GameAction): GameEngineState {
  switch (action.type) {
    case 'START_GAME': {
      const mode = action.mode;
      if (mode === 'ONLINE_MATCH') {
        return {
          ...createInitialState(mode),
          phase: 'LOBBY',
          message: '대기열 입장 중...',
        };
      }
      return {
        ...createInitialState(mode),
        phase: 'READY',
        countdown: 3,
        round: 1,
        message: '준비... 라운드 1!',
      };
    }

    case 'ENTER_LOBBY': {
      return {
        ...createInitialState('ONLINE_MATCH'),
        phase: 'LOBBY',
        message: '새 상대를 찾는 중입니다...',
      };
    }

    case 'MATCH_CONFIRMED': {
      const isP1 = action.myRole === 'p1';
      return {
        ...createInitialState('ONLINE_MATCH'),
        phase: 'READY',
        countdown: 3,
        round: 1,
        p1: createInitialPlayer('p1', false, isP1 ? `${action.myName} (나)` : action.opponentName),
        p2: createInitialPlayer('p2', false, isP1 ? action.opponentName : `${action.myName} (나)`),
        online: {
          myPlayerId: action.myRole,
          myRoleInRoom: action.myRole,
          roomId: action.roomId,
          opponentName: action.opponentName,
          isRematchRequested: false,
          opponentWantsRematch: false,
          opponentLeft: false,
        },
        message: `매칭 성공! 상대: ${action.opponentName}`,
      };
    }

    case 'TICK_COUNTDOWN': {
      return {
        ...state,
        countdown: action.countdown,
        message: `${action.countdown}!`,
      };
    }

    case 'START_RPS': {
      return {
        ...state,
        phase: 'RPS_INPUT',
        timerRemainingRatio: 1.0,
        p1: { ...state.p1, rpsChoice: null, role: null },
        p2: { ...state.p2, rpsChoice: null, role: null },
        message: '선공을 정하는 가위 바위...',
      };
    }

    case 'SET_RPS_INPUT': {
      if (state.phase !== 'RPS_INPUT') return state;
      const key = action.playerId;
      return {
        ...state,
        [key]: {
          ...state[key],
          rpsChoice: action.choice,
        },
      };
    }

    case 'RESOLVE_RPS': {
      if (state.phase !== 'RPS_INPUT') return state;

      // 둘 다 미입력 시 evaluateRPS(null, null)에 의해 공정하게 TIE 처리
      const p1Choice = state.p1.rpsChoice;
      const p2Choice = state.p2.rpsChoice;
      const { p1Role, p2Role } = evaluateRPS(p1Choice, p2Choice);

      if (p1Role === 'TIE') {
        return {
          ...state,
          phase: 'RPS_RESULT',
          p1: { ...state.p1, rpsChoice: p1Choice, role: 'TIE' },
          p2: { ...state.p2, rpsChoice: p2Choice, role: 'TIE' },
          lastOutcome: 'TIE',
          message: '비겼습니다! 다시 한번!',
        };
      }

      const attackerName = p1Role === 'ATTACKER' ? state.p1.name : state.p2.name;

      return {
        ...state,
        phase: 'RPS_RESULT',
        timerRemainingRatio: 1.0,
        p1: { ...state.p1, rpsChoice: p1Choice, role: p1Role, chamDirection: null },
        p2: { ...state.p2, rpsChoice: p2Choice, role: p2Role, chamDirection: null },
        lastOutcome: null,
        message: `${attackerName} 선공 확정!`,
      };
    }

    case 'SYNC_ONLINE_RPS_RESULT': {
      if (action.isTie) {
        return {
          ...state,
          phase: 'RPS_RESULT',
          p1: { ...state.p1, rpsChoice: action.p1Choice, role: 'TIE' },
          p2: { ...state.p2, rpsChoice: action.p2Choice, role: 'TIE' },
          lastOutcome: 'TIE',
          message: '비겼습니다! 다시 한번!',
        };
      }

      const attackerName = action.p1Role === 'ATTACKER' ? state.p1.name : state.p2.name;
      return {
        ...state,
        phase: 'RPS_RESULT',
        timerRemainingRatio: 1.0,
        p1: { ...state.p1, rpsChoice: action.p1Choice, role: action.p1Role, chamDirection: null },
        p2: { ...state.p2, rpsChoice: action.p2Choice, role: action.p2Role, chamDirection: null },
        lastOutcome: null,
        message: `${attackerName} 선공 확정!`,
      };
    }

    case 'START_CHAM_PHASE': {
      if (state.phase !== 'RPS_RESULT') return state;
      const attackerName = state.p1.role === 'ATTACKER' ? state.p1.name : state.p2.name;
      return {
        ...state,
        phase: 'CHAM_INPUT',
        timerRemainingRatio: 1.0,
        p1: { ...state.p1, chamDirection: null },
        p2: { ...state.p2, chamDirection: null },
        lastOutcome: null,
        message: `${attackerName} 선공! 3초 안에 선택! 참! 참! 참!`,
      };
    }

    case 'RETRY_RPS_TIE': {
      return {
        ...state,
        phase: 'RPS_INPUT',
        timerRemainingRatio: 1.0,
        lastOutcome: null,
        p1: { ...state.p1, rpsChoice: null, role: null, chamDirection: null },
        p2: { ...state.p2, rpsChoice: null, role: null, chamDirection: null },
        message: '선공 결정 가위... 바위... 보!',
      };
    }

    case 'SET_CHAM_INPUT': {
      if (state.phase !== 'CHAM_INPUT') return state;
      const key = action.playerId;
      return {
        ...state,
        [key]: {
          ...state[key],
          chamDirection: action.direction,
        },
      };
    }

    case 'RESOLVE_CHAM': {
      if (state.phase !== 'CHAM_INPUT') return state;

      const attackerId = state.p1.role === 'ATTACKER' ? 'p1' : 'p2';
      const defenderId = attackerId === 'p1' ? 'p2' : 'p1';

      const attackerRaw = state[attackerId].chamDirection;
      const defenderRaw = state[defenderId].chamDirection;

      // 1. 공격자 3초 타임아웃 패널티 검증:
      // 공격자가 3초 안에 공격 방향을 정하지 못하면 공격 실패 & 공수 전환 패널티!
      if (!attackerRaw) {
        const attackerName = state[attackerId].name;
        const defenderName = state[defenderId].name;
        let nextP1 = { ...state.p1 };
        let nextP2 = { ...state.p2 };

        // 수비자의 guardCount +1
        if (defenderId === 'p1') {
          nextP1.guardCount = (nextP1.guardCount ?? 0) + 1;
        } else {
          nextP2.guardCount = (nextP2.guardCount ?? 0) + 1;
        }

        return {
          ...state,
          phase: 'RESOLVE',
          p1: nextP1,
          p2: nextP2,
          lastOutcome: 'DODGE', // 공격 실패 -> 수비 측 턴 획득
          hitTarget: null,
          message: `⏰ ${attackerName} 공격 시간(3초) 초과! ➔ ${defenderName} 공수 교대!`,
        };
      }

      // 2. 수비자만 미입력 시 무방비 피격 처리
      const p1Dir = state.p1.chamDirection ?? (attackerId === 'p1' ? 'UP' : null);
      const p2Dir = state.p2.chamDirection ?? (attackerId === 'p2' ? 'UP' : null);

      const attackerDir = attackerId === 'p1' ? p1Dir : p2Dir;
      const defenderDir = defenderId === 'p1' ? p1Dir : p2Dir;

      let isHit = false;
      if (!defenderRaw) {
        // 수비자가 가드를 올리지 못함 -> 무방비 피격
        isHit = true;
      } else {
        // 공격 방향과 수비 방향 판정:
        // 방향 일치 -> 가드 방어 성공 (isHit: false)
        // 방향 불일치 -> 공격 적중 (isHit: true)
        isHit = evaluateCham(attackerDir!, defenderDir!).isHit;
      }

      let nextP1 = { ...state.p1, chamDirection: p1Dir };
      let nextP2 = { ...state.p2, chamDirection: p2Dir };
      let hitTarget: 'p1' | 'p2' | null = null;

      if (isHit) {
        hitTarget = defenderId;
        if (defenderId === 'p1') {
          nextP1.damage = incrementDamage(nextP1.damage);
        } else {
          nextP2.damage = incrementDamage(nextP2.damage);
        }
      } else {
        // 가드 성공: 수비자의 guardCount +1 누적
        if (defenderId === 'p1') {
          nextP1.guardCount = (nextP1.guardCount ?? 0) + 1;
        } else {
          nextP2.guardCount = (nextP2.guardCount ?? 0) + 1;
        }
      }

      return {
        ...state,
        phase: 'RESOLVE',
        p1: nextP1,
        p2: nextP2,
        lastOutcome: isHit ? 'HIT' : 'DODGE',
        hitTarget,
        message: isHit ? '찰싹! 빈틈 타격 명중 (POW!)' : '챙-! 가드 방어 성공 (BLOCK!)',
      };
    }

    case 'SYNC_ONLINE_CHAM_RESULT': {
      const defenderId = state.p1.role === 'DEFENDER' ? 'p1' : 'p2';
      const nextGuardP1 = !action.isHit && defenderId === 'p1'
        ? (state.p1.guardCount ?? 0) + 1
        : state.p1.guardCount;
      const nextGuardP2 = !action.isHit && defenderId === 'p2'
        ? (state.p2.guardCount ?? 0) + 1
        : state.p2.guardCount;

      return {
        ...state,
        phase: 'RESOLVE',
        p1: { ...state.p1, chamDirection: action.p1Dir, damage: action.p1Damage, guardCount: nextGuardP1 },
        p2: { ...state.p2, chamDirection: action.p2Dir, damage: action.p2Damage, guardCount: nextGuardP2 },
        lastOutcome: action.isHit ? 'HIT' : 'DODGE',
        hitTarget: action.hitTarget,
        message: action.isHit ? '찰싹! 빈틈 타격 명중 (POW!)' : '챙-! 가드 방어 성공 (BLOCK!)',
      };
    }

    case 'SET_OPPONENT_LEFT': {
      return {
        ...state,
        phase: 'GAME_OVER',
        winner: state.online?.myRoleInRoom ?? 'p1',
        online: state.online ? { ...state.online, opponentLeft: true } : undefined,
        message: '상대방이 나갔습니다. 부전승!',
      };
    }

    case 'CHECK_ROUND_RESULT': {
      if (state.p1.damage >= 5) {
        return {
          ...state,
          phase: 'GAME_OVER',
          winner: 'p2',
          message: `${state.p2.name} 최종 승리!`,
        };
      }
      if (state.p2.damage >= 5) {
        return {
          ...state,
          phase: 'GAME_OVER',
          winner: 'p1',
          message: `${state.p1.name} 최종 승리!`,
        };
      }

      // 1. 공격 성공(HIT) 시: 공격권 유지 (계속 공격)
      // 2. 수비 성공(DODGE) 시: 공수 전환 (수비수가 공격수로 전환)
      const isHit = state.lastOutcome === 'HIT';
      const nextP1Role: Role = isHit
        ? state.p1.role
        : state.p1.role === 'ATTACKER'
          ? 'DEFENDER'
          : 'ATTACKER';
      const nextP2Role: Role = isHit
        ? state.p2.role
        : state.p2.role === 'ATTACKER'
          ? 'DEFENDER'
          : 'ATTACKER';

      const nextAttackerName = nextP1Role === 'ATTACKER' ? state.p1.name : state.p2.name;

      if (!isHit) {
        // 공수 전환 발생 -> 1.5초간 공수 전환을 확실히 인지할 수 있는 ROLE_SWAP pause 단계로 진입
        return {
          ...state,
          phase: 'ROLE_SWAP',
          round: state.round + 1,
          countdown: 0,
          timerRemainingRatio: 1.0,
          lastOutcome: null,
          hitTarget: null,
          p1: { ...state.p1, role: nextP1Role, chamDirection: null },
          p2: { ...state.p2, role: nextP2Role, chamDirection: null },
          message: `🔄 공수 교대! ${nextAttackerName} 공격 차례!`,
          roleReversed: true,
        };
      }

      // 공격 성공 시 연속 공격
      return {
        ...state,
        phase: 'CHAM_INPUT',
        round: state.round + 1,
        countdown: 0,
        timerRemainingRatio: 1.0,
        lastOutcome: null,
        hitTarget: null,
        p1: { ...state.p1, role: nextP1Role, chamDirection: null },
        p2: { ...state.p2, role: nextP2Role, chamDirection: null },
        message: `💥 공격 성공! ${nextAttackerName} 연속 공격! 참! 참! 참!`,
        roleReversed: false,
      };
    }

    case 'START_NEXT_CHAM': {
      const attackerName = state.p1.role === 'ATTACKER' ? state.p1.name : state.p2.name;
      return {
        ...state,
        phase: 'CHAM_INPUT',
        timerRemainingRatio: 1.0,
        message: `🔥 ${attackerName} 공격! 3초 안에 선택! 참! 참! 참!`,
        roleReversed: false,
      };
    }

    case 'UPDATE_TIMER': {
      return {
        ...state,
        timerRemainingRatio: Math.max(0, Math.min(1, action.ratio)),
      };
    }

    case 'RESET_TO_TITLE': {
      return createInitialState('1P_CPU');
    }

    default:
      return state;
  }
}
