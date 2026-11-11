# 🗺️ 참참참 아케이드 (Comic Cham-Cham-Cham) 전체 코드맵 (CODEMAP)

> **리팩토링 에이전트/모델 필독 가이드**  
> 본 문서는 프로젝트 아키텍처, 모듈별 역할, 데이터 흐름, 핵심 심볼 계약(Contract), FSM 상태 전이 규칙 및 회귀 방지 검증 명령어를 집대성한 공식 코드맵입니다.  
> 코드 수정 전 본 문서의 **의존성 단방향 규칙**과 **골든 마스터 테스트** 통과 기준을 반드시 준수하십시오.

---

## 1. 프로젝트 요약 및 기술 스택

- **프로젝트명**: 코믹 참참참 아케이드 (`GAME_1_luck`)
- **장르**: 90년대 복고풍 코믹 액션 1:1 대전 참참참 웹 게임
- **코어 스택**:
  - **Runtime & UI**: React 19, TypeScript (ES2023, Bundler mode), Tailwind CSS, Lucide React, Canvas-Confetti
  - **Build & Dev Tooling**: Vite 8, Rolldown Runtime Chunking, Oxlint
  - **Backend / Realtime**: Supabase Client (Realtime Broadcast & Presence Channels)
  - **Audio Engine**: Web Audio API (합성 신시사이저 + 2D 핫스왑 오디오 버퍼)
  - **Test Suite**: Node.js Native Runner + `tsx` (`gameEngine.test.ts`, `matchmaking.test.ts`, `harness.test.ts`)

---

## 2. 모듈별 파일 맵 및 역할 명세 (File & Symbol Registry)

