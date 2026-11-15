import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  createInitialState,
  gameReducer,
} from '../../core/engine/fsm';
import { getCpuRpsChoice } from '../../core/engine/rules';
import type {
  ChamDirection,
  GameMode,
  RPSChoice,
} from '../../models/types';
import { matchmakingService } from '../../services/network/matchmakingService';
import { roomSessionService } from '../../services/network/roomSessionService';
import { useGameTimer } from './useGameTimer';
import { useKeyboardControls } from './useKeyboardControls';
import { useOnlineGameSync } from './useOnlineGameSync';

export function useGameLoop() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState('1P_CPU')
  );

  // [L-2 Fix]: 대기실 참가 중에만 유효한 대기자 통계 상태 (초기값 0)
  const [waitingCount, setWaitingCount] = useState(0);
  const [waitingNames, setWaitingNames] = useState<string[]>([]);
  // 첫 화면(TITLE)용 실시간 로비 대기 인원 수
  const [titleWaitingCount, setTitleWaitingCount] = useState<number>(0);

  useEffect(() => {
    // 실시간 대기 인원 통계 구독
    const unsubscribe = matchmakingService.subscribeQueueStats((count) => {
      setTitleWaitingCount(count);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // 현재 상태 최신 레퍼런스 유지
  const stateRef = useRef(state);
  stateRef.current = state;

  const p1SubmittedRef = useRef(false);
  const p2SubmittedRef = useRef(false);

  useEffect(() => {
    p1SubmittedRef.current = false;
    p2SubmittedRef.current = false;
  }, [state.phase, state.round]);

  // [M-1/H-2]: 온라인 룸 세션 이벤트 동기화 서브훅
  const { setupOnlineRoom, leaveOnlineRoom } = useOnlineGameSync({
    stateRef,
    dispatch,
  });

  // [M-1]: 게임 카운트다운/타이머/BGM/단계 전환 서브훅
  useGameTimer({
    state,
    stateRef,
    dispatch,
    p1SubmittedRef,
    p2SubmittedRef,
  });

  // 1. 입력 핸들러 (온라인 룸 세션 자동 연동)
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

  // 2. 키보드 바인딩 (전용 훅으로 분리)
  useKeyboardControls({
    stateRef,
    onP1Input: handleP1Input,
    onP2Input: handleP2Input,
  });

  // 3. 모드별 시작 함수
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
    leaveOnlineRoom();
    dispatch({ type: 'ENTER_LOBBY' });
    matchmakingService.reEnterQueue();
  };

  const goToTitle = () => {
    leaveOnlineRoom();
    matchmakingService.leaveQueue();
    dispatch({ type: 'RESET_TO_TITLE' });
  };

  return {
    state,
    waitingCount,
    waitingNames,
    titleWaitingCount,
    startGame,
    restartGame: () => dispatch({ type: 'START_GAME', mode: state.mode }),
    findNewOnlineMatch,
    goToTitle,
    handleP1Input,
    handleP2Input,
  };
}
