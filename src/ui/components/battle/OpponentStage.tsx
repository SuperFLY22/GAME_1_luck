import React from 'react';
import type { ChamDirection, DamageLevel, GamePhase, Role, RPSChoice } from '../../../models/types';
import { useLanguage } from '../../context/LanguageContext';
import { ActionVideo } from './ActionVideo';

interface OpponentStageProps {
  id: 'p1' | 'p2';
  name: string;
  damage: DamageLevel;
  direction: ChamDirection;
  role: Role;
  phase: GamePhase;
  isHit: boolean;
  lastOutcome: 'HIT' | 'DODGE' | 'TIE' | null;
  rpsChoice: RPSChoice;
  rpsSprite?: string | null;
}

export const OpponentStage: React.FC<OpponentStageProps> = ({
  name,
  damage,
  direction,
  role,
  phase,
  isHit,
  lastOutcome,
  rpsChoice,
  rpsSprite,
}) => {
  const { t } = useLanguage();
  const isAttacker = role === 'ATTACKER';
  const isDefender = role === 'DEFENDER';
  const isResolve = phase === 'RESOLVE';

  const dirKey = direction ? direction.toLowerCase() : 'up';

  // 7번 규칙: 상대방 공격 대칭 각도 및 확실한 좌/우 위치 클래스
  // 상대방 LEFT  -> 내 시점 우측 대각 쇄도 (4시 방향, +68px~+105px)
  // 상대방 UP    -> 내 시점 중앙 12시 정면 (+22px~+30px)
  // 상대방 RIGHT -> 내 시점 좌측 대각 쇄도 (8시 방향, -68px~-105px)
  let oppSymmetricClass = 'opp-action-symmetric-up';
  if (direction === 'LEFT') oppSymmetricClass = 'opp-action-symmetric-left';
  else if (direction === 'RIGHT') oppSymmetricClass = 'opp-action-symmetric-right';

  // 연출 상태 분기
  let oppVideoConfig: { src: string; startTime: number; endTime: number; playbackRate?: number } | null = null;
  let oppStaticAttackImg: string | null = null;
  let oppFlyingPotlidImg: string | null = null;
  let oppFlyingPotlidClass = '';
  let oppActionClass = oppSymmetricClass;

  if (isResolve) {
    if (isAttacker && direction) {
      if (lastOutcome === 'HIT') {
        // 상대방 공격 성공: opp_attack.mp4 0~2초 구간, 1.5배속 재생 및 대칭 각도 적용
        oppVideoConfig = {
          src: '/assets/videos/opp_attack.mp4',
          startTime: 0,
          endTime: 2,
          playbackRate: 1.5,
        };
        oppActionClass = oppSymmetricClass;
      } else if (lastOutcome === 'DODGE') {
        // 상대방 공격 실패 (내가 수비 성공):
        // opp_attack_{dir}.png 정적 이미지를 확실한 방향성에 맞게 대칭 출력
        oppStaticAttackImg = `/assets/images/first_person/opp_attack_${dirKey}.png`;
        oppActionClass = oppSymmetricClass;
      }
    } else if (isDefender) {
      if (lastOutcome === 'DODGE') {
        // 상대방 가드 성공: opp_dodge.mp4 0.5~2.5초 구간, 각도 변화 없이 그냥 12시 정면
        oppVideoConfig = {
          src: '/assets/videos/opp_dodge.mp4',
          startTime: 0.5,
          endTime: 2.5,
        };
        oppActionClass = 'opp-dodge-center';
      } else if (isHit && direction) {
        // 상대방 수비 실패 (내가 공격 성공):
        // 상대방이 수비했던 방향의 냄비뚜껑 이미지가 뱅글뱅글 날아가는 효과
        oppFlyingPotlidImg = `/assets/images/first_person/self_guard_${dirKey}.png`;
        if (direction === 'LEFT') oppFlyingPotlidClass = 'animate-potlid-fly-right';
        else if (direction === 'RIGHT') oppFlyingPotlidClass = 'animate-potlid-fly-left';
        else oppFlyingPotlidClass = 'animate-potlid-fly-up';
      }
    }
  }

  // 상대방 상태 5단계 표현 반영 본체 이미지
  const safeDamage = Math.min(Math.max(damage, 0), 5);
  const oppStateImg = `/assets/images/first_person/opp_state_${safeDamage}.png`;

  // 기본 대기 시 (RESOLVE가 아닐 때) 0 데미지면 idle 비디오
  const isIdleVideo = !isResolve && damage === 0 && phase !== 'CHAM_INPUT';

  // 피격 시 몸체 흔들림 애니메이션
  const bodyHitAnimClass = isResolve && isHit ? 'animate-fp-opp-hit' : '';

  const getRpsLabel = (choice: RPSChoice) => {
    if (choice === 'ROCK') return t('battle_hand_rock');
    if (choice === 'SCISSORS') return t('battle_hand_scissors');
    if (choice === 'PAPER') return t('battle_hand_paper');
    return '';
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none z-10 w-full">
      {/* 상대방 이름 및 역할 뱃지 */}
      <div className="flex items-center gap-2 mb-1 z-20 font-pixel">
        <span className="text-xs sm:text-sm font-black bg-slate-900/90 text-rose-300 border border-rose-500/60 px-2.5 py-0.5 rounded-full shadow-md">
          {t('battle_opp_prefix', { name })}
        </span>
        {role && role !== 'TIE' && (
          <span
            className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border shadow-sm ${
              isAttacker
                ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
                : 'bg-sky-600 text-white border-sky-300'
            }`}
          >
            {isAttacker ? t('battle_badge_attack') : t('battle_badge_guard')}
          </span>
        )}
      </div>

      {/* 1. 상대방 본체 래퍼 (화면 정중앙 정렬) */}
      <div
        className={`relative flex items-center justify-center w-36 h-44 sm:w-64 sm:h-72 md:w-68 md:h-76 transition-transform duration-200 mx-auto ${
          isAttacker && (phase === 'CHAM_INPUT' || phase === 'RESOLVE')
            ? 'aura-attacker rounded-3xl'
            : isDefender && (phase === 'CHAM_INPUT' || phase === 'RESOLVE')
            ? 'aura-defender rounded-3xl'
            : ''
        }`}
      >
        {/* 본체 상태 이미지 (상태 0~5단계 반영) */}
        <div className={`w-full h-full flex items-center justify-center ${bodyHitAnimClass}`}>
          {isIdleVideo ? (
            <video
              src="/assets/videos/opp_idle.mp4"
              autoPlay
              loop
              muted
              playsInline
              poster={oppStateImg}
              className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
            />
          ) : (
            <img
              src={oppStateImg}
              alt={`${name} sprite state ${safeDamage}`}
              className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
            />
          )}
        </div>

        {/* 비디오 액션 (공격 성공 시 opp_attack 0~2초 (1.5배속, 20% 축소) 또는 가드 성공 시 opp_dodge 0.5~2.5초) */}
        {oppVideoConfig && (
          <div
            className={`absolute -inset-10 sm:-inset-16 z-30 flex items-center justify-center pointer-events-none transition-transform duration-200 ${oppActionClass} ${
              isAttacker && lastOutcome === 'HIT' ? 'scale-[0.80]' : ''
            }`}
          >
            <ActionVideo
              src={oppVideoConfig.src}
              startTime={oppVideoConfig.startTime}
              endTime={oppVideoConfig.endTime}
              playbackRate={oppVideoConfig.playbackRate}
              className="w-full h-full object-contain drop-shadow-[0_20px_35px_rgba(239,68,68,0.9)]"
            />
          </div>
        )}

        {/* 상대방 공격 실패 (내가 수비 성공) 시: opp_attack_{dir}.png 정적 이미지 대칭 출력 */}
        {oppStaticAttackImg && (
          <div
            className={`absolute -inset-10 sm:-inset-16 z-30 flex items-center justify-center pointer-events-none transition-transform duration-200 ${oppActionClass}`}
          >
            <img
              src={oppStaticAttackImg}
              alt="Opponent Attack Stopped"
              className="w-full h-full object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.85)]"
            />
          </div>
        )}

        {/* 상대방 수비 실패 (내가 공격 성공) 시: 냄비뚜껑 뱅글뱅글 날아가는 연출 */}
        {oppFlyingPotlidImg && (
          <div
            className={`absolute -top-12 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center w-40 h-40 sm:w-56 sm:h-56 pointer-events-none ${oppFlyingPotlidClass}`}
          >
            <img
              src={oppFlyingPotlidImg}
              alt="Opponent Lost Potlid"
              className="w-full h-full object-contain drop-shadow-[0_15px_25px_rgba(251,191,36,0.9)]"
            />
          </div>
        )}

        {/* 가위바위보 결과 (RPS_RESULT 단계) */}
        {phase === 'RPS_RESULT' && rpsChoice && (
          <aside
            aria-label="상대방 가위바위보 결과"
            className="absolute top-1/2 -translate-y-1/2 -right-3 sm:-right-20 z-30 flex flex-col items-center gap-0.5 sm:gap-1 bg-slate-950/95 border-2 border-rose-400/90 p-1 sm:p-2 rounded-xl sm:rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-scaleUp pointer-events-none font-pixel"
          >
            <div className="text-[9px] sm:text-xs font-black text-rose-300">{t('battle_opp_choice_label')}</div>
            {rpsSprite ? (
              <img
                src={rpsSprite}
                alt={rpsChoice}
                className="w-8 h-8 sm:w-14 sm:h-14 object-contain filter drop-shadow-[0_2px_8px_rgba(244,63,94,0.6)]"
              />
            ) : (
              <span className="text-xl sm:text-3xl">
                {rpsChoice === 'ROCK' ? '✊' : rpsChoice === 'SCISSORS' ? '✌️' : '🖐️'}
              </span>
            )}
            <span className="text-white font-black text-[10px] sm:text-xs whitespace-nowrap bg-rose-600/90 border border-rose-400 px-1.5 py-0.5 rounded-md shadow-sm">
              {getRpsLabel(rpsChoice)}
            </span>
          </aside>
        )}
      </div>
    </div>
  );
};