```text
GAME_1_luck/
├── src/
│   ├── config/
│   │   └── constants.ts                # (47 lines) 게임 타이머, 1P/2P 키 바인딩, 에셋 경로 상수
│   ├── core/                           # [Pure Domain Engine] 외부 I/O 종속성 0%
│   │   └── engine/
│   │       ├── fsm.ts                  # (365 lines) 게임 FSM Reducer, 상태 전이, 라운드/턴 수명주기
│   │       └── rules.ts                # (61 lines) 가위바위보 판정, 참참참 피격/가드 판정, 데미지 누적
│   ├── models/
│   │   └── types.ts                    # (59 lines) GameState, GamePhase, ChamDirection, DTO 명세
│   ├── services/                       # [Application Services & Adapters]
│   │   ├── assets/
│   │   │   └── assetRegistry.ts        # (61 lines) 런타임 이미지 핫스왑 프로브 및 리스너
│   │   ├── network/
│   │   │   ├── matchmakingService.ts   # (239 lines) Supabase Presence 기반 무작위 큐 매칭
│   │   │   ├── roomSessionService.ts   # (238 lines) 실시간 1:1 게임 룸 브로드캐스트 동기화
│   │   │   └── supabaseClient.ts       # (16 lines) Supabase 환경변수 로더 및 클라이언트 싱글톤
│   │   └── sound/
│   │       └── soundManager.ts         # (359 lines) Web Audio 합성음(뿅망치 삑, 냄비 챙) + 외부 오디오
│   ├── ui/                             # [Presentation Layer] 화면 렌더링 및 입력 캡처
│   │   ├── components/
│   │   │   ├── Arena.tsx               # (234 lines) 메인 대전 무대 (1P/2P 대치, 스프라이트, HUD)
│   │   │   ├── CharacterView.tsx       # (165 lines) 표정/데미지/도구 애니메이션 캐릭터 뷰
│   │   │   ├── CharacterSvg.tsx        # (237 lines) 에셋 부재 시 폴백 벡터 SVG 렌더러
│   │   │   ├── ComicImpact.tsx         # (77 lines) HIT 💥 / GUARD 🛡️ / MISS 💨 코믹 이펙트
│   │   │   ├── GameOverModal.tsx       # (142 lines) 승패 결과 판정 및 독립 사운드/재대결 모달
│   │   │   ├── HealthBar.tsx           # (61 lines) 5단계 체력 게이지 및 피격 셰이크
│   │   │   ├── KeyGuide.tsx            # (60 lines) 1P/2P 키보드 입력 가이드 오버레이
│   │   │   ├── LobbyScreen.tsx         # (128 lines) 대기실, 실시간 매칭 큐 UI 및 봇 대전 전환
│   │   │   ├── TimerBar.tsx            # (47 lines) 2초 카운트다운 타이머 프로그레스 바
│   │   │   ├── TitleScreen.tsx         # (128 lines) 메인 타이틀, 모드 선택 (1P vs CPU / 로컬 / 온라인)
│   │   │   └── TouchControls.tsx       # (297 lines) 모바일 가상 D-Pad 및 가위바위보 터치 패드
│   │   ├── hooks/
│   │   │   └── useGameLoop.ts          # (364 lines) 메인 루프, 타이머 틱, 입력 리스너, AI CPU 제어
│   │   ├── App.tsx                     # (89 lines) 최상위 화면 라우팅 (TITLE, LOBBY, ARENA)
│   │   ├── main.tsx                    # (10 lines) React DOM 진입점
│   │   └── index.css                   # Tailwind 스타일 및 뿅망치/냄비뚜껑 키프레임 애니메이션
│   └── utils/
│       └── confetti.ts                 # (31 lines) 승리 축하 파티클 유틸리티
├── tests/                              # [Verification Suites]
│   ├── gameEngine.test.ts              # (99 lines) RPS/참참참/FSM 단위 상태 전이 테스트
│   ├── matchmaking.test.ts             # (75 lines) 대기열 풀 무작위 셔플 및 이탈 복구 테스트
│   └── harness.test.ts                 # (297 lines) 41개 물리 에셋 실존 검사 + E2E 매치 시뮬레이션
├── raw_assets/                         # [Master Assets] 원본 디자인/오디오 소스 보관소
│   ├── art/                            # background, character, actions, impact, rps, tools 원본
│   ├── audio/                          # bgm1, hit1~3, miss, loose, you_win 마스터 오디오
│   └── README.md                       # 슬라이싱 파이프라인 가이드
├── public/assets/                      # [Runtime Assets] 브라우저에 서빙되는 최적화 에셋
│   ├── images/                         # actions/, rps/, tools/, p1_state_*, bg_arcade.png
│   └── sounds/                         # bgm.mp3, climax_bgm.mp3, hit1~3.mp3, dodge.mp3 등
└── docs/
    ├── architecture.md                 # 아키텍처 다이어그램 및 계층 가이드
    └── CODEMAP.md                      # [본 문서]
```

---

## 3. 계층 격리 및 단방향 의존성 규칙 (Unidirectional Architecture)

```
[ui/ (Views & Hooks)]
       │
       ▼ (Calls)
[services/ (Sound, Network, Asset)]
       │
       ▼ (Reads & Computes)
[core/ (FSM, Game Rules)]
       │
       ▼ (Inherits)
[models/ (types.ts)  &  config/ (constants.ts)  &  utils/]
```

### ⚠️ 엄격한 레이어 경계 규칙
1. **`core/` 순수성 유지**: `core/engine/` 내부 코드는 `React`, `window`, `document`, `AudioContext`, `Supabase`를 **절대 import하거나 참조할 수 없음**.
2. **단방향 참조 강제**: 하위 계층(`core`, `models`, `config`)이 상위 계층(`services`, `ui`)을 역참조하는 순환 참조(Circular Dependency) 원천 금지.
3. **Contract First**: 모듈 간 파라미터는 raw `any`나 loosely-typed `object`가 아닌 `src/models/types.ts`의 인터페이스/타입 유니온을 엄격히 사용.

---

## 4. 핵심 데이터 모델 및 계약 (src/models/types.ts)

