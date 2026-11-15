import type { ChamDirection, DamageLevel, RPSChoice } from '../../../models/types';
import type { TranslationKey } from '../../../config/i18n';

export function clampDamage(damage: number): DamageLevel {
  return Math.min(Math.max(damage, 0), 5) as DamageLevel;
}

export function getDirKey(direction: ChamDirection): string {
  return direction ? direction.toLowerCase() : 'up';
}

export function getPotlidImgUrl(direction: ChamDirection): string {
  const dirKey = getDirKey(direction);
  return `/assets/images/first_person/self_guard_${dirKey}.png`;
}

export function getPotlidFlyClass(
  direction: ChamDirection,
  viewType: 'self' | 'opponent'
): string {
  if (viewType === 'opponent') {
    if (direction === 'LEFT') return 'animate-potlid-fly-right';
    if (direction === 'RIGHT') return 'animate-potlid-fly-left';
    return 'animate-potlid-fly-up';
  }
  // self POV view
  if (direction === 'LEFT') return 'animate-potlid-fly-left';
  if (direction === 'RIGHT') return 'animate-potlid-fly-right';
  return 'animate-potlid-fly-up';
}

export function getRpsSpriteUrl(id: 'p1' | 'p2', choice: string | null): string | null {
  if (!choice) return null;
  const prefix = id === 'p1' ? '1p' : '2p';
  return `/assets/images/rps/rps_${prefix}_${choice.toLowerCase()}.png`;
}

export function getRpsLabel(
  choice: RPSChoice,
  t: (key: TranslationKey) => string
): string {
  if (choice === 'ROCK') return t('battle_hand_rock');
  if (choice === 'SCISSORS') return t('battle_hand_scissors');
  if (choice === 'PAPER') return t('battle_hand_paper');
  return '';
}
