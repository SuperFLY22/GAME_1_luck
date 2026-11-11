import React from 'react';
import { Home, Volume2, VolumeX } from 'lucide-react';
import type {
  ChamDirection,
  GameEngineState,
  RPSChoice,
} from '../../models/types';
import { CharacterView } from './CharacterView';
import { HealthBar } from './HealthBar';
import { TimerBar } from './TimerBar';
import { ComicImpact } from './ComicImpact';
import { KeyGuide } from './KeyGuide';
import { TouchControls } from './TouchControls';

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
  myPlayerId,
}) => {
  const isHit = state.lastOutcome === 'HIT';
  const isScreenShake = isHit && state.phase === 'RESOLVE';

  // 참참참 방향 기호 표시 헬퍼 (좌 / 상 / 우 3방향)
  const getChamEmoji = (dir: ChamDirection) => {
    if (dir === 'LEFT') return '👈 왼쪽';
    if (dir === 'UP') return '👆 위쪽';
    if (dir === 'RIGHT') return '오른쪽 👉';
    return '❓ 대기 중';
  };

  // 가위바위보 손 기호 표시 헬퍼
  const getRpsEmoji = (choice: RPSChoice) => {
    if (choice === 'SCISSORS') return '✌️ 가위';
    if (choice === 'ROCK') return '✊ 바위';
    if (choice === 'PAPER') return '🖐️ 보';
    return '❓';
  };

  // 1P / 2P 동적 액션 및 손 스프라이트 매핑 (RPS_RESULT 단계에서 양쪽이 낸 손을 당당하게 공개)
  const p1RpsSprite =
    state.phase === 'RPS_RESULT' && state.p1.rpsChoice
      ? `/assets/images/rps/rps_1p_${state.p1.rpsChoice.toLowerCase()}.png`
      : null;
  const p2RpsSprite =
    state.phase === 'RPS_RESULT' && state.p2.rpsChoice
      ? `/assets/images/rps/rps_2p_${state.p2.rpsChoice.toLowerCase()}.png`
      : null;

  return (
    <div
      className={`min-h-[100svh] flex flex-col justify-between py-3 px-2 sm:px-6 transition-all duration-100 select-none ${
        isScreenShake ? 'animate-shake' : ''
      }`}
    >
      {/* 1. 상단 바: 라운드 정보 및 시스템 버튼 */}
      <header className="w-full flex items-center justify-between max-w-4xl mx-auto bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-2xl border-2 border-slate-800 shadow-md">
        <button
          type="button"
          onClick={onGoTitle}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>메뉴</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-xs font-extrabold text-amber-400 tracking-wider">
            {state.phase === 'RPS_INPUT' || state.phase === 'RPS_RESULT' ? '선공 결정전' : `TURN ${state.round}`}
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">
            {state.mode === 'ONLINE_MATCH'
              ? '🌐 실시간 온라인 대전'
              : state.mode === '1P_CPU'
              ? '1P vs CPU'
              : '1P vs 2P 로컬'}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
          title={isMuted ? '소리 켜기' : '음소거'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </header>

      {/* 2. 체력 게이지 영역 */}
      <section className="w-full max-w-4xl mx-auto grid grid-cols-2 gap-3 sm:gap-6 mt-2">
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

      {/* 3. 메인 배틀 아레나 (캐릭터 vs 캐릭터 + 중앙 상태 알림) */}
      <main className="relative w-full max-w-4xl mx-auto my-auto flex items-center justify-between px-2 sm:px-8">
        <ComicImpact outcome={state.lastOutcome} target={state.hitTarget} />

        {/* FEAT-01: 공수 전환 알림 배너 — 가드 성공 직후 CHAM_INPUT 진입 시 1.4초 표시 */}
        {state.phase === 'CHAM_INPUT' && state.roleReversed && (
          <div className="absolute top-20 inset-x-0 flex justify-center z-40 pointer-events-none animate-slideDown">
            <div className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-black text-base sm:text-lg px-6 py-2.5 rounded-2xl border-4 border-white/20 shadow-[0_8px_30px_rgba(139,92,246,0.5)]">
              🔄 공수 전환! 수비 성공!
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-lg font-mono">
                {state.p1.role === 'ATTACKER' ? state.p1.name : state.p2.name} 이제 공격!
              </span>
            </div>
          </div>
        )}

        {/* 1P 캐릭터 */}
        <div className="flex-1 flex flex-col items-center relative">
          {/* FEAT-02: 내가 1P일 때 (솔로/로컬 2P 화면공유 아닐 때) "나" 배지 표시 */}
          {myPlayerId === 'p1' && (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-40">
              <span className="text-[10px] font-black bg-sky-500 text-white px-2 py-0.5 rounded-full border border-sky-300 shadow-md">
                👤 나 (1P)
              </span>
            </div>
          )}
          <CharacterView
            playerId="p1"
            name={state.p1.name}
            damage={state.p1.damage}
            direction={state.p1.chamDirection}
            isHit={state.hitTarget === 'p1'}
            role={state.p1.role}
            phase={state.phase}
            rpsSprite={p1RpsSprite}
          />
          {/* 선택 말풍선 */}
          <div className="mt-2 min-h-[30px] flex items-center justify-center">
            {state.phase === 'RPS_INPUT' && state.p1.rpsChoice && (
              <span className="text-xs font-black bg-sky-500/20 text-sky-300 border border-sky-500 px-2.5 py-0.5 rounded-full animate-pulse">
                선택 완료!
              </span>
            )}
            {state.phase === 'RPS_RESULT' && state.p1.rpsChoice && (
              <span className="text-sm font-black bg-sky-500/30 text-white border-2 border-sky-400 px-3 py-1 rounded-xl shadow-md animate-bounce">
                {getRpsEmoji(state.p1.rpsChoice)}
              </span>
            )}
            {state.phase === 'CHAM_INPUT' && state.p1.chamDirection && (
              <span className="text-xs font-black bg-sky-500/20 text-sky-300 border border-sky-500 px-2 py-0.5 rounded-full animate-pulse">
                ✅ 선택 완료! {/* BUG-01: 방향 숨김 — RESOLVE 전까지 상대방에게 노출 방지 */}
              </span>
            )}
            {state.phase === 'RESOLVE' && (
              <span className="text-xs font-bold text-slate-300">
                {state.p1.role === 'ATTACKER' ? '공격' : '수비'}: {getChamEmoji(state.p1.chamDirection)}
              </span>
            )}
          </div>
        </div>

        {/* 중앙 상태 표시창 (카운트다운 / 안내 메시지 / 타이머 바) */}
        <div className="flex-1 max-w-[280px] sm:max-w-xs flex flex-col items-center justify-center text-center px-1 z-10">
          {state.phase === 'READY' && (
            <div className="animate-scaleUp">
              <span className="text-6xl sm:text-7xl font-black text-amber-400 font-comic drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                {state.countdown > 0 ? state.countdown : 'GO!'}
              </span>
            </div>
          )}

          {state.phase === 'RPS_INPUT' && (
            <div className="flex flex-col items-center gap-1.5 w-full">
              <span className="text-base sm:text-xl font-black text-white bg-slate-900/90 px-4 py-1.5 rounded-xl border-2 border-amber-400 shadow-md">
                선공 결정 가위! 바위! 보!
              </span>
              <span className="text-xs text-amber-300 font-bold bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                ⏳ 제한시간 없음! 자유롭게 선택하세요
              </span>
            </div>
          )}

          {state.phase === 'RPS_RESULT' && (
            <div className="flex flex-col items-center gap-2 w-full animate-scaleUp">
              <span
                className={`text-base sm:text-xl font-black px-4 py-1.5 rounded-xl border-2 shadow-lg ${
                  state.lastOutcome === 'TIE'
                    ? 'text-amber-300 bg-amber-950/90 border-amber-400 animate-pulse'
                    : 'text-emerald-300 bg-emerald-950/90 border-emerald-400'
                }`}
              >
                {state.message}
              </span>
              <div className="text-xs sm:text-sm font-bold text-slate-200 bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-700">
                {state.p1.name} ({getRpsEmoji(state.p1.rpsChoice)}) vs {state.p2.name} ({getRpsEmoji(state.p2.rpsChoice)})
              </div>
            </div>
          )}

          {state.phase === 'CHAM_INPUT' && (
            <div className="flex flex-col items-center gap-2 w-full">
              <span className="text-xl sm:text-2xl font-black text-amber-300 bg-rose-950/90 px-4 py-1.5 rounded-xl border-2 border-rose-500 animate-pulse shadow-md">
                참! 참! 참!
              </span>
              <TimerBar ratio={state.timerRemainingRatio} label="2초 카운트다운!" totalSeconds={2.0} isUrgent={state.timerRemainingRatio < 0.4} />
            </div>
          )}

          {state.phase === 'RESOLVE' && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm sm:text-base font-black text-white bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-700">
                {state.message}
              </span>
              <div className="text-xs text-slate-400">
                {state.p1.name} ({state.p1.role === 'ATTACKER' ? '공격' : '수비'}): {getChamEmoji(state.p1.chamDirection)} vs{' '}
                {state.p2.name} ({state.p2.role === 'ATTACKER' ? '공격' : '수비'}): {getChamEmoji(state.p2.chamDirection)}
              </div>
            </div>
          )}
        </div>

        {/* 2P 캐릭터 */}
        <div className="flex-1 flex flex-col items-center relative">
          {/* FEAT-02: 내가 2P일 때 "나" 배지 표시 */}
          {myPlayerId === 'p2' && (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-40">
              <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full border border-rose-300 shadow-md">
                👤 나 (2P)
              </span>
            </div>
          )}
          <CharacterView
            playerId="p2"
            name={state.p2.name}
            damage={state.p2.damage}
            direction={state.p2.chamDirection}
            isHit={state.hitTarget === 'p2'}
            role={state.p2.role}
            phase={state.phase}
            rpsSprite={p2RpsSprite}
          />
          {/* 선택 말풍선 */}
          <div className="mt-2 min-h-[30px] flex items-center justify-center">
            {state.phase === 'RPS_INPUT' && state.p2.rpsChoice && (
              <span className="text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500 px-2.5 py-0.5 rounded-full animate-pulse">
                선택 완료!
              </span>
            )}
            {state.phase === 'RPS_RESULT' && state.p2.rpsChoice && (
              <span className="text-sm font-black bg-rose-500/30 text-white border-2 border-rose-400 px-3 py-1 rounded-xl shadow-md animate-bounce">
                {getRpsEmoji(state.p2.rpsChoice)}
              </span>
            )}
            {state.phase === 'CHAM_INPUT' && state.p2.chamDirection && (
              <span className="text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500 px-2 py-0.5 rounded-full animate-pulse">
                ✅ 선택 완료! {/* BUG-01: 방향 숨김 — RESOLVE 전까지 상대방에게 노출 방지 */}
              </span>
            )}
            {state.phase === 'RESOLVE' && (
              <span className="text-xs font-bold text-slate-300">
                {state.p2.role === 'ATTACKER' ? '공격' : '수비'}: {getChamEmoji(state.p2.chamDirection)}
              </span>
            )}
          </div>
        </div>
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
