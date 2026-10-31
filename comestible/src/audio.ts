// All sound is synthesised with WebAudio: no audio files to ship or license.

type Sfx =
  | 'click' | 'stamp' | 'paper' | 'knife' | 'bell' | 'blow' | 'coin' | 'whisper'
  | 'heartbeat' | 'purr' | 'hiss' | 'sting' | 'sniff' | 'pour' | 'thud' | 'fire' | 'page';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private amb!: GainNode;
  private fx!: GainNode;
  private reverb!: ConvolverNode;
  private droneGain: GainNode | null = null;
  private tensionOsc: OscillatorNode | null = null;
  private tensionGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private volumes = { master: 0.8, ambience: 0.7, effects: 0.9 };

  /** Must be called from a user gesture (browser autoplay rules). */
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
    this.amb = this.ctx.createGain();
    this.fx = this.ctx.createGain();
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.8);
    const wet = this.ctx.createGain();
    wet.gain.value = 0.35;
    this.reverb.connect(wet).connect(this.master);
    this.amb.connect(this.master);
    this.fx.connect(this.master);
    this.fx.connect(this.reverb);
    this.applyVolumes();
  }

  setVolumes(v: { master: number; ambience: number; effects: number }): void {
    this.volumes = v;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.amb.gain.setTargetAtTime(this.volumes.ambience, t, 0.05);
    this.fx.gain.setTargetAtTime(this.volumes.effects, t, 0.05);
  }

  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  private noiseBuffer(seconds: number, brown = false): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
    return buf;
  }

  private noise(dur: number, filter: BiquadFilterType, freq: number, q: number, gain: number, attack = 0.005, dest?: AudioNode, brown = false): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur + 0.1, brown);
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.fx);
    src.start(t);
    src.stop(t + dur + 0.1);
    return src;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, at = 0, dest?: AudioNode, attack = 0.01): OscillatorNode | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + at;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.fx);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  play(name: Sfx): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    switch (name) {
      case 'click':
        this.noise(0.05, 'bandpass', 2400, 3, 0.15);
        break;
      case 'page':
      case 'paper':
        this.noise(0.35, 'bandpass', 3000, 0.8, 0.12, 0.05);
        break;
      case 'stamp': {
        this.noise(0.18, 'lowpass', 500, 1, 0.9);
        const o = this.tone(90, 0.25, 'sine', 0.8);
        o?.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
        break;
      }
      case 'thud': {
        const o = this.tone(70, 0.35, 'sine', 0.7);
        o?.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.3);
        break;
      }
      case 'knife': {
        const src = this.noise(0.4, 'highpass', 3000, 1, 0.25, 0.02);
        void src;
        this.noise(0.3, 'bandpass', 600, 4, 0.2, 0.1);
        break;
      }
      case 'bell':
        [880, 1320, 2093, 2637].forEach((f, i) => this.tone(f, 1.6 - i * 0.3, 'sine', 0.12 / (i + 1)));
        this.tone(988, 1.2, 'sine', 0.06, 0.12);
        break;
      case 'blow':
        this.noise(0.7, 'bandpass', 900, 0.6, 0.35, 0.08, undefined, true);
        break;
      case 'coin':
        this.tone(2093, 0.25, 'triangle', 0.12);
        this.tone(2637, 0.3, 'triangle', 0.1, 0.07);
        break;
      case 'sniff':
        for (let i = 0; i < 3; i++) setTimeout(() => this.noise(0.12, 'bandpass', 1800, 1.5, 0.18, 0.03), i * 140);
        break;
      case 'pour':
        this.noise(1.2, 'bandpass', 1200, 2, 0.08, 0.3);
        break;
      case 'fire':
        for (let i = 0; i < 14; i++) setTimeout(() => this.noise(0.06, 'highpass', 1500 + Math.random() * 3000, 1, 0.12 * Math.random()), i * 60);
        this.noise(1.4, 'lowpass', 400, 0.7, 0.35, 0.2, undefined, true);
        break;
      case 'whisper':
        for (let i = 0; i < 7; i++) {
          setTimeout(() => this.noise(0.18 + Math.random() * 0.2, 'bandpass', 1400 + Math.random() * 2200, 6, 0.07, 0.06), i * 150 + Math.random() * 80);
        }
        break;
      case 'heartbeat':
        [0, 0.28].forEach((at) => {
          const o = this.tone(55, 0.2, 'sine', 0.9, at);
          o?.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + at + 0.18);
        });
        break;
      case 'purr': {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer(1.5, true);
        const am = ctx.createGain();
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 24;
        const depth = ctx.createGain();
        depth.gain.value = 0.5;
        lfo.connect(depth).connect(am.gain);
        const out = ctx.createGain();
        out.gain.setValueAtTime(0.5, ctx.currentTime);
        out.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
        src.connect(am).connect(out).connect(this.fx);
        lfo.start();
        src.start();
        src.stop(ctx.currentTime + 1.5);
        lfo.stop(ctx.currentTime + 1.5);
        break;
      }
      case 'hiss':
        this.noise(0.8, 'highpass', 4000, 0.5, 0.3, 0.02);
        break;
      case 'sting':
        [146.8, 155.6, 207.7, 311].forEach((f) => this.tone(f, 2.5, 'sawtooth', 0.04, 0, undefined, 0.02));
        this.noise(1.5, 'bandpass', 300, 1, 0.2, 0.01);
        break;
    }
  }

  /** Night ambience: wind and a low drone whose dissonance follows the tension. */
  startAmbience(): void {
    if (!this.ctx || this.droneGain) return;
    const ctx = this.ctx;
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuffer(8, true);
    wind.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'lowpass';
    wf.frequency.value = 500;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain).connect(wf.frequency);
    const wg = ctx.createGain();
    wg.gain.value = 0.25;
    wind.connect(wf).connect(wg).connect(this.amb);
    wind.start();
    lfo.start();

    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    this.droneGain.gain.setTargetAtTime(0.09, ctx.currentTime, 3);
    const df = ctx.createBiquadFilter();
    df.type = 'lowpass';
    df.frequency.value = 380;
    this.droneGain.connect(df).connect(this.amb);
    for (const f of [55, 55.4, 82.4]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.connect(this.droneGain);
      o.start();
    }
    this.tensionGain = ctx.createGain();
    this.tensionGain.gain.value = 0;
    this.tensionOsc = ctx.createOscillator();
    this.tensionOsc.type = 'sine';
    this.tensionOsc.frequency.value = 77.8;
    this.tensionOsc.connect(this.tensionGain).connect(df);
    this.tensionOsc.start();
  }

  setTension(level: number): void {
    if (!this.ctx || !this.tensionGain) return;
    this.tensionGain.gain.setTargetAtTime(Math.min(level, 1) * 0.12, this.ctx.currentTime, 1.5);
  }

  /** Slow music-box loop for title, morning and endings. */
  music(kind: 'title' | 'morning' | 'ending' | 'none'): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (!this.ctx || kind === 'none') return;
    const scales: Record<string, number[]> = {
      title: [220, 261.6, 329.6, 293.7, 246.9, 220, 196, 164.8],
      morning: [293.7, 349.2, 440, 392, 349.2, 329.6, 293.7, 261.6],
      ending: [196, 233.1, 293.7, 277.2, 233.1, 220, 196, 174.6],
    };
    const notes = scales[kind];
    let i = 0;
    const step = () => {
      const f = notes[i % notes.length] * (i % 16 >= 8 ? 1 : 2);
      this.tone(f, 2.4, 'triangle', 0.045, 0, this.amb);
      if (i % 4 === 0) this.tone(notes[(i / 4) % notes.length] / 2, 3.5, 'sine', 0.05, 0, this.amb, 0.2);
      i++;
    };
    step();
    this.musicTimer = window.setInterval(step, 900);
  }
}

export const audio = new AudioEngine();
