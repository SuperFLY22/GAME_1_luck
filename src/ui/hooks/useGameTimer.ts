import { useEffect, useRef } from 'react';
import { GAME_CONFIG } from '../../config/constants';
import type { GameAction } from '../../core/engine/fsm';
import { getCpuChamDirection } from '../../core/engine/rules';
import type { GameEngineState } from '../../models/types';
import { roomSessionService } from '../../services/network/roomSessionService';
import { soundManager } from '../../services/sound/soundManager';

interface UseGameTimerProps {
  state: GameEngineState;
  stateRef: React.MutableRefObject<GameEngineState>;
  dispatch: React.Dispatch<GameAction>;
  p1SubmittedRef: React.MutableRefObject<boolean>;
  p2SubmittedRef: React.MutableRefObject<boolean>;
}

export function useGameTimer({
  state,
  stateRef,
  dispatch,
  p1SubmittedRef,
  p2SubmittedRef,
}: UseGameTimerProps): void {
  const timerStartRef = useRef<number>(0);
  const timerDurationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const isOnlineP1 =
    state.mode === 'ONLINE_MATCH' && state.online?.myRoleInRoom === 'p1';

  // 1. 카운트다운 루프 (READY 단계: 3, 2, 1)
  useEffect(() => {
    if (state.phase !== 'READY') return;

    soundManager.playCountdown(state.countdown === 1);

    const timer = setTimeout(() => {
      if (state.countdown > 1) {
        dispatch({ type: 'TICK_COUNTDOWN', countdown: state.countdown - 1 });
      } else {
        dispatch({ type: 'START_RPS' });
        soundManager.playRPSChant();
        if (isOnlineP1) {
          roomSessionService.startRpsPhase();
        }
      }
    }, GAME_CONFIG.COUNTDOWN_STEP_MS);

    return () => clearTimeout(timer);
  }, [state.phase, state.countdown, isOnlineP1, dispatch]);

  // 2. 참참참 카운트다운 루프 (CHAM_INPUT: 3초 카운트다운 및 AI 스케줄러)
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

          // 1P 플레이어가 이미 참참참 방향을 선택했다면 3초를 기다리지 않고 즉시 판정
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
  }, [
    state.phase,
    state.round,
    state.mode,
    state.p2.isAi,
    dispatch,
    stateRef,
    p1SubmittedRef,
    p2SubmittedRef,
  ]);

  // 3. 결과 연출 및 사운드 (RESOLVE, ROLE_SWAP, RPS_RESULT)
  useEffect(() => {
    if (state.phase === 'RESOLVE') {
      if (state.lastOutcome === 'HIT') {
        soundManager.playHit();
      } else if (state.lastOutcome === 'DODGE') {
        soundManager.playDodge();
      }

      // 마지막 5번째 일격일 땐 컷씬(hit_impact.mp4) 재생 완료 후 결과 화면으로 전환
      const isFinalHit =
        state.lastOutcome === 'HIT' && (state.p1.damage >= 5 || state.p2.damage >= 5);
      const displayMs = isFinalHit ? 3500 : 2300;

      const timer = setTimeout(() => {
        dispatch({ type: 'CHECK_ROUND_RESULT' });
        if (isOnlineP1) {
          // 공격 성공(HIT)이고 게임 오버가 아닐 때 다음 참참참 시작 신호 브로드캐스트
          if (state.lastOutcome === 'HIT' && state.p1.damage < 5 && state.p2.damage < 5) {
            roomSessionService.startChamPhase();
          }
        }
      }, displayMs);

      return () => clearTimeout(timer);
    }

    // 공수 전환 인지 Pause 단계 (1.5초간 공수 전환 인지 후 다음 라운드 시작)
    if (state.phase === 'ROLE_SWAP') {
      soundManager.playRPSChant();
      const timer = setTimeout(() => {
        dispatch({ type: 'START_NEXT_CHAM' });
        if (isOnlineP1) {
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
          if (isOnlineP1) {
            roomSessionService.startRpsPhase();
          }
        } else {
          dispatch({ type: 'START_CHAM_PHASE' });
          if (isOnlineP1) {
            roomSessionService.startChamPhase();
          }
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [
    state.phase,
    state.lastOutcome,
    state.p1.damage,
    state.p2.damage,
    isOnlineP1,
    dispatch,
  ]);

  // 4. BGM 제어
  useEffect(() => {
    if (
      state.phase === 'TITLE' ||
      state.phase === 'LOBBY' ||
      state.phase === 'GAME_OVER'
    ) {
      soundManager.stopBgm();
      return;
    }
    const isMatchPoint = state.p1.damage >= 4 || state.p2.damage >= 4;
    soundManager.playBgm(isMatchPoint);
  }, [state.phase, state.p1.damage, state.p2.damage]);
}
