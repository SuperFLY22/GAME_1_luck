# 🕹️ 참참참 아케이드 (Comic Cham-Cham-Cham) 시스템 아키텍처

## 1. 프로젝트 디렉토리 레이아웃 (Game Dev Standard)

```text
GAME_1_luck/
├── core/                # (src/core) 순수 게임 엔진 로직 (FSM 유한상태기계, 룰 엔진)
├── services/            # (src/services) 오디오 매니저, 에셋 레지스트리, Supabase 매칭/세션
├── ui/                  # (src/ui) 화면 뷰 및 아케이드 컴포넌트 (Arena, TouchControls 등)
├── models/              # (src/models) 게임 데이터 모델 및 TypeScript 인터페이스
├── utils/               # (src/utils) 파티클/콘페티 등 순수 헬퍼
├── config/              # (src/config) 게임 타이머, 키 바인딩, 에셋 경로 상수
├── tests/               # FSM 단위 테스트, 하네스(Harness) 시뮬레이션
├── docs/                # 시스템 아키텍처, 게임 디자인 문서(GDD)
├── raw_assets/          # 원본 디자인 소스, 마스터 스프라이트시트, 원본 오디오
│   ├── art/             # 마스터 스프라이트시트 (캐릭터, 도구, 손동작, 이펙트)
│   └── audio/           # 원본 마스터 오디오 (BGM, 효과음)
├── public/              # 웹 게임 런타임 정적 리소스 (클라이언트 서빙)
│   └── assets/          # 최적화된 런타임 이미지 및 오디오
├── index.html           # 웹 게임 진입점
├── package.json         # 의존성 및 스크립트 설정
├── tsconfig.json        # 타입스크립트 컴파일러 구성
└── vite.config.ts       # 번들러 및 청크 최적화 빌드 설정
```

---

## 2. 계층 격리 및 데이터 흐름

```
[UI Views] (Arena, TouchControls, LobbyScreen)
       │
       ▼ (Event & Action Dispatch)
[Game Loop Hook] (useGameLoop)
       │
       ├───────────────┬────────────────┐
       ▼               ▼                ▼
[Game Engine / FSM] [SoundManager] [RoomSessionService]
  (rules, fsm)      (Web Audio)     (Supabase Realtime)
       │
       ▼
 [Pure Models & Config] (types.ts, constants.ts)
```

1. **View Layer (`src/ui/`)**: 순수 화면 렌더링 및 키보드/터치 이벤트 캡처. 직접적인 네트워크 호출이나 상태 변이 로직 배제.
2. **Engine Layer (`src/core/`)**: 순수 함수 기반 유한 상태 기계(FSM)와 참참참/가위바위보 판정 로직. 외부 I/O 종속성 0%.
3. **Service Layer (`src/services/`)**: Web Audio 신시사이저 및 외부 오디오 로더(`soundManager`), Supabase Realtime 매칭 및 세션 동기화(`roomSessionService`).
4. **Asset Pipeline**:
   - `raw_assets/`: 디자이너/사운드 마스터 원천 보관.
   - `public/assets/`: 브라우저가 게임 플레이 중 즉시 로드하는 경량화 스프라이트/사운드.