```typescript
export type GameMode = '1P_CPU' | '1P_2P_LOCAL' | 'ONLINE_MATCH';

export type GamePhase =
  | 'TITLE'
  | 'READY'            // 3, 2, 1 카운트다운
  | 'RPS_INPUT'        // 게임 시작 시 단 1회 선공 결정 가위바위보
  | 'CHAM_INPUT'       // 2.0초 카운트다운 참참참 턴
  | 'RESOLVE'          // 피격/가드 결과 연출 (1.3초)
  | 'ROUND_RESOLVE'    // 턴 교체 딜레이 (1.0초)
  | 'GAME_OVER';       // 5 데미지 도달 승패 확정

export type RPSChoice = 'ROCK' | 'SCISSORS' | 'PAPER' | null;
export type ChamDirection = 'LEFT' | 'UP' | 'RIGHT' | null;
export type Role = 'ATTACKER' | 'DEFENDER' | 'TIE' | null;
export type DamageLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface PlayerState {
  id: string;
  name: string;
  damage: DamageLevel;
  role: Role;
  rpsChoice: RPSChoice;
  chamDirection: ChamDirection;
  isReady: boolean;
}

export interface GameState {
  mode: GameMode;
  phase: GamePhase;
  roundNumber: number;
  p1: PlayerState;
  p2: PlayerState;
  countdown: number;
  turnTimer: number;
  lastOutcome: 'HIT' | 'DODGE' | 'TIE' | null;
  hitTarget: 'p1' | 'p2' | null;
  winner: 'p1' | 'p2' | null;
  screenShake: boolean;
  isOnlineMatch?: boolean;
  matchId?: string | null;
}
```

---

## 5. 게임 FSM(유한상태기계) 상태 전이 및 불변 규칙

### A. 게임 룰 불변성 (Game Mechanics Invariants)
1. **단 1회 RPS 선공 결정 (Initial 1-Time RPS)**:
   - 가위바위보는 매 턴마다 하지 않고 **경기 시작 시 단 1회만** 수행하여 최초 공격자(ATTACKER)와 수비자(DEFENDER)를 결정.
   - 무승부(TIE) 시에만 승패가 날 때까지 RPS 재수행.
2. **2.0초 참참참 카운트다운 (2s Cham Countdown)**:
   - 공격권 결정 후 즉시 `CHAM_INPUT` 단계로 진입하며 2초 타이머 작동.
3. **공격 성공 시 공격권 유지 (Consecutive Hit Attack)**:
   - 공격자 방향 === 수비자 방향일 경우 `HIT`: 수비자 데미지 +1 누적, **공격자는 다음 턴에도 공격권 유지**.
4. **수비 성공 시 즉시 공수 전환 (Guard Role Reversal)**:
   - 공격자 방향 !== 수비자 방향일 경우 `DODGE/GUARD`: 데미지 없음, **다음 턴 공수 역할 즉시 반전** (수비자가 공격자로 전환).
5. **승패 판정 (KO Threshold)**:
   - 누군가 5 데미지(`MAX_DAMAGE = 5`)에 도달하면 즉시 `GAME_OVER`.

### B. FSM 상태 전이 다이어그램

```
[TITLE] ──(START_GAME)──> [READY] (3..2..1)
                             │
                             ▼ (START_RPS)
                       [RPS_INPUT] ──(TIE)──┐
                             │ (승패 결정)   │
                             ▼               │
                       [CHAM_INPUT] <────────┘
                             │
                      (RESOLVE_CHAM)
                             │
                             ▼
                         [RESOLVE]
                        /         \
                 (isHit)           (isDodge/Guard)
                   /                 \
        [공격권 유지]             [공수 역할 반전]
                   \                 /
                    ▼               ▼
                 [ROUND_RESOLVE] (Next Turn)
                        │
                  (Damage >= 5?)
                  /            \
              (Yes)            (No)
                ▼                ▼
           [GAME_OVER]      [CHAM_INPUT] (2초 턴 반복)
```

---

