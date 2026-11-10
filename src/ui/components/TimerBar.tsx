import React from 'react';
import { Timer } from 'lucide-react';

interface TimerBarProps {
  ratio: number; // 0.0 ~ 1.0
  label?: string;
  isUrgent?: boolean;
}

export const TimerBar: React.FC<TimerBarProps> = ({
  ratio,
  label = '타이머',
  isUrgent = false,
}) => {
  const percentage = Math.max(0, Math.min(100, Math.round(ratio * 100)));

  // 색상 단계: 녹색 -> 노란색 -> 강렬한 빨간색
  let barColor = 'from-emerald-400 to-green-500 shadow-emerald-500/50';
  if (ratio < 0.35 || isUrgent) {
    barColor = 'from-amber-400 via-rose-500 to-red-600 shadow-red-500/80 animate-pulse';
  } else if (ratio < 0.65) {
    barColor = 'from-amber-300 to-yellow-500 shadow-yellow-500/50';
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-1.5 px-3 select-none">
      <div className="w-full flex justify-between items-center text-xs font-black text-slate-300">
        <span className="flex items-center gap-1 text-amber-300">
          <Timer className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
          {label}
        </span>
        <span className={`${ratio < 0.3 ? 'text-red-400 font-extrabold text-sm' : 'text-slate-400'}`}>
          {(ratio * 1.5).toFixed(1)}s
        </span>
      </div>

      <div className="w-full h-4 sm:h-5 bg-slate-900 rounded-full p-0.5 border-2 border-slate-700 shadow-inner overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} shadow-md transition-all duration-75 ease-linear`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
