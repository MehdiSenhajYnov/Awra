// All sound is synthesised with WebAudio: no audio files to ship or license.

type Sfx = 'click' | 'key' | 'back' | 'tick' | 'coin' | 'stamp' | 'paper' | 'win' | 'lose' | 'deny' | 'bell' | 'zip';

type Track = 'cafe' | 'title' | 'none';

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
      case 'click': this.noise(0.04, 'bandpass', 2500, 4, 0.18); break;
      case 'key':
        // A typewriter key: sharp click plus a dull thud of the type bar.
        this.noise(0.03, 'highpass', 3500, 1, 0.3);
        this.tone(160 + Math.random() * 40, 0.06, 'square', 0.05, 0.005);
        break;
      case 'back': this.noise(0.06, 'bandpass', 900, 2, 0.2); break;
      case 'tick': this.tone(1200 + Math.random() * 300, 0.04, 'triangle', 0.05); break;
      case 'coin': this.tone(1568, 0.12, 'square', 0.05); this.tone(2093, 0.25, 'square', 0.04, 0.08); break;
      case 'stamp': this.tone(110, 0.2, 'sine', 0.6, 0, undefined, 50); this.noise(0.12, 'lowpass', 600, 1, 0.5); break;
      case 'paper': this.noise(0.3, 'bandpass', 3200, 0.8, 0.12); break;
      case 'zip': this.noise(0.35, 'bandpass', 1200, 2, 0.15, 0, undefined, 3800); break;
      case 'deny': this.tone(220, 0.15, 'square', 0.06); this.tone(165, 0.2, 'square', 0.06, 0.1); break;
      case 'bell': this.tone(2093, 0.9, 'sine', 0.12); this.tone(3136, 0.5, 'sine', 0.05); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.1, i * 0.11)); break;
      case 'lose': [392, 370, 349, 311].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.08, i * 0.22)); break;
    }
  }

  /** Little looping grooves: a walking bass with organ stabs, tempo set by the scene. */
  track(kind: Track): void {
    if (kind === this.current) return;
    this.current = kind;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (!this.ctx || kind === 'none') return;
    // Café jazz: walking bass, soft piano chords, brushed hi-hat.
    const patterns: Record<Exclude<Track, 'none'>, { bass: number[]; chords: number[][]; step: number }> = {
      title: { bass: [98, 110, 123.5, 130.8, 146.8, 130.8, 123.5, 110], chords: [[196, 246.9, 293.7, 349.2], [220, 261.6, 329.6, 392]], step: 330 },
      cafe: { bass: [87.3, 98, 110, 116.5, 130.8, 116.5, 110, 98], chords: [[174.6, 220, 261.6, 329.6], [196, 233.1, 293.7, 349.2]], step: 360 },
    };
    const p = patterns[kind];
    let i = 0;
    const step = () => {
      const b = p.bass[i % p.bass.length];
      if (b) this.tone(b, 0.32, 'sine', 0.28, 0, this.music);
      if (i % 8 === 0) {
        const chord = p.chords[(i / 8) % p.chords.length];
        chord.forEach((f) => this.tone(f, 1.6, 'triangle', 0.03, 0.01, this.music));
      }
      if (i % 2 === 1) this.noise(0.12, 'highpass', 6000, 1, 0.025, 0, this.music);
      i++;
    };
    step();
    this.timer = window.setInterval(step, p.step);
  }
}

export const audio = new AudioEngine();
