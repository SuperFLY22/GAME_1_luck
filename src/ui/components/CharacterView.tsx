import React, { useEffect, useState } from 'react';
import { assetRegistry } from '../../services/assets/assetRegistry';
import type { ChamDirection, DamageLevel, GamePhase, Role } from '../../models/types';
import { CharacterSvg } from './CharacterSvg';

interface CharacterViewProps {
  playerId: 'p1' | 'p2';
  name: string;
  damage: DamageLevel;
  direction: ChamDirection;
  isHit: boolean;
  role: Role;
  phase: GamePhase;
  actionSprite?: string | null;
  rpsSprite?: string | null;
}

export const CharacterView: React.FC<CharacterViewProps> = ({
  playerId,
  name,
  damage,
  direction,
  isHit,
  role,
  phase,
  rpsSprite,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    return assetRegistry.subscribe(() => setTick((t) => t + 1));
  }, []);

  const hasCustom = assetRegistry.hasCustomImage(playerId, damage);
  const customFaceUrl = assetRegistry.getCustomImageUrl(playerId, damage);

  const isAttacker = role === 'ATTACKER';
  const isDefender = role === 'DEFENDER';
  const isResolve = phase === 'RESOLVE';

  // 참참참 액션 스프라이트 결정:
  // 사용자가 방향을 선택하고 판정이 일어나는 RESOLVE 단계에서
  // 평상시 얼굴 대신 캐릭터가 직접 좌/상/우로 찌르거나(공격) 피하는(수비) actions 이미지 노출
  let actionImageUrl: string | null = null;
  if (isResolve && direction) {
    const dirKey = direction.toLowerCase();
    const playerSuffix = playerId === 'p2' ? '_2p' : '';
    if (isAttacker) {
      actionImageUrl = `/assets/images/actions/attack_${dirKey}${playerSuffix}.png`;
    } else if (isDefender) {
      actionImageUrl = `/assets/images/actions/defend_${dirKey}${playerSuffix}.png`;
    }
  }

  // 현재 표시할 캐릭터 이미지 우선순위:
  // 1. 참참참 판정 순간 (RESOLVE): 공격/수비 액션 스프라이트 (내가 어디로 공격했고 상대가 어디로 수비했는지 직관적 표현)
  // 2. 가위바위보 순간 (RPS): 가위/바위/보 손 스프라이트
  // 3. 평상시 / 턴 결과 상태: 0~5단계 데미지 표정 스프라이트
  const displayImageUrl = actionImageUrl || rpsSprite || (hasCustom ? customFaceUrl : null);

  // 캐릭터 고개/몸통 방향 틸트 — 액션 스프라이트가 아닐 때(기본 표정/SVG)만 틸트 적용
  let charTransform = 'rotate(0deg)';
  if (isResolve && !actionImageUrl) {
    if (direction === 'LEFT') charTransform = 'rotate(-10deg) translateX(-12px)';
    else if (direction === 'RIGHT') charTransform = 'rotate(10deg) translateX(12px)';
    else if (direction === 'UP') charTransform = 'translateY(-14px)';
  }

  // 방향성 플로팅 배지 텍스트 헬퍼
  const getDirLabel = (dir: ChamDirection) => {
    if (dir === 'LEFT') return '👈 좌';
    if (dir === 'UP') return '👆 상';
    if (dir === 'RIGHT') return '👉 우';
    return null;
  };

  return (
    <div className="flex flex-col items-center w-full min-w-0">
      <div
        className={`relative flex items-center justify-center min-w-0 w-full min-h-[150px] sm:min-h-[230px] rounded-2xl transition-all duration-300 p-1 sm:p-2 mt-4 sm:mt-5 ${
          isAttacker && (phase === 'CHAM_INPUT' || phase === 'RESOLVE' || phase === 'ROLE_SWAP')
            ? 'aura-attacker border-2 border-amber-400 bg-amber-950/20'
            : isDefender && (phase === 'CHAM_INPUT' || phase === 'RESOLVE' || phase === 'ROLE_SWAP')
            ? 'aura-defender border-2 border-sky-400 bg-sky-950/20'
            : 'border border-transparent'
        }`}
      >
        {/* 캐릭터 본체 레이어 */}
        {displayImageUrl && !imgFailed ? (
          <div
            className={`w-32 h-40 sm:w-64 sm:h-76 transition-all duration-150 select-none flex items-center justify-center relative ${
              isHit ? 'animate-bounce scale-95' : actionImageUrl ? 'animate-scaleUp' : ''
            }`}
            style={{ transform: charTransform }}
          >
            <img
              src={displayImageUrl}
              alt={`${name} sprite`}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
            />
          </div>
        ) : (
          <CharacterSvg
            playerId={playerId}
            damage={damage}
            direction={direction}
            isHit={isHit}
            role={null}
          />
        )}

        {/* 1. 현재 공격하는 자 / 수비하는 자 역할 뱃지 (상단 잘림 없이 명확한 네온 뱃지 노출) */}
        {role && role !== 'TIE' && (
          <div
            className={`absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-black tracking-wider uppercase border-2 z-30 whitespace-nowrap shadow-xl flex items-center gap-1.5 ${
              role === 'ATTACKER'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 border-amber-200 ring-2 ring-amber-400/80 animate-pulse scale-105'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white border-sky-200 ring-2 ring-sky-400/80'
            }`}
          >
            {role === 'ATTACKER' ? (
              <>
                <span className="text-sm">🔥</span>
                <span>공격 (ATTACK)</span>
              </>
            ) : (
              <>
                <span className="text-sm">🛡️</span>
                <span>수비 (GUARD)</span>
              </>
            )}
          </div>
        )}

        {/* 2. RESOLVE 단계에서 확실한 방향성 표시 태그 */}
        {isResolve && direction && (
          <div
            className={`absolute bottom-2 left-1/2 -translate-x-1/2 z-30 px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-lg border-2 font-black text-[11px] sm:text-xs shadow-lg whitespace-nowrap animate-scaleUp ${
              isAttacker
                ? 'bg-rose-950/95 text-rose-200 border-rose-400 shadow-rose-500/40'
                : 'bg-sky-950/95 text-sky-200 border-sky-400 shadow-sky-500/40'
            }`}
          >
            {isAttacker ? '💥 타격:' : '🛡️ 방어:'} {getDirLabel(direction)}
          </div>
        )}
      </div>

      <div className="mt-1 sm:mt-2 text-center">
        <span
          className={`inline-block px-2.5 py-0.5 sm:px-3.5 sm:py-1 text-white text-xs sm:text-base font-black rounded-lg border shadow-md truncate max-w-[90px] sm:max-w-none ${
            isAttacker
              ? 'bg-slate-900 border-amber-400 text-amber-300 shadow-amber-400/20'
              : 'bg-slate-900 border-slate-700 text-white'
          }`}
        >
          {name}
        </span>
      </div>
    </div>
  );
};
