# 🗺️ 딱대! 코믹 참참참 아케이드 (Cham-Cham-Cham) 전체 코드맵 (CODEMAP)

> **LLM 리팩토링 & 코드 점검용 압축 가이드**  
> 본 문서는 다른 LLM/에이전트가 최소한의 토큰으로 전체 프로젝트 아키텍처, 모듈별 입출력 계약, FSM 상태 머신, 의존성 제약 및 검증 명령어를 파악할 수 있도록 고안된 공식 코드맵입니다.

---

## 1. 프로젝트 요약 & 핵심 스택

- **프로젝트명**: 이리와 딱 대! 코믹 참참참 (`GAME_1_luck`)
- **타입**: 90년대 복고풍 코믹 1인칭 1:1 대전 참참참 웹 게임
- **런타임 & UI**: React 19, TypeScript (ES2023, Bundler), Tailwind CSS, Lucide React, Canvas-Confetti
- **빌드 & 툴링**: Vite 8, Rolldown Runtime Chunking, Oxlint
- **서버 & 실시간 네트워크**: Cloudflare Workers + Durable Objects (`worker/index.ts`), WebSocket (Lobby/Room), REST Fallback
- **오디오 엔진**: Web Audio API 절차적 사운드 신시사이저 + 2D 오디오 버퍼 핫스왑 (`soundManager.ts`)
- **검증 환경**: Node.js Native Runner + `tsx` (`npm test`, 전수 5,000판 E2E 가상 시뮬레이션 포함)

---

## 2. 파일 레지스트리 및 심볼 맵 (File Registry)

