// Procedural audio: every sound and the music are synthesised with WebAudio (no files), through a shared
// convolution reverb and a master compressor.

type Opts = { vol?: number; pitch?: number; x?: number };

class Audio {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private noise!: AudioBuffer;
  musicVol = 0.7;
  sfxVol = 0.8;
  private music: Music | null = null;
  private last = new Map<string, number>();

  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    comp.connect(this.master).connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus.connect(comp);
    this.musicBus.connect(comp);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2, 2.6);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.9;
    this.reverbSend.connect(this.reverb).connect(comp);
    const n = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = n;
    this.setVolumes(this.musicVol, this.sfxVol);
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVol = music;
    this.sfxVol = sfx;
    if (!this.ctx) return;
    this.musicBus.gain.value = music * 0.55;
    this.sfxBus.gain.value = sfx;
  }

  private impulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  /** An enveloped voice routed to sfx (and some reverb). */
  private voice(vol: number, wet: number, pan = 0): { out: GainNode; t: number } {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = 0;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p);
    p.connect(this.sfxBus);
    const s = ctx.createGain();
    s.gain.value = wet;
    p.connect(s).connect(this.reverbSend);
    void vol;
    return { out: g, t: ctx.currentTime };
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number): void {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private osc(type: OscillatorType, f0: number, f1: number, dur: number, dest: AudioNode, t: number): OscillatorNode {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    o.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private noiseSrc(dest: AudioNode, t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, q = 1): void {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    s.connect(f).connect(dest);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  play(name: string, o: Opts = {}): void {
    const ctx = this.ctx;
    if (!ctx || this.sfxVol <= 0) return;
    const now = ctx.currentTime;
    // Same sound at most every 30 ms.
    if ((this.last.get(name) ?? 0) > now - 0.03) return;
    this.last.set(name, now);
    const vol = (o.vol ?? 1) * 0.6;
    const p = o.pitch ?? 1;
    const pan = o.x ?? 0;
    const v = (wet = 0.25) => this.voice(vol, wet, pan);
    switch (name) {
      case 'slash':
      case 'slashBig': {
        const big = name === 'slashBig';
        const { out, t } = v(0.3);
        this.env(out, t, 0.005, vol * (big ? 0.9 : 0.6), big ? 0.32 : 0.2);
        this.noiseSrc(out, t, big ? 0.3 : 0.18, 'bandpass', 2400 * p, 6500 * p, 1.4);
        const { out: o2, t: t2 } = v(0.5);
        this.env(o2, t2, 0.002, vol * 0.18, 0.5);
        this.osc('sine', 1900 * p, 1700 * p, 0.5, o2, t2);
        this.osc('sine', 2870 * p, 2700 * p, 0.4, o2, t2);
        break;
      }
      case 'palm': {
        const { out, t } = v(0.3);
        this.env(out, t, 0.004, vol * 0.5, 0.18);
        this.noiseSrc(out, t, 0.15, 'lowpass', 1800, 300);
        this.osc('sine', 300, 120, 0.15, out, t);
        break;
      }
      case 'hit':
      case 'hitBlade':
      case 'hitBig': {
        const big = name === 'hitBig';
        const { out, t } = v(0.25);
        this.env(out, t, 0.002, vol * (big ? 1.1 : 0.8), big ? 0.45 : 0.22);
        this.noiseSrc(out, t, 0.2, 'lowpass', 5000, 400);
        this.osc('sine', (big ? 160 : 220) * p, 50, 0.3, out, t);
        this.osc('triangle', (big ? 90 : 140) * p, 40, 0.2, out, t);
        if (name === 'hitBlade' || big) {
          const { out: o2, t: t2 } = v(0.6);
          this.env(o2, t2, 0.002, vol * 0.25, big ? 1.2 : 0.6);
          this.osc('sine', 1320 * p, 1300 * p, 1.2, o2, t2);
          this.osc('sine', 1980 * p, 1960 * p, 0.9, o2, t2);
        }
        break;
      }
      case 'clank': {
        const { out, t } = v(0.4);
        this.env(out, t, 0.001, vol * 0.7, 0.4);
        for (const f of [880, 1310, 2093, 2780]) this.osc('square', f, f * 0.98, 0.4, out, t);
        break;
      }
      case 'kill': {
        const { out, t } = v(0.5);
        this.env(out, t, 0.01, vol * 0.9, 0.8);
        this.noiseSrc(out, t, 0.8, 'lowpass', 2500 * p, 120);
        this.osc('sawtooth', 220 * p, 40, 0.6, out, t);
        const { out: o2, t: t2 } = v(0.8);
        this.env(o2, t2, 0.05, vol * 0.2, 1.2);
        this.osc('sine', 660 * p, 1320 * p, 1.2, o2, t2);
        break;
      }
      case 'hurt': {
        const { out, t } = v(0.3);
        this.env(out, t, 0.002, vol * 1.1, 0.5);
        this.noiseSrc(out, t, 0.4, 'bandpass', 800, 200, 0.8);
        this.osc('sawtooth', 180, 60, 0.4, out, t);
        this.osc('square', 95, 50, 0.3, out, t);
        break;
      }
      case 'eclipse': {
        const { out, t } = v(0.9);
        this.env(out, t, 0.02, vol * 0.6, 2.2);
        this.osc('sine', 1760, 440, 1.6, out, t);
        this.osc('sine', 2637, 660, 1.6, out, t);
        this.noiseSrc(out, t, 1.2, 'bandpass', 6000, 400, 2);
        break;
      }
      case 'jump':
      case 'doubleJump': {
        const { out, t } = v(0.2);
        this.env(out, t, 0.004, vol * 0.35, 0.16);
        this.noiseSrc(out, t, 0.15, 'highpass', 900, 2500);
        if (name === 'doubleJump') {
          const { out: o2, t: t2 } = v(0.7);
          this.env(o2, t2, 0.01, vol * 0.25, 0.6);
          this.osc('sine', 880, 1320, 0.4, o2, t2);
        }
        break;
      }
      case 'land':
      case 'step': {
        const { out, t } = v(0.1);
        this.env(out, t, 0.002, vol * (name === 'land' ? 0.5 : 0.25), 0.1);
        this.noiseSrc(out, t, 0.1, 'lowpass', 900 * p, 200);
        break;
      }
      case 'dash': {
        const { out, t } = v(0.35);
        this.env(out, t, 0.005, vol * 0.6, 0.3);
        this.noiseSrc(out, t, 0.3, 'bandpass', 600, 4000, 1.2);
        break;
      }
      case 'throw':
      case 'recall': {
        const { out, t } = v(0.4);
        this.env(out, t, 0.01, vol * 0.45, 0.35);
        this.noiseSrc(out, t, 0.35, 'bandpass', name === 'throw' ? 3000 : 900, name === 'throw' ? 900 : 3500, 2.5);
        this.osc('sine', name === 'throw' ? 1200 : 700, name === 'throw' ? 700 : 1400, 0.3, out, t);
        break;
      }
      case 'lodge': {
        const { out, t } = v(0.5);
        this.env(out, t, 0.001, vol * 0.7, 0.6);
        this.noiseSrc(out, t, 0.08, 'highpass', 3000, 2000);
        this.osc('sine', 1568, 1560, 0.6, out, t);
        this.osc('sine', 2349, 2340, 0.5, out, t);
        break;
      }
      case 'catch': {
        const { out, t } = v(0.5);
        this.env(out, t, 0.002, vol * 0.4, 0.4);
        this.osc('sine', 1046, 1046, 0.4, out, t);
        this.osc('sine', 1568, 1568, 0.3, out, t);
        break;
      }
      case 'blink':
      case 'execute': {
        const big = name === 'execute';
        const { out, t } = v(0.8);
        this.env(out, t, 0.004, vol * (big ? 0.9 : 0.5), big ? 1.4 : 0.6);
        this.osc('sine', 300, 2400, 0.12, out, t);
        this.noiseSrc(out, t, 0.25, 'bandpass', 8000, 1200, 1.5);
        if (big) {
          this.osc('sawtooth', 110, 40, 0.8, out, t + 0.05);
          this.osc('sine', 55, 30, 1.2, out, t + 0.05);
        }
        break;
      }
      case 'focus': {
        const { out, t } = v(0.8);
        this.env(out, t, 0.4, vol * 0.25, 0.8);
        this.osc('sine', 440, 660, 1.0, out, t);
        break;
      }
      case 'heal': {
        const { out, t } = v(0.9);
        this.env(out, t, 0.01, vol * 0.45, 1.5);
        for (const f of [523, 659, 784, 1046]) this.osc('sine', f, f, 1.5, out, t);
        break;
      }
      case 'boom': {
        const { out, t } = v(0.6);
        this.env(out, t, 0.003, vol * 1.2, 1.2);
        this.noiseSrc(out, t, 1.1, 'lowpass', 3000, 60);
        this.osc('sine', 90, 28, 1.0, out, t);
        break;
      }
      case 'glint': {
        const { out, t } = v(0.6);
        this.env(out, t, 0.002, vol * 0.4, 0.35);
        this.osc('sine', 2637, 3520, 0.2, out, t);
        this.osc('sine', 3951, 3951, 0.3, out, t);
        break;
      }
      case 'roar': {
        const { out, t } = v(0.6);
        this.env(out, t, 0.08, vol * 1.0, 1.8);
        this.noiseSrc(out, t, 1.8, 'bandpass', 300, 120, 0.7);
        this.osc('sawtooth', 70, 45, 1.8, out, t);
        this.osc('sawtooth', 73, 44, 1.8, out, t);
        break;
      }
      case 'break': {
        const { out, t } = v(0.5);
        this.env(out, t, 0.003, vol * 1.0, 0.9);
        this.noiseSrc(out, t, 0.9, 'lowpass', 2200, 100);
        this.osc('sine', 70, 30, 0.6, out, t);
        break;
      }
      case 'pickup':
      case 'art': {
        const { out, t } = v(0.9);
        this.env(out, t, 0.01, vol * 0.5, 2);
        const notes = name === 'pickup' ? [523, 659, 784, 1046, 1318] : [392, 587, 784];
        notes.forEach((f, i) => this.osc('triangle', f, f, 1.6, out, t + i * 0.06));
        break;
      }
      case 'coin': {
        const { out, t } = v(0.4);
        this.env(out, t, 0.002, vol * 0.25, 0.25);
        this.osc('sine', 1760 * p, 1760 * p, 0.25, out, t);
        break;
      }
      case 'ui':
      case 'uiMove': {
        const { out, t } = v(0.4);
        this.env(out, t, 0.002, vol * (name === 'ui' ? 0.35 : 0.18), 0.3);
        this.osc('sine', name === 'ui' ? 988 : 660, name === 'ui' ? 988 : 660, 0.3, out, t);
        break;
      }
      case 'door': {
        const { out, t } = v(0.5);
        this.env(out, t, 0.05, vol * 0.8, 1.2);
        this.noiseSrc(out, t, 1.2, 'lowpass', 500, 80);
        this.osc('sawtooth', 55, 50, 1.2, out, t);
        break;
      }
      default: {
        const { out, t } = v(0.4);
        this.env(out, t, 0.004, vol * 0.3, 0.25);
        this.noiseSrc(out, t, 0.2, 'bandpass', 1500, 600);
      }
    }
  }

  playMusic(theme: string, intensity = 0): void {
    if (!this.ctx) return;
    if (this.music && this.music.theme === theme) {
      this.music.intensity = intensity;
      return;
    }
    this.music?.stop();
    this.music = new Music(this.ctx, this.musicBus, this.reverbSend, theme, this.noise);
    this.music.intensity = intensity;
  }

  stopMusic(): void {
    this.music?.stop();
    this.music = null;
  }
}

/** Themes: scale (semitones from the root), root, tempo, pad colour, percussion for battles. */
const THEMES: Record<string, { root: number; scale: number[]; bpm: number; chords: number[][]; bright: number; drums: boolean; bell: boolean }> = {
  title: { root: 50, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 56, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]], bright: 0.7, drums: false, bell: true },
  couronne: { root: 50, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 60, chords: [[0, 3, 7], [5, 8, 12], [-4, 0, 3], [-2, 2, 5]], bright: 0.6, drums: false, bell: true },
  jardins: { root: 52, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 66, chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [2, 6, 9], [-5, -1, 2, 6]], bright: 0.8, drums: false, bell: true },
  forge: { root: 45, scale: [0, 1, 3, 5, 7, 8, 10], bpm: 70, chords: [[0, 3, 7], [1, 5, 8], [-2, 2, 5], [0, 3, 8]], bright: 0.45, drums: true, bell: false },
  archives: { root: 47, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 54, chords: [[0, 3, 7, 10], [5, 9, 12], [3, 7, 10], [-2, 2, 5, 9]], bright: 0.55, drums: false, bell: true },
  bastion: { root: 43, scale: [0, 2, 3, 5, 7, 8, 11], bpm: 72, chords: [[0, 3, 7], [-4, 0, 3], [-5, -1, 2], [0, 3, 7]], bright: 0.5, drums: true, bell: false },
  firmament: { root: 55, scale: [0, 2, 4, 7, 9], bpm: 62, chords: [[0, 4, 7, 14], [-3, 0, 4, 9], [5, 9, 12], [-5, 2, 7]], bright: 0.9, drums: false, bell: true },
  penombre: { root: 41, scale: [0, 1, 3, 6, 7, 8, 11], bpm: 50, chords: [[0, 3, 6], [1, 4, 8], [-1, 3, 6], [0, 3, 7]], bright: 0.35, drums: false, bell: false },
  coeur: { root: 48, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 58, chords: [[0, 4, 7, 11], [5, 9, 12, 16], [-3, 0, 4, 7], [7, 11, 14]], bright: 1, drums: false, bell: true },
  boss: { root: 45, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 138, chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], bright: 0.6, drums: true, bell: false },
  final: { root: 43, scale: [0, 1, 3, 5, 7, 8, 10], bpm: 150, chords: [[0, 3, 7], [1, 5, 8], [-4, 0, 3], [-5, -1, 2]], bright: 0.7, drums: true, bell: true },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class Music {
  intensity = 0;
  private timer: number;
  private next: number;
  private step = 0;
  private gain: GainNode;
  private stopped = false;

  constructor(private ctx: AudioContext, bus: GainNode, send: GainNode, public theme: string, private noise: AudioBuffer) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
    this.gain.connect(bus);
    const wet = ctx.createGain();
    wet.gain.value = 0.7;
    this.gain.connect(wet).connect(send);
    this.next = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 100);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    const t = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(t);
    this.gain.gain.setValueAtTime(this.gain.gain.value, t);
    this.gain.gain.linearRampToValueAtTime(0, t + 2);
    window.clearInterval(this.timer);
    setTimeout(() => this.gain.disconnect(), 2500);
  }

  private tone(type: OscillatorType, f: number, t: number, a: number, d: number, vol: number, cutoff: number, detune = 0): void {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(fl).connect(g).connect(this.gain);
    o.start(t);
    o.stop(t + a + d + 0.1);
  }

  private drum(t: number, low: boolean, vol: number): void {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (low ? 0.6 : 0.15));
    g.connect(this.gain);
    if (low) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.7);
    }
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = low ? 'lowpass' : 'highpass';
    f.frequency.value = low ? 400 : 6000;
    const ng = ctx.createGain();
    ng.gain.value = low ? 0.5 : 0.25;
    n.connect(f).connect(ng).connect(g);
    n.start(t, Math.random());
    n.stop(t + 0.3);
  }

  private schedule(): void {
    const th = THEMES[this.theme] ?? THEMES.couronne;
    const beat = 60 / th.bpm;
    const sixteenth = beat / 4;
    while (this.next < this.ctx.currentTime + 0.4) {
      const t = this.next;
      const s = this.step;
      const bar = Math.floor(s / 16);
      const chord = th.chords[bar % th.chords.length];
      const inBar = s % 16;
      const fight = th.drums;
      // Pads: a slow chord swell each bar.
      if (inBar === 0) {
        for (const n of chord) {
          const f = midi(th.root + n);
          this.tone('sawtooth', f, t, beat * 1.5, beat * 4.5, 0.035, 600 + th.bright * 900, -7);
          this.tone('sawtooth', f, t, beat * 1.5, beat * 4.5, 0.035, 600 + th.bright * 900, 7);
        }
        this.tone('sine', midi(th.root - 12 + chord[0]), t, 0.5, beat * 4, 0.12, 400);
      }
      // Melody: sparse bell-like notes from the scale, more frequent with intensity.
      const density = fight ? 0.55 : 0.18 + this.intensity * 0.25;
      const pick = (s * 7 + bar * 3) % 16;
      if ((fight ? inBar % 2 === 0 : inBar % 4 === 0) && pseudo(s + bar * 31) < density) {
        const deg = th.scale[(pick + bar) % th.scale.length];
        const oct = pseudo(s * 13) < 0.3 ? 24 : 12;
        const f = midi(th.root + oct + deg);
        if (th.bell) {
          this.tone('sine', f, t, 0.004, beat * 3, 0.07, 6000);
          this.tone('sine', f * 2.76, t, 0.004, beat * 1.2, 0.018, 8000);
        } else {
          this.tone('triangle', f, t, 0.01, beat * 1.5, 0.06, 2200);
        }
      }
      if (fight) {
        // Ostinato and drums.
        if (inBar % 2 === 0) this.tone('sawtooth', midi(th.root - 12 + chord[(inBar / 2) % chord.length]), t, 0.005, sixteenth * 1.8, 0.05, 900 + this.intensity * 800);
        if (inBar === 0 || inBar === 6 || inBar === 10) this.drum(t, true, 0.5);
        if (inBar === 4 || inBar === 12) this.drum(t, false, 0.35);
        if (this.intensity > 0.5 && inBar % 2 === 1) this.drum(t, false, 0.12);
      }
      this.step++;
      this.next += sixteenth;
    }
  }
}

function pseudo(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export const audio = new Audio();
