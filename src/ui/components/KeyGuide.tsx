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
    <div className="hidden sm:flex flex-col items-center gap-2 p-3 bg-slate-900/90 rounded-2xl border-2 border-slate-700 shadow-xl backdrop-blur-sm max-w-xl mx-auto select-none">
      <div className="text-xs font-black text-amber-300 uppercase tracking-widest">
        🎮 키보드 가이드 ({mode === 'ONLINE_MATCH' ? '실시간 온라인 대전' : 'AI 솔로 대전'})
      </div>

      <div className="flex items-center gap-8 text-xs font-bold text-slate-200">
        <div className="flex flex-col items-center gap-1">
          <span className="text-sky-400 font-extrabold">내 입력 (WASD 또는 방향키 지원)</span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
              {isRps ? 'A 또는 ← : 가위 ✌️' : 'A 또는 ← : 왼쪽 👈'}
            </span>
            <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
              {isRps ? 'W 또는 ↑ : 바위 ✊' : 'W 또는 ↑ : 위쪽 👆'}
            </span>
            <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
              {isRps ? 'D 또는 → : 보 🖐️' : 'D 또는 → : 오른쪽 👉'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
