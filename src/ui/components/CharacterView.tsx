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

  // 2. 도구 애니메이션 클래스 결정
  let toolAnimClass = '';
  if (isChamOrResolve) {
    if (isAttacker) {
      if (isResolve) {
        // 공격자: 0.08초 강렬한 스윙 (좌 -30deg / 상 0deg 찍기 / 우 +30deg)
        if (direction === 'LEFT') toolAnimClass = 'animate-hammer-left';
        else if (direction === 'RIGHT') toolAnimClass = 'animate-hammer-right';
        else toolAnimClass = 'animate-hammer-up';
      } else {
        // BUG-01: CHAM_INPUT 대기 중 방향 무관하게 단순 pulse만 (방향 숨김)
        toolAnimClass = direction ? 'animate-pulse scale-110' : 'animate-pulse';
      }
    } else if (isDefender) {
      if (isResolve) {
        if (isHit) {
          // 가드 실패: 냄비뚜껑이 튕겨 날아가고(Pop-off/Rotate 탈락)
          toolAnimClass = 'animate-potlid-pop-off';
        } else {
          // 가드 성공: 냄비뚜껑에 망치가 막히며 굳건한 가드
          toolAnimClass = 'animate-guard-block';
        }
      } else {
        // BUG-01: CHAM_INPUT 대기 중 방향 무관하게 단순 pulse만 (방향 숨김)
        toolAnimClass = direction ? 'animate-pulse opacity-90' : '-translate-y-1';
      }
    }
  }

  // 3. 캐릭터 고개/몸통 방향 틸트 — BUG-01: RESOLVE 단계에서만 최종 판정 방향으로 틸트
  let charTransform = 'rotate(0deg)';
  if (isResolve) {
    if (direction === 'LEFT') charTransform = 'rotate(-10deg) translateX(-10px)';
    else if (direction === 'RIGHT') charTransform = 'rotate(10deg) translateX(10px)';
    else if (direction === 'UP') charTransform = 'translateY(-12px)';
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center min-w-[200px] min-h-[220px]">
        {/* 캐릭터 본체 레이어 */}
        {displayImageUrl && !imgFailed ? (
          <div
            className={`w-48 h-56 sm:w-60 sm:h-72 transition-transform duration-200 select-none flex items-center justify-center relative ${
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
            role={role}
          />
        )}

        {/* 공격(뿅망치) / 수비(냄비뚜껑) 도구 오버레이 레이어 */}
        {isChamOrResolve && toolSrc && (
          <div
            className={`absolute z-20 pointer-events-none transition-all duration-150 flex items-center justify-center ${
              isAttacker
                ? 'w-32 h-32 sm:w-40 sm:h-40 -bottom-2 ' +
                  (playerId === 'p1' ? 'right-0 sm:-right-4' : 'left-0 sm:-left-4')
                : 'w-32 h-32 sm:w-40 sm:h-40 -bottom-1 ' +
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

        {/* 역할 뱃지 */}
        {role && (
          <div
            className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black tracking-wider shadow-md uppercase border-2 z-30 ${
              role === 'ATTACKER'
                ? 'bg-amber-400 text-slate-900 border-amber-600 animate-pulse'
                : role === 'DEFENDER'
                ? 'bg-blue-500 text-white border-blue-700'
                : 'bg-slate-300 text-slate-800 border-slate-500'
            }`}
          >
            {role === 'ATTACKER' ? '💥 공격 (뿅망치)' : role === 'DEFENDER' ? '🛡️ 수비 (냄비뚜껑)' : '🤝 비김'}
          </div>
        )}
      </div>

      <div className="mt-2 text-center">
        <span className="inline-block px-3 py-1 bg-slate-900 text-white text-sm sm:text-base font-black rounded-lg border-2 border-slate-700 shadow-md">
          {name}
        </span>
      </div>
    </div>
  );
};
