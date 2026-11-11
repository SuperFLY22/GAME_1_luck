import React from 'react';
import type { ChamDirection, DamageLevel, GamePhase, Role, RPSChoice } from '../../../models/types';

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

/**
 * 1인칭 상대방 스테이지 (OpponentStage)
 * 
 * 구버전 SVG 및 도구 중첩을 100% 배제하고,
 * public/assets/images/first_person/ 디렉터리의 정식 스프라이트만 단독 렌더링:
 * 1. 공격 판정 순간: opp_attack_left / up / right.png (망치를 든 상대 전신 액션)
 * 2. 회피 판정 순간: opp_dodge_left / up / right.png (고개 돌린 상대 회피 액션)
 * 3. 방어 판정 순간: opp_guard_left / up / right.png (냄비뚜껑 든 가드 액션)
 * 4. 평상시 / 대기 / 피격: opp_state_0 ~ 5.png (6단계 정면 얼굴 데미지 상태)
 */
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
  const isAttacker = role === 'ATTACKER';
  const isDefender = role === 'DEFENDER';
  const isResolve = phase === 'RESOLVE';

  const dirKey = direction ? direction.toLowerCase() : 'up';

  // 1. 단일 최우선 액션 스프라이트 리졸브 (중첩 방지)
  let activeSpriteUrl: string;

  if (isResolve && direction) {
    if (isAttacker) {
      // 상대가 공격자일 때: 상대방 공격 스프라이트 (상반신 + 뿅망치 일체형)
      activeSpriteUrl = `/assets/images/first_person/opp_attack_${dirKey}.png`;
    } else if (isDefender) {
      if (lastOutcome === 'DODGE') {
        // 상대가 수비 성공(회피): 회피 스프라이트
        activeSpriteUrl = `/assets/images/first_person/opp_dodge_${dirKey}.png`;
      } else {
        // 상대가 피격 또는 가드: 가드 스프라이트 (피격 시는 아래 hit 애니메이션과 함께 데미지 표정)
        activeSpriteUrl = isHit
          ? `/assets/images/first_person/opp_state_${damage}.png`
          : `/assets/images/first_person/opp_guard_${dirKey}.png`;
      }
    } else {
      activeSpriteUrl = `/assets/images/first_person/opp_state_${damage}.png`;
    }
  } else if (phase === 'RPS_RESULT' && rpsSprite) {
    // 가위바위보 손 공개
    activeSpriteUrl = rpsSprite;
  } else {
    // 기본 대기 / 카운트다운: 데미지 단계별 정면 얼굴 (0~5)
    activeSpriteUrl = `/assets/images/first_person/opp_state_${damage}.png`;
  }

  // 2. 피격(HIT) 리액션 애니메이션 클래스
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
        className={`relative flex items-center justify-center w-44 h-52 sm:w-64 sm:h-72 transition-transform duration-200 ${
          isAttacker && (phase === 'CHAM_INPUT' || phase === 'RESOLVE')
            ? 'aura-attacker rounded-3xl'
            : isDefender && (phase === 'CHAM_INPUT' || phase === 'RESOLVE')
            ? 'aura-defender rounded-3xl'
            : ''
        }`}
      >
        {/* 오직 first_person 정식 스프라이트만 단독 렌더링 (SVG/구버전 완전 배제) */}
        <div className={`w-full h-full flex items-center justify-center ${bodyAnimClass}`}>
          <img
            src={activeSpriteUrl}
            alt={`${name} sprite`}
            className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
          />
        </div>

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
