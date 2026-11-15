# 🛠️ GAME_1_luck 전체 최적화 리팩토링 계획서

> **작성일**: 2026-11-15  
> **검토 범위**: 전체 소스코드 (`src/`, `worker/`, `tests/`)  
> **현재 베이스라인**: `npm test` ✅ ALL PASSED | `npm run build` ✅ 무에러  
> **리팩토링 목적**: 코드 품질·유지보수성 개선, 단일 책임 원칙(SRP) 적용, 버그 위험 제거

---

## ⚠️ 필수 불변 사항 (Do NOT touch)

아래 사항은 리팩토링 중 절대 변경하지 않는다:

1. `core/engine/fsm.ts` / `rules.ts` 의 **퍼블릭 함수 시그니처** (`gameReducer`, `evaluateRPS`, `evaluateCham`, `incrementDamage`, `createInitialState`)
2. `models/types.ts` 의 **모든 타입/인터페이스** (변경 시 테스트 전체 재작성 필요)
3. `GameAction` **유니온 멤버 열거** (FSM 계약, 테스트 커버 중)
4. 현재 통과 중인 **4개 테스트 파일 100% Green** 반드시 유지

---

## 📋 발견사항 목록 (Issues Registry)

### 🔴 HIGH RISK — 버그/논리 결함

#### [H-1] `roomSessionService.ts`: `resolveChamOnTimeout()` 타임아웃 패널티 UX 비대칭

**위치**: `src/services/network/roomSessionService.ts:229-251`

**문제**:
온라인 모드 타임아웃 발생 시 P1(Host)이 `CHAM_RESOLVED` 이벤트를 `isHit: false`로 강제 브로드캐스트한다. 로컬 모드(`fsm.ts:RESOLVE_CHAM`)에서는 `attackerRaw === null`이면 `lastOutcome: 'DODGE'` + 명시적 패널티 메시지(`⏰ 공격 시간 초과 → 공수 교대`)를 반환한다. 온라인에서는 단순 `DODGE` 결과로만 보여 **타임아웃 패널티 UX가 비대칭**이다.

```typescript
// roomSessionService.ts:234 (온라인 타임아웃 현재)
this.broadcast('CHAM_RESOLVED', { isHit: false, hitTarget: null, ... });
// ⚠️ isTimeout 필드 없음 → FSM이 일반 DODGE와 구분 불가
```

**수정 방향**:
`CHAM_RESOLVED` payload에 `isTimeout: boolean` 필드 추가. `fsm.ts`의 `SYNC_ONLINE_CHAM_RESULT` 케이스에서 `isTimeout` 여부를 `message` 분기에 반영:
```typescript
// roomSessionService.ts 수정
this.broadcast('CHAM_RESOLVED', { isHit: false, hitTarget: null, isTimeout: true, ... });

// fsm.ts SYNC_ONLINE_CHAM_RESULT 수정
message: action.isHit
  ? '찰싹! 빈틈 타격 명중 (POW!)'
  : action.isTimeout
    ? `⏰ 공격 시간 초과! → 공수 교대!`
    : '챙-! 가드 방어 성공 (BLOCK!)',
```

---

#### [H-2] `useGameLoop.ts`: 온라인 `startChamPhase()` 이중 호출 위험 경로

**위치**: `src/ui/hooks/useGameLoop.ts:189-248`

**문제**:
`RESOLVE` 단계 `useEffect`에서 `HIT`이고 게임 오버 아닐 때 `startChamPhase()` 호출 (line 207). `ROLE_SWAP` 단계 `useEffect`에서도 `startChamPhase()` 호출 (line 221). 두 경로는 현재 FSM 전이 순서상 겹치지 않지만, `CHECK_ROUND_RESULT`가 직접 `CHAM_INPUT`으로 전환하는 HIT 경로에서 `useEffect` 의존성 배열이 `state.phase`만 추적하므로, React Strict Mode 더블 호출 환경에서 타이밍 경쟁 가능성 잠재.

**수정 방향**:
온라인 브로드캐스트 호출 책임을 `useOnlineGameSync` 서브 훅으로 분리([M-1]과 연동). 단일 위치에서 `state.phase` 전이를 감시하여 브로드캐스트 결정:
```typescript
// useOnlineGameSync.ts
useEffect(() => {
  if (!isOnlineP1) return;
  if (state.phase === 'ROLE_SWAP') roomSessionService.startChamPhase();
  if (state.phase === 'CHAM_INPUT' && prevPhaseRef.current === 'RESOLVE') {
    // HIT 연속 공격 시 RESOLVE→CHAM_INPUT 전이
    roomSessionService.startChamPhase();
  }
  prevPhaseRef.current = state.phase;
}, [state.phase]);
```