```text
GAME_1_luck/
├── src/
│   ├── config/
│   │   ├── constants.ts          (46L)  # 타이머(RPS 5s, Cham 2s), 데미지(0~5), 조작키, 에셋 경로 상수
│   │   ├── i18n.ts               (281L) # ko / en 번역 사전 및 문자열 보간 유틸
│   │   └── websocket.ts          (26L)  # Cloudflare Worker WS/HTTP URL 동적 산출 (VITE_WS_URL)
│   ├── core/                     # [Pure Domain Engine] 외부 I/O, UI, Web API 종속성 0%
│   │   └── engine/
│   │       ├── fsm.ts            (469L) # GameAction, createInitialState, gameReducer (핵심 상태머신)
│   │       └── rules.ts          (62L)  # evaluateRPS, evaluateCham, getCpuChoice, incrementDamage
│   ├── models/
│   │   └── types.ts              (84L)  # GameEngineState, PlayerState, GamePhase, ActionFrame 계약
│   ├── services/                 # [Application Services & Adapters]
│   │   ├── network/
│   │   │   ├── guestbookService.ts   (259L) # 방명록 CRUD, 낙관적 UI, HTTP/WS 폴백, 캐시
│   │   │   ├── matchmakingService.ts (289L) # WS 로비 큐, 매칭 통계, heartbeat, 소켓 관리
│   │   │   └── roomSessionService.ts (276L) # WS 1:1 게임룸 세션 동기화 (RPS/참/리매치/하트비트)
│   │   └── sound/
│   │       └── soundManager.ts   (362L) # BGM 루프/전환, Web Audio 뿅망치/냄비 합성음 및 외부 mp3 캐시
│   ├── ui/                       # [Presentation Layer] 화면 렌더링 및 입력 캡처
│   │   ├── context/
│   │   │   └── LanguageContext.tsx (68L)  # 다국어(ko/en) 컨텍스트 프로바이더
│   │   ├── hooks/
│   │   │   ├── useGameLoop.ts    (211L) # 메인 게임 루프 오케스트레이터 (리듀서 조립 및 입력 라우팅)
│   │   │   ├── useGameTimer.ts   (205L) # READY/CHAM/RESOLVE 카운트다운, AI 스케줄러, BGM
│   │   │   ├── useOnlineGameSync.ts (73L) # 온라인 룸 세션 이벤트 동기화 및 브로드캐스트
│   │   │   └── useKeyboardControls.ts (54L) # A/W/D 및 방향키 입력 라우팅 리스너
│   │   ├── components/
│   │   │   ├── battle/           # [1인칭 배틀 무대 컴포넌트군]
│   │   │   │   ├── FirstPersonArena.tsx (198L) # 3D 투시 배틀 스테이지 (무대/HUD/오버레이 통합)
│   │   │   │   ├── OpponentStage.tsx   (217L) # 2P/상대 뷰 (비디오/스프라이트/대칭 공격 쇄도/가드)
│   │   │   │   ├── PlayerSelfStage.tsx (165L) # 1P 본인 뷰 (10/12/2시 방향 타격, 냄비 가드, 피격)
│   │   │   │   ├── stageVisualUtils.ts  (46L)  # 냄비 가드/RPS 스프라이트/각도 공통 계산 유틸
│   │   │   │   ├── ActionVideo.tsx      (90L)  # HTML5 Video 정밀 구간(startTime~endTime) 재생기
│   │   │   │   └── CutsceneOverlay.tsx  (96L)  # KO 결정타(damage>=5) 시 1.8초 풀스크린 컷씬 오버레이
│   │   │   ├── Arena.tsx         (137L) # 대전 메인 컨테이너 (CRT 스캔라인, HealthBar, 조작부 결합)
│   │   │   ├── ComicImpact.tsx    (79L)  # HIT💥, GUARD🛡️, MISS💨 코믹 플래시 팝업
│   │   │   ├── GameOverModal.tsx (225L) # 경기 결과(KO), 리매치 신청/대기, 개별 승패 사운드
│   │   │   ├── GuestbookModal.tsx(248L) # 실시간 방명록 모달 + 관리자 삭제 PIN 모드
│   │   │   ├── GuestbookTicker.tsx(87L) # 하단 롤링 전광판 티커
│   │   │   ├── HealthBar.tsx      (61L)  # 5칸 게이지 바 (피격 셰이크 및 하트/해골)
│   │   │   ├── KeyGuide.tsx       (45L)  # PC 키보드 핫키 HUD
│   │   │   ├── LobbyScreen.tsx   (135L) # 매칭 대기열 화면, 봇 전환 트리거
│   │   │   ├── TimerBar.tsx       (47L)  # 2초 참참참 턴 게이지 프로그레스 바
│   │   │   ├── TitleScreen.tsx   (168L) # 타이틀, 모드선택, 실시간 대기자 수 뱃지, 방명록 버튼
│   │   │   └── TouchControls.tsx (165L) # 모바일 가상 RPS/참참참 D-Pad 패드
│   │   ├── App.tsx                (99L)  # 최상위 화면 라우팅 (TITLE/LOBBY/ARENA)
│   │   ├── main.tsx               (10L)  # React 19 진입점
│   │   └── index.css                     # Tailwind, CRT 비네팅, 코믹 키프레임 애니메이션
│   └── utils/
│       └── confetti.ts            (31L)  # 승리 축하 파티클 유틸리티
├── worker/
│   └── index.ts                  (429L) # Cloudflare Workers Durable Object (GameRoom 실시간 WS + 방명록 REST)
└── tests/
    ├── gameEngine.test.ts         (99L)  # RPS 경우의 수, 참참참 판정, FSM 라이프사이클 단위 테스트
    ├── matchmaking.test.ts        (75L)  # 대기열 무작위 매칭 및 재진입 알고리즘
    ├── harness.test.ts           (299L) # 41개 물리 에셋 실존 검사 + E2E 완승 시뮬레이션
    └── virtualPlay.test.ts       (265L) # 16대 RPS, 32대 참참참 전수 검증 + 5,000판 E2E 가상 대전
```

---

## 3. 계층 분리 및 단방향 의존성 규칙