## 6. 에셋 및 사운드 시스템 계약

### A. 런타임 에셋 경로 (`public/assets/`)
- **이미지**:
  - 캐릭터 표정: `/assets/images/p1_state_0.png` ~ `5.png`, `p2_state_0.png` ~ `5.png`
  - 배경: `/assets/images/bg_arcade.png`
  - 액션: `/assets/images/actions/attack_left.png`, `attack_up.png`, `attack_right.png`, `defend_*.png`
  - 도구: `/assets/images/tools/hammer_*.png`, `potlid_*.png`
  - RPS: `/assets/images/rps/rps_1p_rock.png`, `scissors.png`, `paper.png`, `rps_2p_*`
- **오디오**:
  - BGM: `/assets/sounds/bgm.mp3`, `/assets/sounds/climax_bgm.mp3` (매치 포인트 시 자동 전환)
  - 효과음: `hit1~3.mp3`, `dodge.mp3`, `victory.mp3`, `surrender.mp3`, `you_win.mp3`, `loose.mp3`

### B. SoundManager 절차적 사운드 합성기
- 외부 에셋 파일이 없거나 브라우저 오디오 지연 시에도 **내장 Web Audio 신시사이저**가 동작:
  - 뿅망치 타격: 사인파(1400Hz -> 2600Hz -> 950Hz) 0.1s 삑 사운드 합성
  - 냄비 가드: 3중 복합 배음(880Hz, 1760Hz, 3520Hz) 금속 타격음 챙- 사운드 합성

---

## 7. 주요 리팩토링 타겟 (High-ROI Candidates Top 3)

향후 리팩토링 시 우선순위가 높은 3대 타겟입니다:

| 순위 | 타겟 파일 | 현재 상태 및 문제점 | 권장 리팩토링 방향 (To-Be) |
| :---: | :--- | :--- | :--- |
| **1** | `src/ui/hooks/useGameLoop.ts`<br>*(364 lines)* | 타이머 틱, 키보드 이벤트 리스너, CPU AI 결정, 온라인 웹소켓 콜백이 단일 훅에 집중되어 비대함. | `useGameTimer`, `useKeyboardControls`, `useOnlineGameSync` 3개 서브 훅으로 관심사 분리. |
| **2** | `src/ui/components/Arena.tsx`<br>*(234 lines)* | 스프라이트 URL 조합 로직 및 좌/우 플레이어 뷰 레이아웃이 단일 파일에 밀집됨. | 스프라이트 리졸버 유틸리티 함수 추출 및 `ArenaPlayerStage` 컴포넌트 재사용화. |
| **3** | `src/ui/components/TouchControls.tsx`<br>*(297 lines)* | 가위바위보 패드와 3방향 참참참 버튼 렌더링에 중복 스타일 및 좌표 계산 산재. | 컨트롤 버튼 프리셋 컴포넌트(`DirectionalPad`, `RpsPad`)로 분할하여 재사용성 강화. |

---

## 8. 회귀 방지 필수 자가 검증 (Automated Verification)

코드 수정 후 아래 2개 검증을 **반드시 순차 실행**하여 100% Green을 확인해야 합니다.

```bash
# 1. TypeScript 컴파일 무결성 및 프로덕션 번들 빌드 검증
npm run build
# 기대 결과: tsc -b && vite build 무에러 통과 (dist/ 청크 정상 생성)

# 2. 게임 엔진, 대기열 매치, 41개 물리 에셋 하네스 전체 검증
npm test
# 기대 결과:
#  - RPS 9대 경우의 수 및 무승부 통과
#  - 참참참 절대 좌표 판정 통과
#  - 대기열 랜덤 매칭 및 재진입 알고리즘 100% 통과
#  - 총 41개 필수 이미지/오디오 에셋 물리 파일 실존 확인
#  - 1회 RPS 선공 + 5연속 참참참 완승 시뮬레이션 통과
#  - [ALL HARNESS TESTS PASSED] 100% 통과
```

