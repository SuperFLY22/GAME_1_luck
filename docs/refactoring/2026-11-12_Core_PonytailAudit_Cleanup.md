# 리팩토링 계획서: Ponytail Audit 기반 데드코드 제거 및 훅 결합도 분리

**작성일시**: 2026-11-12  
**대상 모듈**: `src/ui/components`, `src/services/assets`, `src/ui/hooks/useGameLoop.ts`  
**기준 규칙**: Google Antigravity Global Rules (Section 6-A Refactoring Flow) & Ponytail Audit  

---

## 1. As-Is & Problem (기술 부채 및 결합도 분석)

1. **미참조 데드 코드(Dead Code) 잔존**:
   - 1인칭 아케이드 뷰포트로 전환되면서 구버전 2D 정면 뷰 SVG/컴포넌트(`CharacterSvg.tsx`, `CharacterView.tsx`, `ActionTimelinePlayer.tsx`) 3개 파일 총 507줄이 프로젝트 어디에서도 참조되지 않은 채 번들 트리에 방치됨.
2. **무의미한 런타임 404 I/O 프로빙 (`assetRegistry.ts`)**:
   - 이미 삭제된 과거 에셋(`p1_state_*.png`, `p2_state_*.png`)을 애플리케이션 시작 시마다 `Image()` 인스턴스 12개를 생성하여 프로브하는 불필요한 백그라운드 네트워크/I/O 발생 (61줄).
3. **`useGameLoop.ts` 단일 훅 과밀 (414줄)**:
   - FSM 게임 엔진 연동, AI 타이머 스케줄러, 온라인 Supabase 세션 동기화와 더불어 전역 윈도우 키보드 이벤트 리스너(WASD, 방향키 매핑)가 단일 훅에 혼재되어 있어 관심사 분리(SoC) 미흡.

---

## 2. To-Be (Max 3 High-ROI Tasks)

### Item 1. [Cut Dead Code] 완전 미참조 컴포넌트 및 서비스 제거
- **대상**:
  - `src/ui/components/CharacterSvg.tsx` (삭제)
  - `src/ui/components/CharacterView.tsx` (삭제)
  - `src/ui/components/battle/ActionTimelinePlayer.tsx` (삭제)
  - `src/services/assets/assetRegistry.ts` (삭제) 및 `App.tsx` 내 호출부 제거
- **효과**: 불필요한 보일러플레이트 568줄 영구 감축, 앱 기동 시 404 이미지 로딩 I/O 오버헤드 0화.

### Item 2. [Decouple Hook] 키보드 입력 핸들러 모듈 격리
- **대상**: `src/ui/hooks/useGameLoop.ts` → `src/ui/hooks/useKeyboardControls.ts` 신설
- **내용**: 키보드 입력 이벤트 바인딩 및 WASD/방향키 변환 로직을 전용 훅으로 분리하여 `useGameLoop.ts`를 순수 게임 루프 및 세션 상태 조율에만 집중하도록 단일 책임 원칙(SRP) 적용.

### Item 3. [Sanitize Config] 상수 파일 정돈
- **대상**: `src/config/constants.ts`
- **내용**: 삭제된 구버전 이미지 베이스 경로(`ASSET_PATHS.IMAGES.P1_BASE`, `P2_BASE`)를 안전하게 정리.

---

## 3. Stop Condition (DoD / 완료 조건)

1. TypeScript 컴파일 및 Vite 번들 빌드 (`npm run build`) 통과 (경고 및 에러 0건).
2. 하네스 테스트 스위트 (`npm test` - 4개 테스트 파일, 44개 시나리오, 5,000판 가상 대전) 100% Pass.
3. 소스 코드 순감소: 최소 **-500줄 이상** 달성.

---

## 4. Test Strategy (안전망 및 회귀 검증)

- **Baseline Tests**: 기존 `tests/harness.test.ts`, `tests/gameEngine.test.ts`, `tests/virtualPlay.test.ts`.
- **불변성 검증**: 키보드 입력(A, W, D / ArrowLeft, ArrowUp, ArrowRight) 및 터치 입력이 동일한 `handleP1Input`/`handleP2Input`으로 전달됨을 검증.

