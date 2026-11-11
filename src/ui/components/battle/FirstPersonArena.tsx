import React from 'react';
import type { ChamDirection, GameEngineState } from '../../../models/types';
import { ComicImpact } from '../ComicImpact';
import { TimerBar } from '../TimerBar';
import { OpponentStage } from './OpponentStage';
import { PlayerSelfStage } from './PlayerSelfStage';

interface FirstPersonArenaProps {
  state: GameEngineState;
  myPlayerId?: 'p1' | 'p2';
}

/**
 * 1인칭 오버더숄더(Over-the-shoulder) 참참참 배틀 무대
 * - 상단: 원경의 상대방 정면 뷰
 * - 중앙: 카운트다운 타이머 & 참참참 판정 메시지 & 코믹 임팩트
 * - 하단: 전경의 내 캐릭터 뒷모습 뷰 (공격 스윙 & 가드)
 */
export const FirstPersonArena: React.FC<FirstPersonArenaProps> = ({
  state,
  myPlayerId = 'p1',
}) => {
  // 관점 결정: 내가 p2이면 p2가 Self, p1이 Opponent
  const isMeP1 = myPlayerId === 'p1';
  const selfPlayer = isMeP1 ? state.p1 : state.p2;
  const oppPlayer = isMeP1 ? state.p2 : state.p1;

  // 가위바위보 손 스프라이트 경로
  const oppRpsSprite =
    state.phase === 'RPS_RESULT' && oppPlayer.rpsChoice
      ? `/assets/images/rps/rps_${oppPlayer.id}_${oppPlayer.rpsChoice.toLowerCase()}.png`
      : null;
  const selfRpsSprite =
    state.phase === 'RPS_RESULT' && selfPlayer.rpsChoice
      ? `/assets/images/rps/rps_${selfPlayer.id}_${selfPlayer.rpsChoice.toLowerCase()}.png`
      : null;

  // 참참참 방향 기호 헬퍼
  const getChamLabel = (dir: ChamDirection) => {
    if (dir === 'LEFT') return '👈 왼쪽';
    if (dir === 'UP') return '👆 위쪽';
    if (dir === 'RIGHT') return '오른쪽 👉';
    return null;
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex-1 flex flex-col justify-between items-center perspective-stage min-h-[380px] sm:min-h-[480px] py-1">
      {/* 1. 코믹 임팩트 (HIT / DODGE 이펙트) */}
      <ComicImpact outcome={state.lastOutcome} target={state.hitTarget} />

      {/* 2. 공수 교대 배너 (ROLE_SWAP Pause 단계) */}
      {state.phase === 'ROLE_SWAP' && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-scaleUp">
          <div className="flex flex-col items-center gap-2 sm:gap-3 bg-slate-950/95 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-4 border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.7)] text-center max-w-xs sm:max-w-md mx-3">
            <span className="text-3xl sm:text-5xl animate-bounce">🔄</span>
            <span className="text-xl sm:text-3xl font-black text-amber-400 font-comic tracking-wider">
              공수 교대!
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500 to-rose-600 text-slate-950 font-black text-xs sm:text-base px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl shadow-md">
              <span>🔥</span>
              <span>{state.p1.role === 'ATTACKER' ? state.p1.name : state.p2.name} 공격 차례!</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. 상단: 상대방 스테이지 (원경 정면) */}
      <div className="w-full flex justify-center pt-2 sm:pt-4">
        <OpponentStage
          id={oppPlayer.id}
          name={oppPlayer.name}
          damage={oppPlayer.damage}
          direction={oppPlayer.chamDirection}
          role={oppPlayer.role}
          phase={state.phase}
          isHit={state.hitTarget === oppPlayer.id}
          lastOutcome={state.lastOutcome}
          rpsChoice={oppPlayer.rpsChoice}
          rpsSprite={oppRpsSprite}
        />
      </div>

      {/* 4. 중앙: 상태/카운트다운/타이머/방향 알림 바 */}
      <div className="w-full max-w-sm flex flex-col items-center justify-center text-center my-auto z-30 px-2">
        {state.phase === 'READY' && (
          <div className="animate-scaleUp">
            <span className="text-5xl sm:text-7xl font-black text-amber-400 font-comic drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
              {state.countdown > 0 ? state.countdown : 'GO!'}
            </span>
          </div>
        )}

        {state.phase === 'RPS_INPUT' && (
          <div className="flex flex-col items-center gap-1 animate-scaleUp">
            <span className="text-sm sm:text-lg font-black text-white bg-slate-900/90 px-3 py-1 rounded-xl border border-amber-400 shadow-md">
              가위! 바위! 보!
            </span>
            <span className="text-[10px] sm:text-xs text-amber-300 font-bold bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
              하단 버튼으로 선택하세요
            </span>
          </div>
        )}

        {state.phase === 'RPS_RESULT' && (
          <div className="flex flex-col items-center gap-1 animate-scaleUp">
            <span
              className={`text-xs sm:text-base font-black px-3 py-1 rounded-xl border shadow-lg ${
                state.lastOutcome === 'TIE'
                  ? 'text-amber-300 bg-amber-950/90 border-amber-400 animate-pulse'
                  : 'text-emerald-300 bg-emerald-950/90 border-emerald-400'
              }`}
            >
              {state.message}
            </span>
          </div>
        )}

        {state.phase === 'CHAM_INPUT' && (
          <div className="flex flex-col items-center gap-1 w-full max-w-xs animate-scaleUp">
            <span className="text-xs sm:text-sm font-black text-amber-300 bg-amber-950/90 px-3 py-0.5 rounded-md border border-amber-500 shadow-md">
              🔥 {selfPlayer.role === 'ATTACKER' ? '나의 공격 차례!' : `${oppPlayer.name} 공격!`}
            </span>
            <span className="text-base sm:text-2xl font-black text-white bg-rose-950/90 px-3 py-1 rounded-xl border border-rose-500 animate-pulse shadow-md">
              참! 참! 참!
            </span>
            <TimerBar
              ratio={state.timerRemainingRatio}
              label="3초 카운트다운!"
              totalSeconds={3.0}
              isUrgent={state.timerRemainingRatio < 0.35}
            />
          </div>
        )}

        {state.phase === 'RESOLVE' && (
          <div className="flex flex-col items-center gap-1 animate-scaleUp">
            <span
              className={`text-xs sm:text-base font-black px-3 py-1 rounded-lg border shadow-md ${
                state.lastOutcome === 'HIT'
                  ? 'bg-rose-950 text-rose-300 border-rose-500'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-500'
              }`}
            >
              {state.message}
            </span>
            <div className="text-[10px] sm:text-xs font-bold text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-2">
              <span>나: {getChamLabel(selfPlayer.chamDirection) || '선택 없음'}</span>
              <span>vs</span>
              <span>상대: {getChamLabel(oppPlayer.chamDirection) || '선택 없음'}</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. 하단: 내 캐릭터 뒷모습 스테이지 (전경 오버더숄더) */}
      <div className="w-full flex justify-center pb-0">
        <PlayerSelfStage
          id={selfPlayer.id}
          name={selfPlayer.name}
          damage={selfPlayer.damage}
          direction={selfPlayer.chamDirection}
          role={selfPlayer.role}
          phase={state.phase}
          isHit={state.hitTarget === selfPlayer.id}
          lastOutcome={state.lastOutcome}
          rpsChoice={selfPlayer.rpsChoice}
          rpsSprite={selfRpsSprite}
        />
      </div>
    </div>
  );
};
