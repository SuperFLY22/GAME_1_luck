import React from 'react';
import type { ChamDirection, GameMode, GamePhase, RPSChoice, Role } from '../../models/types';

interface TouchControlsProps {
  mode: GameMode;
  phase: GamePhase;
  myRoleInRoom?: 'p1' | 'p2';
  p1Role?: Role;
  p2Role?: Role;
  p1ChosenRps: RPSChoice;
  p1ChosenCham: ChamDirection;
  p2ChosenRps: RPSChoice;
  p2ChosenCham: ChamDirection;
  onP1Input: (type: 'rps' | 'cham', value: RPSChoice | ChamDirection) => void;
  onP2Input: (type: 'rps' | 'cham', value: RPSChoice | ChamDirection) => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  mode,
  phase,
  myRoleInRoom = 'p1',
  p1Role,
  p2Role,
  p1ChosenRps,
  p1ChosenCham,
  p2ChosenRps,
  p2ChosenCham,
  onP1Input,
  onP2Input,
}) => {
  const isRps = phase === 'RPS_INPUT';
  const isCham = phase === 'CHAM_INPUT';
  const isOnlineP2 = mode === 'ONLINE_MATCH' && myRoleInRoom === 'p2';

  if (!isRps && !isCham) return null;

  const currentRps = isOnlineP2 ? p2ChosenRps : p1ChosenRps;
  const currentCham = isOnlineP2 ? p2ChosenCham : p1ChosenCham;
  const currentRole = isOnlineP2 ? p2Role : p1Role;
  const submitHandler = isOnlineP2 ? onP2Input : onP1Input;

  return (
    <div className="w-full max-w-sm mx-auto px-2 sm:px-4 py-1 sm:py-2 flex flex-col gap-1.5 sm:gap-2.5 select-none">
      <div className="text-center sm:hidden text-[10px] font-black text-amber-300">
        👆 화면 터치 컨트롤러
      </div>

      <div className="flex flex-col items-center gap-1.5 sm:gap-2 bg-slate-900/80 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border-2 border-sky-500/50 shadow-lg">
        <div className={`text-xs font-black flex items-center gap-1.5 ${isOnlineP2 ? 'text-rose-400' : 'text-sky-400'}`}>
          <span>{isOnlineP2 ? '👤 나 (2P)' : '👤 나 (1P)'}</span>
          {mode === 'ONLINE_MATCH' && (
            <span className="text-[10px] text-slate-400 font-mono">({myRoleInRoom.toUpperCase()})</span>
          )}
          {currentRole && currentRole !== 'TIE' && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] border ${
                currentRole === 'ATTACKER'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
              }`}
            >
              {currentRole === 'ATTACKER' ? '💥 공격 중' : '🛡️ 수비 중'}
            </span>
          )}
        </div>

        {isRps && (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
            <button
              type="button"
              onClick={() => submitHandler('rps', 'SCISSORS')}
              className={`py-2.5 sm:py-3 px-1 sm:px-2 text-xs sm:text-base font-black rounded-lg sm:rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                currentRps === 'SCISSORS'
                  ? 'bg-amber-400 border-amber-600 text-slate-950 scale-105'
                  : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
              }`}
            >
              ✌️ 가위
            </button>
            <button
              type="button"
              onClick={() => submitHandler('rps', 'ROCK')}
              className={`py-2.5 sm:py-3 px-1 sm:px-2 text-xs sm:text-base font-black rounded-lg sm:rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                currentRps === 'ROCK'
                  ? 'bg-amber-400 border-amber-600 text-slate-950 scale-105'
                  : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
              }`}
            >
              ✊ 바위
            </button>
            <button
              type="button"
              onClick={() => submitHandler('rps', 'PAPER')}
              className={`py-2.5 sm:py-3 px-1 sm:px-2 text-xs sm:text-base font-black rounded-lg sm:rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                currentRps === 'PAPER'
                  ? 'bg-amber-400 border-amber-600 text-slate-950 scale-105'
                  : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
              }`}
            >
              🖐️ 보
            </button>
          </div>
        )}

        {isCham && (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full">
            <button
              type="button"
              onClick={() => submitHandler('cham', 'LEFT')}
              className={`py-2.5 sm:py-3 px-1 sm:px-1.5 font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                currentCham === 'LEFT'
                  ? 'bg-sky-400 border-sky-600 text-slate-950 scale-105 shadow-md'
                  : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
              }`}
            >
              👈 좌
            </button>
            <button
              type="button"
              onClick={() => submitHandler('cham', 'UP')}
              className={`py-2.5 sm:py-3 px-1 sm:px-1.5 font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                currentCham === 'UP'
                  ? 'bg-amber-400 border-amber-600 text-slate-950 scale-105 shadow-md'
                  : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
              }`}
            >
              👆 상
            </button>
            <button
              type="button"
              onClick={() => submitHandler('cham', 'RIGHT')}
              className={`py-2.5 sm:py-3 px-1 sm:px-1.5 font-black text-xs sm:text-sm rounded-lg sm:rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                currentCham === 'RIGHT'
                  ? 'bg-sky-400 border-sky-600 text-slate-950 scale-105 shadow-md'
                  : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
              }`}
            >
              우 👉
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
