// LOOPBREAK — procedural audio: ambience, dynamic music, SFX, spatial cues. No external assets.

export type Surface = 'asphalt' | 'grass' | 'metal' | 'snow' | 'tile' | 'sand';
export interface AmbScene {
  urban: number; birds: number; wind: number; rain: number; tunnel: number; indoor: number; water: number;
  tension: number; mystery: number; loopRemain: number; running: boolean;
}

const CHORDS: number[][] = [[110, 164.8, 261.6], [87.3, 130.8, 220], [130.8, 196, 329.6], [98, 146.8, 246.9]];

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode; private musicG!: GainNode; private sfxG!: GainNode; private ambG!: GainNode;
  private sfxWet!: GainNode; private noiseBuf!: AudioBuffer; private brownBuf!: AudioBuffer;
  private vol = { master: 0.8, music: 0.55, sfx: 0.8 };
  private amb: Record<string, GainNode> = {};
  private padOsc: OscillatorNode[] = []; private padGain!: GainNode; private padFilter!: BiquadFilterNode;
  private riserG!: GainNode; private riserF!: BiquadFilterNode;
  private scene: AmbScene = { urban: 0.5, birds: 0, wind: 0.2, rain: 0, tunnel: 0, indoor: 0, water: 0, tension: 0, mystery: 0, loopRemain: 60, running: false };
  private tBeat = 0; private tChord = 0; private chordI = 0; private tBird = 2; private tSiren = 25; private tBreath = 0; private lastTickSec = -1;
  private stepFlip = false; private started = false; private tParam = 0;

  init(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC(); this.ctx = ctx;
    this.master = ctx.createGain(); this.master.connect(ctx.destination);
    this.musicG = ctx.createGain(); this.sfxG = ctx.createGain(); this.ambG = ctx.createGain();
    this.musicG.connect(this.master); this.ambG.connect(this.master); this.sfxG.connect(this.master);
    // cheap reverb for indoor spaces
    const delay = ctx.createDelay(0.5); delay.delayTime.value = 0.13; const fb = ctx.createGain(); fb.gain.value = 0.38;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    this.sfxWet = ctx.createGain(); this.sfxWet.gain.value = 0;
    this.sfxG.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(this.sfxWet); this.sfxWet.connect(this.master);
    // noise buffers
    const sr = ctx.sampleRate; this.noiseBuf = ctx.createBuffer(1, sr * 2, sr); this.brownBuf = ctx.createBuffer(1, sr * 4, sr);
    const n = this.noiseBuf.getChannelData(0); for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
    const b = this.brownBuf.getChannelData(0); let last = 0; for (let i = 0; i < b.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; b[i] = last * 3.2; }
    this.buildAmbience(); this.buildMusic(); this.applyVolumes();
    void ctx.resume(); this.started = true;
  }

  private loopSrc(buf: AudioBuffer): AudioBufferSourceNode { const s = this.ctx!.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }

  private buildAmbience(): void {
    const ctx = this.ctx!;
    const mk = (name: string, buf: AudioBuffer, type: BiquadFilterType, freq: number, q: number, lfo?: number) => {
      const src = this.loopSrc(buf); const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(this.ambG); this.amb[name] = g;
      if (lfo) { const o = ctx.createOscillator(); o.frequency.value = lfo; const og = ctx.createGain(); og.gain.value = freq * 0.35; o.connect(og); og.connect(f.frequency); o.start(); }
    };
    mk('urban', this.brownBuf, 'lowpass', 420, 0.5, 0.07); mk('wind', this.noiseBuf, 'bandpass', 520, 0.6, 0.11);
    mk('rain', this.noiseBuf, 'highpass', 1600, 0.4); mk('water', this.noiseBuf, 'bandpass', 900, 0.9, 0.3);
    const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 52; const hg = ctx.createGain(); hg.gain.value = 0; hum.connect(hg); hg.connect(this.ambG); hum.start(); this.amb.tunnel = hg;
  }

  private buildMusic(): void {
    const ctx = this.ctx!;
    this.padFilter = ctx.createBiquadFilter(); this.padFilter.type = 'lowpass'; this.padFilter.frequency.value = 420; this.padFilter.Q.value = 0.7;
    this.padGain = ctx.createGain(); this.padGain.gain.value = 0.0; this.padFilter.connect(this.padGain); this.padGain.connect(this.musicG);
    for (let i = 0; i < 3; i++) for (const det of [-6, 7]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = CHORDS[0][i]; o.detune.value = det;
      const g = ctx.createGain(); g.gain.value = 0.11; o.connect(g); g.connect(this.padFilter); o.start(); this.padOsc.push(o);
    }
    const rs = this.loopSrc(this.noiseBuf); this.riserF = ctx.createBiquadFilter(); this.riserF.type = 'bandpass'; this.riserF.frequency.value = 300; this.riserF.Q.value = 2;
    this.riserG = ctx.createGain(); this.riserG.gain.value = 0; rs.connect(this.riserF); this.riserF.connect(this.riserG); this.riserG.connect(this.musicG);
  }

  setVolumes(master: number, music: number, sfx: number): void { this.vol = { master, music, sfx }; this.applyVolumes(); }
  private applyVolumes(): void {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05); this.musicG.gain.setTargetAtTime(this.vol.music, t, 0.05);
    this.sfxG.gain.setTargetAtTime(this.vol.sfx, t, 0.05); this.ambG.gain.setTargetAtTime(Math.min(1, 0.4 + this.vol.sfx * 0.6), t, 0.05);
  }

  setScene(s: Partial<AmbScene>): void { Object.assign(this.scene, s); }

  update(dt: number): void {
    if (!this.ctx || !this.started) return; const ctx = this.ctx; const t = ctx.currentTime; const s = this.scene;
    const set = (n: string, v: number) => this.amb[n].gain.setTargetAtTime(v, t, 0.6);
    const ten = Math.min(1, s.tension); this.tParam -= dt; const doP = this.tParam <= 0; if (doP) this.tParam = 0.12; // throttle AudioParam automation
    if (doP) {
      set('urban', 0.26 * s.urban * (1 - s.indoor * 0.5)); set('wind', 0.09 * s.wind); set('rain', 0.11 * s.rain); set('water', 0.05 * s.water); set('tunnel', 0.05 * s.tunnel);
      this.sfxWet.gain.setTargetAtTime(s.indoor * 0.28, t, 0.3);
      this.padGain.gain.setTargetAtTime((0.05 + 0.05 * ten) * (1 - s.mystery * 0.6), t, 0.8);
      this.padFilter.frequency.setTargetAtTime(330 + ten * 1100 + (s.running ? 120 : 0), t, 0.6);
    }
    this.tChord -= dt;
    if (this.tChord <= 0) { this.tChord = 8; this.chordI = (this.chordI + 1) % CHORDS.length; const ch = CHORDS[this.chordI]; this.padOsc.forEach((o, i) => o.frequency.setTargetAtTime(ch[Math.floor(i / 2)], t, 1.8)); }
    if (s.running) {
      this.tBeat -= dt; const interval = 1.1 - ten * 0.6;
      if (this.tBeat <= 0) { this.tBeat = interval; if (ten > 0.15) this.thump(0.08 + ten * 0.22); }
      const remain = s.loopRemain;
      const rise = remain < 9 ? (9 - remain) / 9 : 0;
      if (doP) { this.riserG.gain.setTargetAtTime(rise * 0.06, t, 0.3); this.riserF.frequency.setTargetAtTime(300 + rise * 3200, t, 0.3); }
      const sec = Math.ceil(remain);
      if (remain < 10.5 && sec !== this.lastTickSec && remain > 0) { this.lastTickSec = sec; this.tick(remain < 4 ? 1 : 0.6); }
      this.tBreath -= dt;
      if (this.tBreath <= 0) { this.tBreath = 1.5 - ten * 0.6; this.noise(0.45, 'bandpass', 900, 0.8, 0.028 + ten * 0.02, 0, 0.15, 600); }
    } else { if (doP) this.riserG.gain.setTargetAtTime(0, t, 0.3); this.lastTickSec = -1; }
    // sporadic ambience
    this.tBird -= dt; if (this.tBird <= 0) { this.tBird = 2 + Math.random() * 5; if (s.birds > 0.1 && s.indoor < 0.3) this.bird(s.birds); }
    this.tSiren -= dt; if (this.tSiren <= 0) { this.tSiren = 35 + Math.random() * 40; if (s.urban > 0.4 && s.indoor < 0.5) this.siren(); }
  }

  // ---- primitives ----
  private pan(p: number): AudioNode { const n = this.ctx!.createStereoPanner(); n.pan.value = Math.max(-1, Math.min(1, p)); n.connect(this.sfxG); return n; }

  private noise(dur: number, type: BiquadFilterType, f0: number, q: number, vol: number, pan = 0, attack = 0.005, f1?: number): void {
    if (!this.ctx) return; const ctx = this.ctx; const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.pan(pan)); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, pan = 0, f1?: number, attack = 0.004): void {
    if (!this.ctx) return; const ctx = this.ctx; const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.pan(pan)); o.start(t); o.stop(t + dur + 0.05);
  }

  private thump(v: number): void {
    if (!this.ctx) return; const ctx = this.ctx; const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18); const g = ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(this.musicG); o.start(t); o.stop(t + 0.35);
  }
  private tick(v: number): void { this.tone(1800, 0.05, 'square', 0.03 * v * 2, 0); this.tone(900, 0.08, 'sine', 0.05 * v, 0); }

  private bird(v: number): void {
    const n = 2 + Math.floor(Math.random() * 3); const base = 2200 + Math.random() * 1600; const pan = Math.random() * 2 - 1;
    for (let i = 0; i < n; i++) setTimeout(() => this.tone(base + Math.random() * 400, 0.09, 'sine', 0.018 * v, pan, base * 1.35), i * 110);
  }
  private siren(): void {
    if (!this.ctx) return; const ctx = this.ctx; const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = 'triangle'; const g = ctx.createGain();
    const p = ctx.createStereoPanner(); p.pan.value = Math.random() > 0.5 ? 0.7 : -0.7;
    for (let i = 0; i < 6; i++) o.frequency.setValueAtTime(i % 2 ? 640 : 860, t + i * 0.55);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.014, t + 1); g.gain.linearRampToValueAtTime(0.0001, t + 3.3);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100; o.connect(f); f.connect(g); g.connect(p); p.connect(this.ambG); o.start(t); o.stop(t + 3.4);
  }

  // ---- public SFX ----
  sfx(name: string, o: { pan?: number; vol?: number; surface?: Surface } = {}): void {
    if (!this.ctx) return; const p = o.pan ?? 0; const v = o.vol ?? 1;
    switch (name) {
      case 'step': {
        this.stepFlip = !this.stepFlip; const s = o.surface ?? 'asphalt';
        const f = s === 'grass' ? 700 : s === 'snow' ? 1500 : s === 'metal' ? 2600 : s === 'tile' ? 2200 : s === 'sand' ? 900 : 1700;
        this.noise(0.07, s === 'snow' ? 'bandpass' : 'lowpass', f * (this.stepFlip ? 1 : 0.85), 0.8, 0.09 * v, p, 0.003);
        if (s === 'metal') this.tone(520, 0.08, 'square', 0.01 * v, p); break;
      }
      case 'land': this.noise(0.14, 'lowpass', 600, 0.7, 0.16 * v, p); this.tone(70, 0.14, 'sine', 0.12 * v, p, 45); break;
      case 'jump': this.noise(0.18, 'bandpass', 500, 0.9, 0.06 * v, p, 0.02, 1400); break;
      case 'slide': this.noise(0.5, 'bandpass', 1300, 0.8, 0.07 * v, p, 0.04, 500); break;
      case 'dash': this.noise(0.3, 'bandpass', 600, 1.2, 0.12 * v, p, 0.01, 3000); this.tone(300, 0.3, 'sawtooth', 0.03 * v, p, 900); break;
      case 'coin': this.tone(1320, 0.09, 'triangle', 0.06 * v, p); setTimeout(() => this.tone(1760, 0.14, 'triangle', 0.05 * v, p), 55); break;
      case 'shard': this.tone(1040, 0.18, 'sine', 0.07 * v, p); this.tone(1560, 0.3, 'sine', 0.045 * v, p); setTimeout(() => this.tone(2080, 0.35, 'sine', 0.035 * v, p), 70); break;
      case 'rare': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.5, 'sine', 0.06 * v, p), i * 90)); break;
      case 'hit': this.noise(0.3, 'lowpass', 500, 0.7, 0.3 * v, p); this.tone(90, 0.3, 'sine', 0.25 * v, p, 40); break;
      case 'bump': this.noise(0.1, 'lowpass', 400, 0.7, 0.12 * v, p); break;
      case 'switch': this.tone(180, 0.08, 'square', 0.06 * v, p); this.noise(0.06, 'highpass', 2500, 1, 0.09 * v, p); setTimeout(() => this.tone(260, 0.1, 'square', 0.05 * v, p), 70); break;
      case 'plate': this.tone(140, 0.25, 'sine', 0.12 * v, p, 100); this.noise(0.08, 'highpass', 2000, 1, 0.06 * v, p); break;
      case 'gate': this.noise(1.1, 'lowpass', 280, 1, 0.22 * v, p, 0.05, 160); this.tone(62, 1.1, 'sawtooth', 0.04 * v, p, 48); this.noise(0.15, 'highpass', 3000, 1, 0.07 * v, p); break;
      case 'gateClose': this.noise(0.6, 'lowpass', 220, 1, 0.22 * v, p, 0.02, 120); this.tone(55, 0.5, 'sine', 0.14 * v, p, 40); break;
      case 'echoHum': this.tone(196, 0.9, 'sine', 0.04 * v, p, 185, 0.2); this.tone(392, 0.9, 'sine', 0.018 * v, p, 370, 0.3); break;
      case 'echoBorn': this.noise(1.2, 'bandpass', 400, 1.5, 0.08 * v, p, 0.2, 2400); this.tone(440, 1.2, 'sine', 0.05 * v, p, 220, 0.3); break;
      case 'reset': this.noise(1.6, 'bandpass', 200, 1.4, 0.16 * v, p, 0.5, 3600); this.tone(880, 1.5, 'sine', 0.06 * v, p, 110, 0.05); setTimeout(() => this.tone(523, 1.4, 'sine', 0.05 * v, p), 300); break;
      case 'fail': this.tone(220, 0.9, 'sawtooth', 0.07 * v, p, 55); this.noise(0.8, 'lowpass', 400, 1, 0.14 * v, p, 0.01, 90); break;
      case 'win': [392, 494, 587, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.9, 'sine', 0.07 * v, p), i * 140)); break;
      case 'ui': this.tone(660, 0.06, 'triangle', 0.05 * v, 0); break;
      case 'uiBack': this.tone(420, 0.07, 'triangle', 0.05 * v, 0); break;
      case 'uiPlay': this.tone(330, 0.3, 'sine', 0.08 * v, 0, 660); this.noise(0.4, 'bandpass', 500, 1, 0.05 * v, 0, 0.1, 2000); break;
      case 'radio': this.noise(0.5, 'bandpass', 1800, 2, 0.08 * v, p, 0.02); this.tone(1000, 0.15, 'square', 0.02 * v, p); break;
      case 'glitch': this.noise(0.25, 'highpass', 4000, 1, 0.12 * v, p, 0.002); this.tone(120, 0.25, 'square', 0.05 * v, p, 900); break;
      case 'whisper': this.noise(1.2, 'bandpass', 2400, 3, 0.05 * v, p, 0.4, 1800); break;
      case 'horn': this.tone(311, 0.7, 'sawtooth', 0.07 * v, p); this.tone(392, 0.7, 'sawtooth', 0.05 * v, p); break;
      case 'engine': this.noise(1.5, 'lowpass', 180, 1, 0.12 * v, p, 0.5, 260); break;
      case 'train': this.noise(2.2, 'lowpass', 160, 1, 0.22 * v, p, 0.8, 300); this.tone(58, 2.2, 'sawtooth', 0.05 * v, p, 52, 0.6); break;
      case 'alarm': this.tone(880, 0.25, 'square', 0.05 * v, p); setTimeout(() => this.tone(660, 0.25, 'square', 0.05 * v, p), 260); break;
      case 'phase': this.noise(0.6, 'bandpass', 900, 1.5, 0.1 * v, p, 0.05, 200); this.tone(600, 0.6, 'sine', 0.05 * v, p, 150); break;
      case 'slow': this.tone(300, 1, 'sine', 0.08 * v, p, 70); this.noise(1, 'lowpass', 900, 1, 0.08 * v, p, 0.1, 150); break;
      case 'key': this.tone(988, 0.12, 'triangle', 0.07 * v, p); setTimeout(() => this.tone(1319, 0.3, 'triangle', 0.06 * v, p), 90); break;
      case 'clue': this.tone(740, 0.35, 'sine', 0.05 * v, 0); this.tone(1110, 0.5, 'sine', 0.03 * v, 0); break;
      case 'rumble': this.noise(1.6, 'lowpass', 140, 1, 0.2 * v, p, 0.4, 80); break;
    }
  }

  stopAll(): void { this.setScene({ running: false, tension: 0, rain: 0, tunnel: 0, indoor: 0 }); }
}

export const audio = new AudioEngine();
