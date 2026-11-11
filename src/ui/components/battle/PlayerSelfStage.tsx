import React, { useState } from 'react';
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
 * 1인칭 내 캐릭터 뒷모습 뷰포트 (오버더숄더 Punch-Out 구도)
 * - 화면 하단 전경에 넓은 어깨와 뒤통수 실루엣 배치
 * - 공격 시: 뿅망치가 화면 앞 상대방을 향해 3D 깊이감(Depth)으로 돌진
 * - 방어 시: 냄비뚜껑이 화면 전면을 방패처럼 차단
 */
export const PlayerSelfStage: React.FC<PlayerSelfStageProps> = ({
  name,
  damage,
  direction,
  role,
  phase,
  isHit,
  rpsChoice,
}) => {
  const [backImgFailed, setBackImgFailed] = useState(false);

  const isAttacker = role === 'ATTACKER';
  const isDefender = role === 'DEFENDER';
  const isResolve = phase === 'RESOLVE';
  const isChamOrResolve = phase === 'CHAM_INPUT' || phase === 'RESOLVE';

  // 1. 내 도구 1인칭 3D 애니메이션 이미지 및 클래스 결정
  // 1인칭 전용 뿅망치(승인된 마스터 에셋) 적용
  const fpLeftHammer = '/assets/images/first_person/self_attack_left.png';
  const fpUpHammer = '/assets/images/first_person/self_attack_up.png';
  const fpRightHammer = '/assets/images/first_person/self_attack_right.png';
  const fpLeftGuard = '/assets/images/first_person/self_guard_left.png';
  const fpUpGuard = '/assets/images/first_person/self_guard_up.png';
  const fpRightGuard = '/assets/images/first_person/self_guard_right.png';

  const toolSrc = isAttacker
    ? direction === 'LEFT'
      ? fpLeftHammer
      : direction === 'RIGHT'
      ? fpRightHammer
      : fpUpHammer
    : isDefender
    ? direction === 'LEFT'
      ? fpLeftGuard
      : direction === 'RIGHT'
      ? fpRightGuard
      : fpUpGuard
    : null;

  let toolAnimClass = '';
  if (isChamOrResolve && toolSrc) {
    if (isAttacker) {
      if (isResolve) {
        if (direction === 'LEFT') toolAnimClass = 'animate-fp-hammer-left';
        else if (direction === 'RIGHT') toolAnimClass = 'animate-fp-hammer-right';
        else toolAnimClass = 'animate-fp-hammer-up';
      } else {
        toolAnimClass = 'animate-pulse scale-105';
      }
    } else if (isDefender) {
      if (isResolve) {
        if (isHit) {
          toolAnimClass = 'animate-potlid-pop-off';
        } else {
          if (direction === 'LEFT') toolAnimClass = 'animate-fp-guard-left';
          else if (direction === 'RIGHT') toolAnimClass = 'animate-fp-guard-right';
          else toolAnimClass = 'animate-fp-guard-up';
        }
      } else {
        toolAnimClass = 'scale-95 opacity-90';
      }
    }
  }

  return (
    <div className="relative flex flex-col items-center select-none z-20 pointer-events-none mt-auto">
      {/* 1. 1인칭 플레이어 도구 오버레이 레이어 (하단에서 전방으로 뻗어 나감) */}
      {isChamOrResolve && toolSrc && (
        <div
          className={`absolute -top-20 sm:-top-28 z-30 transition-all duration-150 flex items-center justify-center w-40 h-40 sm:w-60 sm:h-60 ${
            isAttacker ? 'right-2 sm:right-10' : 'left-4 sm:left-12'
          } ${toolAnimClass}`}
        >
          <img
            src={toolSrc}
            alt={isAttacker ? 'Self Toy Hammer' : 'Self Pot Lid'}
            className="w-full h-full object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)]"
          />
        </div>
      )}

      {/* 2. 내 캐릭터 뒷모습 본체 (등 & 뒤통수 아케이드 실루엣) */}
      <div className="relative flex flex-col items-center justify-end w-48 h-32 sm:w-80 sm:h-52 overflow-visible">
        {/* '나 (YOU)' 배지 및 공격/수비 태그 */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 whitespace-nowrap">
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

        {/* 1인칭 고품질 생성 에셋 우선 렌더링, 부재 시 정교한 벡터 실루엣 폴백 */}
        {!backImgFailed ? (
          <img
            src={`/assets/images/first_person/self_state_${damage}.png`}
            alt={`${name} back view`}
            onError={() => setBackImgFailed(true)}
            className="w-full h-full object-contain drop-shadow-[0_-8px_20px_rgba(0,0,0,0.7)]"
          />
        ) : (
          <svg
            viewBox="0 0 200 130"
            className="w-full h-full drop-shadow-[0_-8px_16px_rgba(0,0,0,0.6)]"
          >
            <defs>
              <linearGradient id="selfBodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#090d16" />
              </linearGradient>
              <linearGradient id="selfHairGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="selfCollarGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
            </defs>

            <path
              d="M 10 130 C 15 80, 50 65, 80 65 L 120 65 C 150 65, 185 80, 190 130 Z"
              fill="url(#selfBodyGrad)"
              stroke="#475569"
              strokeWidth="3"
            />
            <path
              d="M 75 65 Q 100 80 125 65 Q 100 68 75 65 Z"
              fill="url(#selfCollarGrad)"
              stroke="#38bdf8"
              strokeWidth="2"
            />
            <ellipse
              cx="100"
              cy="40"
              rx="34"
              ry="36"
              fill="url(#selfHairGrad)"
              stroke="#64748b"
              strokeWidth="3"
            />
            <path
              d="M 68 40 Q 64 25 78 16 Q 100 8 122 16 Q 136 25 132 40 C 130 18, 70 18, 68 40 Z"
              fill="#1e293b"
            />
            <rect
              x="88"
              y="54"
              width="24"
              height="14"
              rx="4"
              fill="#0f172a"
            />
          </svg>
        )}

        {/* 내 RPS 선택 표시 */}
        {phase === 'RPS_RESULT' && rpsChoice && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-sky-950/90 border border-sky-400 text-white font-black text-xs sm:text-sm px-3 py-0.5 rounded-lg shadow-lg animate-bounce whitespace-nowrap">
            {rpsChoice === 'ROCK' ? '✊ 바위' : rpsChoice === 'SCISSORS' ? '✌️ 가위' : '🖐️ 보'}
          </div>
        )}
      </div>
    </div>
  );
};

