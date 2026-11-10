import React, { useEffect, useState } from 'react';
import { assetRegistry } from '../../services/assets/assetRegistry';
import type { ChamDirection, DamageLevel, Role } from '../../models/types';
import { CharacterSvg } from './CharacterSvg';

interface CharacterViewProps {
  playerId: 'p1' | 'p2';
  name: string;
  damage: DamageLevel;
  direction: ChamDirection;
  isHit: boolean;
  role: Role;
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
  actionSprite,
  rpsSprite,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    return assetRegistry.subscribe(() => setTick((t) => t + 1));
  }, []);

  const hasCustom = assetRegistry.hasCustomImage(playerId, damage);
  const customFaceUrl = assetRegistry.getCustomImageUrl(playerId, damage);

  // 현재 표시할 이미지 (액션 스프라이트 > 가위바위보 손 > 기본 표정)
  const displayImageUrl = actionSprite || rpsSprite || (hasCustom ? customFaceUrl : null);

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center min-w-[200px] min-h-[220px]">
        {displayImageUrl && !imgFailed ? (
          <div
            className={`w-48 h-56 sm:w-60 sm:h-72 transition-transform duration-200 select-none flex items-center justify-center ${
              isHit ? 'animate-bounce scale-95' : ''
            }`}
            style={{
              transform:
                !actionSprite && direction === 'LEFT'
                  ? 'rotate(-16deg) translateX(-12px)'
                  : !actionSprite && direction === 'RIGHT'
                  ? 'rotate(16deg) translateX(12px)'
                  : 'rotate(0deg)',
            }}
          >
            <img
              src={displayImageUrl}
              alt={`${name} sprite`}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.45)]"
            />
            {role && (
              <div
                className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black tracking-wider shadow-md uppercase border-2 ${
                  role === 'ATTACKER'
                    ? 'bg-amber-400 text-slate-900 border-amber-600 animate-pulse'
                    : role === 'DEFENDER'
                    ? 'bg-blue-500 text-white border-blue-700'
                    : 'bg-slate-300 text-slate-800 border-slate-500'
                }`}
              >
                {role === 'ATTACKER' ? '💥 공격 (뿅망치)' : role === 'DEFENDER' ? '🛡️ 수비 (냄비)' : '🤝 비김'}
              </div>
            )}
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
      </div>

      <div className="mt-2 text-center">
        <span className="inline-block px-3 py-1 bg-slate-900 text-white text-sm sm:text-base font-black rounded-lg border-2 border-slate-700 shadow-md">
          {name}
        </span>
      </div>
    </div>
  );
};
