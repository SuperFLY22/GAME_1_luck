import React from 'react';
import { Bot, Globe, Volume2, VolumeX, Sparkles, Languages, Users } from 'lucide-react';
import type { GameMode } from '../../models/types';
import { soundManager } from '../../services/sound/soundManager';
import { useLanguage } from '../context/LanguageContext';
import { GuestbookTicker } from './GuestbookTicker';

interface TitleScreenProps {
  onStartGame: (mode: GameMode) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  waitingCount?: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  isMuted,
  onToggleMute,
  waitingCount = 0,
}) => {
  const { language, toggleLanguage, t } = useLanguage();

  const handleStart = (mode: GameMode) => {
    soundManager.getContext(); // 브라우저 AudioContext 언락
    soundManager.playCountdown(true);
    onStartGame(mode);
  };

  const damageSteps = [
    t('damage_step_0'),
    t('damage_step_1'),
    t('damage_step_2'),
    t('damage_step_3'),
    t('damage_step_4'),
    t('damage_step_5'),
  ];

  return (
    <div className="w-full max-w-lg mx-auto py-4 sm:py-8 px-4 flex flex-col items-center justify-center text-center select-none relative">
      {/* 우측 상단 유틸리티 바: 언어 전환 토글 & 음소거 토글 */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* 언어 변경 버튼 (KO / EN) */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 border-2 border-amber-500/70 hover:border-amber-400 rounded-xl text-amber-300 hover:text-amber-200 transition-all shadow-lg active:scale-95 group font-pixel text-xs font-black tracking-wider"
          title="Switch Language (한국어 / English)"
        >
          <Languages className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span>{language === 'ko' ? 'EN' : '한국어'}</span>
        </button>

        {/* 음소거 토글 버튼 */}
        <button
          type="button"
          onClick={onToggleMute}
          className="p-2.5 bg-slate-900/90 border-2 border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors shadow-lg active:scale-95"
          title={isMuted ? t('mute_sound_on') : t('mute_sound_off')}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>
      </div>

      {/* 로고 & 타이틀 */}
      <div className="relative mb-3 sm:mb-5 mt-6 sm:mt-2">
        <div className="text-amber-400 text-xs sm:text-sm font-black tracking-widest uppercase mb-1 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-600 inline-block shadow-md">
          {t('title_badge')}
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-rose-600 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] tracking-tight font-comic">
          {t('title_main')}
        </h1>
        <p className="text-slate-400 text-sm sm:text-base font-bold mt-1">
          {t('title_sub')}
        </p>
      </div>

      {/* 5단계 데미지 코믹 프리뷰 일러스트 */}
      <div className="flex items-center gap-2 sm:gap-4 my-3 p-3 bg-slate-900/80 rounded-2xl border-2 border-slate-800 shadow-xl overflow-x-auto max-w-full">
        {damageSteps.map((text, idx) => (
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
        ))}
      </div>

      {/* 실시간 방명록 전광판 티커 */}
      <GuestbookTicker />

      {/* 모드 선택 카드 영역: 온라인 매칭(메인) & AI 연습(테스트) */}
      <div className="w-full max-w-md flex flex-col gap-3 mt-4">
        {/* 1. 실시간 온라인 매칭 (메인 모드) - 실시간 대기자 수 뱃지 표시 */}
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-lg sm:text-xl font-black">{t('mode_online_title')}</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shadow-sm">
                  <Sparkles className="w-2.5 h-2.5" /> {t('mode_online_badge')}
                </span>
              </div>
              <div className="text-xs text-teal-100 font-medium">
                {t('mode_online_desc')}
              </div>
              {/* 실시간 대기 인원 수 표시 */}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-black bg-slate-950/80 text-emerald-300 border border-emerald-400/60 px-2.5 py-0.5 rounded-full shadow-inner">
                  <Users className="w-3 h-3 text-emerald-400 animate-pulse" />
                  {t('mode_online_waiting', { count: waitingCount })}
                </span>
              </div>
            </div>
          </div>
          <span className="text-xl group-hover:translate-x-1 transition-transform ml-2">➡️</span>
        </button>

        {/* 2. AI 대전 모드 (테스트 & 솔로 연습) */}
        <button
          type="button"
          onClick={() => handleStart('1P_CPU')}
          className="w-full flex items-center justify-between p-3.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-black rounded-2xl border-2 border-slate-700 hover:border-sky-500/50 active:translate-y-0.5 transition-all shadow-lg group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950/60 border border-sky-400/40 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Bot className="w-6 h-6 text-sky-400" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-100">{t('mode_cpu_title')}</span>
                <span className="text-[10px] bg-sky-900 text-sky-200 border border-sky-700 px-1.5 py-0.2 rounded font-bold">
                  {t('mode_cpu_badge')}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">{t('mode_cpu_desc')}</span>
            </div>
          </div>
          <span className="text-sm font-bold text-slate-400 group-hover:text-sky-300 transition-colors">
            {t('mode_cpu_start')}
          </span>
        </button>
      </div>

      <div className="mt-6 text-xs text-slate-500 font-medium max-w-sm">
        {t('footer_info')}
      </div>
    </div>
  );
};
