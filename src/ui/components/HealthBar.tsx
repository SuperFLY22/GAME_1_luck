import React from 'react';
import { Heart, HeartCrack } from 'lucide-react';
import type { DamageLevel } from '../../models/types';

interface HealthBarProps {
  damage: DamageLevel;
  maxDamage?: number;
  align?: 'left' | 'right';
  playerName: string;
}

export const HealthBar: React.FC<HealthBarProps> = ({
  damage,
  maxDamage = 5,
  align = 'left',
  playerName,
}) => {
  const remainingHp = Math.max(0, maxDamage - damage);

  return (
    <div
      className={`flex flex-col ${
        align === 'right' ? 'items-end' : 'items-start'
      } gap-1 p-2 bg-slate-900/80 rounded-xl border-2 border-slate-700 shadow-lg`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider font-pixel">
          {playerName} HP
        </span>
        <span className="text-xs font-black text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800 font-pixel">
          {remainingHp} / {maxDamage}
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5">
        {Array.from({ length: maxDamage }).map((_, index) => {
          // index 0, 1, 2, 3, 4
          // If damage is 2, index 0 and 1 are broken, index 2, 3, 4 are intact (or vice-versa depending on orientation)
          const isBroken = index < damage;

          return (
            <div
              key={index}
              className={`transition-all duration-300 transform ${
                isBroken
                  ? 'scale-90 opacity-40 grayscale rotate-12'
                  : 'scale-100 hover:scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
              }`}
            >
              {isBroken ? (
                <HeartCrack className="w-4 h-4 sm:w-6 sm:h-6 text-slate-500 fill-slate-700" />
              ) : (
                <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-rose-500 fill-rose-500 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
