import React, { useState } from 'react';
import { ArrowLeft, Loader2, Users, Edit2, Check, Zap } from 'lucide-react';
import { matchmakingService } from '../../services/network/matchmakingService';
import { useLanguage } from '../context/LanguageContext';
import { GuestbookTicker } from './GuestbookTicker';

interface LobbyScreenProps {
  waitingCount: number;
  waitingNames: string[];
  onCancel: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  waitingCount,
  waitingNames,
  onCancel,
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState(matchmakingService.getMyName());
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveName = () => {
    matchmakingService.setMyName(name);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 text-center select-none animate-fadeIn">
      {/* 뒤로 가기 버튼 */}
      <div className="absolute top-4 left-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border-2 border-slate-700 hover:border-slate-500 rounded-xl text-slate-300 hover:text-white transition-colors shadow-lg active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold">{t('lobby_leave')}</span>
        </button>
      </div>

      {/* 헤더 배지 */}
      <div className="text-amber-400 text-xs font-black tracking-widest uppercase mb-3 bg-amber-950/80 px-3.5 py-1 rounded-full border border-amber-600 inline-flex items-center gap-1.5 shadow-md">
        <Zap className="w-3.5 h-3.5 animate-bounce" />
        {t('lobby_badge')}
      </div>

      <h2 className="text-3xl sm:text-5xl font-black text-white font-comic drop-shadow-lg tracking-tight mb-2">
        {t('lobby_searching')}
      </h2>
      <p className="text-slate-400 text-sm font-medium max-w-sm mb-6">
        {t('lobby_desc')}
      </p>

      {/* 닉네임 수정 박스 */}
      <div className="flex items-center gap-2 bg-slate-900/90 border-2 border-slate-700 px-4 py-2 rounded-2xl mb-8 shadow-inner">
        <span className="text-xs text-slate-400 font-bold">{t('lobby_my_nick')}</span>
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={10}
              className="bg-slate-800 text-white font-black text-sm px-2 py-1 rounded border border-amber-500 focus:outline-none w-32"
            />
            <button
              type="button"
              onClick={handleSaveName}
              className="p-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-amber-300">{name}</span>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 레이더 매칭 애니메이션 */}
      <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center my-2">
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 animate-ping" />
        <div className="absolute inset-4 rounded-full border-2 border-sky-500/40 animate-pulse" />
        <div className="absolute inset-8 rounded-full border border-slate-700" />
        <div className="w-24 h-24 rounded-full bg-slate-900 border-4 border-amber-400 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.4)] z-10">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-[10px] font-black text-amber-300 mt-1 uppercase tracking-wider font-pixel">
            {t('lobby_matching')}
          </span>
        </div>
      </div>

      {/* 대기자 수 카드 */}
      <div className="w-full max-w-sm bg-slate-900/80 rounded-2xl p-4 border-2 border-slate-800 shadow-xl mt-6">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
          <span className="flex items-center gap-1.5 text-sky-400">
            <Users className="w-4 h-4" />
            {t('lobby_participants')}
          </span>
          <span className="px-2 py-0.5 bg-sky-950 text-sky-300 rounded border border-sky-800 font-extrabold font-pixel">
            {t('lobby_waiting_count', { count: waitingCount })}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center mt-2 max-h-24 overflow-y-auto">
          {waitingNames.map((nick, idx) => (
            <span
              key={idx}
              className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${
                nick === name
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {nick === name ? `⭐ ${nick}${t('lobby_me')}` : nick}
            </span>
          ))}
        </div>
      </div>

      {/* 실시간 방명록 전광판 */}
      <div className="w-full max-w-sm mt-4">
        <GuestbookTicker />
      </div>
    </div>
  );
};
