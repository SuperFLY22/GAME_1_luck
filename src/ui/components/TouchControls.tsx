import React from 'react';
import type { ChamDirection, GameMode, GamePhase, RPSChoice } from '../../models/types';

interface TouchControlsProps {
  mode: GameMode;
  phase: GamePhase;
  myRoleInRoom?: 'p1' | 'p2';
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
  p1ChosenRps,
  p1ChosenCham,
  p2ChosenRps,
  p2ChosenCham,
  onP1Input,
  onP2Input,
}) => {
  const isRps = phase === 'RPS_INPUT';
  const isCham = phase === 'CHAM_INPUT';
  const isLocal2P = mode === '2P_LOCAL';
  const isOnlineP2 = mode === 'ONLINE_MATCH' && myRoleInRoom === 'p2';

  if (!isRps && !isCham) return null;

  const currentRps = isOnlineP2 ? p2ChosenRps : p1ChosenRps;
  const currentCham = isOnlineP2 ? p2ChosenCham : p1ChosenCham;
  const submitHandler = isOnlineP2 ? onP2Input : onP1Input;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-2 flex flex-col gap-3 select-none">
      <div className="text-center sm:hidden text-xs font-black text-amber-300">
        👆 화면 터치 컨트롤러
      </div>

      <div
        className={`grid ${
          isLocal2P ? 'grid-cols-2 gap-4' : 'grid-cols-1 max-w-sm mx-auto w-full'
        }`}
      >
        {/* 단일 플레이어 조작 패드 (1P, CPU, 온라인 대전 공용) */}
        {!isLocal2P ? (
          <div className="flex flex-col items-center gap-2 bg-slate-900/80 p-2.5 rounded-2xl border-2 border-sky-500/50 shadow-lg">
            <div className="text-xs font-black text-sky-400">
              내 조작 패드 {mode === 'ONLINE_MATCH' ? `(${myRoleInRoom.toUpperCase()})` : ''}
            </div>

            {isRps && (
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => submitHandler('rps', 'SCISSORS')}
                  className={`py-3 px-2 font-black rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
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
                  className={`py-3 px-2 font-black rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
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
                  className={`py-3 px-2 font-black rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
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
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={() => submitHandler('cham', 'LEFT')}
                  className={`py-3.5 px-3 font-black text-base rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                    currentCham === 'LEFT'
                      ? 'bg-sky-400 border-sky-600 text-slate-950 scale-105'
                      : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                  }`}
                >
                  👈 왼쪽
                </button>
                <button
                  type="button"
                  onClick={() => submitHandler('cham', 'RIGHT')}
                  className={`py-3.5 px-3 font-black text-base rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                    currentCham === 'RIGHT'
                      ? 'bg-sky-400 border-sky-600 text-slate-950 scale-105'
                      : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                  }`}
                >
                  오른쪽 👉
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 로컬 2인 대전 모드 듀얼 패드 */
          <>
            {/* 1P 컨트롤러 */}
            <div className="flex flex-col items-center gap-2 bg-slate-900/80 p-2.5 rounded-2xl border-2 border-sky-500/50 shadow-lg">
              <div className="text-xs font-black text-sky-400">1P (왼쪽)</div>
              {isRps && (
                <div className="grid grid-cols-3 gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onP1Input('rps', 'SCISSORS')}
                    className={`py-3 px-2 font-black rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                      p1ChosenRps === 'SCISSORS'
                        ? 'bg-amber-400 border-amber-600 text-slate-950 scale-105'
                        : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                    }`}
                  >
                    ✌️ 가위
                  </button>
                  <button
                    type="button"
                    onClick={() => onP1Input('rps', 'ROCK')}
                    className={`py-3 px-2 font-black rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                      p1ChosenRps === 'ROCK'
                        ? 'bg-amber-400 border-amber-600 text-slate-950 scale-105'
                        : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                    }`}
                  >
                    ✊ 바위
                  </button>
                  <button
                    type="button"
                    onClick={() => onP1Input('rps', 'PAPER')}
                    className={`py-3 px-2 font-black rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                      p1ChosenRps === 'PAPER'
                        ? 'bg-amber-400 border-amber-600 text-slate-950 scale-105'
                        : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                    }`}
                  >
                    🖐️ 보
                  </button>
                </div>
              )}
              {isCham && (
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => onP1Input('cham', 'LEFT')}
                    className={`py-3.5 px-3 font-black text-base rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                      p1ChosenCham === 'LEFT'
                        ? 'bg-sky-400 border-sky-600 text-slate-950 scale-105'
                        : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                    }`}
                  >
                    👈 왼쪽
                  </button>
                  <button
                    type="button"
                    onClick={() => onP1Input('cham', 'RIGHT')}
                    className={`py-3.5 px-3 font-black text-base rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                      p1ChosenCham === 'RIGHT'
                        ? 'bg-sky-400 border-sky-600 text-slate-950 scale-105'
                        : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                    }`}
                  >
                    오른쪽 👉
                  </button>
                </div>
              )}
            </div>

            {/* 2P 컨트롤러 */}
            <div className="flex flex-col items-center gap-2 bg-slate-900/80 p-2.5 rounded-2xl border-2 border-rose-500/50 shadow-lg">
              <div className="text-xs font-black text-rose-400">2P (오른쪽)</div>
              {isRps && (
                <div className="grid grid-cols-3 gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onP2Input('rps', 'SCISSORS')}
                    className={`py-3 px-2 font-black rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                      p2ChosenRps === 'SCISSORS'
                        ? 'bg-amber-400 border-amber-600 text-slate-950 scale-105'
                        : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                    }`}
                  >
                    ✌️ 가위
                  </button>
                  <button
                    type="button"
                    onClick={() => onP2Input('rps', 'ROCK')}
                    className={`py-3 px-2 font-black rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                      p2ChosenRps === 'ROCK'
                        ? 'bg-amber-400 border-amber-600 text-slate-950 scale-105'
                        : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                    }`}
                  >
                    ✊ 바위
                  </button>
                  <button
                    type="button"
                    onClick={() => onP2Input('rps', 'PAPER')}
                    className={`py-3 px-2 font-black rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                      p2ChosenRps === 'PAPER'
                        ? 'bg-amber-400 border-amber-600 text-slate-950 scale-105'
                        : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                    }`}
                  >
                    🖐️ 보
                  </button>
                </div>
              )}
              {isCham && (
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    type="button"
                    onClick={() => onP2Input('cham', 'LEFT')}
                    className={`py-3.5 px-3 font-black text-base rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                      p2ChosenCham === 'LEFT'
                        ? 'bg-rose-400 border-rose-600 text-slate-950 scale-105'
                        : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                    }`}
                  >
                    👈 왼쪽
                  </button>
                  <button
                    type="button"
                    onClick={() => onP2Input('cham', 'RIGHT')}
                    className={`py-3.5 px-3 font-black text-base rounded-xl border-b-4 active:border-b-0 active:translate-y-1 transition-all ${
                      p2ChosenCham === 'RIGHT'
                        ? 'bg-rose-400 border-rose-600 text-slate-950 scale-105'
                        : 'bg-slate-800 border-slate-950 text-white hover:bg-slate-700'
                    }`}
                  >
                    오른쪽 👉
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
