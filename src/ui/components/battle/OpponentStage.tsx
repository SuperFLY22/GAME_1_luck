import React, { useState } from 'react';
import type { ChamDirection, DamageLevel, GamePhase, Role, RPSChoice } from '../../../models/types';
import { assetRegistry } from '../../../services/assets/assetRegistry';
import { CharacterSvg } from '../CharacterSvg';

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
  id,
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
  const [imgFailed, setImgFailed] = useState(false);

  const hasCustom = assetRegistry.hasCustomImage(id, damage);
  const customFaceUrl = assetRegistry.getCustomImageUrl(id, damage);

  const isAttacker = role === 'ATTACKER';
  const isDefender = role === 'DEFENDER';
  const isResolve = phase === 'RESOLVE';
  const isChamOrResolve = phase === 'CHAM_INPUT' || phase === 'RESOLVE';

  const dirKey = direction ? direction.toLowerCase() : 'up';

  // 1인칭 전용 회피/공격/데미지 스프라이트 매핑
  const isDodge = isResolve && lastOutcome === 'DODGE' && direction;
  const dodgeSprite = isDodge ? `/assets/images/first_person/opp_dodge_${dirKey}.png` : null;
  const fpFaceUrl = `/assets/images/first_person/opp_state_${damage}.png`;
  const displayImageUrl = dodgeSprite || rpsSprite || fpFaceUrl || (hasCustom ? customFaceUrl : null);

  // 1. 상대방 회피 / 피격 리액션 애니메이션 클래스 결정
  let bodyAnimClass = '';
  if (isResolve) {
    if (isHit) {
      bodyAnimClass = 'animate-fp-opp-hit';
    } else if (lastOutcome === 'DODGE' && direction) {
      if (direction === 'LEFT') bodyAnimClass = 'animate-fp-opp-dodge-left';
      else if (direction === 'RIGHT') bodyAnimClass = 'animate-fp-opp-dodge-right';
      else bodyAnimClass = 'animate-fp-opp-dodge-up';
    }
  }

  // 2. 상대방 도구 렌더링 (공격 시: 1인칭 전방 뿅망치, 수비 시: 냄비뚜껑 가드)
  const toolSrc = isAttacker
    ? `/assets/images/first_person/opp_attack_${dirKey}.png`
    : isDefender
    ? `/assets/images/first_person/opp_guard_${dirKey}.png`
    : null;

  let toolAnimClass = '';
  if (isChamOrResolve && toolSrc) {
    if (isAttacker) {
      if (isResolve) {
        // 상대방이 공격자일 때: 뿅망치가 플레이어(화면 전면)를 향해 돌진
        toolAnimClass = 'animate-fp-opp-attack';
      } else {
        toolAnimClass = 'animate-pulse';
      }
    } else if (isDefender) {
      if (isResolve) {
        if (isHit) {
          toolAnimClass = 'animate-potlid-pop-off';
        } else {
          // 가드 성공
          if (direction === 'LEFT') toolAnimClass = 'animate-guard-left';
          else if (direction === 'RIGHT') toolAnimClass = 'animate-guard-right';
          else toolAnimClass = 'animate-guard-up';
        }
      } else {
        toolAnimClass = '-translate-y-1';
      }
    }
  }

  return (
    <div className="relative flex flex-col items-center select-none z-10">
      {/* 상대방 이름 및 역할 뱃지 */}
      <div className="flex items-center gap-2 mb-1 z-20">
        <span className="text-xs sm:text-sm font-black bg-slate-900/90 text-rose-300 border border-rose-500/60 px-2.5 py-0.5 rounded-full shadow-md">
          👾 상대방: {name}
        </span>
        {role && role !== 'TIE' && (
          <span
            className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border shadow-sm ${
              isAttacker
                ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
                : 'bg-sky-600 text-white border-sky-300'
            }`}
          >
            {isAttacker ? '🔥 공격 (ATTACK)' : '🛡️ 수비 (GUARD)'}
          </span>
        )}
      </div>

      {/* 상대방 본체 래퍼 */}
      <div
        className={`relative flex items-center justify-center w-36 h-44 sm:w-56 sm:h-64 transition-transform duration-200 ${
          isAttacker && (phase === 'CHAM_INPUT' || phase === 'RESOLVE')
            ? 'aura-attacker rounded-3xl'
            : isDefender && (phase === 'CHAM_INPUT' || phase === 'RESOLVE')
            ? 'aura-defender rounded-3xl'
            : ''
        }`}
      >
        {/* 캐릭터 바디 스프라이트 또는 SVG */}
        <div className={`w-full h-full flex items-center justify-center ${bodyAnimClass}`}>
          {displayImageUrl && !imgFailed ? (
            <img
              src={displayImageUrl}
              alt={`${name} sprite`}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.7)]"
            />
          ) : (
            <CharacterSvg
              playerId={id}
              damage={damage}
              direction={direction}
              isHit={isHit}
              role={null}
            />
          )}
        </div>

        {/* 상대방 도구 (뿅망치 또는 냄비뚜껑) */}
        {isChamOrResolve && toolSrc && (
          <div
            className={`absolute z-20 pointer-events-none transition-all duration-150 flex items-center justify-center w-28 h-28 sm:w-44 sm:h-44 ${
              isAttacker
                ? '-bottom-4 ' + (id === 'p1' ? 'right-0' : 'left-0')
                : '-bottom-2 ' + (id === 'p1' ? 'left-0' : 'right-0')
            } ${toolAnimClass}`}
          >
            <img
              src={toolSrc}
              alt={isAttacker ? 'Opponent Toy Hammer' : 'Opponent Pot Lid'}
              className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
            />
          </div>
        )}

        {/* RPS 선택 말풍선 */}
        {phase === 'RPS_RESULT' && rpsChoice && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30 bg-rose-950/90 border border-rose-400 text-white font-black text-xs sm:text-sm px-2.5 py-0.5 rounded-lg shadow-lg animate-bounce whitespace-nowrap">
            {rpsChoice === 'ROCK' ? '✊ 바위' : rpsChoice === 'SCISSORS' ? '✌️ 가위' : '🖐️ 보'}
          </div>
        )}
      </div>
    </div>
  );
};

