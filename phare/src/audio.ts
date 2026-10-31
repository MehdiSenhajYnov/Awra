// All sound is synthesised with WebAudio: the sea, the wind, the horn and the radio. No audio files.

type Sfx = 'click' | 'coin' | 'bell' | 'splash' | 'creak' | 'glug' | 'wipe' | 'horn' | 'thunder' | 'meow' | 'saved' | 'crash' | 'paper' | 'gull' | 'deny';

export interface Ambience {
  waves: number;
  rain: number;
  wind: number;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private fx!: GainNode;
  private amb!: GainNode;
  private beds: { waves: GainNode; rain: GainNode; wind: GainNode } | null = null;
  private timer: number | null = null;
  private radioOn = false;
  private volumes = { master: 0.8, music: 0.5, effects: 0.9 };
  private wanted: Ambience = { waves: 0.6, rain: 0, wind: 0 };

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
    this.amb = this.ctx.createGain();
    this.music.connect(this.master);
    this.fx.connect(this.master);
    this.amb.connect(this.master);
    this.apply();
    this.startBeds();
    this.ambience(this.wanted);
    if (this.radioOn) { this.radioOn = false; this.radio(true); }
  }

  setVolumes(v: { master: number; music: number; effects: number }): void {
    this.volumes = v;
    this.apply();
  }

  private apply(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.music.gain.setTargetAtTime(this.volumes.music * 0.45, t, 0.05);
    this.fx.gain.setTargetAtTime(this.volumes.effects, t, 0.05);
    this.amb.gain.setTargetAtTime(this.volumes.effects * 0.8, t, 0.05);
  }

  private noiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = buf.getChannelData(0);
    // Brownish noise: softer than white, closer to surf.
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5 + (Math.random() * 2 - 1) * 0.15; }
    return buf;
  }

  /** Continuous beds of surf, rain and wind, each with its own gain driven by the weather. */
  private startBeds(): void {
    const ctx = this.ctx!;
    const bed = (filter: BiquadFilterType, freq: number, q: number, lfoRate: number, lfoDepth: number, lfoTarget: 'gain' | 'freq') => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer(4);
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = filter;
      f.frequency.value = freq;
      f.Q.value = q;
      const swell = ctx.createGain();
      swell.gain.value = lfoTarget === 'gain' ? 1 - lfoDepth : 1;
      const out = ctx.createGain();
      out.gain.value = 0;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = lfoRate;
      const depth = ctx.createGain();
      depth.gain.value = lfoTarget === 'gain' ? lfoDepth : freq * lfoDepth;
      lfo.connect(depth).connect(lfoTarget === 'gain' ? swell.gain : f.frequency);
      src.connect(f).connect(swell).connect(out).connect(this.amb);
      src.start();
      lfo.start();
      return out;
    };
    this.beds = {
      waves: bed('lowpass', 520, 0.7, 0.11, 0.6, 'gain'),
      rain: bed('highpass', 3500, 0.5, 0.5, 0.1, 'gain'),
      wind: bed('bandpass', 700, 1.5, 0.07, 0.5, 'freq'),
    };
  }

  ambience(a: Ambience): void {
    this.wanted = a;
    if (!this.ctx || !this.beds) return;
    const t = this.ctx.currentTime;
    this.beds.waves.gain.setTargetAtTime(a.waves * 0.9, t, 1.5);
    this.beds.rain.gain.setTargetAtTime(a.rain * 0.35, t, 1.5);
    this.beds.wind.gain.setTargetAtTime(a.wind * 0.6, t, 1.5);
  }

  private noise(dur: number, type: BiquadFilterType, freq: number, q: number, gain: number, at = 0, sweepTo?: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur + 0.1);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    const t = ctx.currentTime + at;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + Math.min(0.05, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.fx);
    src.start(t);
    src.stop(t + dur + 0.1);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, at = 0, dest?: AudioNode, slideTo?: number, attack = 0.01): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    const t = ctx.currentTime + at;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.fx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  play(name: Sfx): void {
    if (!this.ctx) return;
    switch (name) {
      case 'click': this.noise(0.03, 'bandpass', 2400, 4, 0.12); break;
      case 'paper': this.noise(0.25, 'bandpass', 3000, 0.8, 0.08); break;
      case 'coin': this.tone(1760, 0.12, 'triangle', 0.05); this.tone(2349, 0.25, 'triangle', 0.04, 0.06); break;
      case 'bell': this.tone(880, 1.6, 'sine', 0.12); this.tone(880 * 2.76, 0.8, 'sine', 0.03); this.tone(1320, 1.2, 'sine', 0.05, 0.25); break;
      case 'splash': this.noise(0.5, 'bandpass', 1500, 0.8, 0.25, 0, 400); this.noise(0.2, 'highpass', 4000, 1, 0.1, 0.1); break;
      case 'creak': for (let i = 0; i < 5; i++) this.tone(140 + i * 12, 0.07, 'sawtooth', 0.04, i * 0.08); break;
      case 'glug': for (let i = 0; i < 4; i++) this.tone(300 - i * 30, 0.12, 'sine', 0.12, i * 0.12, undefined, 500); break;
      case 'wipe': this.noise(0.18, 'bandpass', 5000, 2, 0.08); this.noise(0.18, 'bandpass', 4200, 2, 0.08, 0.2); break;
      // A foghorn: two detuned low saws through a resonant lowpass.
      case 'horn': this.tone(110, 1.8, 'sawtooth', 0.14, 0, undefined, undefined, 0.25); this.tone(111.5, 1.8, 'sawtooth', 0.1, 0, undefined, undefined, 0.25); this.tone(55, 1.8, 'sine', 0.2, 0, undefined, undefined, 0.25); break;
      case 'thunder': this.noise(2.5, 'lowpass', 300, 0.7, 0.6, 0, 60); this.noise(0.3, 'lowpass', 1200, 0.5, 0.3); break;
      case 'meow': this.tone(700, 0.45, 'triangle', 0.08, 0, undefined, 950); this.tone(950, 0.3, 'triangle', 0.05, 0.3, undefined, 600); break;
      case 'saved': [523, 659, 784].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.08, i * 0.1)); break;
      case 'crash': this.noise(0.6, 'lowpass', 700, 0.8, 0.5); this.tone(70, 0.5, 'sine', 0.3, 0, undefined, 40); break;
      case 'gull': this.tone(1800, 0.18, 'triangle', 0.025, 0, undefined, 1300); this.tone(1900, 0.22, 'triangle', 0.02, 0.24, undefined, 1250); break;
      case 'deny': this.tone(220, 0.15, 'triangle', 0.05); break;
    }
  }

  /** The wireless plays a gentle accordion waltz while it is owned and switched on. */
  radio(on: boolean): void {
    if (on === this.radioOn) return;
    this.radioOn = on;
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    if (!this.ctx || !on) return;
    // A minor-key waltz in 3/4: bass on one, chord on two and three.
    const bars = [
      { bass: 110, chord: [220, 261.6, 329.6], tune: [659, 587, 523] },
      { bass: 146.8, chord: [220, 293.7, 349.2], tune: [587, 523, 440] },
      { bass: 98, chord: [196, 246.9, 293.7], tune: [494, 523, 587] },
      { bass: 130.8, chord: [196, 261.6, 329.6], tune: [523, 0, 0] },
      { bass: 110, chord: [220, 261.6, 329.6], tune: [440, 494, 523] },
      { bass: 146.8, chord: [220, 293.7, 349.2], tune: [587, 659, 698] },
      { bass: 82.4, chord: [207.7, 246.9, 329.6], tune: [659, 587, 494] },
      { bass: 110, chord: [220, 261.6, 329.6], tune: [440, 0, 0] },
    ];
    let i = 0;
    const step = () => {
      const bar = bars[Math.floor(i / 3) % bars.length];
      const beat = i % 3;
      if (beat === 0) this.tone(bar.bass, 0.6, 'sine', 0.18, 0, this.music);
      else bar.chord.forEach((f) => this.tone(f, 0.35, 'triangle', 0.025, 0, this.music));
      const n = bar.tune[beat];
      if (n) { this.tone(n, 0.5, 'sawtooth', 0.012, 0, this.music, undefined, 0.04); this.tone(n * 1.003, 0.5, 'square', 0.006, 0, this.music, undefined, 0.04); }
      i++;
    };
    step();
    this.timer = window.setInterval(step, 420);
  }
}

export const audio = new AudioEngine();
