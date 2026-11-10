import React from 'react';
import { Bot, Globe, Swords, Volume2, VolumeX, Sparkles } from 'lucide-react';
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
      <div className="relative mb-5">
        <div className="text-amber-400 text-xs sm:text-sm font-black tracking-widest uppercase mb-1 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-600 inline-block shadow-md">
          🔥 ULTRA RETRO COMIC ARCADE 🔥
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-rose-600 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] tracking-tight font-comic">
          참! 참! 참!
        </h1>
        <p className="text-slate-400 text-sm sm:text-base font-bold mt-1">
          가위바위보로 공격권을 잡고, 0.8초의 찰나에 뺨을 때려라!
        </p>
      </div>

      {/* 5단계 데미지 코믹 프리뷰 일러스트 */}
      <div className="flex items-center gap-2 sm:gap-4 my-3 p-3 bg-slate-900/80 rounded-2xl border-2 border-slate-800 shadow-xl overflow-x-auto max-w-full">
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

      {/* 실시간 온라인 매칭 메인 추천 버튼 */}
      <div className="w-full max-w-md mt-4">
        <button
          type="button"
          onClick={() => handleStart('ONLINE_MATCH')}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black rounded-2xl border-b-6 border-teal-900 active:border-b-0 active:translate-y-1.5 transition-all shadow-[0_0_25px_rgba(20,184,166,0.35)] group"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-950/40 border border-teal-300/40 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Globe className="w-7 h-7 text-emerald-300 animate-pulse" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black">실시간 온라인 랜덤 매칭</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> LIVE
                </span>
              </div>
              <span className="text-xs text-teal-100 font-medium">대기열 자동 진입 · 접속자 간 무작위 대전</span>
            </div>
          </div>
          <span className="text-xl group-hover:translate-x-1 transition-transform">➡️</span>
        </button>
      </div>

      {/* 로컬 대전 및 CPU 모드 카드 버튼 */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-3">
        <button
          type="button"
          onClick={() => handleStart('1P_CPU')}
          className="flex-1 flex flex-col items-center justify-center gap-1 p-3.5 bg-gradient-to-b from-sky-600 to-blue-800 hover:from-sky-500 hover:to-blue-700 text-white font-black rounded-xl border-b-4 border-blue-950 active:border-b-0 active:translate-y-1 transition-all shadow-lg group"
        >
          <Bot className="w-6 h-6 group-hover:rotate-12 transition-transform text-amber-300" />
          <span className="text-base tracking-wide">1P vs CPU (솔로 연습)</span>
          <span className="text-[11px] text-sky-200 font-medium">인공지능과 1:1 대결</span>
        </button>

        <button
          type="button"
          onClick={() => handleStart('2P_LOCAL')}
          className="flex-1 flex flex-col items-center justify-center gap-1 p-3.5 bg-gradient-to-b from-amber-600 to-rose-800 hover:from-amber-500 hover:to-rose-700 text-white font-black rounded-xl border-b-4 border-rose-950 active:border-b-0 active:translate-y-1 transition-all shadow-lg group"
        >
          <Swords className="w-6 h-6 group-hover:-rotate-12 transition-transform text-yellow-200" />
          <span className="text-base tracking-wide">1P vs 2P (로컬 2인)</span>
          <span className="text-[11px] text-amber-200 font-medium">한 화면에서 2인 플레이</span>
        </button>
      </div>

      <div className="mt-6 text-xs text-slate-500 font-medium">
        5회 피격 시 최종 패배(KO) · 대기열 풀 기반 실시간 무작위 자동 매칭 지원
      </div>
    </div>
  );
};
