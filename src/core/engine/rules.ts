import type { ChamDirection, DamageLevel, RPSChoice, Role } from '../../models/types';

/**
 * 가위바위보 승패 판정
 * @returns { p1Role: Role, p2Role: Role }
 */
export function evaluateRPS(
  p1: RPSChoice,
  p2: RPSChoice
): { p1Role: Role; p2Role: Role } {
  if (!p1 && !p2) return { p1Role: 'TIE', p2Role: 'TIE' };
  if (!p1 && p2) return { p1Role: 'DEFENDER', p2Role: 'ATTACKER' };
  if (p1 && !p2) return { p1Role: 'ATTACKER', p2Role: 'DEFENDER' };
  if (p1 === p2) return { p1Role: 'TIE', p2Role: 'TIE' };

  const isP1Win =
    (p1 === 'SCISSORS' && p2 === 'PAPER') ||
    (p1 === 'ROCK' && p2 === 'SCISSORS') ||
    (p1 === 'PAPER' && p2 === 'ROCK');

  return isP1Win
    ? { p1Role: 'ATTACKER', p2Role: 'DEFENDER' }
    : { p1Role: 'DEFENDER', p2Role: 'ATTACKER' };
}

/**
 * CPU 의사 결정 헬퍼
 */
export function getCpuRpsChoice(): RPSChoice {
  const choices: RPSChoice[] = ['ROCK', 'SCISSORS', 'PAPER'];
  return choices[Math.floor(Math.random() * choices.length)];
}

export function getCpuChamDirection(): ChamDirection {
  const dirs: ('LEFT' | 'UP' | 'RIGHT')[] = ['LEFT', 'UP', 'RIGHT'];
  return dirs[Math.floor(Math.random() * dirs.length)];
}

/**
 * 다음 데미지 레벨 산출 (최대 5)
 */
export function incrementDamage(current: DamageLevel): DamageLevel {
  const next = current + 1;
  return (next > 5 ? 5 : next) as DamageLevel;
}

/**
 * 참참참 판정 (좌 / 상 / 우 3방향 판정)
 * 공격자의 지목 방향과 수비자의 가드/회피 방향이 일치하면 피격(HIT, 가드 실패)
 */
export function evaluateCham(
  attackerDir: ChamDirection,
  defenderDir: ChamDirection
): { isHit: boolean } {
  const finalAttacker = attackerDir ?? getCpuChamDirection();
  const finalDefender = defenderDir ?? getCpuChamDirection();

  return {
    isHit: finalAttacker === finalDefender,
  };
}