---

#### [H-3] `matchmakingService.ts`: 방명록 낙관적 UI 머지 로직 버그

**위치**: `src/services/network/matchmakingService.ts:360-376`

**문제**:
`GUESTBOOK_INIT` 수신 시 임시 엔트리 중복 제거를 `content + nickname` 텍스트 비교로 수행:
```typescript
!tempEntries.some((t) => t.content === d.content && t.nickname === d.nickname)
```
동일 닉네임·동일 내용으로 다른 사용자가 작성한 엔트리를 중복으로 판단하는 **False Positive** 발생 가능. 짧은 텍스트("짱이다") 2명이 동시에 작성 시 하나가 누락됨.

**수정 방향**: 병합 키를 `id` 기반으로 변경:
```typescript
// 개선안
const serverIds = new Set(data.entries.map((d: GuestbookEntry) => d.id));
const combined = [
  ...tempEntries,                            // 낙관적 엔트리 보존
  ...data.entries.filter((d: GuestbookEntry) =>
    !this.guestbookEntries.some((e) => e.id === d.id)  // id 기반 중복 제거
  ),
];
this.guestbookEntries = combined.slice(0, 50);
```

---

#### [H-4] `worker/index.ts`: 관리자 키 소스코드 하드코딩

**위치**: `worker/index.ts:246`

**문제**:
```typescript
const validKey = 'admin777!'; // ⚠️ Public 저장소에 평문 노출
```

**수정 방향**:
```typescript
// worker/index.ts
export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  ADMIN_KEY?: string;  // 환경변수 추가
}

// GameRoom 생성자 수정
constructor(ctx: DurableObjectState, env: Env) {
  this.adminKey = env.ADMIN_KEY || 'admin777!'; // fallback은 로컬 개발용
}

// handleDeleteGuestbook 수정
private handleDeleteGuestbook(id?: string, adminKey?: string): boolean {
  if (!id || adminKey !== this.adminKey) return false;
  ...
}
```
`wrangler.toml`에 로컬 개발용 `[vars] ADMIN_KEY = "dev-only-key"` 추가, 프로덕션은 `wrangler secret put ADMIN_KEY` 적용.

---

### 🟡 MEDIUM — 아키텍처/SRP 위반

#### [M-1] `useGameLoop.ts` (405L): God Hook 과적재

**위치**: `src/ui/hooks/useGameLoop.ts`

