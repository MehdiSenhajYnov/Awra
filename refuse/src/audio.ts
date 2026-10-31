// All sound is synthesised with WebAudio: no audio files to ship or license.

type Sfx = 'click' | 'coin' | 'stamp' | 'approve' | 'paper' | 'quill' | 'win' | 'lose' | 'deny' | 'bell' | 'riot' | 'fanfare' | 'gavel' | 'buy';

type Track = 'office' | 'title' | 'trial' | 'none';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private fx!: GainNode;
  private timer: number | null = null;
  private current: Track = 'none';
  private volumes = { master: 0.8, music: 0.6, effects: 0.9 };

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.fx = this.ctx.createGain();
    this.music.connect(this.master);
    this.fx.connect(this.master);
    this.apply();
    const pending = this.current;
    this.current = 'none';
    if (pending !== 'none') this.track(pending);
  }

  setVolumes(v: { master: number; music: number; effects: number }): void {
    this.volumes = v;
    this.apply();
  }

  private apply(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.music.gain.setTargetAtTime(this.volumes.music * 0.5, t, 0.05);
    this.fx.gain.setTargetAtTime(this.volumes.effects, t, 0.05);
  }

  private noise(dur: number, type: BiquadFilterType, freq: number, q: number, gain: number, at = 0, dest?: AudioNode, sweepTo?: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * (dur + 0.05));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    const t = ctx.currentTime + at;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.fx);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, at = 0, dest?: AudioNode, slideTo?: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    const t = ctx.currentTime + at;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.fx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  play(name: Sfx): void {
    if (!this.ctx) return;
    switch (name) {
      case 'click': this.noise(0.04, 'bandpass', 2200, 4, 0.16); break;
      case 'coin': this.tone(1318, 0.1, 'square', 0.04); this.tone(1760, 0.22, 'square', 0.035, 0.07); break;
      case 'buy': this.tone(1046, 0.08, 'triangle', 0.08); this.tone(1568, 0.25, 'triangle', 0.07, 0.06); this.noise(0.15, 'bandpass', 5000, 3, 0.05, 0.05); break;
      // A heavy wooden stamp hitting a desk: low thump, a knock, a paper slap.
      case 'stamp':
        this.tone(95, 0.22, 'sine', 0.7, 0, undefined, 40);
        this.noise(0.1, 'lowpass', 500, 1, 0.55);
        this.noise(0.05, 'bandpass', 2400, 2, 0.15, 0.01);
        break;
      case 'approve': this.tone(160, 0.12, 'sine', 0.35, 0, undefined, 90); this.noise(0.06, 'bandpass', 1800, 2, 0.12); this.tone(784, 0.3, 'triangle', 0.05, 0.08); break;
      case 'paper': this.noise(0.28, 'bandpass', 3000, 0.8, 0.1); break;
      case 'quill': for (let i = 0; i < 4; i++) this.noise(0.05, 'highpass', 5000 + i * 300, 2, 0.06, i * 0.06); break;
      case 'deny': this.tone(196, 0.15, 'square', 0.05); this.tone(147, 0.22, 'square', 0.05, 0.1); break;
      case 'bell': this.tone(1046, 1.2, 'sine', 0.12); this.tone(2093, 0.6, 'sine', 0.04); this.tone(1046 * 2.76, 0.4, 'sine', 0.02); break;
      // Angry crowd: layered rumbling noise with shouts.
      case 'riot':
        this.noise(1.6, 'bandpass', 400, 0.7, 0.35);
        this.noise(1.2, 'bandpass', 900, 1.5, 0.2, 0.2);
        for (let i = 0; i < 5; i++) this.tone(180 + Math.random() * 160, 0.25, 'sawtooth', 0.03, 0.15 + i * 0.22, undefined, 120 + Math.random() * 80);
        this.noise(0.25, 'highpass', 3000, 1, 0.3, 0.5);
        break;
      case 'fanfare': [392, 392, 523, 659, 784].forEach((f, i) => this.tone(f, i === 4 ? 0.7 : 0.18, 'sawtooth', 0.05, i * 0.14)); break;
      case 'gavel': this.noise(0.08, 'lowpass', 900, 1, 0.6); this.noise(0.08, 'lowpass', 900, 1, 0.5, 0.25); break;
      case 'win': [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.1, i * 0.12)); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.08, i * 0.22)); break;
    }
  }

  /** Loops in the dorian mode: a plucked lute line over a fifth drone, like a minstrel in the corridor. */
  track(kind: Track): void {
    if (kind === this.current) return;
    this.current = kind;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (!this.ctx || kind === 'none') return;
    const D = [146.8, 164.8, 174.6, 196, 220, 246.9, 261.6, 293.7, 329.6, 349.2, 392];
    const patterns: Record<Exclude<Track, 'none'>, { melody: number[]; drone: number[]; step: number }> = {
      title: { melody: [7, 4, 5, 7, 8, 7, 5, 4, 3, 4, 5, 4, 2, 1, 0, -1], drone: [73.4, 110], step: 300 },
      office: { melody: [0, 2, 4, -1, 3, 2, 1, -1, 0, 4, 7, 5, 4, 2, 0, -1], drone: [73.4, 110], step: 380 },
      trial: { melody: [0, 0, 3, -1, 2, 2, 1, -1, 0, 0, 3, 5, 4, 3, 1, -1], drone: [73.4, 103.8], step: 300 },
    };
    const p = patterns[kind];
    let i = 0;
    const step = () => {
      const n = p.melody[i % p.melody.length];
      if (n >= 0) {
        this.tone(D[n], 0.5, 'triangle', 0.09, 0, this.music);
        this.tone(D[n] * 2, 0.18, 'sine', 0.025, 0, this.music);
      }
      if (i % 16 === 0) p.drone.forEach((f) => this.tone(f, p.step * 16 / 1000, 'sine', 0.07, 0, this.music));
      if (kind === 'trial' && i % 4 === 0) this.noise(0.1, 'lowpass', 200, 1, 0.12, 0, this.music);
      i++;
    };
    step();
    this.timer = window.setInterval(step, p.step);
  }
}

export const audio = new AudioEngine();