```text
[ui/ (Views, Hooks, Components)]
       │
       ▼ (Calls)
[services/ (Sound, Network WS)] ──▶ [worker/ (Cloudflare DO)]
       │
       ▼ (Reads & Computes)
[core/engine/ (FSM Reducer, Game Rules)]
       │
       ▼ (Types & Constants)
[models/ (types.ts)] & [config/ (constants, i18n, ws)]
```

### ⚠️ 리팩토링 시 절대 금지 사항 (Invariants)
1. **`core/engine/` 순수성 절대 보장**: `fsm.ts`, `rules.ts`는 UI(`React`), Web API(`window`, `AudioContext`, `WebSocket`), DOM에 의존하지 않는 순수 함수여야 함.
2. **역방향 참조 금지**: `core/`나 `services/`가 `ui/` 컴포넌트를 import하면 안 됨.
3. **엄격한 계약 기반 통신**: 모든 상태 전이는 `GameAction` 유니온을 통해서만 `gameReducer`로 전달.

---

## 4. 핵심 데이터 모델 및 계약 (`src/models/types.ts`)

```typescript
export type GameMode = 'ONLINE_MATCH' | '1P_CPU';

export type GamePhase =
  | 'TITLE'
  | 'LOBBY'
  | 'READY'            // 3, 2, 1 카운트다운
  | 'RPS_INPUT'        // 경기 시작 시 1회 선공 결정
  | 'RPS_RESULT'       // 가위바위보 결과 노출 (1.5초)
  | 'CHAM_INPUT'       // 2.0초 참참참 입력 턴
  | 'RESOLVE'          // 타격/가드 비디오/스프라이트 연출 (1.5초)
  | 'ROLE_SWAP'        // 수비 성공 시 공수 전환 인지 딜레이 (1.5초)
  | 'CHECK_WINNER'     // 데미지 5 도달 판정
  | 'GAME_OVER';       // KO 최종 결과 모달

export type RPSChoice = 'ROCK' | 'SCISSORS' | 'PAPER' | null;
export type ChamDirection = 'LEFT' | 'UP' | 'RIGHT' | null;
export type Role = 'ATTACKER' | 'DEFENDER' | 'TIE' | null;
export type DamageLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface PlayerState {
  id: 'p1' | 'p2';
  name: string;
  damage: DamageLevel;
  rpsChoice: RPSChoice;
  chamDirection: ChamDirection;
  role: Role;
  isAi: boolean;
  score: number;
  guardCount: number;
}

export interface GameEngineState {
  mode: GameMode;
  phase: GamePhase;
  round: number;
  countdown: number;
  timerRemainingRatio: number;
  p1: PlayerState;
  p2: PlayerState;
  lastOutcome: 'HIT' | 'DODGE' | 'TIE' | null;
  hitTarget: 'p1' | 'p2' | null;
  winner: 'p1' | 'p2' | null;
  message: string;
  roleReversed: boolean;
  online?: OnlineMatchContext;
}
```

---

## 5. FSM 상태 전이 및 게임 불변 규칙

### A. 불변 룰 (Core Game Mechanics)
1. **단 1회 RPS 선공 결정**: 가위바위보는 게임 시작 시 1회만 실행. 무승부(`TIE`)일 때만 재실행(`RETRY_RPS_TIE`).
2. **참참참 판정 (`rules.ts`)**:
   - `attackerDir !== defenderDir` ➔ **HIT** (공격 성공): 수비자 데미지 +1, **공격자 공격권 유지**.
   - `attackerDir === defenderDir` ➔ **DODGE** (수비 성공/가드): 데미지 없음, **공수 역할 즉시 반전(`ROLE_SWAP`)**.
3. **2초 제한 시간 (`CHAM_INPUT`)**: 2초 내 미입력 시 `rules.ts`의 `getCpuChamDirection()`으로 랜덤 강제 결정.
4. **승리 조건**: 어느 한 쪽의 `damage >= 5`가 되면 즉시 `GAME_OVER`.

