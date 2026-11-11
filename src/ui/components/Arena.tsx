import React from 'react';
import { Home, Volume2, VolumeX } from 'lucide-react';
import type {
  ChamDirection,
  GameEngineState,
  RPSChoice,
} from '../../models/types';
import { HealthBar } from './HealthBar';
import { KeyGuide } from './KeyGuide';
import { TouchControls } from './TouchControls';
import { FirstPersonArena } from './battle/FirstPersonArena';

interface ArenaProps {
  state: GameEngineState;
  isMuted: boolean;
  onToggleMute: () => void;
  onGoTitle: () => void;
  onP1Input: (type: 'rps' | 'cham', value: RPSChoice | ChamDirection) => void;
  onP2Input: (type: 'rps' | 'cham', value: RPSChoice | ChamDirection) => void;
  myPlayerId?: 'p1' | 'p2'; // FEAT-02: 온라인/솔로 모드에서 "내가 누구인지" 전달
}

export const Arena: React.FC<ArenaProps> = ({
  state,
  isMuted,
  onToggleMute,
  onGoTitle,
  onP1Input,
  onP2Input,
  myPlayerId = 'p1',
}) => {
  const isHit = state.lastOutcome === 'HIT';
  const isScreenShake = isHit && state.phase === 'RESOLVE';

  return (
    <div
      className={`min-h-[100svh] flex flex-col justify-between py-2 sm:py-3 px-1 sm:px-6 transition-all duration-100 select-none relative ${
        isScreenShake ? 'animate-shake' : ''
      }`}
    >
      {/* 90년대 아케이드 감성 CRT 비네팅 & 미세 스캔라인 오버레이 */}
      <div className="fixed inset-0 crt-vignette crt-scanlines z-30 pointer-events-none" />

      {/* 피격(HIT) 순간 강렬한 백색 임팩트 플래시 */}
      {isHit && state.phase === 'RESOLVE' && (
        <div className="fixed inset-0 bg-white pointer-events-none z-50 animate-hit-flash" />
      )}

      {/* 1. 상단 바: 라운드 정보 및 시스템 버튼 */}
      <header className="w-full flex items-center justify-between max-w-4xl mx-auto bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl border-2 border-slate-800 shadow-md relative z-10">
        <button
          type="button"
          onClick={onGoTitle}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-700 transition-colors"
        >
          <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>메뉴</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[11px] sm:text-xs font-extrabold text-amber-400 font-pixel tracking-wider">
            {state.phase === 'RPS_INPUT' || state.phase === 'RPS_RESULT' ? '선공 결정전' : `TURN ${state.round}`}
          </span>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold font-pixel">
            {state.mode === 'ONLINE_MATCH'
              ? '🌐 온라인 대전'
              : '1P vs CPU (AI)'}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
          title={isMuted ? '소리 켜기' : '음소거'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />}
        </button>
      </header>

      {/* 2. 체력 게이지 영역 */}
      <section className="w-full max-w-4xl mx-auto grid grid-cols-2 gap-2 sm:gap-6 mt-1 sm:mt-2">
        <HealthBar
          damage={state.p1.damage}
          playerName={state.p1.name}
          align="left"
        />
        <HealthBar
          damage={state.p2.damage}
          playerName={state.p2.name}
          align="right"
        />
      </section>

      {/* 3. 메인 배틀 아레나 (1인칭 오버더숄더 Punch-Out 스테이지) */}
      <main className="relative w-full max-w-4xl mx-auto my-auto flex flex-col items-center justify-between overflow-visible flex-1">
        <FirstPersonArena state={state} myPlayerId={myPlayerId} />
      </main>

      {/* 4. 컨트롤러 및 키 가이드 영역 */}
      <footer className="w-full max-w-4xl mx-auto flex flex-col gap-2 mt-2">
        <TouchControls
          mode={state.mode}
          phase={state.phase}
          myRoleInRoom={state.online?.myRoleInRoom}
          p1Role={state.p1.role}
          p2Role={state.p2.role}
          p1ChosenRps={state.p1.rpsChoice}
          p1ChosenCham={state.p1.chamDirection}
          p2ChosenRps={state.p2.rpsChoice}
          p2ChosenCham={state.p2.chamDirection}
          onP1Input={onP1Input}
          onP2Input={onP2Input}
        />
        <KeyGuide mode={state.mode} phase={state.phase} />
      </footer>
    </div>
  );
};
