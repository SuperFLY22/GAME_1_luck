import React, { useEffect, useState } from 'react';
import { MessageSquare, Flame } from 'lucide-react';
import type { GuestbookEntry } from '../../models/types';
import { matchmakingService } from '../../services/network/matchmakingService';
import { useLanguage } from '../context/LanguageContext';
import { GuestbookModal } from './GuestbookModal';

export const GuestbookTicker: React.FC = () => {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<GuestbookEntry[]>(matchmakingService.getGuestbookEntries());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = matchmakingService.subscribeGuestbook((newEntries) => {
      setEntries(newEntries);
      if (newEntries.length > 0) {
        setCurrentIndex(0);
      }
    });
    return unsubscribe;
  }, []);

  // 4초마다 롤링
  useEffect(() => {
    if (entries.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % entries.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [entries.length]);

  const currentEntry = entries[currentIndex] || {
    nickname: 'ALERT',
    content: t('guestbook_empty'),
  };

  return (
    <>
      <div className="w-full max-w-xl mx-auto px-3 my-2 z-10 select-none">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="w-full group bg-slate-900/90 hover:bg-slate-800/95 border-2 border-amber-500/60 hover:border-amber-400 rounded-2xl px-3.5 py-2 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-center justify-between gap-2.5 transition-all active:scale-[0.99] text-left"
          title={t('guestbook_btn_open')}
        >
          {/* 좌측 뱃지 */}
          <div className="flex items-center gap-1.5 shrink-0 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/50">
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-[11px] font-black text-amber-300 font-pixel tracking-wider whitespace-nowrap">
              {t('guestbook_ticker_prefix')}
            </span>
          </div>

          {/* 중앙 롤링 텍스트 */}
          <div className="flex-1 overflow-hidden h-5 relative">
            <div
              key={currentEntry.id || currentIndex}
              className="flex items-center gap-2 animate-fadeIn text-xs text-slate-200 truncate font-medium"
            >
              <span className="font-bold text-amber-400 font-pixel shrink-0">
                [{currentEntry.nickname}]
              </span>
              <span className="truncate text-slate-300">
                {currentEntry.content}
              </span>
            </div>
          </div>

          {/* 우측 아이콘 */}
          <div className="flex items-center gap-1 shrink-0 text-slate-400 group-hover:text-amber-300 transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px] font-bold font-pixel hidden sm:inline">
              {t('guestbook_btn_open')}
            </span>
          </div>
        </button>
      </div>

      <GuestbookModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entries={entries}
      />
    </>
  );
};
