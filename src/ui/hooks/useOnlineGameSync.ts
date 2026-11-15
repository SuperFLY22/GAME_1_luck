import { useCallback } from 'react';
import type { GameAction } from '../../core/engine/fsm';
import type { GameEngineState } from '../../models/types';
import type { MatchFoundData } from '../../services/network/matchmakingService';
import { roomSessionService } from '../../services/network/roomSessionService';
import { soundManager } from '../../services/sound/soundManager';

interface UseOnlineGameSyncProps {
  stateRef: React.MutableRefObject<GameEngineState>;
  dispatch: React.Dispatch<GameAction>;
}

export function useOnlineGameSync({
  stateRef,
  dispatch,
}: UseOnlineGameSyncProps) {
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
          isTimeout: res.isTimeout,
        });
      },
      onOpponentLeft: () => {
        dispatch({ type: 'SET_OPPONENT_LEFT' });
      },
    });
  }, [dispatch, stateRef]);

  const leaveOnlineRoom = useCallback(() => {
    roomSessionService.leaveRoom();
  }, []);

  return {
    setupOnlineRoom,
    leaveOnlineRoom,
  };
}
