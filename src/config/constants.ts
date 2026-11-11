/**
 * 전역 게임 설정 및 타이머/키 매핑 상수
 */

export const GAME_CONFIG = {
  MAX_DAMAGE: 5,
  COUNTDOWN_STEP_MS: 500, // READY 단계 3, 2, 1 각 0.5초
  RPS_LIMIT_MS: 1500,     // 최초 선공 결정 가위바위보 대기 시간 1.5초
  CHAM_LIMIT_MS: 3000,    // 참참참 카운트다운 타이머 3.0초 (공격자가 3초 안에 미입력 시 공수 전환 패널티)
  RESOLVE_DISPLAY_MS: 1400, // 피격/회피 결과 연출 시간 (1.4초)
  ROLE_SWAP_PAUSE_MS: 1500, // 공수 교대 시 플레이어 인지용 일시정지(pause) 시간 (1.5초)
  NEXT_ROUND_DELAY_MS: 1000,
} as const;

export const KEY_BINDINGS = {
  P1_LOCAL: {
    LEFT: ['KeyA', 'a', 'A'],
    UP: ['KeyW', 'w', 'W'],
    RIGHT: ['KeyD', 'd', 'D'],
  },
  P2_LOCAL: {
    LEFT: ['ArrowLeft'],
    UP: ['ArrowUp'],
    RIGHT: ['ArrowRight'],
  },
  // 1P vs CPU 모드에서는 화살표와 WASD 모두 1P 조작으로 허용
  SOLO_P1: {
    LEFT: ['KeyA', 'a', 'A', 'ArrowLeft'],
    UP: ['KeyW', 'w', 'W', 'ArrowUp'],
    RIGHT: ['KeyD', 'd', 'D', 'ArrowRight'],
  },
} as const;

export const ASSET_PATHS = {
  IMAGES: {
    BACKGROUND: '/assets/images/bg_arcade.png',
  },
  SOUNDS: {
    RPS_CHANT: '/assets/sounds/rps_chant.mp3',
    HIT: '/assets/sounds/hit.mp3',
    DODGE: '/assets/sounds/dodge.mp3',
    VICTORY: '/assets/sounds/victory.mp3',
    SURRENDER: '/assets/sounds/surrender.mp3',
    COUNTDOWN: '/assets/sounds/countdown.mp3',
  },
} as const;
