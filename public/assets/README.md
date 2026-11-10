# 🎨 참참참 멀티미디어 에셋 디렉토리 & 제미나이 프롬프트 가이드

이 폴더(`/public/assets/`)에 아래 규격에 맞추어 생성한 이미지와 사운드 파일을 넣으면,
게임 엔진이 **실행 중 자동으로 외부 에셋을 인식하여 내장 SVG/합성음에서 실사 2D 에셋으로 즉시 핫스왑**합니다.
파일이 없어도 내장된 절차적 Web Audio 신시사이저와 SVG 벡터 그래픽이 100% 정상 작동합니다.

---

## 📁 1. 필수 파일 경로 및 네이밍 규격

### 🖼️ 이미지 (`public/assets/images/`)
- 해상도 권장: `512x512` 또는 `768x768` (정사각형, 배경 투명 PNG 권장)
- 파일명 목록:
  - `p1_state_0.png` : 1P 기본 정상 표정 (말끔, 미소)
  - `p1_state_1.png` : 1P 1단계 경미 (한쪽 눈 멍, 머리카락 삐죽)
  - `p1_state_2.png` : 1P 2단계 주의 (양쪽 눈탱이 밤탱이, 찡그림)
  - `p1_state_3.png` : 1P 3단계 중상 (코피 주르륵, 뺨 반창고)
  - `p1_state_4.png` : 1P 4단계 치명 (부르튼 입술, 찌그러진 얼굴, 머리 위 별)
  - `p1_state_5.png` : 1P 5단계 패배/KO (호박머리, X_X 기절 눈, 흰 깃발 흔듦)
  - `p2_state_0.png` ~ `p2_state_5.png` : 2P/CPU 라이벌 캐릭터 동일 단계
  - `bg_arcade.png` : 아케이드 게임 배경 일러스트 (선택)

### 🔊 오디오 (`public/assets/sounds/`)
- 포맷: `.mp3` 또는 `.wav`
- 파일명 목록:
  - `rps_chant.mp3` : "가위 바위 보" 리듬 톤
  - `hit.mp3` : 뺨/얼굴을 찰싹 때리는 강력한 타격음
  - `dodge.mp3` : 빗맞히는 쉭 바람 가르는 소리 (MISS)
  - `victory.mp3` : 승리 팡파레 멜로디
  - `surrender.mp3` : 패배/항복 슬픈 트롬본 사운드
  - `countdown.mp3` : 3, 2, 1 카운트다운 톤

---

## 🤖 2. 웹 제미나이(Gemini) 에셋 생성 프롬프트 팩

웹 제미나이(Gemini / Imagen 3)에 아래 프롬프트를 복사하여 입력하세요.

### [캐릭터 이미지 생성 프롬프트]
```text
Korean arcade comic style, funny fighting game character bust portrait, bold black comic outlines, cel-shaded, vibrant saturated colors, transparent or clean white background:
- Character: A cheerful Korean young challenger boy (P1).
- Expression/Damage State: [원하는 단계 입력: e.g. Stage 0: healthy smiling face / Stage 3: nosebleed with band-aid on cheek / Stage 5: knocked out face with spiral dizzy eyes holding a white surrender flag].
- Style: Retro 90s arcade comic book illustration, dynamic expression, high quality, 2D sprite art.
```

### [오디오/효과음 프롬프트 (오디오 생성 AI 활용 시)]
```text
- Hit Sound: Short cartoon slap impact sound effect, punchy, retro arcade game style, high dynamic range, crisp transient punch.
- Dodge Sound: Quick cartoon swoosh whoosh wind sound effect, comical miss.
- Victory Fanfare: 8-bit retro arcade game winning fanfare, upbeat brass synth melody, 3 seconds.
- Surrender Sound: Sad descending trombone cartoon sound, wah-wah-wah-waaah comical defeat tone.
```
