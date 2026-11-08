// Web Audio API Synthesizer for Camera Sound Effects (zero external asset dependencies)

class CameraAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** One crisp shutter "tick": a band-passed noise burst plus a short falling tone. */
  private tick(ctx: AudioContext, when: number, pitch: number, level: number) {
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = pitch * 2.2;
    band.Q.value = 1.1;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(level, when);
    ng.gain.exponentialRampToValueAtTime(0.001, when + 0.03);
    noise.connect(band);
    band.connect(ng);
    ng.connect(ctx.destination);
    noise.start(when);
    noise.stop(when + 0.032);

    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, when);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, when + 0.022);
    og.gain.setValueAtTime(level * 0.55, when);
    og.gain.exponentialRampToValueAtTime(0.001, when + 0.025);
    osc.connect(og);
    og.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + 0.028);
  }

  /**
   * Phone-camera shutter: a short two-part click (open, then close about 90 ms later) with a light haptic tap.
   * Synthesised, so there is no audio asset to ship.
   */
  playShutter() {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(12);
      } catch {
        // haptics are optional
      }
    }
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tick(ctx, now, 1900, 0.55);
    this.tick(ctx, now + 0.09, 1500, 0.4);
  }

  // Previous layered "mechanical" shutter, kept for reference and the optional mechanical style
  playMechanicalShutter() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Mirror slap: low frequency punch
    const mirrorOsc = ctx.createOscillator();
    const mirrorGain = ctx.createGain();
    mirrorOsc.type = 'triangle';
    mirrorOsc.frequency.setValueAtTime(140, now);
    mirrorOsc.frequency.exponentialRampToValueAtTime(30, now + 0.05);

    mirrorGain.gain.setValueAtTime(0.4, now);
    mirrorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    mirrorOsc.connect(mirrorGain);
    mirrorGain.connect(ctx.destination);
    mirrorOsc.start(now);
    mirrorOsc.stop(now + 0.07);

    // 2. High frequency shutter curtain click (white noise snap)
    const bufferSize = ctx.sampleRate * 0.08;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.Q.setValueAtTime(3, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now + 0.015);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now + 0.015);
    whiteNoise.stop(now + 0.07);

    // 3. Second shutter close click
    const closeNoise = ctx.createBufferSource();
    closeNoise.buffer = noiseBuffer;
    const closeFilter = ctx.createBiquadFilter();
    closeFilter.type = 'highpass';
    closeFilter.frequency.setValueAtTime(1800, now + 0.06);

    const closeGain = ctx.createGain();
    closeGain.gain.setValueAtTime(0.35, now + 0.06);
    closeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    closeNoise.connect(closeFilter);
    closeFilter.connect(closeGain);
    closeGain.connect(ctx.destination);
    closeNoise.start(now + 0.06);
    closeNoise.stop(now + 0.12);
  }

  // AF lock beep: dual-tone precision beep
  playFocusLock() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.setValueAtTime(2200, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Countdown timer beep
  playTimerBeep(isFinal: boolean = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 1760 : 880, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.35 : 0.08));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isFinal ? 0.36 : 0.09));
  }

  // Horizon level snap click
  playLevelSnap() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, now);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Tactile dial click
  playClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }
}

export const cameraAudio = new CameraAudioEngine();
