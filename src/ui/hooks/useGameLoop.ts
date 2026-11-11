import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { GAME_CONFIG } from '../../config/constants';
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

  // 3. 참참참 타이머 루프 (CHAM_INPUT 전용: 2초 카운트다운)
  // * 가위바위보(RPS_INPUT)는 시간제한 없이 자유롭게 고민 후 선택!
  useEffect(() => {
    if (state.phase !== 'CHAM_INPUT') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const duration = GAME_CONFIG.CHAM_LIMIT_MS;
    timerStartRef.current = performance.now();
    timerDurationRef.current = duration;

    // AI 자동 입력 (1P vs CPU 전용: 0.5~1.3초 사이에 참참참 방향 결정)
    let aiTimer: ReturnType<typeof setTimeout> | null = null;
    if (state.p2.isAi) {
      const aiDelay = 500 + Math.random() * 800;
      aiTimer = setTimeout(() => {
        if (stateRef.current.phase === 'CHAM_INPUT') {
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

      // 참참참 2초 카운트다운 종료 시 결과 판정
      if (remainingRatio <= 0) {
        if (stateRef.current.mode !== 'ONLINE_MATCH') {
          if (!stateRef.current.p1.chamDirection) {
            dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p1', direction: getCpuChamDirection() });
          }
          if (!stateRef.current.p2.chamDirection) {
            dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p2', direction: getCpuChamDirection() });
          }
          dispatch({ type: 'RESOLVE_CHAM' });
        } else {
          roomSessionService.resolveChamOnTimeout();
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
  }, [state.phase, state.round, state.mode, state.p2.isAi]);

  // 4. 결과 연출 및 사운드 (RESOLVE & RPS_RESULT)
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

    // 가위바위보 결과 노출 (1.5초간 서로 무엇을 냈는지 확인 후 다음 단계로 전이)
    if (state.phase === 'RPS_RESULT') {
      const isTie = state.lastOutcome === 'TIE';
      const timer = setTimeout(() => {
        if (isTie) {
          dispatch({ type: 'RETRY_RPS_TIE' });
          soundManager.playRPSChant();
          if (state.mode === 'ONLINE_MATCH' && state.online?.myRoleInRoom === 'p1') {
            roomSessionService.startRpsPhase();
          }
        } else {
          dispatch({ type: 'START_CHAM_PHASE' });
          if (state.mode === 'ONLINE_MATCH' && state.online?.myRoleInRoom === 'p1') {
            roomSessionService.startChamPhase();
          }
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [state.phase, state.lastOutcome, state.mode, state.online?.myRoleInRoom]);

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
        if (isOnline) {
          roomSessionService.submitRps(value as RPSChoice);
        } else if (cur.mode === '1P_CPU') {
          // 1P vs CPU: 1P가 고르면 CPU도 즉시 패를 결정하여 동시 판정
          const cpuChoice = getCpuRpsChoice();
          p2SubmittedRef.current = true;
          dispatch({ type: 'SET_RPS_INPUT', playerId: 'p2', choice: cpuChoice });
          dispatch({ type: 'RESOLVE_RPS' });
        } else {
          // 2P_LOCAL: 2P가 이미 선택했다면 즉시 결과 판정
          if (p2SubmittedRef.current) {
            dispatch({ type: 'RESOLVE_RPS' });
          }
        }
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
        if (isOnline) {
          roomSessionService.submitRps(value as RPSChoice);
        } else {
          // 2P_LOCAL: 1P가 이미 선택했다면 즉시 결과 판정
          if (p1SubmittedRef.current) {
            dispatch({ type: 'RESOLVE_RPS' });
          }
        }
      } else if (type === 'cham' && cur.phase === 'CHAM_INPUT') {
        p2SubmittedRef.current = true;
        dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p2', direction: value as ChamDirection });
        if (isOnline) roomSessionService.submitCham(value as ChamDirection);
      }
    },
    []
  );

  // 7. 키보드 바인딩 (WASD 및 방향키 모두 지원)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const cur = stateRef.current;
      const isOnline = cur.mode === 'ONLINE_MATCH';
      const myRole = cur.online?.myRoleInRoom ?? 'p1';

      // 로컬 플레이어 핸들러 선택 (온라인 P2 배정 시 onP2Input, 그 외 1P)
      const submitHandler = isOnline && myRole === 'p2' ? handleP2Input : handleP1Input;

      const code = e.code;
      const key = e.key;

      // 왼쪽: A, ArrowLeft
      if (code === 'KeyA' || key === 'a' || key === 'A' || key === 'ArrowLeft' || code === 'ArrowLeft') {
        if (cur.phase === 'RPS_INPUT') submitHandler('rps', 'SCISSORS');
        else if (cur.phase === 'CHAM_INPUT') submitHandler('cham', 'LEFT');
      }
      // 위쪽: W, ArrowUp
      else if (code === 'KeyW' || key === 'w' || key === 'W' || key === 'ArrowUp' || code === 'ArrowUp') {
        if (cur.phase === 'RPS_INPUT') submitHandler('rps', 'ROCK');
        else if (cur.phase === 'CHAM_INPUT') submitHandler('cham', 'UP');
      }
      // 오른쪽: D, ArrowRight
      else if (code === 'KeyD' || key === 'd' || key === 'D' || key === 'ArrowRight' || code === 'ArrowRight') {
        if (cur.phase === 'RPS_INPUT') submitHandler('rps', 'PAPER');
        else if (cur.phase === 'CHAM_INPUT') submitHandler('cham', 'RIGHT');
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
