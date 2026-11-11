# 💥 코믹 참참참 아케이드 (Comic Cham-Cham-Cham Arcade)

90년대 복고풍 레트로 아케이드 감성의 1:1 대전 참참참 게임 엔진입니다.  
절차적 Web Audio 사운드 합성, 외부 에셋 실시간 핫스왑 레지스트리, Cloudflare Workers(PartyKit) 초저지연 WebSocket 기반 매치메이킹 및 멀티플레이어 룸 세션을 지원합니다.

---

## 🎮 게임 모드
- **1P vs CPU (솔로 모드)**: 무작위 AI를 상대로 펼쳐지는 참참참 배틀 (WASD / 방향키 / 모바일 터치 조작)
- **1P vs 2P (로컬 2인 대전)**: 한 키보드에서 1P(A/W/D)와 2P(←/↑/→)로 실시간 맞대결
- **온라인 매칭 대전**: Cloudflare Workers(PartyKit) 기반 엣지 WebSocket 대기열 풀 자동 매칭 및 룸 배틀

---

## 📁 프로젝트 구조 (Game Developer Layout)

```text
GAME_1_luck/
├── raw_assets/               # [원본 에셋] 마스터 스프라이트시트 및 미가공 오디오
│   ├── art/                  # 캐릭터, 도구(망치/냄비뚜껑), 가위바위보 손, 배경 원본
│   ├── audio/                # 원본 BGM 및 효과음 소스
│   └── README.md             # 에셋 파이프라인 명세
├── public/                   # [런타임 에셋] 브라우저에 직접 서빙되는 최적화 에셋
│   └── assets/
│       ├── images/           # 슬라이싱된 액션, 도구, 손동작, 캐릭터 데미지 표정
│       └── sounds/           # 게임 내 사운드 효과음 및 배경음악
├── src/                      # [소스 코드] 계층형 게임 아키텍처
│   ├── core/                 # 순수 게임 엔진 (FSM 상태 머신, 참참참 룰셋)
│   ├── services/             # Web Audio 사운드 매니저, WebSocket 세션/매칭 서비스
│   ├── ui/                   # 화면 뷰(Arena, Lobby) 및 컴포넌트, 입력 루프
│   ├── models/               # 게임 데이터 모델 및 TypeScript 인터페이스
│   ├── utils/                # 파티클 및 헬퍼
│   └── config/               # 게임 타이머, 키 매핑, 에셋 경로 상수
├── tests/                    # 게임 FSM, 매치메이킹, 물리 에셋 하네스 테스트
├── docs/                     # [문서] architecture.md, CODEMAP.md (전체 코드맵)
├── index.html                # 진입점
├── package.json
└── vite.config.ts            # 번들러 및 빌드 설정
```

---

## 🕹️ 키 조작 가이드

| 입력 구분 | 1P 조작키 | 2P 조작키 | 게임 동작 |
| :--- | :--- | :--- | :--- |
| **가위바위보 (선공 결정)** | A (가위) / W (바위) / D (보) | ← (가위) / ↑ (바위) / → (보) | 선공 공격권 결정 |
| **참참참 (공격 / 수비)** | A (좌) / W (상) / D (우) | ← (좌) / ↑ (상) / → (우) | 공격자 지목 / 수비자 가드 |

---

## 🛠️ 개발 및 테스트 명령어

```bash
# 1. 프론트엔드 개발 서버 실행
npm run dev

# 2. 로컬 Cloudflare Worker 소켓 서버 실행 (포트 8787)
npm run worker:dev

# 3. Cloudflare Workers 전 세계 엣지 배포 (1회 로그인 후 배포)
npm run worker:deploy

# 4. 빌드
npm run build

# 5. 무결성 하네스 및 전체 테스트 스위트 실행
npm test
```
