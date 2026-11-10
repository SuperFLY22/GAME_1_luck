import React from 'react';
import type { GameMode, GamePhase } from '../../models/types';

interface KeyGuideProps {
  mode: GameMode;
  phase: GamePhase;
}

export const KeyGuide: React.FC<KeyGuideProps> = ({ mode, phase }) => {
  const isRps = phase === 'RPS_INPUT';
  const isCham = phase === 'CHAM_INPUT';

  if (!isRps && !isCham) {
    return null;
  }

  return (
    <div className="hidden sm:flex flex-col items-center gap-2 p-3 bg-slate-900/90 rounded-2xl border-2 border-slate-700 shadow-xl backdrop-blur-sm max-w-xl mx-auto">
      <div className="text-xs font-black text-amber-300 uppercase tracking-widest">
        🎮 키보드 가이드 ({mode === '1P_CPU' ? '1P vs CPU' : '로컬 2P 대전'})
      </div>

      <div className="flex items-center gap-8 text-xs font-bold text-slate-200">
        {/* 1P 조작 안내 */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-sky-400 font-extrabold">{mode === '1P_CPU' ? '1P (또는 방향키)' : '1P (왼쪽 플레이어)'}</span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
              {isRps ? 'A : 가위 ✌️' : 'A : 왼쪽 👈'}
            </span>
            {isRps ? (
              <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
                W : 바위 ✊
              </span>
            ) : (
              <span className="px-2 py-1 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-500 line-through">
                W : 불가
              </span>
            )}
            <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
              {isRps ? 'D : 보 🖐️' : 'D : 오른쪽 👉'}
            </span>
          </div>
        </div>

        {/* 2P 조작 안내 (2P 모드일 때만 표시) */}
        {mode === '2P_LOCAL' && (
          <div className="flex flex-col items-center gap-1 border-l-2 border-slate-700 pl-8">
            <span className="text-rose-400 font-extrabold">2P (오른쪽 플레이어)</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
                {isRps ? '← : 가위 ✌️' : '← : 왼쪽 👈'}
              </span>
              {isRps ? (
                <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
                  ↑ : 바위 ✊
                </span>
              ) : (
                <span className="px-2 py-1 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-500 line-through">
                  ↑ : 불가
                </span>
              )}
              <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
                {isRps ? '→ : 보 🖐️' : '→ : 오른쪽 👉'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
