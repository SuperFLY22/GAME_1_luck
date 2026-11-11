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

  // 현재 표시할 캐릭터 본체 이미지 (RPS 손 > 단계별 표정 0~5)
  const displayImageUrl = rpsSprite || (hasCustom ? customFaceUrl : null);

  const isChamOrResolve = phase === 'CHAM_INPUT' || phase === 'RESOLVE';
  const isAttacker = role === 'ATTACKER';
  const isDefender = role === 'DEFENDER';
  const isResolve = phase === 'RESOLVE';

  // 1. 도구 이미지 결정 (좌 / 상 / 우) — BUG-01: CHAM_INPUT 중에는 방향 숨김(중립 UP 유지), RESOLVE 때만 해당 방향 스프라이트 표시
  const resolvedDir = isResolve ? direction : null;
  const dirKey = resolvedDir ? resolvedDir.toLowerCase() : 'up';
  const toolSrc = isAttacker
    ? `/assets/images/tools/hammer_${dirKey}.png`
    : isDefender
    ? `/assets/images/tools/potlid_${dirKey}.png`
    : null;

  // 2. 도구 애니메이션 클래스 결정 (방향별 명확한 공격 및 방어 가드 모션)
  let toolAnimClass = '';
  if (isChamOrResolve) {
    if (isAttacker) {
      if (isResolve) {
        // 공격자: 지정한 방향으로 망치를 강타 (좌 / 상 내리찍기 / 우)
        if (direction === 'LEFT') toolAnimClass = 'animate-hammer-left';
        else if (direction === 'RIGHT') toolAnimClass = 'animate-hammer-right';
        else toolAnimClass = 'animate-hammer-up';
      } else {
        // CHAM_INPUT 대기 중: 공격 태세 모션 (가벼운 펄스 및 준비 모션)
        toolAnimClass = direction ? 'animate-pulse scale-110' : 'animate-pulse';
      }
    } else if (isDefender) {
      if (isResolve) {
        if (isHit) {
          // 가드 실패 (피격): 냄비뚜껑이 튕겨 날아감 (Pop-off 탈락)
          toolAnimClass = 'animate-potlid-pop-off';
        } else {
          // 가드 성공: 선택한 방향으로 냄비뚜껑을 번쩍 내밀며 굳건한 방어!
          if (direction === 'LEFT') toolAnimClass = 'animate-guard-left';
          else if (direction === 'RIGHT') toolAnimClass = 'animate-guard-right';
          else toolAnimClass = 'animate-guard-up';
        }
      } else {
        // CHAM_INPUT 대기 중: 가슴 앞 방어 태세
        toolAnimClass = direction ? 'animate-pulse opacity-95 scale-105' : '-translate-y-1';
      }
    }
  }

  // 3. 캐릭터 고개/몸통 방향 틸트 — RESOLVE 단계에서만 최종 판정 방향으로 틸트
  let charTransform = 'rotate(0deg)';
  if (isResolve) {
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
        className={`relative flex items-center justify-center min-w-0 w-full min-h-[140px] sm:min-h-[220px] rounded-2xl transition-all duration-300 p-1 sm:p-2 ${
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
            className={`w-28 h-36 sm:w-60 sm:h-72 transition-transform duration-200 select-none flex items-center justify-center relative ${
              isHit ? 'animate-bounce scale-95' : ''
            }`}
            style={{ transform: charTransform }}
          >
            <img
              src={displayImageUrl}
              alt={`${name} sprite`}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)]"
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

        {/* 공격(뿅망치) / 수비(냄비뚜껑) 도구 오버레이 레이어 */}
        {isChamOrResolve && toolSrc && (
          <div
            className={`absolute z-20 pointer-events-none transition-all duration-150 flex items-center justify-center ${
              isAttacker
                ? 'w-24 h-24 sm:w-44 sm:h-44 -bottom-2 ' +
                  (playerId === 'p1' ? 'right-0 sm:-right-4' : 'left-0 sm:-left-4')
                : 'w-24 h-24 sm:w-44 sm:h-44 -bottom-1 ' +
                  (playerId === 'p1' ? 'left-0 sm:-left-2' : 'right-0 sm:-right-2')
            } ${toolAnimClass}`}
          >
            <img
              src={toolSrc}
              alt={isAttacker ? 'Toy Hammer' : 'Pot Lid'}
              className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
            />
          </div>
        )}

        {/* 1. 현재 공격하는 자 / 수비하는 자 역할 뱃지 (요청 1 확실한 표현) */}
        {role && role !== 'TIE' && (
          <div
            className={`absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2 px-2.5 py-0.5 sm:px-4 sm:py-1 rounded-full text-[11px] sm:text-xs font-black tracking-wider uppercase border-2 z-30 whitespace-nowrap shadow-lg flex items-center gap-1 ${
              role === 'ATTACKER'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/80 animate-pulse scale-105'
                : 'bg-gradient-to-r from-blue-600 to-sky-500 text-white border-sky-300 ring-2 ring-sky-400/60'
            }`}
          >
            {role === 'ATTACKER' ? (
              <>
                <span>🔥</span>
                <span>공격 (ATTACK)</span>
              </>
            ) : (
              <>
                <span>🛡️</span>
                <span>수비 (GUARD)</span>
              </>
            )}
          </div>
        )}

        {/* 2. RESOLVE 단계에서 확실한 방향성 표시 태그 (요청 2-d) */}
        {isResolve && direction && (
          <div
            className={`absolute bottom-2 left-1/2 -translate-x-1/2 z-30 px-2 sm:px-3 py-0.5 rounded-lg border font-black text-[11px] sm:text-xs shadow-md whitespace-nowrap animate-scaleUp ${
              isAttacker
                ? 'bg-rose-900/90 text-rose-200 border-rose-500 shadow-rose-500/30'
                : 'bg-sky-900/90 text-sky-200 border-sky-500 shadow-sky-500/30'
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
