import React from 'react';
import type { ChamDirection, DamageLevel, GamePhase, Role, RPSChoice } from '../../../models/types';
import { useLanguage } from '../../context/LanguageContext';

interface OpponentStageProps {
  id: 'p1' | 'p2';
  name: string;
  damage: DamageLevel;
  direction: ChamDirection;
  role: Role;
  phase: GamePhase;
  isHit: boolean;
  lastOutcome: 'HIT' | 'DODGE' | 'TIE' | null;
  rpsChoice: RPSChoice;
  rpsSprite?: string | null;
}

export const OpponentStage: React.FC<OpponentStageProps> = ({
  name,
  damage,
  direction,
  role,
  phase,
  isHit,
  lastOutcome,
  rpsChoice,
  rpsSprite,
}) => {
  const { t } = useLanguage();
  const isAttacker = role === 'ATTACKER';
  const isDefender = role === 'DEFENDER';
  const isResolve = phase === 'RESOLVE';

  const dirKey = direction ? direction.toLowerCase() : 'up';

  let activeSpriteUrl: string;
  let activeVideoUrl: string | null = null;
  let isVideoLoop = false;

  if (isResolve && direction) {
    if (isAttacker) {
      activeSpriteUrl = `/assets/images/first_person/opp_attack_${dirKey}.png`;
      activeVideoUrl = '/assets/videos/opp_attack.mp4';
      isVideoLoop = false;
    } else if (isDefender) {
      if (lastOutcome === 'DODGE') {
        activeSpriteUrl = `/assets/images/first_person/opp_dodge_${dirKey}.png`;
        activeVideoUrl = '/assets/videos/opp_dodge.mp4';
        isVideoLoop = false;
      } else {
        activeSpriteUrl = isHit
          ? `/assets/images/first_person/opp_state_${damage}.png`
          : `/assets/images/first_person/opp_guard_${dirKey}.png`;
      }
    } else {
      activeSpriteUrl = `/assets/images/first_person/opp_state_${damage}.png`;
    }
  } else {
    activeSpriteUrl = `/assets/images/first_person/opp_state_${damage}.png`;
    if (damage === 0) {
      activeVideoUrl = '/assets/videos/opp_idle.mp4';
      isVideoLoop = true;
    }
  }

  let bodyAnimClass = '';
  if (isResolve) {
    if (isHit) {
      bodyAnimClass = 'animate-fp-opp-hit';
    } else if (lastOutcome === 'DODGE' && direction) {
      if (direction === 'LEFT') bodyAnimClass = 'animate-fp-opp-dodge-left';
      else if (direction === 'RIGHT') bodyAnimClass = 'animate-fp-opp-dodge-right';
      else bodyAnimClass = 'animate-fp-opp-dodge-up';
    } else if (isAttacker) {
      bodyAnimClass = 'animate-fp-opp-attack';
    }
  }

  const getRpsLabel = (choice: RPSChoice) => {
    if (choice === 'ROCK') return t('battle_hand_rock');
    if (choice === 'SCISSORS') return t('battle_hand_scissors');
    if (choice === 'PAPER') return t('battle_hand_paper');
    return '';
  };

  return (
    <div className="relative flex flex-col items-center select-none z-10">
      {/* 상대방 이름 및 역할 뱃지 */}
      <div className="flex items-center gap-2 mb-1 z-20 font-pixel">
        <span className="text-xs sm:text-sm font-black bg-slate-900/90 text-rose-300 border border-rose-500/60 px-2.5 py-0.5 rounded-full shadow-md">
          {t('battle_opp_prefix', { name })}
        </span>
        {role && role !== 'TIE' && (
          <span
            className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border shadow-sm ${
              isAttacker
                ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
                : 'bg-sky-600 text-white border-sky-300'
            }`}
          >
            {isAttacker ? t('battle_badge_attack') : t('battle_badge_guard')}
          </span>
        )}
      </div>

      {/* 상대방 본체 래퍼 */}
      <div
        className={`relative flex items-center justify-center w-44 h-52 sm:w-64 sm:h-72 transition-transform duration-200 ${
          isAttacker && (phase === 'CHAM_INPUT' || phase === 'RESOLVE')
            ? 'aura-attacker rounded-3xl'
            : isDefender && (phase === 'CHAM_INPUT' || phase === 'RESOLVE')
            ? 'aura-defender rounded-3xl'
            : ''
        }`}
      >
        <div className={`w-full h-full flex items-center justify-center ${bodyAnimClass}`}>
          {activeVideoUrl ? (
            <video
              key={activeVideoUrl}
              src={activeVideoUrl}
              autoPlay
              loop={isVideoLoop}
              muted
              playsInline
              poster={activeSpriteUrl}
              className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
            />
          ) : (
            <img
              src={activeSpriteUrl}
              alt={`${name} sprite`}
              className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
            />
          )}
        </div>

        {/* 가위바위보 결과 (캐릭터 본체 우측 배치) */}
        {phase === 'RPS_RESULT' && rpsChoice && (
          <aside
            aria-label="상대방 가위바위보 결과"
            className="absolute top-1/2 -translate-y-1/2 -right-14 sm:-right-24 z-30 flex flex-col items-center gap-1 bg-slate-950/95 border-2 border-rose-400/90 p-1.5 sm:p-2 rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-scaleUp pointer-events-none font-pixel"
          >
            <div className="text-[10px] sm:text-xs font-black text-rose-300">{t('battle_opp_choice_label')}</div>
            {rpsSprite ? (
              <img
                src={rpsSprite}
                alt={rpsChoice}
                className="w-10 h-10 sm:w-14 sm:h-14 object-contain filter drop-shadow-[0_2px_8px_rgba(244,63,94,0.6)]"
              />
            ) : (
              <span className="text-2xl sm:text-3xl">
                {rpsChoice === 'ROCK' ? '✊' : rpsChoice === 'SCISSORS' ? '✌️' : '🖐️'}
              </span>
            )}
            <span className="text-white font-black text-[11px] sm:text-xs whitespace-nowrap bg-rose-600/90 border border-rose-400 px-2 py-0.5 rounded-md shadow-sm">
              {getRpsLabel(rpsChoice)}
            </span>
          </aside>
        )}
      </div>
    </div>
  );
};
