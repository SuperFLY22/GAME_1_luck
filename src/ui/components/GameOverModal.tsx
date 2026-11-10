import React, { useEffect } from 'react';
import { RotateCcw, Trophy, Home, Users } from 'lucide-react';
import type { GameEngineState } from '../../models/types';
import { fireVictoryConfetti } from '../../utils/confetti';
import { soundManager } from '../../services/sound/soundManager';

interface GameOverModalProps {
  state: GameEngineState;
  onRestart: () => void;
  onGoTitle: () => void;
  onFindNewMatch?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  state,
  onRestart,
  onGoTitle,
  onFindNewMatch,
}) => {
  const winner = state.winner === 'p1' ? state.p1 : state.p2;
  const loser = state.winner === 'p1' ? state.p2 : state.p1;
  const isP1Win = state.winner === 'p1';
  const isOnline = state.mode === 'ONLINE_MATCH';
  const opponentLeft = state.online?.opponentLeft;

  useEffect(() => {
    soundManager.playVictory();
    fireVictoryConfetti();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-4 border-amber-500 rounded-3xl p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center">
        {/* 트로피 아이콘 */}
        <div className="w-20 h-20 rounded-full bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center -mt-14 mb-3 shadow-lg">
          <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
        </div>

        <div className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-600 mb-2">
          K.O. MATCH DECIDED!
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white font-comic drop-shadow-md">
          {winner.name} 완승!
        </h2>

        <p className="text-rose-400 font-bold text-sm mt-1">
          {loser.name} 피격 5회 누적으로 백기 항복!
        </p>

        {opponentLeft && (
          <div className="mt-2 px-3 py-1 bg-rose-950/80 border border-rose-500 rounded-xl text-xs font-black text-rose-300 animate-pulse">
            ⚠️ 상대방이 퇴장했습니다. 대기 중인 새 도전자와 매칭하세요!
          </div>
        )}

        {/* 결과 스탯 요약 박스 */}
        <div className="w-full bg-slate-800/80 rounded-2xl p-4 my-5 border-2 border-slate-700 flex justify-around items-center">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-sky-400">{state.p1.name}</span>
            <span className="text-2xl font-black text-white">피격 {state.p1.damage}회</span>
            <span className="text-xs text-slate-400">{isP1Win ? '👑 WINNER' : '🏳️ LOSE'}</span>
          </div>

          <div className="h-10 w-0.5 bg-slate-700" />

          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-rose-400">{state.p2.name}</span>
            <span className="text-2xl font-black text-white">피격 {state.p2.damage}회</span>
            <span className="text-xs text-slate-400">{!isP1Win ? '👑 WINNER' : '🏳️ LOSE'}</span>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex flex-col gap-2.5 w-full">
          {isOnline ? (
            <button
              type="button"
              onClick={onFindNewMatch}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl border-b-4 border-teal-800 active:border-b-0 active:translate-y-1 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              대기 중인 새 상대와 랜덤 매칭!
            </button>
          ) : (
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-3.5 px-4 bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              한 판 더!
            </button>
          )}

          <button
            type="button"
            onClick={onGoTitle}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border-2 border-slate-600 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            메인 메뉴로 이동
          </button>
        </div>
      </div>
    </div>
  );
};
