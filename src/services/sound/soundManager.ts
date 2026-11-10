import { ASSET_PATHS } from '../../config/constants';

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private customAudioCache: Map<string, HTMLAudioElement> = new Map();
  private failedFiles: Set<string> = new Set();
  private bgmAudio: HTMLAudioElement | null = null;

  constructor() {
    // 지연 초기화 (사용자 제스처 후 활성화)
  }

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch((e) => console.warn('AudioContext resume error:', e));
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.bgmAudio) {
      this.bgmAudio.muted = this.isMuted;
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public playBgm(): void {
    if (this.bgmAudio) {
      if (!this.isMuted) this.bgmAudio.play().catch(() => {});
      return;
    }

    try {
      this.bgmAudio = new Audio('/assets/sounds/bgm.mp3');
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.25;
      this.bgmAudio.muted = this.isMuted;
      this.bgmAudio.play().catch(() => {
        // 자동 재생 차단 시 무시
      });
    } catch {
      // BGM 파일 없을 경우 무시
    }
  }

  public stopBgm(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
  }

  /**
   * 외부 오디오 파일 재생 시도 후, 실패 시 절차적 Web Audio 신시사이저 실행
   */
  private async tryPlayExternalOrSynthesize(
    url: string,
    synthesizerFn: () => void
  ): Promise<void> {
    if (this.isMuted) return;

    if (this.failedFiles.has(url)) {
      synthesizerFn();
      return;
    }

    try {
      let audio = this.customAudioCache.get(url);
      if (!audio) {
        audio = new Audio(url);
        audio.preload = 'auto';
        this.customAudioCache.set(url, audio);
      }
      audio.currentTime = 0;
      await audio.play();
    } catch {
      this.failedFiles.add(url);
      synthesizerFn();
    }
  }

  /**
   * 1. 가위바위보 리듬 톤 (단음 3단계 상승)
   */
  public playRPSChant(): void {
    this.tryPlayExternalOrSynthesize(ASSET_PATHS.SOUNDS.RPS_CHANT, () => {
      const ctx = this.getContext();
      const notes = [261.63, 329.63, 392.0]; // C4, E4, G4
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);

        gain.gain.setValueAtTime(0.2, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.18);
        osc.stop(now + (idx + 1) * 0.18);
      });
    });
  }

  /**
   * 2. 왜곡된 저주파 펀치 폭발음 (hit1/2/3 무작위 변형 지원)
   */
  public playHit(): void {
    const hitIndex = Math.floor(Math.random() * 3) + 1;
    const hitUrl = `/assets/sounds/hit${hitIndex}.mp3`;

    this.tryPlayExternalOrSynthesize(hitUrl, () => {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);

      try {
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.15);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.15);
      } catch (e) {
        console.warn('Noise burst synth error:', e);
      }
    });
  }

  /**
   * 3. 경쾌한 바람 가르는 쉭 소리 (MISS / 회피)
   */
  public playDodge(): void {
    this.tryPlayExternalOrSynthesize(ASSET_PATHS.SOUNDS.DODGE, () => {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const bufferSize = ctx.sampleRate * 0.22;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 3.0;
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.1);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.22);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.22);
    });
  }

  /**
   * 4. 아케이드 팡파레 (승리 - you_win.mp3)
   */
  public playVictory(): void {
    this.tryPlayExternalOrSynthesize(ASSET_PATHS.SOUNDS.VICTORY, () => {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const fanfare = [
        { f: 261.63, d: 0.12 },
        { f: 329.63, d: 0.12 },
        { f: 392.0, d: 0.12 },
        { f: 523.25, d: 0.4 },
      ];

      let elapsed = 0;
      fanfare.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(n.f, now + elapsed);

        gain.gain.setValueAtTime(0.15, now + elapsed);
        gain.gain.exponentialRampToValueAtTime(0.001, now + elapsed + n.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + elapsed);
        osc.stop(now + elapsed + n.d);
        elapsed += n.d * 0.9;
      });
    });
  }

  /**
   * 5. 슬픈 트롬본 디센딩 톤 (패배 / 항복 - loose.mp3)
   */
  public playSurrender(): void {
    this.tryPlayExternalOrSynthesize(ASSET_PATHS.SOUNDS.SURRENDER, () => {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [293.66, 277.18, 261.63, 246.94];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.25);
        if (idx === notes.length - 1) {
          osc.frequency.exponentialRampToValueAtTime(160, now + idx * 0.25 + 0.6);
        }

        gain.gain.setValueAtTime(0.2, now + idx * 0.25);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          now + idx * 0.25 + (idx === 3 ? 0.6 : 0.24)
        );

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.25);
        osc.stop(now + idx * 0.25 + (idx === 3 ? 0.6 : 0.24));
      });
    });
  }

  /**
   * 6. 카운트다운 비프음
   */
  public playCountdown(isGo: boolean = false): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isGo ? 'sine' : 'square';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.25 : 0.12));

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + (isGo ? 0.25 : 0.12));
  }
}

export const soundManager = new SoundManager();
