import React from 'react';
import { Bot, Swords, Volume2, VolumeX } from 'lucide-react';
import type { GameMode } from '../../models/types';
import { soundManager } from '../../services/sound/soundManager';

interface TitleScreenProps {
  onStartGame: (mode: GameMode) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  isMuted,
  onToggleMute,
}) => {
  const handleStart = (mode: GameMode) => {
    soundManager.getContext(); // 브라우저 AudioContext 언락
    soundManager.playCountdown(true);
    onStartGame(mode);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 text-center select-none">
      {/* 음소거 토글 버튼 */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={onToggleMute}
          className="p-2.5 bg-slate-900 border-2 border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors shadow-lg"
          title={isMuted ? '소리 켜기' : '음소거'}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>
      </div>

      {/* 로고 & 타이틀 */}
      <div className="relative mb-6">
        <div className="text-amber-400 text-xs sm:text-sm font-black tracking-widest uppercase mb-1 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-600 inline-block shadow-md">
          🔥 ULTRA RETRO COMIC ARCADE 🔥
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-rose-600 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] tracking-tight font-comic">
          참! 참! 참!
        </h1>
        <p className="text-slate-400 text-sm sm:text-base font-bold mt-2">
          가위바위보로 공격권을 잡고, 0.8초의 찰나에 뺨을 때려라!
        </p>
      </div>

      {/* 5단계 데미지 코믹 프리뷰 일러스트 */}
      <div className="flex items-center gap-2 sm:gap-4 my-4 p-3 bg-slate-900/80 rounded-2xl border-2 border-slate-800 shadow-xl overflow-x-auto max-w-full">
        {['0단계: 멀쩡', '1단계: 멍', '2단계: 밤탱이', '3단계: 코피', '4단계: 퉁퉁', '5단계: KO'].map(
          (text, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center text-[10px] sm:text-xs font-bold text-slate-400"
            >
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black border-2 ${
                  idx === 0
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : idx === 5
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                    : 'bg-amber-500/20 border-amber-500 text-amber-300'
                }`}
              >
                {idx === 5 ? '💀' : idx}
              </div>
              <span className="mt-1 whitespace-nowrap">{text}</span>
            </div>
          )
        )}
      </div>

      {/* 모드 선택 카드 버튼 */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-6">
        <button
          type="button"
          onClick={() => handleStart('1P_CPU')}
          className="flex-1 flex flex-col items-center justify-center gap-2 p-5 bg-gradient-to-b from-sky-500 to-blue-700 hover:from-sky-400 hover:to-blue-600 text-white font-black rounded-2xl border-b-6 border-blue-900 active:border-b-0 active:translate-y-1.5 transition-all shadow-xl group"
        >
          <Bot className="w-10 h-10 group-hover:rotate-12 transition-transform text-amber-300" />
          <span className="text-xl tracking-wide">1P vs CPU (추천)</span>
          <span className="text-xs text-sky-200 font-medium">인공지능 알파참과 1:1 대결</span>
        </button>

        <button
          type="button"
          onClick={() => handleStart('2P_LOCAL')}
          className="flex-1 flex flex-col items-center justify-center gap-2 p-5 bg-gradient-to-b from-amber-500 to-rose-700 hover:from-amber-400 hover:to-rose-600 text-white font-black rounded-2xl border-b-6 border-rose-950 active:border-b-0 active:translate-y-1.5 transition-all shadow-xl group"
        >
          <Swords className="w-10 h-10 group-hover:-rotate-12 transition-transform text-yellow-200" />
          <span className="text-xl tracking-wide">1P vs 2P 로컬 대전</span>
          <span className="text-xs text-amber-200 font-medium">한 키보드/화면에서 2인 승부</span>
        </button>
      </div>

      <div className="mt-8 text-xs text-slate-500 font-medium">
        5회 피격 시 최종 패배(KO) · 외부 에셋 자동 감지 및 SVG 완벽 폴백 지원
      </div>
    </div>
  );
};
