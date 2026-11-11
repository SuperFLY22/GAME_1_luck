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
import { useKeyboardControls } from './useKeyboardControls';

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
        // 참참참 실시간 턴 개시 (RPS 직후 또는 ROLE_SWAP / RESOLVE 후 CHAM_INPUT 단계로 전이)
        const curPhase = stateRef.current.phase;
        if (curPhase === 'ROLE_SWAP' || curPhase === 'RESOLVE') {
          dispatch({ type: 'START_NEXT_CHAM' });
        } else {
          dispatch({ type: 'START_CHAM_PHASE' });
        }
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

  // 3. 참참참 타이머 루프 (CHAM_INPUT 전용: 3초 카운트다운)
  // * 패널티: 공격자가 3초 안에 선택하지 않으면 공격 실패 및 공수 전환!
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
    let resolveTimer: ReturnType<typeof setTimeout> | null = null;
    if (state.p2.isAi) {
      const aiDelay = 500 + Math.random() * 800;
      aiTimer = setTimeout(() => {
        if (stateRef.current.phase === 'CHAM_INPUT') {
          const cpuDir = getCpuChamDirection();
          p2SubmittedRef.current = true;
          dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p2', direction: cpuDir });

          // 1P 플레이어가 이미 참참참 방향을 선택했다면 3초를 기다리지 않고 즉시 판정!
          if (p1SubmittedRef.current || Boolean(stateRef.current.p1.chamDirection)) {
            resolveTimer = setTimeout(() => {
              if (stateRef.current.phase === 'CHAM_INPUT') {
                dispatch({ type: 'RESOLVE_CHAM' });
              }
            }, 100);
          }
        }
      }, aiDelay);
    }

    const tick = (now: number) => {
      const elapsed = now - timerStartRef.current;
      const remainingRatio = Math.max(0, 1 - elapsed / timerDurationRef.current);

      dispatch({ type: 'UPDATE_TIMER', ratio: remainingRatio });

      // 참참참 3초 카운트다운 종료 시 결과 판정
      if (remainingRatio <= 0) {
        if (stateRef.current.mode !== 'ONLINE_MATCH') {
          // 공격자가 3초 안에 안 골랐으면 그대로 null 상태로 판정 -> 공격자 타임아웃 패널티(공수 전환) 발동
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
      if (resolveTimer) clearTimeout(resolveTimer);
    };
  }, [state.phase, state.round, state.mode, state.p2.isAi]);

  // 4. 결과 연출 및 사운드 (RESOLVE, ROLE_SWAP & RPS_RESULT)
  useEffect(() => {
    if (state.phase === 'RESOLVE') {
      if (state.lastOutcome === 'HIT') {
        soundManager.playHit();
      } else if (state.lastOutcome === 'DODGE') {
        soundManager.playDodge();
      }

      const timer = setTimeout(() => {
        dispatch({ type: 'CHECK_ROUND_RESULT' });
        if (state.mode === 'ONLINE_MATCH' && state.online?.myRoleInRoom === 'p1') {
          // 공격 성공(HIT)이고 게임 오버가 아닐 때 다음 참참참 시작 신호 브로드캐스트
          if (state.lastOutcome === 'HIT' && state.p1.damage < 5 && state.p2.damage < 5) {
            roomSessionService.startChamPhase();
          }
        }
      }, GAME_CONFIG.RESOLVE_DISPLAY_MS);

      return () => clearTimeout(timer);
    }

    // 공수 전환 인지 Pause 단계 (1.5초간 공수 전환을 확실히 인지 후 다음 라운드 시작)
    if (state.phase === 'ROLE_SWAP') {
      soundManager.playRPSChant();
      const timer = setTimeout(() => {
        dispatch({ type: 'START_NEXT_CHAM' });
        if (state.mode === 'ONLINE_MATCH' && state.online?.myRoleInRoom === 'p1') {
          roomSessionService.startChamPhase();
        }
      }, GAME_CONFIG.ROLE_SWAP_PAUSE_MS);

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
        if (p1SubmittedRef.current) return;
        p1SubmittedRef.current = true;
        dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p1', direction: value as ChamDirection });
        if (isOnline) {
          roomSessionService.submitCham(value as ChamDirection);
        } else {
          // 1P vs CPU: 상대방(CPU)이 이미 선택했다면 3초를 기다리지 않고 즉시 판정!
          if (p2SubmittedRef.current || Boolean(cur.p2.chamDirection)) {
            setTimeout(() => {
              if (stateRef.current.phase === 'CHAM_INPUT') {
                dispatch({ type: 'RESOLVE_CHAM' });
              }
            }, 100);
          }
        }
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
        if (p2SubmittedRef.current) return;
        p2SubmittedRef.current = true;
        dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p2', direction: value as ChamDirection });
        if (isOnline) {
          roomSessionService.submitCham(value as ChamDirection);
        } else {
          // 상대방(P1)이 이미 선택했다면 3초를 기다리지 않고 즉시 판정!
          if (p1SubmittedRef.current || Boolean(cur.p1.chamDirection)) {
            setTimeout(() => {
              if (stateRef.current.phase === 'CHAM_INPUT') {
                dispatch({ type: 'RESOLVE_CHAM' });
              }
            }, 100);
          }
        }
      }
    },
    []
  );

  // 7. 키보드 바인딩 (전용 훅으로 분리)
  useKeyboardControls({
    stateRef,
    onP1Input: handleP1Input,
    onP2Input: handleP2Input,
  });

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
