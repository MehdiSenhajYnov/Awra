// All sound is synthesised with WebAudio: no audio files to ship or license.

type Sfx =
  | 'click' | 'place' | 'pick' | 'rotate' | 'zip' | 'coin' | 'stamp' | 'scanner' | 'bark' | 'sniff'
  | 'alarm' | 'search' | 'paper' | 'win' | 'lose' | 'deny' | 'bell';

type Track = 'cave' | 'poste' | 'title' | 'none';

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
      case 'pick': this.tone(520, 0.08, 'triangle', 0.12, 0, undefined, 700); break;
      case 'place': this.tone(180, 0.12, 'sine', 0.35, 0, undefined, 90); this.noise(0.06, 'lowpass', 900, 1, 0.15); break;
      case 'rotate': this.noise(0.06, 'bandpass', 1500, 6, 0.15); break;
      case 'zip': this.noise(0.45, 'bandpass', 900, 3, 0.2, 0, undefined, 4200); break;
      case 'coin': this.tone(1568, 0.12, 'square', 0.06); this.tone(2093, 0.25, 'square', 0.05, 0.08); break;
      case 'stamp': this.tone(110, 0.2, 'sine', 0.7, 0, undefined, 50); this.noise(0.12, 'lowpass', 600, 1, 0.5); break;
      case 'scanner':
        this.tone(60, 1.4, 'sawtooth', 0.06);
        this.tone(61.5, 1.4, 'sawtooth', 0.06);
        this.noise(1.4, 'bandpass', 3000, 2, 0.03);
        break;
      case 'bark':
        [0, 0.22].forEach((at) => {
          this.tone(420, 0.13, 'sawtooth', 0.12, at, undefined, 260);
          this.noise(0.12, 'bandpass', 900, 2, 0.25, at);
        });
        break;
      case 'sniff': for (let i = 0; i < 4; i++) this.noise(0.08, 'bandpass', 2200, 2, 0.15, i * 0.13); break;
      case 'alarm': [0, 0.35, 0.7].forEach((at) => { this.tone(880, 0.17, 'square', 0.07, at); this.tone(660, 0.17, 'square', 0.07, at + 0.17); }); break;
      case 'search': this.noise(0.1, 'lowpass', 400, 1, 0.4); this.noise(0.25, 'bandpass', 2000, 1, 0.08, 0.05); break;
      case 'paper': this.noise(0.3, 'bandpass', 3200, 0.8, 0.12); break;
      case 'deny': this.tone(200, 0.2, 'square', 0.08); this.tone(150, 0.25, 'square', 0.08, 0.1); break;
      case 'bell': this.tone(1318, 0.6, 'sine', 0.1); this.tone(1975, 0.4, 'sine', 0.05); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.12, i * 0.12)); break;
      case 'lose': [392, 370, 349, 311].forEach((f, i) => this.tone(f, 0.45, 'sawtooth', 0.06, i * 0.22)); break;
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
    const patterns: Record<Exclude<Track, 'none'>, { bass: number[]; chords: number[][]; step: number }> = {
      title: { bass: [110, 0, 138.6, 0, 164.8, 0, 146.8, 138.6], chords: [[220, 277, 330], [196, 247, 294]], step: 260 },
      cave: { bass: [98, 0, 123.5, 98, 146.8, 0, 130.8, 123.5], chords: [[196, 247, 294, 349], [174.6, 220, 262, 330]], step: 240 },
      poste: { bass: [82.4, 82.4, 0, 82.4, 87.3, 0, 82.4, 0], chords: [[165, 196, 233]], step: 200 },
    };
    const p = patterns[kind];
    let i = 0;
    const step = () => {
      const b = p.bass[i % p.bass.length];
      if (b) this.tone(b, 0.22, 'triangle', 0.22, 0, this.music);
      if (i % 8 === 0) {
        const chord = p.chords[(i / 8) % p.chords.length];
        chord.forEach((f) => this.tone(f, 0.5, 'square', 0.025, 0.01, this.music));
      }
      if (i % 2 === 1) this.noise(0.04, 'highpass', 7000, 1, kind === 'poste' ? 0.05 : 0.035, 0, this.music);
      if (kind === 'poste' && i % 4 === 0) this.noise(0.03, 'bandpass', 1200, 8, 0.05, 0, this.music);
      i++;
    };
    step();
    this.timer = window.setInterval(step, p.step);
  }
}

export const audio = new AudioEngine();
