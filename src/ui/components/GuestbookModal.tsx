import React, { useEffect, useState } from 'react';
import { X, Send, MessageSquare, Clock, Sparkles, Shield, Trash2, KeyRound } from 'lucide-react';
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
  const { t, language } = useLanguage();
  const [nickname, setNickname] = useState(matchmakingService.getMyName());
  const [content, setContent] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // 관리자 모드 상태
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [adminError, setAdminError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      matchmakingService.fetchGuestbookHttp();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    const trimmedNick = nickname.trim();
    if (trimmedNick) {
      matchmakingService.setMyName(trimmedNick);
    }

    matchmakingService.sendGuestbookEntry(trimmedNick, trimmed);
    setContent('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2500);
  };

  const handleAdminVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminInput.trim() === 'admin777!') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminError(false);
    } else {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 2000);
    }
  };

  const handleDelete = (id: string) => {
    matchmakingService.deleteGuestbookEntry(id, 'admin777!');
  };

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return t('time_just_now');
    if (diff < 3600) return t('time_mins_ago', { min: Math.floor(diff / 60) });
    if (diff < 86400) return t('time_hours_ago', { hours: Math.floor(diff / 3600) });
    return new Date(ts).toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'numeric',
      day: 'numeric',
    });
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
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-amber-400 font-comic tracking-tight">
                  {t('guestbook_title')}
                </h3>
                {isAdmin && (
                  <span className="text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500 px-2 py-0.5 rounded-full font-pixel animate-pulse">
                    ADMIN MODE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-bold font-pixel">
                {t('guestbook_subtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 관리자 모드 진입 버튼 */}
            <button
              type="button"
              onClick={() => {
                if (isAdmin) {
                  setIsAdmin(false);
                } else {
                  setShowAdminLogin(!showAdminLogin);
                }
              }}
              className={`p-1.5 rounded-xl border transition-colors ${
                isAdmin
                  ? 'bg-rose-950 border-rose-500 text-rose-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
              title={isAdmin ? '관리자 모드 해제' : '관리자 인증'}
            >
              <Shield className="w-4 h-4" />
            </button>

            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 관리자 패스워드 입력 바 (토글 시 노출) */}
        {showAdminLogin && !isAdmin && (
          <form
            onSubmit={handleAdminVerify}
            className="flex items-center gap-2 p-2 mt-2 bg-slate-950 rounded-xl border border-rose-500/60 animate-fadeIn font-pixel"
          >
            <KeyRound className="w-4 h-4 text-rose-400 shrink-0 ml-1" />
            <input
              type="password"
              value={adminInput}
              onChange={(e) => setAdminInput(e.target.value)}
              placeholder={t('guestbook_admin_pwd_prompt')}
              className="flex-1 bg-transparent text-white text-xs px-1 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-lg transition-colors"
            >
              {t('guestbook_admin_mode')}
            </button>
            {adminError && (
              <span className="text-[10px] text-rose-400">
                {t('guestbook_admin_wrong_pwd')}
              </span>
            )}
          </form>
        )}

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
                className="p-3 rounded-2xl bg-slate-800/70 border border-slate-700/80 hover:border-amber-500/50 transition-all flex flex-col gap-1 text-left shadow-sm group relative"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-amber-300 font-pixel flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    {entry.nickname}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-pixel">
                      <Clock className="w-3 h-3" />
                      {formatTime(entry.createdAt)}
                    </span>
                    {/* 관리자 삭제 버튼 */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="p-1 bg-rose-500/20 hover:bg-rose-600 border border-rose-500 text-rose-300 hover:text-white rounded-lg transition-colors active:scale-90"
                        title={t('guestbook_admin_delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
              <span>{t('guestbook_btn_post')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
