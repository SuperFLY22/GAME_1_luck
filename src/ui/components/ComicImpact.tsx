import React, { useState } from 'react';

interface ComicImpactProps {
  outcome: 'HIT' | 'DODGE' | 'TIE' | null;
  target: 'p1' | 'p2' | null;
}

export const ComicImpact: React.FC<ComicImpactProps> = ({ outcome, target }) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (!outcome) return null;

  const isHit = outcome === 'HIT';
  const isDodge = outcome === 'DODGE';
  const isTie = outcome === 'TIE';

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
      {isHit && (
        <div
          className={`transform scale-110 sm:scale-135 animate-bounce duration-200 ${
            target === 'p1' ? '-translate-x-16 sm:-translate-x-28' : 'translate-x-16 sm:translate-x-28'
          }`}
        >
          <div className="relative flex items-center justify-center">
            {!imgFailed ? (
              <img
                src="/assets/images/impact_pow.png"
                alt="POW!"
                onError={() => setImgFailed(true)}
                className="w-48 h-48 sm:w-60 sm:h-60 object-contain drop-shadow-[0_12px_24px_rgba(239,68,68,0.9)] animate-pulse"
              />
            ) : (
              /* Fallback SVG */
              <>
                <svg viewBox="0 0 100 100" className="w-44 h-44 drop-shadow-[0_10px_20px_rgba(239,68,68,0.8)]">
                  <polygon
                    points="50,0 63,28 95,15 78,45 100,60 70,72 75,100 48,82 25,98 32,70 0,62 22,42 5,18 36,26"
                    fill="#facc15"
                    stroke="#dc2626"
                    strokeWidth="4"
                  />
                </svg>
                <span className="absolute font-black text-3xl sm:text-4xl text-rose-600 tracking-wider -rotate-12 drop-shadow-[2px_2px_0px_#ffffff] font-comic">
                  POW! 💥
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {isDodge && (
        <div className="animate-bounce">
          <div className="bg-cyan-400 text-slate-950 font-black text-2xl sm:text-3xl px-6 py-2 rounded-2xl border-4 border-slate-900 shadow-[0_8px_0_#0f172a] rotate-6">
            MISS! 💨
          </div>
        </div>
      )}

      {isTie && (
        <div className="animate-pulse">
          <div className="bg-amber-400 text-slate-900 font-black text-2xl sm:text-3xl px-6 py-2 rounded-2xl border-4 border-slate-900 shadow-[0_8px_0_#0f172a] -rotate-3">
            비김! 다시! 🤝
          </div>
        </div>
      )}
    </div>
  );
};
