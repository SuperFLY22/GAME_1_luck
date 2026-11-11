import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { GAME_CONFIG, KEY_BINDINGS } from '../../config/constants';
import {
  createInitialState,
  gameReducer,
} from '../../core/engine/fsm';
import { getCpuChamDirection, getCpuRpsChoice } from '../../core/engine/rules';
import type {
  ChamDirection,
  GameMode,
  RPSChoice,
} from '../../models/types';
import { matchmakingService, type MatchFoundData } from '../../services/network/matchmakingService';
import { roomSessionService } from '../../services/network/roomSessionService';
import { soundManager } from '../../services/sound/soundManager';

export function useGameLoop() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState('1P_CPU')
  );

  // 대기실 통계 상태
  const [waitingCount, setWaitingCount] = useState(1);
  const [waitingNames, setWaitingNames] = useState<string[]>([]);

  // 현재 상태 최신 레퍼런스 유지
  const stateRef = useRef(state);
  stateRef.current = state;

  const p1SubmittedRef = useRef(false);
  const p2SubmittedRef = useRef(false);

  const timerStartRef = useRef<number>(0);
  const timerDurationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    p1SubmittedRef.current = false;
    p2SubmittedRef.current = false;
  }, [state.phase, state.round]);

  // 1. 온라인 룸 세션 연결 및 이벤트 바인딩
  const setupOnlineRoom = useCallback((data: MatchFoundData) => {
    roomSessionService.joinRoom(data.roomId, data.myRole, {
      onStartReady: () => {
        dispatch({ type: 'TICK_COUNTDOWN', countdown: 3 });
      },
      onRpsStart: () => {
        dispatch({ type: 'START_RPS' });
        soundManager.playRPSChant();
      },
      onRpsResult: (res) => {
        dispatch({
          type: 'SYNC_ONLINE_RPS_RESULT',
          p1Choice: res.p1Choice,
          p2Choice: res.p2Choice,
          p1Role: res.p1Role,
          p2Role: res.p2Role,
          isTie: res.isTie,
        });
      },
      onChamStart: () => {
        // 참참참 입력 시작
      },
      onChamResult: (res) => {
        dispatch({
          type: 'SYNC_ONLINE_CHAM_RESULT',
          p1Dir: res.p1Dir,
          p2Dir: res.p2Dir,
          isHit: res.isHit,
          hitTarget: res.hitTarget,
          p1Damage: res.p1Damage,
          p2Damage: res.p2Damage,
          isGameOver: res.isGameOver,
          winner: res.winner,
        });
      },
      onOpponentLeft: () => {
        dispatch({ type: 'SET_OPPONENT_LEFT' });
      },
    });
  }, []);

  // 2. 카운트다운 루프 (READY 단계)
  useEffect(() => {
    if (state.phase !== 'READY') return;

    soundManager.playCountdown(state.countdown === 1);

    const timer = setTimeout(() => {
      if (state.countdown > 1) {
        dispatch({ type: 'TICK_COUNTDOWN', countdown: state.countdown - 1 });
      } else {
        dispatch({ type: 'START_RPS' });
        soundManager.playRPSChant();
        if (state.mode === 'ONLINE_MATCH' && state.online?.myRoleInRoom === 'p1') {
          roomSessionService.startRpsPhase();
        }
      }
    }, GAME_CONFIG.COUNTDOWN_STEP_MS);

    return () => clearTimeout(timer);
  }, [state.phase, state.countdown, state.mode, state.online?.myRoleInRoom]);

  // 3. 타이머 루프 (RPS_INPUT & CHAM_INPUT)
  useEffect(() => {
    if (state.phase !== 'RPS_INPUT' && state.phase !== 'CHAM_INPUT') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const duration =
      state.phase === 'RPS_INPUT'
        ? GAME_CONFIG.RPS_LIMIT_MS
        : GAME_CONFIG.CHAM_LIMIT_MS;

    timerStartRef.current = performance.now();
    timerDurationRef.current = duration;

    // AI 자동 입력 (1P vs CPU 전용)
    let aiTimer: ReturnType<typeof setTimeout> | null = null;
    if (state.p2.isAi) {
      const aiDelay =
        state.phase === 'RPS_INPUT'
          ? 400 + Math.random() * 400
          : 500 + Math.random() * 800; // 2초 카운트다운 중 0.5~1.3초 사이에 AI 결정
      aiTimer = setTimeout(() => {
        if (stateRef.current.phase === 'RPS_INPUT') {
          const cpuChoice = getCpuRpsChoice();
          dispatch({ type: 'SET_RPS_INPUT', playerId: 'p2', choice: cpuChoice });
          p2SubmittedRef.current = true;
        } else if (stateRef.current.phase === 'CHAM_INPUT') {
          const cpuDir = getCpuChamDirection();
          dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p2', direction: cpuDir });
          p2SubmittedRef.current = true;
        }
      }, aiDelay);
    }

    const tick = (now: number) => {
      const elapsed = now - timerStartRef.current;
      const remainingRatio = Math.max(0, 1 - elapsed / timerDurationRef.current);

      dispatch({ type: 'UPDATE_TIMER', ratio: remainingRatio });

      const isRps = stateRef.current.phase === 'RPS_INPUT';
      const rpsBothInputted = isRps && p1SubmittedRef.current && p2SubmittedRef.current;

      // RPS는 둘 다 선택 시 즉시 결과 판정
      // 참참참은 2초 카운트다운 동안 방향을 결정하고 타이머 종료 시(remainingRatio <= 0) 결과 반영!
      if (remainingRatio <= 0 || rpsBothInputted) {
        if (stateRef.current.mode !== 'ONLINE_MATCH') {
          if (stateRef.current.phase === 'RPS_INPUT') {
            dispatch({ type: 'RESOLVE_RPS' });
          } else if (stateRef.current.phase === 'CHAM_INPUT') {
            if (!stateRef.current.p1.chamDirection) {
              dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p1', direction: getCpuChamDirection() });
            }
            if (!stateRef.current.p2.chamDirection) {
              dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p2', direction: getCpuChamDirection() });
            }
            dispatch({ type: 'RESOLVE_CHAM' });
          }
        } else {
          if (stateRef.current.phase === 'CHAM_INPUT' && remainingRatio <= 0) {
            roomSessionService.resolveChamOnTimeout();
          }
        }
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (aiTimer) clearTimeout(aiTimer);
    };
  }, [state.phase, state.round, state.mode]);

  // 4. 결과 연출 및 사운드
  useEffect(() => {
    if (state.phase === 'RESOLVE') {
      if (state.lastOutcome === 'HIT') {
        soundManager.playHit();
      } else if (state.lastOutcome === 'DODGE') {
        soundManager.playDodge();
      }

      const timer = setTimeout(() => {
        dispatch({ type: 'CHECK_ROUND_RESULT' });
      }, GAME_CONFIG.RESOLVE_DISPLAY_MS);

      return () => clearTimeout(timer);
    }

    if (state.lastOutcome === 'TIE') {
      const timer = setTimeout(() => {
        dispatch({ type: 'RETRY_RPS_TIE' });
        soundManager.playRPSChant();
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [state.phase, state.lastOutcome]);

  // 5. BGM 제어
  useEffect(() => {
    if (state.phase === 'TITLE' || state.phase === 'LOBBY' || state.phase === 'GAME_OVER') {
      soundManager.stopBgm();
      return;
    }
    const isMatchPoint = state.p1.damage >= 4 || state.p2.damage >= 4;
    soundManager.playBgm(isMatchPoint);
  }, [state.phase, state.p1.damage, state.p2.damage]);

  // 6. 입력 핸들러 (온라인 룸 세션 자동 연동)
  const handleP1Input = useCallback(
    (type: 'rps' | 'cham', value: RPSChoice | ChamDirection) => {
      const cur = stateRef.current;
      const isOnline = cur.mode === 'ONLINE_MATCH';
      const myRole = cur.online?.myRoleInRoom;

      if (isOnline && myRole !== 'p1') return; // 온라인 모드에서는 내 역할만 조작

      if (type === 'rps' && cur.phase === 'RPS_INPUT') {
        if (p1SubmittedRef.current) return;
        p1SubmittedRef.current = true;
        dispatch({ type: 'SET_RPS_INPUT', playerId: 'p1', choice: value as RPSChoice });
        if (isOnline) roomSessionService.submitRps(value as RPSChoice);
      } else if (type === 'cham' && cur.phase === 'CHAM_INPUT') {
        p1SubmittedRef.current = true;
        dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p1', direction: value as ChamDirection });
        if (isOnline) roomSessionService.submitCham(value as ChamDirection);
      }
    },
    []
  );

  const handleP2Input = useCallback(
    (type: 'rps' | 'cham', value: RPSChoice | ChamDirection) => {
      const cur = stateRef.current;
      const isOnline = cur.mode === 'ONLINE_MATCH';
      const myRole = cur.online?.myRoleInRoom;

      if (isOnline && myRole !== 'p2') return;

      if (type === 'rps' && cur.phase === 'RPS_INPUT') {
        if (p2SubmittedRef.current) return;
        p2SubmittedRef.current = true;
        dispatch({ type: 'SET_RPS_INPUT', playerId: 'p2', choice: value as RPSChoice });
        if (isOnline) roomSessionService.submitRps(value as RPSChoice);
      } else if (type === 'cham' && cur.phase === 'CHAM_INPUT') {
        p2SubmittedRef.current = true;
        dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p2', direction: value as ChamDirection });
        if (isOnline) roomSessionService.submitCham(value as ChamDirection);
      }
    },
    []
  );

  // 7. 키보드 바인딩
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const cur = stateRef.current;
      const isSolo = cur.mode === '1P_CPU';
      const isOnline = cur.mode === 'ONLINE_MATCH';
      const myRole = cur.online?.myRoleInRoom;

      // 1P 조작
      const p1Bindings = isSolo ? KEY_BINDINGS.SOLO_P1 : KEY_BINDINGS.P1_LOCAL;
      const p1Left = p1Bindings.LEFT as readonly string[];
      const p1Up = p1Bindings.UP as readonly string[];
      const p1Right = p1Bindings.RIGHT as readonly string[];

      if (!isOnline || myRole === 'p1') {
        if (p1Left.includes(e.code) || p1Left.includes(e.key)) {
          if (cur.phase === 'RPS_INPUT') handleP1Input('rps', 'SCISSORS');
          else if (cur.phase === 'CHAM_INPUT') handleP1Input('cham', 'LEFT');
        } else if (p1Up.includes(e.code) || p1Up.includes(e.key)) {
          if (cur.phase === 'RPS_INPUT') handleP1Input('rps', 'ROCK');
          else if (cur.phase === 'CHAM_INPUT') handleP1Input('cham', 'UP');
        } else if (p1Right.includes(e.code) || p1Right.includes(e.key)) {
          if (cur.phase === 'RPS_INPUT') handleP1Input('rps', 'PAPER');
          else if (cur.phase === 'CHAM_INPUT') handleP1Input('cham', 'RIGHT');
        }
      }

      // 2P 조작
      if (!isSolo && (!isOnline || myRole === 'p2')) {
        const p2Bindings = KEY_BINDINGS.P2_LOCAL;
        const p2Left = p2Bindings.LEFT as readonly string[];
        const p2Up = p2Bindings.UP as readonly string[];
        const p2Right = p2Bindings.RIGHT as readonly string[];

        if (p2Left.includes(e.code) || p2Left.includes(e.key)) {
          if (cur.phase === 'RPS_INPUT') handleP2Input('rps', 'SCISSORS');
          else if (cur.phase === 'CHAM_INPUT') handleP2Input('cham', 'LEFT');
        } else if (p2Up.includes(e.code) || p2Up.includes(e.key)) {
          if (cur.phase === 'RPS_INPUT') handleP2Input('rps', 'ROCK');
          else if (cur.phase === 'CHAM_INPUT') handleP2Input('cham', 'UP');
        } else if (p2Right.includes(e.code) || p2Right.includes(e.key)) {
          if (cur.phase === 'RPS_INPUT') handleP2Input('rps', 'PAPER');
          else if (cur.phase === 'CHAM_INPUT') handleP2Input('cham', 'RIGHT');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleP1Input, handleP2Input]);

  // 8. 모드별 시작 함수
  const startGame = (mode: GameMode) => {
    if (mode === 'ONLINE_MATCH') {
      dispatch({ type: 'ENTER_LOBBY' });
      matchmakingService.joinQueue(
        (count, names) => {
          setWaitingCount(count);
          setWaitingNames(names);
        },
        (matchData) => {
          dispatch({
            type: 'MATCH_CONFIRMED',
            roomId: matchData.roomId,
            myRole: matchData.myRole,
            myName: matchmakingService.getMyName(),
            opponentName: matchData.opponentName,
          });
          setupOnlineRoom(matchData);
        }
      );
    } else {
      dispatch({ type: 'START_GAME', mode });
    }
  };

  const findNewOnlineMatch = () => {
    roomSessionService.leaveRoom();
    dispatch({ type: 'ENTER_LOBBY' });
    matchmakingService.reEnterQueue();
  };

  const goToTitle = () => {
    roomSessionService.leaveRoom();
    matchmakingService.leaveQueue();
    dispatch({ type: 'RESET_TO_TITLE' });
  };

  return {
    state,
    waitingCount,
    waitingNames,
    startGame,
    restartGame: () => dispatch({ type: 'START_GAME', mode: state.mode }),
    findNewOnlineMatch,
    goToTitle,
    handleP1Input,
    handleP2Input,
  };
}
