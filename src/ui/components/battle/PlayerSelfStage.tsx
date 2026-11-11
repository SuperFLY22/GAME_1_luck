import React from 'react';
import type { ChamDirection, DamageLevel, GamePhase, Role, RPSChoice } from '../../../models/types';

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

/**
 * 1인칭 내 캐릭터 뒷모습 스테이지 (PlayerSelfStage)
 * 
 * 구버전 벡터 SVG를 100% 배제하고,
 * public/assets/images/first_person/ 디렉터리의 정식 스프라이트만 렌더링:
 * 1. 내 뒷모습 상반신: self_state_0 ~ 5.png (6단계 데미지 훼손)
 * 2. 1인칭 공격 스윙: self_attack_left / up / right.png (1인칭 뿅망치 스윙)
 * 3. 1인칭 냄비 방어: self_guard_left / up / right.png (1인칭 냄비뚜껑 가드)
 */
export const PlayerSelfStage: React.FC<PlayerSelfStageProps> = ({
  name,
  damage,
  direction,
  role,
  phase,
  isHit,
  rpsChoice,
  rpsSprite,
}) => {
  const isAttacker = role === 'ATTACKER';
  const isDefender = role === 'DEFENDER';
  const isResolve = phase === 'RESOLVE';

  const dirKey = direction ? direction.toLowerCase() : 'up';

  // 1. 1인칭 공격(뿅망치 스윙) 및 방어(냄비뚜껑) 오버레이 스프라이트
  let actionSpriteUrl: string | null = null;
  let actionAnimClass = '';

  if (isResolve && direction) {
    if (isAttacker) {
      actionSpriteUrl = `/assets/images/first_person/self_attack_${dirKey}.png`;
      if (direction === 'LEFT') actionAnimClass = 'animate-fp-hammer-left';
      else if (direction === 'RIGHT') actionAnimClass = 'animate-fp-hammer-right';
      else actionAnimClass = 'animate-fp-hammer-up';
    } else if (isDefender) {
      actionSpriteUrl = `/assets/images/first_person/self_guard_${dirKey}.png`;
      if (isHit) {
        actionAnimClass = 'animate-potlid-pop-off';
      } else {
        if (direction === 'LEFT') actionAnimClass = 'animate-fp-guard-left';
        else if (direction === 'RIGHT') actionAnimClass = 'animate-fp-guard-right';
        else actionAnimClass = 'animate-fp-guard-up';
      }
    }
  }

  // 2. 내 캐릭터 뒷모습 데미지 스프라이트 (0~5단계)
  const selfBackSpriteUrl = `/assets/images/first_person/self_state_${damage}.png`;

  return (
    <div className="relative flex flex-col items-center select-none z-20 pointer-events-none mt-auto">
      {/* 1. 1인칭 플레이어 액션 (뿅망치 스윙 / 냄비 가드) - 공격/방어 순간에만 전방으로 뻗어나감 */}
      {actionSpriteUrl && (
        <div
          className={`absolute -top-24 sm:-top-36 z-30 transition-all duration-150 flex items-center justify-center w-48 h-48 sm:w-72 sm:h-72 ${
            isAttacker ? 'right-0 sm:right-6' : 'left-0 sm:left-8'
          } ${actionAnimClass}`}
        >
          <img
            src={actionSpriteUrl}
            alt={isAttacker ? 'Self Attack Hammer' : 'Self Guard Lid'}
            className="w-full h-full object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)]"
          />
        </div>
      )}

      {/* 2. 내 캐릭터 뒷모습 본체 (6단계 데미지 스프라이트 단독 렌더링) */}
      <div className="relative flex flex-col items-center justify-end w-52 h-36 sm:w-88 sm:h-60 overflow-visible">
        {/* '나 (YOU)' 배지 및 공격/수비 태그: 중앙 타이머와 겹치지 않도록 머리 위 대신 좌측 하단 코너에 배치 */}
        <div className="absolute bottom-1 -left-4 sm:-left-8 z-40 flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-1.5 whitespace-nowrap bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-md pointer-events-none">
          <span className="text-[10px] sm:text-xs font-black bg-sky-500 text-white px-2.5 py-0.5 rounded-full border border-sky-300 shadow-md">
            👤 나 ({name})
          </span>
          {role && role !== 'TIE' && (
            <span
              className={`text-[9px] sm:text-[11px] font-black px-2 py-0.5 rounded-full border shadow-sm ${
                isAttacker
                  ? 'bg-amber-400 text-slate-950 border-amber-200 animate-pulse'
                  : 'bg-emerald-600 text-white border-emerald-300'
              }`}
            >
              {isAttacker ? '🔥 공격' : '🛡️ 방어'}
            </span>
          )}
        </div>

        {/* 오직 first_person 정식 뒷모습 스프라이트만 단독 렌더링 */}
        <img
          src={selfBackSpriteUrl}
          alt={`${name} back view`}
          className="w-full h-full object-contain drop-shadow-[0_-8px_20px_rgba(0,0,0,0.7)]"
        />

        {/* 내 RPS 선택 결과 (캐릭터 본체 우측 배치) */}
        {phase === 'RPS_RESULT' && rpsChoice && (
          <aside
            aria-label="내 가위바위보 결과"
            className="absolute top-1/2 -translate-y-1/2 -right-14 sm:-right-24 z-40 flex flex-col items-center gap-1 bg-slate-950/95 border-2 border-sky-400/90 p-1.5 sm:p-2 rounded-2xl shadow-[0_0_20px_rgba(56,189,248,0.5)] animate-scaleUp pointer-events-none"
          >
            <div className="text-[10px] sm:text-xs font-black text-sky-300">내 선택</div>
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
              {rpsChoice === 'ROCK' ? '✊ 바위' : rpsChoice === 'SCISSORS' ? '✌️ 가위' : '🖐️ 보'}
            </span>
          </aside>
        )}
      </div>
    </div>
  );
};