### B. 상태 전이 흐름도
```text
[TITLE] ──(START_GAME)──> [LOBBY or READY]
                             │
                             ▼ (START_RPS)
                       [RPS_INPUT] ──(TIE)──> [RETRY_RPS_TIE]
                             │
                             ▼ (선공 결정)
                       [RPS_RESULT] (1.5s)
                             │
                             ▼
                       [CHAM_INPUT] (2.0s 카운트다운)
                             │
                             ▼ (RESOLVE_CHAM)
                         [RESOLVE] (1.5s 연출)
                        /         \
                 (isHit)           (isDodge)
                   /                 \
            [공격권 유지]        [ROLE_SWAP] (1.5s 공수 반전)
                   \                 /
                    ▼               ▼
                     [CHECK_WINNER]
                      /          \
            (Damage >= 5)       (Damage < 5)
                 /                  \
                ▼                    ▼
           [GAME_OVER]          [CHAM_INPUT] (다음 턴)
```

---

## 6. 네트워크 & 백엔드 프로토콜 (`worker/index.ts`)

- **호스트**: Cloudflare Workers Durable Object (`GAME_ROOM` 네임스페이스)
- **WebSocket 프로토콜**:
  - `lobby`: 입장(`join_lobby`), 대기자 수 브로드캐스트(`lobby_stats`), 매치 성사 통보(`match_found`)
  - `room_<id>`: 동기화(RPS 입력/결과, 참 방향/결과, 리매치 요청, 하트비트 `ping/pong`)
- **방명록(Guestbook) 아키텍처**:
  - REST: `GET /api/guestbook`, `POST /api/guestbook`, `DELETE /api/guestbook` (관리자 PIN 인증)
  - WebSocket: 신규 등록 실시간 브로드캐스트 + `sessionStorage`/`localStorage` 0ms 즉시 렌더링 캐시

---

## 7. 주요 리팩토링 검토 대상 (Top 3 High-ROI Targets)

| 순위 | 타겟 파일 | 라인수 | 현재 문제점 | 권장 리팩토링 방향 (To-Be) |
| :---: | :--- | :---: | :--- | :--- |
| **1** | `src/ui/hooks/useGameLoop.ts` | 405L | 타이머 rAF 틱, CPU AI 호출 스케줄러, 온라인 소켓 이벤트 핸들러가 한 훅에 집중 | `useOnlineGameSync`, `useGameTimer` 서브 훅으로 관심사 분리 |
| **2** | `src/services/network/matchmakingService.ts` | 455L | 매칭 대기열 관리, 방명록 HTTP/WS 폴백, 통계 리스너 혼재 | 방명록 전용 서비스(`guestbookService.ts`) 분리 및 단일 책임 원칙(SRP) 적용 |
| **3** | `src/ui/components/battle/OpponentStage.tsx` / `PlayerSelfStage.tsx` | 226L / 175L | 액션 비디오 설정 계산, 대칭 각도 클래스 계산 등 렌더링 로직 중복 | `stageVisualResolver.ts` 순수 유틸 함수로 계산 로직 외과수술적 추출 |

---

## 8. 회귀 방지 필수 자가 검증 명령어 (Automated Verification)

코드 수정 후 반드시 다음 2개 명령어를 순차 실행하여 100% 통과를 확인해야 합니다:

```bash
# 1. TypeScript 컴파일 무결성 및 프로덕션 빌드 검사
npm run build
# 기대 결과: tsc -b && vite build 무에러 통과 (dist/ 청크 정상 생성)

# 2. 전수 단위/통합/가상 5,000판 E2E 테스트 검사
npm test
# 기대 결과:
#  - RPS 9대 경우의 수 및 16대 전수 입력 통과
#  - 참참참 32대 전수 방향 조합 및 공수 판정 통과
#  - 41개 물리 에셋 파일 100% 실존 확인
#  - 1P vs CPU 5,000판 엔드투엔드 시뮬레이션 통과 (오류 제로)
#  - [ALL HARNESS TESTS PASSED] & [VIRTUAL PLAY PASSED]
```
