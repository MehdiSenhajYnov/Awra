// Every sound is synthesised: hammer on bronze, bells, wind and the drones of each zone. No audio files.

export type Sfx =
  | 'swing' | 'hit' | 'hitHeavy' | 'clang' | 'parry' | 'hurt' | 'jump' | 'land' | 'dash' | 'echo' | 'swap' | 'heal' | 'healed'
  | 'death' | 'bronze' | 'break' | 'bell' | 'bellBig' | 'gate' | 'item' | 'ability' | 'rest' | 'menu' | 'menuMove' | 'back'
  | 'shoot' | 'slam' | 'grapple' | 'roar' | 'enemyDie' | 'splash' | 'hazard' | 'wind' | 'tick' | 'chime' | 'ink';

const BELL_PARTIALS = [0.5, 1, 1.183, 1.506, 2, 2.514, 2.662, 3.011];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private fx!: GainNode;
  private reverb!: ConvolverNode;
  private wet!: GainNode;
  private volumes = { master: 0.8, music: 0.55, effects: 0.9 };
  private zone = -1;
  private timer: number | null = null;
  private intensity = 0;
  private noiseBuf: AudioBuffer | null = null;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.fx = ctx.createGain();
    // A long synthetic cathedral reverb.
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb.buffer = ir;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.32;
    this.musicBus.connect(this.master);
    this.fx.connect(this.master);
    this.musicBus.connect(this.reverb);
    this.fx.connect(this.reverb);
    this.reverb.connect(this.wet).connect(this.master);
    const nlen = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    this.apply();
    if (this.zone >= 0) { const z = this.zone; this.zone = -1; this.music(z); }
  }

  setVolumes(v: { master: number; music: number; effects: number }): void {
    this.volumes = v;
    this.apply();
  }

  private apply(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.4, t, 0.05);
    this.fx.gain.setTargetAtTime(this.volumes.effects * 0.9, t, 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, at = 0, dest?: AudioNode, slideTo?: number, attack = 0.005): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    const t = ctx.currentTime + at;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest ?? this.fx);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, type: BiquadFilterType, freq: number, q: number, gain: number, at = 0, sweepTo?: number): void {
    if (!this.ctx || !this.noiseBuf) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    const t = ctx.currentTime + at;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.fx);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /** A struck bell: inharmonic partials with long decays. */
  bell(freq: number, gain = 0.12, dur = 2.5, dest?: AudioNode): void {
    BELL_PARTIALS.forEach((p, i) => this.tone(freq * p, dur * (1.2 - i * 0.12), 'sine', gain / (1 + i * 0.7), 0, dest, undefined, 0.002));
  }

  play(name: Sfx, pitch = 1): void {
    if (!this.ctx) return;
    const p = pitch;
    switch (name) {
      case 'swing': this.noise(0.12, 'bandpass', 1800 * p, 1.5, 0.12, 0, 600); break;
      case 'hit': this.bell(660 * p, 0.05, 0.4); this.noise(0.06, 'lowpass', 1500, 1, 0.3); this.tone(120, 0.12, 'sine', 0.35, 0, undefined, 60); break;
      case 'hitHeavy': this.bell(330 * p, 0.08, 0.9); this.noise(0.12, 'lowpass', 900, 1, 0.45); this.tone(80, 0.25, 'sine', 0.5, 0, undefined, 40); break;
      case 'clang': this.bell(1400, 0.07, 0.5); this.noise(0.05, 'highpass', 3000, 1, 0.2); break;
      case 'parry': this.bell(1046, 0.1, 1.6); this.bell(1568, 0.06, 1.2); this.noise(0.08, 'highpass', 4000, 1, 0.2); break;
      case 'hurt': this.tone(220, 0.3, 'sawtooth', 0.12, 0, undefined, 70); this.noise(0.2, 'lowpass', 600, 1, 0.4); break;
      case 'jump': this.noise(0.08, 'bandpass', 900, 2, 0.06, 0, 2000); break;
      case 'land': this.noise(0.06, 'lowpass', 400, 1, 0.12); break;
      case 'dash': this.noise(0.2, 'bandpass', 600, 1, 0.16, 0, 3000); break;
      case 'echo': this.tone(440, 0.6, 'sine', 0.1, 0, undefined, 880); this.tone(660, 0.6, 'sine', 0.06, 0.05, undefined, 1320); break;
      case 'swap': this.tone(1320, 0.25, 'sine', 0.1, 0, undefined, 330); this.noise(0.15, 'bandpass', 2000, 2, 0.1); break;
      case 'heal': this.tone(330, 0.9, 'sine', 0.05, 0, undefined, 660, 0.3); break;
      case 'healed': this.bell(784, 0.08, 1.6); break;
      case 'death': this.bell(110, 0.2, 4); this.tone(55, 2, 'sine', 0.3, 0, undefined, 30); break;
      case 'bronze': this.bell(1760 * p, 0.03, 0.4); break;
      case 'break': this.noise(0.4, 'lowpass', 1200, 0.8, 0.45, 0, 200); this.tone(70, 0.3, 'sine', 0.3); break;
      case 'bell': this.bell(523 * p, 0.12, 2.5); break;
      case 'bellBig': this.bell(130.8, 0.28, 6); this.bell(196, 0.12, 5); break;
      case 'gate': this.noise(0.6, 'lowpass', 500, 2, 0.3, 0, 120); this.tone(90, 0.5, 'square', 0.04); break;
      case 'item': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.9, 'sine', 0.06, i * 0.09)); break;
      case 'ability': this.bell(261.6, 0.18, 4); [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 1.6, 'sine', 0.05, 0.2 + i * 0.15)); break;
      case 'rest': this.bell(392, 0.1, 3); this.bell(587, 0.06, 3); break;
      case 'menu': this.bell(1046, 0.04, 0.4); break;
      case 'menuMove': this.tone(1318, 0.05, 'sine', 0.03); break;
      case 'back': this.tone(660, 0.08, 'sine', 0.04, 0, undefined, 440); break;
      case 'shoot': this.tone(700 * p, 0.15, 'triangle', 0.06, 0, undefined, 300); break;
      case 'slam': this.noise(0.5, 'lowpass', 900, 0.8, 0.55, 0, 100); this.tone(60, 0.5, 'sine', 0.5, 0, undefined, 30); break;
      case 'grapple': this.tone(900, 0.2, 'sine', 0.06, 0, undefined, 1800); this.noise(0.15, 'highpass', 3000, 1, 0.08); break;
      case 'roar': this.tone(90 * p, 1.2, 'sawtooth', 0.12, 0, undefined, 50, 0.1); this.noise(1.2, 'lowpass', 500, 1, 0.3, 0, 120); break;
      case 'enemyDie': this.bell(392 * p, 0.06, 1); this.noise(0.25, 'lowpass', 900, 1, 0.25, 0, 150); break;
      case 'splash': this.noise(0.35, 'bandpass', 1400, 0.8, 0.25, 0, 400); break;
      case 'hazard': this.noise(0.2, 'highpass', 2500, 1, 0.2); this.tone(180, 0.25, 'square', 0.06, 0, undefined, 90); break;
      case 'wind': this.noise(0.8, 'bandpass', 500, 1, 0.12, 0, 1400); break;
      case 'tick': this.noise(0.03, 'highpass', 5000, 1, 0.12); break;
      case 'chime': this.bell(1568 * p, 0.04, 0.8); break;
      case 'ink': this.tone(60, 1.5, 'sine', 0.2, 0, undefined, 30, 0.2); this.noise(1, 'lowpass', 200, 1, 0.2); break;
    }
  }

  /**
   * Zone music: a slow modal melody of bells over a drone; `intensity` (0..1) adds a pulse for bosses.
   * Zone indexes follow ZONES; -1 is silence.
   */
  music(zone: number, key = 0): void {
    if (zone === this.zone) return;
    this.zone = zone;
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    if (!this.ctx || zone < 0) return;
    const base = 130.81 * Math.pow(2, key / 12);
    // Dorian / phrygian / aeolian flavours by zone.
    const modes = [[0, 2, 3, 5, 7, 9, 10], [0, 1, 3, 5, 7, 8, 10], [0, 2, 3, 5, 7, 8, 10]];
    const mode = modes[zone % 3];
    let step = 0;
    const tick = () => {
      if (!this.ctx) return;
      const bar = Math.floor(step / 8);
      if (step % 16 === 0) {
        this.tone(base / 2, 7, 'sine', 0.14, 0, this.musicBus, undefined, 1.5);
        this.tone(base * 0.75, 7, 'sine', 0.05, 0, this.musicBus, undefined, 1.5);
      }
      const seed = (zone * 31 + bar * 7 + step * 13) % 17;
      if (step % 2 === 0 && seed % 3 !== 0) {
        const deg = mode[(seed + bar) % mode.length];
        const oct = seed % 5 === 0 ? 2 : 1;
        this.bell(base * oct * Math.pow(2, deg / 12), 0.035, 3.2, this.musicBus);
      }
      if (this.intensity > 0.3 && step % 2 === 1) this.tone(base / 2, 0.25, 'triangle', 0.08 * this.intensity, 0, this.musicBus);
      if (this.intensity > 0.6 && step % 4 === 0) this.noise(0.1, 'lowpass', 300, 1, 0.12 * this.intensity);
      step++;
    };
    tick();
    this.timer = window.setInterval(tick, 420);
  }

  setIntensity(v: number): void {
    this.intensity = v;
  }
}

export const audio = new AudioEngine();
