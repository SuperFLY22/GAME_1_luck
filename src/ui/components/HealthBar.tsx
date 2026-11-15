import React from 'react';
import { Heart, HeartCrack } from 'lucide-react';
import type { DamageLevel } from '../../models/types';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();
  const remainingHp = Math.max(0, maxDamage - damage);

  return (
    <div
      className={`flex flex-col ${
        align === 'right' ? 'items-end' : 'items-start'
      } gap-0.5 sm:gap-1 p-1.5 sm:p-2 bg-slate-900/80 rounded-xl border-2 border-slate-700 shadow-lg overflow-hidden`}
    >
      <div className="flex items-center gap-1 sm:gap-2 max-w-full">
        <span className="text-[10px] sm:text-xs font-bold text-amber-300 uppercase tracking-wider font-pixel truncate max-w-[85px] sm:max-w-[140px]">
          {playerName} {t('arena_hp')}
        </span>
        <span className="text-[10px] sm:text-xs font-black text-rose-400 bg-rose-950/60 px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded border border-rose-800 font-pixel shrink-0">
          {remainingHp} / {maxDamage}
        </span>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 mt-0.5">
        {Array.from({ length: maxDamage }).map((_, index) => {
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
                <HeartCrack className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-500 fill-slate-700" />
              ) : (
                <Heart className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-rose-500 fill-rose-500 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
