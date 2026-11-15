import React, { useEffect, useState } from 'react';
import { RotateCcw, Trophy, Home, Users, Skull, MessageSquare, Send } from 'lucide-react';
import type { GameEngineState } from '../../models/types';
import { fireVictoryConfetti } from '../../utils/confetti';
import { soundManager } from '../../services/sound/soundManager';
import { matchmakingService } from '../../services/network/matchmakingService';
import { useLanguage } from '../context/LanguageContext';

interface GameOverModalProps {
  state: GameEngineState;
  onRestart: () => void;
  onGoTitle: () => void;
  onFindNewMatch?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  state,
  onRestart,
  onGoTitle,
  onFindNewMatch,
}) => {
  const { t } = useLanguage();
  const winner = state.winner === 'p1' ? state.p1 : state.p2;
  const loser = state.winner === 'p1' ? state.p2 : state.p1;
  const isP1Win = state.winner === 'p1';
  const isOnline = state.mode === 'ONLINE_MATCH';
  const opponentLeft = state.online?.opponentLeft;

  // 플레이어 기준 승패 판단 (ONLINE_MATCH는 myRoleInRoom, 1P_CPU는 항상 p1)
  const isLocalWinner = isOnline
    ? state.winner === state.online?.myRoleInRoom
    : state.winner === 'p1';

  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const handleSendReview = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reviewText.trim();
    if (!trimmed) return;

    const myName = isOnline
      ? (state.online?.myRoleInRoom === 'p1' ? state.p1.name : state.p2.name)
      : state.p1.name;

    matchmakingService.sendGuestbookEntry(myName, trimmed);
    setReviewText('');
    setReviewSubmitted(true);
  };

  useEffect(() => {
    if (isLocalWinner) {
      soundManager.playVictory();
      fireVictoryConfetti();
    } else {
      soundManager.playSurrender();
    }
  }, [isLocalWinner]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div
        className={`w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-4 rounded-3xl p-6 text-center flex flex-col items-center ${
          isLocalWinner
            ? 'border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)]'
            : 'border-rose-600 shadow-[0_0_50px_rgba(225,29,72,0.3)]'
        }`}
      >
        {/* 승패 아이콘 */}
        <div
          className={`w-20 h-20 rounded-full border-4 flex items-center justify-center -mt-14 mb-3 shadow-lg ${
            isLocalWinner
              ? 'bg-amber-500/20 border-amber-400'
              : 'bg-rose-500/20 border-rose-500'
          }`}
        >
          {isLocalWinner ? (
            <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
          ) : (
            <Skull className="w-10 h-10 text-rose-400 animate-pulse" />
          )}
        </div>

        <div
          className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border mb-2 font-pixel ${
            isLocalWinner
              ? 'text-amber-400 bg-amber-950/80 border-amber-600'
              : 'text-rose-400 bg-rose-950/80 border-rose-600'
          }`}
        >
          {isLocalWinner ? t('game_over_victory') : t('game_over_defeat')}
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white font-comic drop-shadow-md">
          {t('game_over_winner_title', { name: winner.name })}
        </h2>

        {/* 내가 패배했을 때(DEFEAT) 웹제미나이 KO 패배 컷씬 비디오 연출 */}
        {!isLocalWinner && (
          <div className="w-full max-w-[200px] aspect-[9/16] max-h-[160px] my-2 rounded-2xl overflow-hidden border-2 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.5)]">
            <video
              src="/assets/videos/cutscenes/ko_defeat.mp4"
              autoPlay
              loop
              muted
              playsInline
              poster="/assets/images/first_person/opp_state_5.png"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <p className="text-rose-400 font-bold text-sm mt-1 font-pixel">
          {t('game_over_loser_surrender', { name: loser.name })}
        </p>

        {opponentLeft && (
          <div className="mt-2 px-3 py-1 bg-rose-950/80 border border-rose-500 rounded-xl text-xs font-black text-rose-300 animate-pulse font-pixel">
            {t('game_over_opponent_left')}
          </div>
        )}

        {/* 결과 스탯 요약 박스 */}
        <div className="w-full bg-slate-800/80 rounded-2xl p-4 my-5 border-2 border-slate-700">
          {/* 총 대전 턴 수 */}
          <div className="text-center mb-3 pb-2 border-b border-slate-700">
            <span className="text-xs text-slate-400 font-bold font-pixel">
              {t('game_over_total_turns')}
            </span>
            <div className="text-2xl font-black text-white font-pixel">
              {t('game_over_turn_count', { count: state.round })}
            </div>
          </div>
          {/* 플레이어별 스탯 */}
          <div className="flex justify-around items-start">
            <div className="flex flex-col items-center gap-1 font-pixel">
              <span className="text-xs font-bold text-sky-400">{state.p1.name}</span>
              <span className="text-2xl font-black text-white">
                {t('game_over_damage_count', { count: state.p1.damage })}
              </span>
              <span className="text-xs text-emerald-400 font-bold">
                {t('game_over_guard_count', { count: state.p1.guardCount ?? 0 })}
              </span>
              <span className="text-xs text-slate-400">{isP1Win ? '👑 WINNER' : '🏳️ LOSE'}</span>
            </div>

            <div className="h-16 w-0.5 bg-slate-700" />

            <div className="flex flex-col items-center gap-1 font-pixel">
              <span className="text-xs font-bold text-rose-400">{state.p2.name}</span>
              <span className="text-2xl font-black text-white">
                {t('game_over_damage_count', { count: state.p2.damage })}
              </span>
              <span className="text-xs text-emerald-400 font-bold">
                {t('game_over_guard_count', { count: state.p2.guardCount ?? 0 })}
              </span>
              <span className="text-xs text-slate-400">{!isP1Win ? '👑 WINNER' : '🏳️ LOSE'}</span>
            </div>
          </div>
        </div>

        {/* 실시간 한줄 후기 작성 바 */}
        <div className="w-full bg-slate-900/90 border border-amber-500/50 rounded-2xl p-2.5 mb-4 shadow-sm">
          {reviewSubmitted ? (
            <div className="text-center text-xs font-black text-emerald-400 py-1 font-pixel animate-fadeIn flex items-center justify-center gap-1">
              ✨ <span>{t('guestbook_submitted')}</span>
            </div>
          ) : (
            <form onSubmit={handleSendReview} className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
              <input
                type="text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={60}
                placeholder={t('guestbook_gameover_placeholder')}
                className="flex-1 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!reviewText.trim()}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs rounded-lg active:scale-95 transition-all font-pixel shrink-0 flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>{t('guestbook_btn_post')}</span>
              </button>
            </form>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="flex flex-col gap-2.5 w-full font-pixel">
          {isOnline ? (
            <button
              type="button"
              onClick={onFindNewMatch}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black rounded-xl border-b-4 border-teal-800 active:border-b-0 active:translate-y-1 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              {t('game_over_btn_online')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-3.5 px-4 bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              {t('game_over_btn_restart')}
            </button>
          )}

          <button
            type="button"
            onClick={onGoTitle}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border-2 border-slate-600 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            {t('game_over_btn_title')}
          </button>
        </div>
      </div>
    </div>
  );
};
