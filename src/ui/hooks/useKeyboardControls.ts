import { useEffect } from 'react';
import type { ChamDirection, GameEngineState, RPSChoice } from '../../models/types';

interface UseKeyboardControlsProps {
  stateRef: React.MutableRefObject<GameEngineState>;
  onP1Input: (type: 'rps' | 'cham', value: RPSChoice | ChamDirection) => void;
  onP2Input: (type: 'rps' | 'cham', value: RPSChoice | ChamDirection) => void;
}

/**
 * 전역 키보드 조작 이벤트 리스너 훅 (WASD 및 방향키 지원)
 * - RPS 단계: A(가위 ✌️), W(바위 ✊), D(보 🖐️)
 * - 참참참 단계: A(왼쪽 👈), W(위쪽 👆), D(오른쪽 👉)
 * - 온라인 P2 배정 시 onP2Input으로 자동 라우팅, 그 외 onP1Input
 */
export function useKeyboardControls({
  stateRef,
  onP1Input,
  onP2Input,
}: UseKeyboardControlsProps): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const cur = stateRef.current;
      const isOnline = cur.mode === 'ONLINE_MATCH';
      const myRole = cur.online?.myRoleInRoom ?? 'p1';

      // 로컬 플레이어 핸들러 선택 (온라인 P2 배정 시 onP2Input, 그 외 1P)
      const submitHandler = isOnline && myRole === 'p2' ? onP2Input : onP1Input;

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
  }, [stateRef, onP1Input, onP2Input]);
}
