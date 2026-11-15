import React from 'react';
import type { GameMode, GamePhase } from '../../models/types';
import { useLanguage } from '../context/LanguageContext';

interface KeyGuideProps {
  mode: GameMode;
  phase: GamePhase;
}

export const KeyGuide: React.FC<KeyGuideProps> = ({ mode, phase }) => {
  const { t } = useLanguage();
  const isRps = phase === 'RPS_INPUT';
  const isCham = phase === 'CHAM_INPUT';

  if (!isRps && !isCham) {
    return null;
  }

  const modeText = mode === 'ONLINE_MATCH' ? t('controls_key_online') : t('controls_key_cpu');

  return (
    <div className="hidden sm:flex flex-col items-center gap-2 p-3 bg-slate-900/90 rounded-2xl border-2 border-slate-700 shadow-xl backdrop-blur-sm max-w-xl mx-auto select-none">
      <div className="text-xs font-black text-amber-300 uppercase tracking-widest font-pixel">
        {t('controls_key_guide', { mode: modeText })}
      </div>

      <div className="flex items-center gap-8 text-xs font-bold text-slate-200">
        <div className="flex flex-col items-center gap-1 font-pixel">
          <span className="text-sky-400 font-extrabold">{t('controls_key_my_input')}</span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
              {isRps ? t('controls_key_scissors') : t('controls_key_left')}
            </span>
            <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
              {isRps ? t('controls_key_rock') : t('controls_key_up')}
            </span>
            <span className="px-2 py-1 bg-slate-800 border-2 border-slate-600 rounded-lg shadow-sm text-amber-400">
              {isRps ? t('controls_key_paper') : t('controls_key_right')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
