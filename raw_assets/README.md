# 📦 Raw Assets Archive (게임 원본 에셋 보관소)

이 디렉토리는 게임 프로덕션에서 사용되는 **마스터 원본 그래픽(스프라이트시트, 배경 원화)** 및 **미가공 오디오 소스**를 보관하는 공간입니다.  
빌드 결과물 및 클라이언트 런타임에는 직접 배포되지 않으며, 에셋 가공 및 버전 관리를 위한 원천 소스입니다.

---

## 📁 디렉토리 구조

```text
raw_assets/
├── art/                      # 원본 그래픽 및 스프라이트시트
│   ├── background.png        # 고해상도 아케이드 배경 원화 (8.6MB)
│   ├── character.png         # 캐릭터 베이스 표정 및 포트레이트 원본 (4.9MB)
│   ├── character_actions..png# 참참참 공/수 액션 스프라이트시트 (4.8MB)
│   ├── impact.png            # 코믹 타격/피격 이펙트 원본 시트 (5.2MB)
│   ├── ROCK_PAPER_SCISSORS.png # 가위바위보 손동작 마스터 시트 (4.3MB)
│   └── tools_spriteshee.png  # 뿅망치 및 냄비뚜껑 도구 스프라이트시트 (4.6MB)
└── audio/                    # 마스터 오디오 및 효과음 원본
    ├── bgm1.mp3              # 오리지널 8-bit 아케이드 BGM
    ├── hit1.mp3 ~ hit3.mp3   # 타격 효과음 3단계 변형 소스
    ├── miss.mp3              # 회피(스윙) 효과음 원본
    ├── loose.mp3             # 패배/실패 사운드 원본
    └── you_win.mp3           # 승리 팡파레 원본
```

---

## 🔄 런타임 에셋 파이프라인 (Build Pipeline)

게임 실행 시 브라우저가 로드하는 최적화된 런타임 에셋은 `/public/assets/`에 위치합니다.

| 원본 에셋 (`raw_assets/art/`) | 런타임 슬라이싱 대상 (`public/assets/images/`) | 용도 |
| :--- | :--- | :--- |
| `background.png` | `bg_arcade.png` | 게임 메인 아케이드 배경화면 |
| `character.png` | `p1_state_0.png` ~ `p1_state_5.png`<br>`p2_state_0.png` ~ `p2_state_5.png` | 캐릭터 0~5단계 데미지 표정 |
| `character_actions..png` | `actions/attack_*.png`<br>`actions/defend_*.png` | 참참참 좌/상/우 공격 및 수비 포즈 |
| `tools_spriteshee.png` | `tools/hammer_*.png`<br>`tools/potlid_*.png` | 뿅망치 타격 및 냄비뚜껑 가드 도구 |
| `ROCK_PAPER_SCISSORS.png` | `rps/rps_1p_*.png`<br>`rps/rps_2p_*.png` | 가위/바위/보 손동작 스프라이트 |
| `impact.png` | `impact_bang.png`<br>`impact_pow.png` | 만화풍 타격 텍스트 이펙트 |
