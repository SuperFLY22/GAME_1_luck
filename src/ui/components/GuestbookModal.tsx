import React, { useState } from 'react';
import { X, Send, MessageSquare, Clock, Sparkles } from 'lucide-react';
import type { GuestbookEntry } from '../../models/types';
import { matchmakingService } from '../../services/network/matchmakingService';
import { useLanguage } from '../context/LanguageContext';

interface GuestbookModalProps {
  entries: GuestbookEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const GuestbookModal: React.FC<GuestbookModalProps> = ({
  entries,
  isOpen,
  onClose,
}) => {
  const { t } = useLanguage();
  const [nickname, setNickname] = useState(matchmakingService.getMyName());
  const [content, setContent] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    matchmakingService.sendGuestbookEntry(nickname, trimmed);
    setContent('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2500);
  };

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return new Date(ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none font-sans">
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-4 border-amber-500/80 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col max-h-[90vh]">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 border border-amber-500 rounded-xl text-amber-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-amber-400 font-comic tracking-tight">
                {t('guestbook_title')}
              </h3>
              <p className="text-xs text-slate-400 font-bold font-pixel">
                실시간 접속자들과 함께 보는 라이브 한줄평
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 후기 리스트 영역 */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 my-2 pr-1 custom-scrollbar min-h-[220px] max-h-[360px]">
          {entries.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs font-pixel gap-2">
              <Sparkles className="w-8 h-8 text-amber-500/40 animate-pulse" />
              <span>{t('guestbook_empty')}</span>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/80 hover:border-amber-500/50 transition-all flex flex-col gap-1 text-left shadow-sm"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-amber-300 font-pixel flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    {entry.nickname}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-pixel">
                    <Clock className="w-3 h-3" />
                    {formatTime(entry.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-200 font-medium break-words leading-relaxed pl-3.5">
                  {entry.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* 등록 폼 */}
        <form onSubmit={handleSubmit} className="pt-3 border-t-2 border-slate-800 flex flex-col gap-2">
          {isSuccess && (
            <div className="text-center text-xs font-black text-emerald-400 py-1 bg-emerald-950/60 border border-emerald-600 rounded-lg animate-pulse font-pixel">
              ✨ {t('guestbook_submitted')}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
              placeholder={t('guestbook_input_nick')}
              className="w-28 sm:w-32 bg-slate-800 text-white text-xs font-bold px-3 py-2.5 rounded-xl border-2 border-slate-700 focus:border-amber-500 focus:outline-none font-pixel"
            />
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={60}
              placeholder={t('guestbook_input_content')}
              className="flex-1 bg-slate-800 text-white text-xs font-medium px-3 py-2.5 rounded-xl border-2 border-slate-700 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs rounded-xl border-b-2 border-amber-800 active:translate-y-0.5 transition-all shadow-md flex items-center gap-1 font-pixel shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>등록</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
