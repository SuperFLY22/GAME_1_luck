import React, { useEffect, useState } from 'react';
import { assetRegistry } from './services/assets/assetRegistry';
import { soundManager } from './services/sound/soundManager';
import { Arena } from './ui/components/Arena';
import { GameOverModal } from './ui/components/GameOverModal';
import { TitleScreen } from './ui/components/TitleScreen';
import { useGameLoop } from './ui/hooks/useGameLoop';

export const App: React.FC = () => {
  const {
    state,
    startGame,
    restartGame,
    goToTitle,
    handleP1Input,
    handleP2Input,
  } = useGameLoop();

  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());

  // 앱 기동 시 에셋 폴더 프로브 1회 실행
  useEffect(() => {
    assetRegistry.probeCustomAssets();
  }, []);

  const handleStartGame = (mode: Parameters<typeof startGame>[0]) => {
    soundManager.playBgm();
    startGame(mode);
  };

  const handleToggleMute = () => {
    const nextMute = soundManager.toggleMute();
    setIsMuted(nextMute);
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center relative overflow-hidden font-sans bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.78), rgba(2, 6, 23, 0.88)), url('/assets/images/bg_arcade.png')`,
      }}
    >

      {state.phase === 'TITLE' ? (
        <TitleScreen
          onStartGame={handleStartGame}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      ) : (
        <>
          <Arena
            state={state}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onGoTitle={goToTitle}
            onP1Input={handleP1Input}
            onP2Input={handleP2Input}
          />
          {state.phase === 'GAME_OVER' && (
            <GameOverModal
              state={state}
              onRestart={restartGame}
              onGoTitle={goToTitle}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
