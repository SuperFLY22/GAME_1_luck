import { useCallback, useEffect, useReducer, useRef } from 'react';
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
import { soundManager } from '../../services/sound/soundManager';

export function useGameLoop() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState('1P_CPU')
  );

  // 현재 상태 최신 레퍼런스 유지 (이벤트 핸들러 내 클로저 분리)
  const stateRef = useRef(state);
  stateRef.current = state;

  // 1P / 2P 입력 래칭 플래그 (키 반복 입력 누수 방지)
  const p1SubmittedRef = useRef(false);
  const p2SubmittedRef = useRef(false);

  // 타이머 참조
  const timerStartRef = useRef<number>(0);
  const timerDurationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // 단계 초기화 시 입력 플래그 리셋
  useEffect(() => {
    p1SubmittedRef.current = false;
    p2SubmittedRef.current = false;
  }, [state.phase]);

  // 1. 카운트다운 루프 (READY 단계)
  useEffect(() => {
    if (state.phase !== 'READY') return;

    soundManager.playCountdown(state.countdown === 1);

    const timer = setTimeout(() => {
      if (state.countdown > 1) {
        dispatch({ type: 'TICK_COUNTDOWN', countdown: state.countdown - 1 });
      } else {
        dispatch({ type: 'START_RPS' });
        soundManager.playRPSChant();
      }
    }, GAME_CONFIG.COUNTDOWN_STEP_MS);

    return () => clearTimeout(timer);
  }, [state.phase, state.countdown]);

  // 2. 가위바위보 및 참참참 정밀 타이머 루프 (requestAnimationFrame)
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

    // AI 자동 입력 예약
    let aiTimer: ReturnType<typeof setTimeout> | null = null;
    if (state.p2.isAi) {
      const aiDelay = state.phase === 'RPS_INPUT' ? 400 + Math.random() * 400 : 200 + Math.random() * 200;
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

      // 조기 판정: 두 플레이어가 모두 입력 완료했는지 확인
      const bothInputted =
        p1SubmittedRef.current &&
        (stateRef.current.p2.isAi ? p2SubmittedRef.current : p2SubmittedRef.current);

      if (remainingRatio <= 0 || bothInputted) {
        if (stateRef.current.phase === 'RPS_INPUT') {
          dispatch({ type: 'RESOLVE_RPS' });
        } else if (stateRef.current.phase === 'CHAM_INPUT') {
          dispatch({ type: 'RESOLVE_CHAM' });
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
  }, [state.phase]);

  // 3. 무승부 재시도 및 결과 판정 딜레이 (RESOLVE & TIE)
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

  // 4. BGM 및 클라이맥스(매치 포인트) 제어
  useEffect(() => {
    if (state.phase === 'TITLE') {
      soundManager.stopBgm();
      return;
    }
    if (state.phase === 'GAME_OVER') {
      soundManager.stopBgm();
      return;
    }
    const isMatchPoint = state.p1.damage >= 4 || state.p2.damage >= 4;
    soundManager.playBgm(isMatchPoint);
  }, [state.phase, state.p1.damage, state.p2.damage]);

  // 4. 입력 핸들러 (UI 버튼 / 터치 / 키보드 공용)
  const handleP1Input = useCallback((type: 'rps' | 'cham', value: RPSChoice | ChamDirection) => {
    if (type === 'rps' && stateRef.current.phase === 'RPS_INPUT') {
      if (p1SubmittedRef.current) return;
      p1SubmittedRef.current = true;
      dispatch({ type: 'SET_RPS_INPUT', playerId: 'p1', choice: value as RPSChoice });
    } else if (type === 'cham' && stateRef.current.phase === 'CHAM_INPUT') {
      if (p1SubmittedRef.current) return;
      p1SubmittedRef.current = true;
      dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p1', direction: value as ChamDirection });
    }
  }, []);

  const handleP2Input = useCallback((type: 'rps' | 'cham', value: RPSChoice | ChamDirection) => {
    if (type === 'rps' && stateRef.current.phase === 'RPS_INPUT') {
      if (p2SubmittedRef.current) return;
      p2SubmittedRef.current = true;
      dispatch({ type: 'SET_RPS_INPUT', playerId: 'p2', choice: value as RPSChoice });
    } else if (type === 'cham' && stateRef.current.phase === 'CHAM_INPUT') {
      if (p2SubmittedRef.current) return;
      p2SubmittedRef.current = true;
      dispatch({ type: 'SET_CHAM_INPUT', playerId: 'p2', direction: value as ChamDirection });
    }
  }, []);

  // 5. 키보드 이벤트 리스너 바인딩
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // OS 키 반복 방지

      const cur = stateRef.current;
      const isSolo = cur.mode === '1P_CPU';

      // 1P 조작 확인
      const p1Bindings = isSolo ? KEY_BINDINGS.SOLO_P1 : KEY_BINDINGS.P1_LOCAL;
      const p1Left = p1Bindings.LEFT as readonly string[];
      const p1Up = p1Bindings.UP as readonly string[];
      const p1Right = p1Bindings.RIGHT as readonly string[];

      if (p1Left.includes(e.code) || p1Left.includes(e.key)) {
        if (cur.phase === 'RPS_INPUT') handleP1Input('rps', 'SCISSORS');
        else if (cur.phase === 'CHAM_INPUT') handleP1Input('cham', 'LEFT');
      } else if (p1Up.includes(e.code) || p1Up.includes(e.key)) {
        if (cur.phase === 'RPS_INPUT') handleP1Input('rps', 'ROCK');
        // 참참참 단계에서는 상 키 무시
      } else if (p1Right.includes(e.code) || p1Right.includes(e.key)) {
        if (cur.phase === 'RPS_INPUT') handleP1Input('rps', 'PAPER');
        else if (cur.phase === 'CHAM_INPUT') handleP1Input('cham', 'RIGHT');
      }

      // 2P 로컬 조작 확인 (2P 대전 모드일 때만 활성)
      if (!isSolo) {
        const p2Bindings = KEY_BINDINGS.P2_LOCAL;
        const p2Left = p2Bindings.LEFT as readonly string[];
        const p2Up = p2Bindings.UP as readonly string[];
        const p2Right = p2Bindings.RIGHT as readonly string[];

        if (p2Left.includes(e.code) || p2Left.includes(e.key)) {
          if (cur.phase === 'RPS_INPUT') handleP2Input('rps', 'SCISSORS');
          else if (cur.phase === 'CHAM_INPUT') handleP2Input('cham', 'LEFT');
        } else if (p2Up.includes(e.code) || p2Up.includes(e.key)) {
          if (cur.phase === 'RPS_INPUT') handleP2Input('rps', 'ROCK');
        } else if (p2Right.includes(e.code) || p2Right.includes(e.key)) {
          if (cur.phase === 'RPS_INPUT') handleP2Input('rps', 'PAPER');
          else if (cur.phase === 'CHAM_INPUT') handleP2Input('cham', 'RIGHT');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleP1Input, handleP2Input]);

  return {
    state,
    startGame: (mode: GameMode) => dispatch({ type: 'START_GAME', mode }),
    restartGame: () => dispatch({ type: 'START_GAME', mode: state.mode }),
    goToTitle: () => dispatch({ type: 'RESET_TO_TITLE' }),
    handleP1Input,
    handleP2Input,
  };
}
