import React from 'react';
import type { ChamDirection, DamageLevel, GamePhase, Role, RPSChoice } from '../../../models/types';
import { useLanguage } from '../../context/LanguageContext';
import { ActionVideo } from './ActionVideo';

interface PlayerSelfStageProps {
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

export const PlayerSelfStage: React.FC<PlayerSelfStageProps> = ({
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

  // 6번 규칙: 10시(LEFT), 12시(UP), 2시(RIGHT) 각도 클래스
  let angleClass = 'action-angle-12';
  if (direction === 'LEFT') angleClass = 'action-angle-10';
  else if (direction === 'RIGHT') angleClass = 'action-angle-2';

  // 액션 영상 및 연출 계산
  let videoConfig: { src: string; startTime: number; endTime: number } | null = null;
  let potlidFlyAwayImg: string | null = null;
  let potlidFlyAnimClass = '';

  if (isResolve && direction) {
    if (isAttacker) {
      if (lastOutcome === 'HIT') {
        // 2. 공격 성공: self_attack.mp4 5~8초 구간
        videoConfig = {
          src: '/assets/videos/self_attack.mp4',
          startTime: 5,
          endTime: 8,
        };
      } else if (lastOutcome === 'DODGE') {
        // 4. 공격 실패: self_attack.mp4 1~3초 구간
        videoConfig = {
          src: '/assets/videos/self_attack.mp4',
          startTime: 1,
          endTime: 3,
        };
      }
    } else if (isDefender) {
      if (lastOutcome === 'DODGE') {
        // 3. 수비 성공: self_guard.mp4 (좌/우: 1~3초, 상: 5~7초)
        const isUp = direction === 'UP';
        videoConfig = {
          src: '/assets/videos/self_guard.mp4',
          startTime: isUp ? 5 : 1,
          endTime: isUp ? 7 : 3,
        };
      } else if (isHit) {
        // 5. 수비 실패: 선택했던 방향의 냄비뚜껑 이미지가 뱅글뱅글 날아가는 효과
        potlidFlyAwayImg = `/assets/images/first_person/self_guard_${dirKey}.png`;
        if (direction === 'LEFT') potlidFlyAnimClass = 'animate-potlid-fly-left';
        else if (direction === 'RIGHT') potlidFlyAnimClass = 'animate-potlid-fly-right';
        else potlidFlyAnimClass = 'animate-potlid-fly-up';
      }
    }
  }

  // 내 상태 이미지 (본체 0~5단계)
  const safeDamage = Math.min(Math.max(damage, 0), 5);
  const selfBackSpriteUrl = `/assets/images/first_person/self_state_${safeDamage}.png`;

  const getRpsLabel = (choice: RPSChoice) => {
    if (choice === 'ROCK') return t('battle_hand_rock');
    if (choice === 'SCISSORS') return t('battle_hand_scissors');
    if (choice === 'PAPER') return t('battle_hand_paper');
    return '';
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none z-20 pointer-events-none mt-auto w-full">
      {/* 1. 1인칭 플레이어 액션 (화면 정중앙 정렬 + 10시/12시/2시 각도) */}
      {videoConfig && (
        <div
          className={`absolute -top-28 sm:-top-44 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-60 h-60 sm:w-96 sm:h-96 transition-transform duration-200 ${angleClass}`}
        >
          <ActionVideo
            src={videoConfig.src}
            startTime={videoConfig.startTime}
            endTime={videoConfig.endTime}
            className="w-full h-full object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)]"
          />
        </div>
      )}

      {/* 수비 실패 시 냄비뚜껑 뱅글뱅글 날아가는 연출 */}
      {potlidFlyAwayImg && (
        <div
          className={`absolute -top-24 sm:-top-36 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-48 h-48 sm:w-72 sm:h-72 pointer-events-none ${potlidFlyAnimClass}`}
        >
          <img
            src={potlidFlyAwayImg}
            alt="Flying Potlid Guard Failure"
            className="w-full h-full object-contain drop-shadow-[0_15px_30px_rgba(239,68,68,0.85)]"
          />
        </div>
      )}

      {/* 2. 내 캐릭터 뒷모습 본체 (1번 요구사항: 상태 이미지 화면 정중앙 배치) */}
      <div className="relative flex flex-col items-center justify-end w-52 h-36 sm:w-88 sm:h-60 overflow-visible mx-auto">
        {/* '나 (YOU)' 배지 및 공격/수비 태그 */}
        <div className="absolute bottom-1 -left-4 sm:-left-8 z-40 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5 whitespace-nowrap bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-md pointer-events-none font-pixel">
          <span className="text-[10px] sm:text-xs font-black bg-sky-500 text-white px-2.5 py-0.5 rounded-full border border-sky-300 shadow-md">
            {t('battle_self_prefix', { name })}
          </span>
          {role && role !== 'TIE' && (
            <span
              className={`text-[9px] sm:text-[11px] font-black px-2 py-0.5 rounded-full border shadow-sm ${
                isAttacker
                  ? 'bg-amber-400 text-slate-950 border-amber-200 animate-pulse'
                  : 'bg-emerald-600 text-white border-emerald-300'
              }`}
            >
              {isAttacker ? t('battle_badge_attack') : t('battle_badge_guard')}
            </span>
          )}
        </div>

        <img
          src={selfBackSpriteUrl}
          alt={`${name} back view`}
          className="w-full h-full object-contain drop-shadow-[0_-8px_20px_rgba(0,0,0,0.7)]"
        />

        {/* 내 RPS 선택 결과 (RPS_RESULT 단계) */}
        {phase === 'RPS_RESULT' && rpsChoice && (
          <aside
            aria-label="내 가위바위보 결과"
            className="absolute top-1/2 -translate-y-1/2 -right-14 sm:-right-24 z-40 flex flex-col items-center gap-1 bg-slate-950/95 border-2 border-sky-400/90 p-1.5 sm:p-2 rounded-2xl shadow-[0_0_20px_rgba(56,189,248,0.5)] animate-scaleUp pointer-events-none font-pixel"
          >
            <div className="text-[10px] sm:text-xs font-black text-sky-300">{t('battle_self_choice_label')}</div>
            {rpsSprite ? (
              <img
                src={rpsSprite}
                alt={rpsChoice}
                className="w-10 h-10 sm:w-14 sm:h-14 object-contain filter drop-shadow-[0_2px_8px_rgba(56,189,248,0.6)]"
              />
            ) : (
              <span className="text-2xl sm:text-3xl">
                {rpsChoice === 'ROCK' ? '✊' : rpsChoice === 'SCISSORS' ? '✌️' : '🖐️'}
              </span>
            )}
            <span className="text-white font-black text-[11px] sm:text-xs whitespace-nowrap bg-sky-600/90 border border-sky-400 px-2 py-0.5 rounded-md shadow-sm">
              {getRpsLabel(rpsChoice)}
            </span>
          </aside>
        )}
      </div>
    </div>
  );
};