**현재 상태** — 단일 훅이 담당하는 6가지 관심사:
1. `useReducer` 상태 관리 + stateRef 동기화
2. READY 카운트다운 타이머 (`useEffect` #1)
3. CHAM_INPUT rAF 타이머 + CPU AI 스케줄러 (`useEffect` #2)
4. RESOLVE / ROLE_SWAP / RPS_RESULT 연출 타이머 (`useEffect` #3)
5. BGM 제어 (`useEffect` #4)
6. 온라인 룸 세션 이벤트 바인딩 (`setupOnlineRoom`)

**수정 방향**: 아래 3개 서브 훅으로 분리 (공개 인터페이스 불변 유지):
```text
src/ui/hooks/
├── useGameLoop.ts         (~80L) 메인: useReducer + 서브훅 조립 + startGame/goToTitle 등 액션
├── useGameTimer.ts       (~150L) READY/CHAM/RESOLVE/ROLE_SWAP 타이머 로직
├── useOnlineGameSync.ts  (~120L) setupOnlineRoom + 온라인 브로드캐스트 타이밍
└── useKeyboardControls.ts (54L) 기존 유지
```

**인터페이스 보존 계약** (변경 없음):
```typescript
// App.tsx는 이 인터페이스를 그대로 사용해야 함
const { state, waitingCount, waitingNames, titleWaitingCount,
        startGame, restartGame, findNewOnlineMatch, goToTitle,
        handleP1Input, handleP2Input } = useGameLoop();
```

---

#### [M-2] `matchmakingService.ts` (455L): 매칭 큐 + 방명록 단일 책임 위반

**위치**: `src/services/network/matchmakingService.ts`

**현재 상태** — 단일 클래스가 담당하는 책임:
- 매칭 대기열 (joinQueue, leaveQueue, reEnterQueue, sendJoinQueue)
- 방명록 CRUD (fetchGuestbookHttp, sendGuestbookEntry, deleteGuestbookEntry)
- 실시간 구독 (subscribeQueueStats, subscribeGuestbook)
- WebSocket 연결 관리 + heartbeat
- 클라이언트 ID/Name 영속성

**수정 방향**: 2개 클래스 분리 + 공유 WebSocket 처리 설계:

```text
src/services/network/
├── matchmakingService.ts    (큐 전용: 매칭, heartbeat, WS 소유자)
└── guestbookService.ts      (방명록 전용: CRUD, 구독, 낙관적 UI)
```

WebSocket은 `matchmakingService`가 소유, `guestbookService`는 WS 인스턴스를 주입받아 사용:
```typescript
// guestbookService.ts
class GuestbookService {
  constructor(private getWs: () => WebSocket | null) {}
}
export const guestbookService = new GuestbookService(() => matchmakingService.getWs());
```
외부 호출부(`TitleScreen`, `GuestbookModal`, `GuestbookTicker`, `GameOverModal`)의 import 경로 동반 수정.

> **⚠️ 고위험**: 외부 호출부 5개 파일 동반 수정 필요. 마지막 순서로 실행.

---

#### [M-3] `OpponentStage.tsx` / `PlayerSelfStage.tsx`: 비주얼 로직 중복

**위치**: `src/ui/components/battle/OpponentStage.tsx`, `PlayerSelfStage.tsx`

**중복 항목 목록**:
- `dirKey = direction?.toLowerCase()` (동일 패턴)
- `getRpsLabel()` 함수 (완전 동일 복사본 2개)
- `safeDamage = Math.min(Math.max(damage, 0), 5)` (동일)
- 냄비뚜껑 flyAway URL 패턴 (`self_guard_{dirKey}.png`)
- 냄비뚜껑 애니메이션 클래스 계산 (`LEFT→fly-left`, `RIGHT→fly-right`, else→`fly-up`)

**수정 방향**: 순수 유틸리티 모듈 추출:
```typescript
// src/ui/components/battle/stageVisualUtils.ts (신규, ~40L)
export function clampDamage(damage: number): DamageLevel
export function getDirKey(direction: ChamDirection): string
export function getPotlidImgUrl(dirKey: string): string
export function getPotlidFlyClass(direction: ChamDirection): string
export function getRpsSpriteUrl(id: 'p1' | 'p2', choice: string | null): string | null
export function getRpsLabel(choice: RPSChoice, t: (key: string) => string): string
```
`FirstPersonArena.tsx`의 `getRpsSpriteUrl` 인라인 함수도 이 모듈로 통합 ([L-5] 동시 해결).

---

### 🟢 LOW — 코드 품질 / 가독성

#### [L-1] `constants.ts`: `ASSET_PATHS.SOUNDS` 정의와 실제 사운드 파일 불일치

**위치**: `src/config/constants.ts:34-45`

**문제**:
| 상수 정의 | 실제 soundManager 사용 경로 | 불일치 |
|:---|:---|:---:|
| `HIT: '/assets/sounds/hit.mp3'` | `hit1.mp3`, `hit2.mp3`, `hit3.mp3` (3종) | ✅ 불일치 |
| `VICTORY: '/assets/sounds/victory.mp3'` | `victory.mp3` (동일하지만 `you_win.mp3`도 별도 존재) | △ 혼동 |
| `SURRENDER: '/assets/sounds/surrender.mp3'` | `surrender.mp3` (동일하지만 `loose.mp3`도 존재) | △ 혼동 |
| `COUNTDOWN: '/assets/sounds/countdown.mp3'` | `soundManager`에서 미사용 (합성음만 사용) | ✅ 데드 상수 |

**수정 방향**:
```typescript
SOUNDS: {
  RPS_CHANT: '/assets/sounds/rps_chant.mp3',
  HIT_VARIANTS: ['/assets/sounds/hit1.mp3', '/assets/sounds/hit2.mp3', '/assets/sounds/hit3.mp3'],
  DODGE: '/assets/sounds/dodge.mp3',
  VICTORY: '/assets/sounds/victory.mp3',
  SURRENDER: '/assets/sounds/surrender.mp3',
  // COUNTDOWN 삭제 (합성음만 사용)
},
```
`soundManager.ts`의 `hitIndex` 직접 조립 코드를 `ASSET_PATHS.SOUNDS.HIT_VARIANTS[Math.floor(...)]`로 교체.

---

#### [L-2] `useGameLoop.ts`: `waitingCount` 초기값 오류

**위치**: `src/ui/hooks/useGameLoop.ts:24`

**문제**: `useState(1)` — 의미 없는 초기값 `1` (실제 대기 중이지 않을 때도 `1`로 표시 위험)

**수정 방향**: `useState(0)` + 주석 명확화.

---

#### [L-3] 불필요한 `async` 선언 (5개 메서드)

**위치**:
- `src/services/network/roomSessionService.ts:58` — `joinRoom`
- `src/services/network/matchmakingService.ts:282` — `joinQueue`
- `src/services/network/matchmakingService.ts:422` — `reEnterQueue`
- `src/services/network/matchmakingService.ts:433` — `leaveQueue`

**문제**: 모두 내부에 `await`가 없는 동기 함수이나 `async`로 선언되어 불필요한 Promise wrapping 발생. 호출부도 `await`하지 않음.

**수정 방향**: `async` 키워드 제거 → 반환 타입 `Promise<void>` → `void`. 호출부 타입 체크 영향 없음 (이미 `await` 없이 호출 중).

---

#### [L-4] `websocket.ts`: `window` 직접 참조 — 테스트 불가 코드

**위치**: `src/config/websocket.ts:9-10`

**문제**: `window.location.protocol` 직접 참조 → Node.js 테스트 환경에서 `ReferenceError` 발생 가능.

**수정 방향**:
```typescript
function isSecureContext(): boolean {
  if (typeof window === 'undefined') return true;  // SSR/Node 기본 secure
  return window.location.protocol === 'https:' || !WS_HOST.includes('localhost');
}
```

---

#### [L-5] `FirstPersonArena.tsx`: `getRpsSpriteUrl` 인라인 함수 중복

**위치**: `src/ui/components/battle/FirstPersonArena.tsx:24-28`

→ **[M-3] stageVisualUtils 추출과 동시 해결**.

---

#### [L-6] `fsm.ts`: 불필요한 `guardCount ?? 0` null 가드

**위치**: `src/core/engine/fsm.ts:282, 284, 330, 332, 350, 352`

**문제**: `PlayerState.guardCount`는 `types.ts`에서 `number`로 명시 선언됨 → `undefined` 될 수 없으나 `?? 0` 옵셔널 체이닝 6곳 존재. 이전 선택 필드 시절 잔존 코드.

**수정 방향**: `?? 0` 전체 제거 → `nextP1.guardCount + 1`로 단순화. 단, 외부 직렬화(네트워크 역직렬화 등)에서 `guardCount`가 `undefined`로 오는 경로 없음을 `grep` 확인 후 제거.

---

#### [L-7] `worker/index.ts`: `handleLobbyMessage` if-else 체인 → switch 전환

**위치**: `worker/index.ts:206-241`

**문제**: 5종 메시지 타입을 if-else 체인으로 처리. 타입 안전성 없음.

**수정 방향**:
```typescript
type LobbyMessageType = 'PING' | 'JOIN_QUEUE' | 'LEAVE_QUEUE' | 'ADD_GUESTBOOK' | 'DELETE_GUESTBOOK';
interface LobbyMessage { type: LobbyMessageType; id?: string; name?: string; ... }

private handleLobbyMessage(ws: WebSocket, data: LobbyMessage): void {
  switch (data.type) {
    case 'PING': ws.send(JSON.stringify({ type: 'PONG' })); return;
    case 'JOIN_QUEUE': if (data.id && data.name) { ... } return;
    case 'LEAVE_QUEUE': this.lobbyPlayers.delete(ws); ... return;
    case 'ADD_GUESTBOOK': this.handleAddGuestbook(data.nickname, data.content); return;
    case 'DELETE_GUESTBOOK': this.handleDeleteGuestbook(data.id, data.adminKey); return;
  }
}
```

---

## 📐 실행 순서 및 우선순위 테이블

| 순서 | 이슈 | 대상 파일 | Diff 규모 | 위험도 | 비고 |
|:---:|:---|:---|:---:|:---:|:---|
| 1 | [H-4] 관리자 키 환경변수화 | `worker/index.ts`, `wrangler.toml` | Small | 🟢 낮음 | 보안 최우선 |
| 2 | [H-3] 방명록 머지 버그(id 기반) | `matchmakingService.ts` | Small | 🟢 낮음 | 버그 수정 |
| 3 | [L-2] waitingCount 초기값 `0`화 | `useGameLoop.ts` | Tiny | 🟢 낮음 | |
| 4 | [L-3] 불필요 async 제거 (4곳) | `roomSessionService.ts`, `matchmakingService.ts` | Tiny | 🟢 낮음 | |
| 5 | [L-6] guardCount null 가드 제거 | `fsm.ts` | Tiny | 🟢 낮음 | grep 확인 후 |
| 6 | [L-7] Worker switch문 전환 | `worker/index.ts` | Small | 🟢 낮음 | |
| 7 | [L-4] window 분리 | `websocket.ts` | Small | 🟢 낮음 | |
| 8 | [L-1] ASSET_PATHS 경로 정리 | `constants.ts`, `soundManager.ts` | Small | 🟡 중간 | 사운드 경로 변경 |
| 9 | [H-1] 온라인 타임아웃 UX 비대칭 | `roomSessionService.ts`, `fsm.ts` | Medium | 🟡 중간 | types 변경 수반 |
| 10 | [M-3]+[L-5] stageVisualUtils 추출 | `battle/*.tsx` (3개) | Medium | 🟢 낮음 | 순수 함수 추출 |
| 11 | [H-2] 온라인 startChamPhase 명확화 | `useGameLoop.ts` | Medium | 🟡 중간 | M-1과 연동 |
| 12 | [M-1] useGameLoop 서브훅 3분리 | `useGameLoop.ts` → 3개 파일 | Large | 🟡 중간 | 인터페이스 불변 |
| 13 | [M-2] matchmakingService SRP 분리 | `matchmakingService.ts` → 2개 파일 | Large | 🔴 높음 | 호출부 5곳 동반 |

---

## 🧪 필수 검증 명령어 (Verification Protocol)

**각 순서 완료 후 반드시 실행, 100% Green 확인:**

```bash
# 1. TypeScript 컴파일 + 번들 무결성
npm run build
# 기대: dist/ 무에러 생성

# 2. 전수 테스트 (유닛 + 통합 + 5,000판 E2E 가상 플레이)
npm test
# 기대:
# ✅ RPS 16대 전수 입력 통과
# ✅ 참참참 32대 전수 방향 통과
# ✅ 41개 물리 에셋 100% 실존
# ✅ 1P vs CPU 5,000판 오류 제로
# ✅ [ALL HARNESS TESTS PASSED] & [VIRTUAL PLAY PASSED]
```

---

## 🔒 완료 판단 기준 (DoD)

1. `npm test` 100% 통과 (5,000판 E2E 포함)
2. `npm run build` 무에러 완료
3. `npx tsc --noEmit` 타입 에러 0개
4. `useGameLoop()`의 외부 반환 인터페이스 변경 없음 (`App.tsx` 임포트 그대로 작동)
5. `admin777!`가 소스코드에 더 이상 하드코딩되지 않음
6. `matchmakingService` / `roomSessionService` 외부 export 시그니처 변경 없음 (또는 호출부 동반 수정 완료)

---

## 📝 모델 교체 운영 지침

### 다음 모델에 주입할 필수 첨부 문서

1. `docs/CODEMAP.md` — 전체 아키텍처 & 타입 계약
2. 본 계획서 (`docs/refactoring/2026-11-15_Full_Optimization_Refactoring_Plan.md`)

### 필수 선제 작업

```bash
# 수정 시작 전 베이스라인 확인
npm test && npm run build
```

### 커밋 메시지 규약

```
fix(worker): move admin key to env var [H-4]
fix(matchmaking): fix guestbook merge id-based dedup [H-3]
refactor(hooks): extract useGameTimer and useOnlineGameSync from useGameLoop [M-1]
refactor(battle): extract stageVisualUtils from OpponentStage/PlayerSelfStage [M-3]
refactor(network): separate guestbookService from matchmakingService [M-2]
chore(fsm): remove redundant guardCount null-guard [L-6]
```
