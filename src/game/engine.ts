// LOOPBREAK — game engine: fixed-step simulation, Echo recording/replay, puzzle mechanisms, camera, weather.
import * as THREE from 'three';
import { ABILITIES, ATMOS, COSMETICS, LANES, LORE, STAGES, STORY_ORDER, WORLDS, type AtmoDef, type AtmoId, type BlockerDef, type Mode, type SegDef, type StageDef, type SwitchDef, type WorldDef, type WorldId } from './data';
import { audio } from './audio';
import { Batch, Human, M, applyAtmosphere, disposeGroup, initGfx, mulberry32, type Cosmetic, type Npc } from './gfx';
import { FRAME, LevelGen, scriptedFrames, type Col, type Obs, type SegData } from './gen';
import { buildEnv } from './env';
import { COL, buildClue, buildCable, buildExit, buildGap, buildGate, buildGuard, buildLever, buildModel, buildPlate, labelColor, laneRange, type GapVis, type GateVis, type GuardVis, type LeverVis, type PlateVis } from './models';
import { getSave, storyProgress, updateSave } from './storage';

const DT = 1 / 60; const AHEAD = 250; const BEHIND = 45; const MAXF = 3700;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ECHO_COLORS = [0x7fb4e8, 0x86d0bd, 0xc2a4e6, 0xe3c188, 0xe39aa3];

export type Phase = 'menu' | 'playing' | 'paused' | 'reset' | 'failed' | 'complete';
export interface RunConfig { mode: Mode; stage: StageDef; world?: WorldId }
export interface EchoHud { label: string; status: string; rel: number; color: string }
export interface HudState {
  phase: Phase; mode: Mode; stageName: string; loop: number; timeLeft: number; timerVisible: boolean; dist: number; coins: number; shards: number; memories: number;
  hp: number; maxHp: number; speed: number; dash: number; slow: number; phaseStep: number; hasSlow: boolean; hasPhase: boolean; echoes: EchoHud[]; echoCap: number; echoCount: number;
  mission: string; progress: string; hint: string | null; subtitle: string | null; tip: string | null; toast: { text: string; tone: string } | null; glitch: boolean; danger: number;
  atmo: string; canReset: boolean; hit: number; bumped: boolean; touchHold: boolean; loopLabel: string;
}
export interface RunStats { distance: number; time: number; coins: number; shards: number; echoes: number; missions: string[]; best: number; loop: number; newBest: boolean; stageId: string; hits: number }
export type GameEvent =
  | { type: 'failed'; reason: string; stats: RunStats; canKeep: boolean }
  | { type: 'complete'; stats: RunStats; stage: StageDef }
  | { type: 'loopReset'; loop: number; echoes: number; label: string }
  | { type: 'phase'; phase: Phase };
export interface GameCallbacks { onHud: (h: HudState) => void; onEvent: (e: GameEvent) => void }

interface SwRT { def: SwitchDef; plate?: PlateVis; lever?: LeverVis; x: number; vx: number; holdUntil: number; until: number; latched: boolean; active: boolean; by: string; handle: number }
interface BlRT { def: BlockerDef; gate?: GateVis; gap?: GapVis; guard?: GuardVis; prog: number; want: boolean; xr: [number, number]; off: number; wasWant: boolean; cx: number }
interface EchoRec { frames: Float32Array; n: number; serial: number; scripted: boolean; broken: boolean; rel: boolean }
interface EchoRT { rec: EchoRec; human: Human; d: number; x: number; y: number; pd: number; px: number; py: number; speed: number; flags: number; done: boolean; fade: number; status: string; statusT: number; turn: number; label: string; inScene: boolean }
interface SegRT { data: SegData; group: THREE.Group; npcs: Npc[] }
interface Player { d: number; x: number; y: number; vy: number; lane: number; speed: number; grounded: boolean; sliding: boolean; slideT: number; slideQ: boolean; dashT: number; dashCd: number; hitT: number; stumbleT: number; hp: number; phaseT: number; phaseCd: number; slowT: number; slowCd: number; jumpBuf: number; coyote: number; dead: boolean; bump: number; lastStepPh: number }

const fresh = (hp: number): Player => ({ d: 0, x: 0, y: 0, vy: 0, lane: 1, speed: 0, grounded: true, sliding: false, slideT: 0, slideQ: false, dashT: 0, dashCd: 0, hitT: 0, stumbleT: 0, hp, phaseT: 0, phaseCd: 0, slowT: 0, slowCd: 0, jumpBuf: 0, coyote: 0, dead: false, bump: 0, lastStepPh: 0 });

export function cosmeticsFromSave(): Cosmetic {
  const eq = getSave().equipped; const v = (id: string, fb: string) => COSMETICS.find((c) => c.id === id)?.value ?? fb;
  return { jacket: v(eq.jacket, '#5d6670'), shirt: v(eq.shirt, '#e6e3da'), pants: v(eq.pants, '#2e3f5c'), shoes: v(eq.shoes, '#ddddd8'), pack: v(eq.pack, '#474c52'), acc: v(eq.acc, 'none') };
}
export function abilityUnlocked(id: string): boolean {
  const a = ABILITIES.find((x) => x.id === id); if (!a) return false; return storyProgress(getSave(), STORY_ORDER) >= a.unlockStage;
}
export function makeEndlessStage(world: WorldId): StageDef {
  return { id: 'endless-' + world, name: 'ENDLESS', subtitle: WORLDS[world].name, mode: 'endless', world, atmos: WORLDS[world].atmos[0], cruise: WORLDS[world].cruise, segs: [], switches: [], blockers: [], clues: [], events: [], loot: [], secrets: [], tips: [], endlessGen: true, rotateAtmos: true,
    missions: [{ id: 'dist', text: 'Run as far as you can', kind: 'distance', target: 1e9 }], hint: 'Every 60 seconds the world shifts. Your last 60 seconds run beside you.', maxEchoes: 1, timerShowAt: 0, loopSeconds: 60, seed: Math.floor(Math.random() * 1e6) };
}

export class Game {
  private renderer: THREE.WebGLRenderer; private scene = new THREE.Scene(); private camera: THREE.PerspectiveCamera;
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private head: THREE.PointLight;
  private skyTex: THREE.CanvasTexture; private sky: THREE.Mesh; private backdrop: THREE.Group | null = null;
  private rain!: THREE.LineSegments; private snow!: THREE.Points; private dust!: THREE.Points; private rainN = 0; private snowN = 0; private dustN = 0;
  private rainP = new Float32Array(1100 * 6); private snowP = new Float32Array(450 * 3); private dustP = new Float32Array(160 * 3);
  private inst: Record<string, THREE.InstancedMesh> = {};
  private stageGroup = new THREE.Group(); private segsGroup = new THREE.Group();
  private human: Human; private menuEcho: Human; private cosSig = '';
  private atmo: AtmoDef = ATMOS.morning; private world: WorldDef = WORLDS.paris; private indoor = 0;
  private raf = 0; private last = 0; private acc = 0; private alpha = 0; private now = 0; private renderOn = true; private disposed = false;
  phase: Phase = 'menu'; private cfg: RunConfig | null = null; private stage!: StageDef; private level!: LevelGen; private endless = false; private exitD = Infinity;
  private segs: SegRT[] = []; private obsActive: Obs[] = []; private P: Player = fresh(3); private pp = { d: 0, x: 0, y: 0 };
  private frame = 0; private t = 0; private loop = 1; private rec: Float32Array = new Float32Array(MAXF * FRAME); private recN = 0; private moverT = 0; private echoes: EchoRT[] = []; private serial = 0; private echoBase = 0;
  private switches: SwRT[] = []; private blockers: BlRT[] = []; private figure: { h: Human; d: number } | null = null; private vanishers: { obj: THREE.Object3D; minLoop: number }[] = [];
  private evFired = new Set<number>(); private tipsShown = new Set<number>(); private cluesShown = new Set<number>(); private flicker = 0; private turnActive = false;
  private inp = { left: false, right: false, jump: false, slide: false, dash: false, interact: false, slow: false, phase: false };
  private held = { boost: false, brake: false, touchBrake: false }; private maxHp = 3; private shake = 0; private glitchT = 0; private resetT = 0; private hitFlash = 0; private bumpedT = 0;
  private runTime = 0; private stats = { coins: 0, shards: 0, hits: 0, echoes: 0 }; private loopStats = { coins: 0, shards: 0, hits: 0 }; private stageLore = new Set<string>(); private clueCount = 0;
  private pend = { coins: 0, shards: 0 }; private flushT = 0; private hudT = 0; private audT = 0; private camX = 0; private camY = 3; private primaryDone = false; private pendingRec: Float32Array | null = null; private pendingN = 0;
  private sub: { text: string; t: number } | null = null; private tip: { text: string; t: number } | null = null; private toastO: { text: string; tone: string; t: number } | null = null;
  private lastBlock: BlRT | null = null; private hintText: string | null = null; private danger = 0; private touchStart = new Map<number, { x: number; y: number; done: boolean }>(); private atmoIdx = 0;
  private cuedMovers = new Set<string>(); private menuT = 0; private finalT = 0; private timerNote = false;

  constructor(private canvas: HTMLCanvasElement, private cb: GameCallbacks) {
    initGfx();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 620);
    this.scene.fog = new THREE.Fog(0xcccccc, 40, 170);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2); this.sun.castShadow = true; this.sun.shadow.mapSize.set(1536, 1536); this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.03;
    const sc = this.sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 22; sc.bottom = -14; sc.near = 1; sc.far = 130; this.scene.add(this.sun, this.sun.target);
    this.head = new THREE.PointLight(0xffe2b8, 0, 26, 1.6); this.scene.add(this.head);
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; this.skyTex = new THREE.CanvasTexture(c); this.skyTex.colorSpace = THREE.SRGBColorSpace;
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(450, 16, 12), new THREE.MeshBasicMaterial({ map: this.skyTex, side: THREE.BackSide, fog: false, depthWrite: false })); this.sky.renderOrder = -10; this.scene.add(this.sky);
    this.scene.add(this.segsGroup, this.stageGroup);
    this.human = new Human(cosmeticsFromSave()); this.scene.add(this.human.root);
    this.menuEcho = new Human(cosmeticsFromSave(), { color: ECHO_COLORS[0], opacity: 0.5, label: 'ECHO 01' }); this.menuEcho.root.visible = false; this.scene.add(this.menuEcho.root);
    this.buildWeather(); this.buildInstances();
    this.bindInput(); this.resize(); window.addEventListener('resize', this.resize);
    this.applySettings(); this.showMenu(); this.raf = requestAnimationFrame(this.tick);
  }

  // ------------------------------------------------------------------ setup
  private buildInstances(): void {
    const mk = (k: keyof typeof COL, n: number) => { const m = new THREE.InstancedMesh(COL[k].geo, COL[k].mat, n); m.frustumCulled = false; m.count = 0; m.castShadow = false; this.scene.add(m); this.inst[k] = m; };
    mk('coin', 420); mk('shard', 140); mk('memory', 24); mk('recording', 24); mk('core', 12);
  }
  private buildWeather(): void {
    for (let i = 0; i < 1100; i++) { const o = i * 6; this.rainP[o] = (Math.random() - 0.5) * 30; this.rainP[o + 1] = Math.random() * 16; this.rainP[o + 2] = -Math.random() * 44 + 4; }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(this.rainP, 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xb9c7d6, transparent: true, opacity: 0.3, fog: false, depthWrite: false })); this.rain.frustumCulled = false; this.rain.visible = false; this.scene.add(this.rain);
    for (let i = 0; i < 450; i++) { this.snowP[i * 3] = (Math.random() - 0.5) * 30; this.snowP[i * 3 + 1] = Math.random() * 14; this.snowP[i * 3 + 2] = -Math.random() * 40 + 4; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(this.snowP, 3).setUsage(THREE.DynamicDrawUsage));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.11, transparent: true, opacity: 0.85, depthWrite: false })); this.snow.frustumCulled = false; this.snow.visible = false; this.scene.add(this.snow);
    for (let i = 0; i < 160; i++) { this.dustP[i * 3] = (Math.random() - 0.5) * 34; this.dustP[i * 3 + 1] = Math.random() * 8; this.dustP[i * 3 + 2] = -Math.random() * 45 + 4; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(this.dustP, 3).setUsage(THREE.DynamicDrawUsage));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xd8bd8c, size: 0.16, transparent: true, opacity: 0.35, depthWrite: false })); this.dust.frustumCulled = false; this.dust.visible = false; this.scene.add(this.dust);
  }
  applySettings(): void {
    const s = getSave().settings; audio.setVolumes(s.master, s.music, s.sfx);
    const pr = s.quality === 'low' ? 1 : s.quality === 'medium' ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pr); this.sun.castShadow = s.quality !== 'low'; const ms = s.quality === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== ms) { this.sun.shadow.mapSize.set(ms, ms); this.sun.shadow.map?.dispose(); (this.sun.shadow as unknown as { map: null }).map = null; }
    this.resize();
  }
  private resize = (): void => {
    const w = this.canvas.clientWidth || window.innerWidth; const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  };
  setRenderEnabled(on: boolean): void { this.renderOn = on; if (!on) audio.stopAll(); }

  private setAtmosphere(id: AtmoId): void {
    const a = ATMOS[id]; this.atmo = a; const fog = this.scene.fog as THREE.Fog; fog.color.setHex(a.fog); fog.near = a.fogNear; fog.far = a.fogFar;
    this.renderer.toneMappingExposure = a.exposure; this.hemi.color.setHex(a.hemiSky); this.hemi.groundColor.setHex(a.hemiGround); this.sun.color.setHex(a.sun);
    this.head.intensity = a.night ? 2.2 : id === 'fog' || id === 'heavyRain' ? 0.9 : 0; applyAtmosphere(a);
    this.rainN = a.rain; this.snowN = a.snow; this.dustN = a.dust; this.rain.visible = a.rain > 0; this.snow.visible = a.snow > 0; this.dust.visible = a.dust > 0;
    (this.rain.geometry as THREE.BufferGeometry).setDrawRange(0, a.rain * 2);
    const c = this.skyTex.image as HTMLCanvasElement; c.width = 4; const g = c.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 0, 256); const hx = (n: number) => '#' + n.toString(16).padStart(6, '0');
    gr.addColorStop(0, hx(a.skyTop)); gr.addColorStop(0.3, hx(a.skyMid)); gr.addColorStop(0.5, hx(a.skyBot)); gr.addColorStop(1, hx(a.fog)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); this.skyTex.needsUpdate = true;
    if (this.backdrop) { this.scene.remove(this.backdrop); disposeGroup(this.backdrop); }
    this.backdrop = this.makeBackdrop(); this.scene.add(this.backdrop);
  }

  private makeBackdrop(): THREE.Group {
    const g = new THREE.Group(); const fog = new THREE.Color(this.atmo.fog); const mat = (c: number, mix = 0.55) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).lerp(fog, mix), fog: false });
    const b = new Batch(); const w = this.world.id; const r = mulberry32(7);
    if (w === 'paris') {
      const m = mat(0x59606a, 0.45); const S = 1.35;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(m, 2.4, 62, 2.4, sx * 12.5 * S, 0, sz * 12.5 * S, { rx: sz * 0.25, rz: -sx * 0.25 });
      b.box(m, 30 * S, 2.2, 30 * S, 0, 27 * S, 0); b.frustum(m, 12 * S, 12 * S, 38 * S, 0.45, 0, 29 * S, 0); b.box(m, 12 * S, 2, 12 * S, 0, 58 * S, 0); b.frustum(m, 6 * S, 6 * S, 34 * S, 0.3, 0, 60 * S, 0); b.cone(m, 1.2, 30 * S, 0, 92 * S, 0, 5);
      const grp = b.build(false, false); grp.position.set(-120, 0, -340); g.add(grp);
      const sk = new Batch(); const m2 = mat(0x6d737b, 0.6); for (let i = 0; i < 18; i++) sk.box(m2, 14 + r() * 16, 18 + r() * 14, 16 + r() * 10, -260 + i * 30 + r() * 12, 0, -420 - r() * 60); const sg = sk.build(false, false); g.add(sg);
    } else if (w === 'verdant') { const m = mat(0x425a44, 0.5); for (let i = 0; i < 9; i++) b.sph(m, 90 + r() * 70, -380 + i * 95, -30, -400 - r() * 80, 0.5, 10, 6); g.add(b.build());
    } else if (w === 'dustfall') { const m = mat(0x9b6b45, 0.5); for (let i = 0; i < 8; i++) { b.box(m, 90 + r() * 80, 30 + r() * 40, 70 + r() * 50, -350 + i * 100, 0, -420 - r() * 80); } g.add(b.build());
    } else if (w === 'frostline') { const m = mat(0xaebccb, 0.4); for (let i = 0; i < 8; i++) { b.cone(m, 90 + r() * 50, 150 + r() * 80, -380 + i * 100, -10, -430 - r() * 70, 6); b.cone(mat(0xffffff, 0.3), 36, 60, -380 + i * 100, 100, -430, 6); } g.add(b.build());
    } else if (w === 'monsoon') { const m = mat(0x3d4650, 0.5); for (let i = 0; i < 22; i++) b.box(m, 18 + r() * 14, 60 + r() * 100, 18 + r() * 12, -330 + i * 32 + r() * 14, 0, -380 - r() * 80); g.add(b.build());
    } else if (w === 'fractured') { const m = mat(0x8c939b, 0.45); for (let i = 0; i < 16; i++) b.box(m, 20 + r() * 30, 6 + r() * 18, 20 + r() * 30, -300 + i * 40, 60 + r() * 140, -360 - r() * 90, { rx: r(), rz: r() * 0.8, ry: r() * 2 }); g.add(b.build());
    } else { const m = mat(0x9fb3c6, 0.35); const t = new THREE.Mesh(new THREE.TorusGeometry(110, 4, 6, 40), m); t.position.set(0, 90, -380); g.add(t); const t2 = new THREE.Mesh(new THREE.TorusGeometry(70, 3, 6, 36), m); t2.position.set(0, 90, -378); g.add(t2); b.box(m, 8, 200, 8, 0, 0, -380); g.add(b.build()); }
    return g;
  }

  // ------------------------------------------------------------------ input
  private bindInput(): void {
    window.addEventListener('keydown', this.onKey); window.addEventListener('keyup', this.onKeyUp); window.addEventListener('blur', this.onBlur);
    const c = this.canvas; c.addEventListener('touchstart', this.onTS, { passive: false }); c.addEventListener('touchmove', this.onTM, { passive: false }); c.addEventListener('touchend', this.onTE); c.addEventListener('touchcancel', this.onTE);
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.phase === 'playing') this.pause(); });
  }
  private onBlur = (): void => { this.held.boost = this.held.brake = false; if (this.phase === 'playing') this.pause(); };
  private onKey = (e: KeyboardEvent): void => {
    const k = getSave().settings.keys; const c = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c) && (this.phase === 'playing' || this.phase === 'failed')) e.preventDefault();
    if (c === 'Escape' || c === 'KeyP') { if (!e.repeat) { if (this.phase === 'playing') this.pause(); else if (this.phase === 'paused') this.resume(); } return; }
    if (this.phase === 'failed') { if (!e.repeat && (c === 'Enter' || c === k.reset || c === 'Space')) this.retry(true); else if (!e.repeat && c === 'KeyX') this.retry(false); return; }
    if (this.phase !== 'playing') return;
    if (c === 'KeyW' || c === 'ArrowUp') this.held.boost = true;
    if (c === 'KeyS' || c === 'ArrowDown') this.held.brake = true;
    if (e.repeat) return;
    if (c === k.left || c === 'ArrowLeft') this.inp.left = true; else if (c === k.right || c === 'ArrowRight') this.inp.right = true;
    else if (c === k.jump) this.inp.jump = true; else if (c === k.slide || c === 'ControlLeft' || c === 'ControlRight') this.inp.slide = true;
    else if (c === k.dash || c === 'ShiftRight') this.inp.dash = true; else if (c === k.interact) this.inp.interact = true;
    else if (c === k.reset) this.manualReset(); else if (c === k.slow) this.inp.slow = true; else if (c === k.phase) this.inp.phase = true;
  };
  private onKeyUp = (e: KeyboardEvent): void => { if (e.code === 'KeyW' || e.code === 'ArrowUp') this.held.boost = false; if (e.code === 'KeyS' || e.code === 'ArrowDown') this.held.brake = false; };
  private onTS = (e: TouchEvent): void => { if (this.phase !== 'playing') return; e.preventDefault(); for (const t of Array.from(e.changedTouches)) this.touchStart.set(t.identifier, { x: t.clientX, y: t.clientY, done: false }); };
  private onTM = (e: TouchEvent): void => {
    if (this.phase !== 'playing') return; e.preventDefault(); const thr = lerp(48, 18, getSave().settings.sensitivity);
    for (const t of Array.from(e.changedTouches)) { const s = this.touchStart.get(t.identifier); if (!s || s.done) continue; const dx = t.clientX - s.x; const dy = t.clientY - s.y;
      if (Math.abs(dx) > thr && Math.abs(dx) > Math.abs(dy)) { if (dx > 0) this.inp.right = true; else this.inp.left = true; s.done = true; }
      else if (Math.abs(dy) > thr) { if (dy < 0) this.inp.jump = true; else this.inp.slide = true; s.done = true; } }
  };
  private onTE = (e: TouchEvent): void => { for (const t of Array.from(e.changedTouches)) this.touchStart.delete(t.identifier); };
  touchAction(a: 'dash' | 'interact' | 'reset' | 'slow' | 'phase'): void { if (this.phase !== 'playing') return; if (a === 'reset') this.manualReset(); else this.inp[a] = true; }
  setTouchBrake(on: boolean): void { this.held.touchBrake = on; }

  // ------------------------------------------------------------------ lifecycle
  pause(): void { if (this.phase !== 'playing') return; this.phase = 'paused'; audio.setScene({ running: false }); this.cb.onEvent({ type: 'phase', phase: 'paused' }); this.emitHud(true); }
  resume(): void { if (this.phase !== 'paused') return; this.phase = 'playing'; this.last = performance.now(); audio.setScene({ running: true }); this.cb.onEvent({ type: 'phase', phase: 'playing' as Phase }); }
  dispose(): void {
    this.disposed = true; cancelAnimationFrame(this.raf); window.removeEventListener('resize', this.resize); window.removeEventListener('keydown', this.onKey); window.removeEventListener('keyup', this.onKeyUp); window.removeEventListener('blur', this.onBlur);
    this.clearRun(); this.renderer.dispose();
  }

  private clearRun(): void {
    for (const s of this.segs) { this.segsGroup.remove(s.group); disposeGroup(s.group); } this.segs = []; this.obsActive = [];
    this.stageGroup.clear(); this.switches = []; this.blockers = []; this.vanishers = []; if (this.figure) this.scene.remove(this.figure.h.root); this.figure = null;
    for (const e of this.echoes) { this.scene.remove(e.human.root); } this.echoes = [];
  }

  showMenu(): void {
    this.clearRun(); audio.stopAll(); this.cfg = null; this.phase = 'menu';
    const base = STAGES[0]; const segs: SegDef[] = [{ kind: 'street', len: 140, density: 0 }, { kind: 'boulevard', len: 140, density: 0 }, { kind: 'cafe', len: 120, density: 0 }];
    this.stage = { ...base, segs, clues: [], events: [], tips: [], loot: [], switches: [], blockers: [], secrets: [], preEchoes: undefined, id: 'menu' };
    this.world = WORLDS.paris; this.endless = false; this.level = new LevelGen(this.stage, this.world, false); this.exitD = Infinity;
    this.setAtmosphere('morning'); this.P = fresh(3); this.P.d = 34; this.P.x = -0.6; this.pp = { d: 34, x: -0.6, y: 0 };
    this.level.ensureTo(AHEAD); this.syncSegments(true); this.menuEcho.root.visible = true; this.human.root.visible = true; this.loop = 1; this.cosSig = '';
    audio.setScene({ urban: 0.45, birds: 0.6, wind: 0.2, rain: 0, tunnel: 0, indoor: 0, water: 0, tension: 0, mystery: 0.6, running: false });
    this.cb.onEvent({ type: 'phase', phase: 'menu' });
  }

  startRun(cfg: RunConfig): void {
    audio.init(); this.clearRun(); this.cfg = cfg; this.stage = cfg.stage; this.world = WORLDS[cfg.world ?? cfg.stage.world]; this.endless = cfg.mode === 'endless' || !!cfg.stage.endlessGen;
    this.level = new LevelGen(this.stage, this.world, this.endless); this.exitD = this.level.exitD; this.serial = 0; this.runTime = 0; this.stats = { coins: 0, shards: 0, hits: 0, echoes: 0 };
    this.stageLore.clear(); this.clueCount = 0; this.tipsShown.clear(); this.cluesShown.clear(); this.atmoIdx = 0; this.primaryDone = false; this.timerNote = false;
    this.menuEcho.root.visible = false; this.maxHp = 3; this.loop = 1;
    const cruise = this.stage.cruise;
    for (const pe of this.stage.preEchoes ?? []) this.addEchoRec({ frames: scriptedFrames(pe, cruise), n: 3600, serial: ++this.serial, scripted: true, broken: !!pe.broken, rel: false });
    this.buildStageObjects(); this.beginLoop(true);
  }
  restartStage(): void { if (this.cfg) this.startRun(this.cfg); }

  private beginLoop(first: boolean): void {
    this.P = fresh(this.maxHp); this.pp = { d: 0, x: 0, y: 0 }; this.frame = 0; this.t = 0; this.rec = new Float32Array(MAXF * FRAME); this.recN = 0; this.loopStats = { coins: 0, shards: 0, hits: 0 }; this.echoBase = 0;
    this.primaryDone = false; this.pendingRec = null; this.moverT = 0;
    for (const s of this.level.segs) for (const c of s.cols) c.taken = false;
    for (const s of this.switches) { s.holdUntil = -1; s.until = -1; s.latched = false; s.active = false; s.by = ''; }
    for (const b of this.blockers) { b.prog = 0; b.want = false; b.wasWant = false; }
    for (const e of this.echoes) { e.done = false; e.fade = 0; e.status = 'RUNNING'; e.d = e.pd = this.echoBase; e.inScene = true; if (!e.human.root.parent) this.scene.add(e.human.root); }
    this.evFired.clear(); this.flicker = 0; this.turnActive = false; if (this.figure) this.scene.remove(this.figure.h.root); this.figure = null; this.cuedMovers.clear(); this.bumpedT = 0; this.lastBlock = null;
    if (this.stage.rotateAtmos) { const list = this.world.atmos; this.setAtmosphere(list[this.atmoIdx % list.length]); } else if (first || this.atmo.id !== this.stage.atmos) this.setAtmosphere(this.stage.atmos);
    for (const v of this.vanishers) v.obj.visible = this.loop < v.minLoop;
    this.level.ensureTo(AHEAD); this.syncSegments(true);
    this.phase = 'playing'; audio.setScene({ running: true }); this.acc = 0; this.last = performance.now();
    if (!first) audio.sfx('echoBorn');
    this.cb.onEvent({ type: 'phase', phase: 'playing' }); this.emitHud(true);
  }

  private addEchoRec(rec: EchoRec): void {
    const label = rec.broken ? 'ECHO ??' : 'ECHO ' + String(rec.serial).padStart(2, '0'); const cos = cosmeticsFromSave();
    const human = new Human(cos, { color: rec.broken ? 0xd98a8a : ECHO_COLORS[(rec.serial - 1) % 5], opacity: 0.0, label }); this.scene.add(human.root);
    this.echoes.push({ rec, human, d: 0, x: 0, y: 0, pd: 0, px: 0, py: 0, speed: 0, flags: 0, done: false, fade: 0, status: 'RUNNING', statusT: 0, turn: 0, label, inScene: true });
  }

  private commitEcho(): void {
    if (this.recN < 90) return; const cap = this.endless ? 1 : getSave().echoCap; const frames = this.rec.slice(0, this.recN * FRAME); const rel = this.endless;
    if (rel) { const d0 = frames[0]; for (let i = 0; i < this.recN; i++) frames[i * FRAME] -= d0; }
    this.addEchoRec({ frames, n: this.recN, serial: ++this.serial, scripted: false, broken: false, rel }); this.stats.echoes++;
    updateSave((s) => { s.stats.echoes++; });
    const user = this.echoes.filter((e) => !e.rec.scripted); if (user.length > cap) { const old = user[0]; this.scene.remove(old.human.root); this.echoes.splice(this.echoes.indexOf(old), 1); }
  }

  manualReset(): void {
    if (this.phase !== 'playing' || this.endless || this.t < 1.5) return; this.endLoopReset();
  }
  private endLoopReset(): void {
    this.commitEcho(); this.flushSave(); this.phase = 'reset'; this.resetT = 1.9; this.loop++; this.atmoIdx++;
    audio.sfx('reset'); audio.setScene({ running: false }); const last = this.echoes[this.echoes.length - 1];
    this.cb.onEvent({ type: 'loopReset', loop: this.loop, echoes: this.echoes.filter((e) => !e.rec.scripted).length, label: last ? last.label : '' }); this.emitHud(true);
  }

  retry(keep: boolean): void {
    if (this.phase !== 'failed') return;
    if (this.endless) { this.restartStage(); return; }
    if (keep && this.pendingRec && this.pendingN >= 90) { this.rec = this.pendingRec; this.recN = this.pendingN; this.commitEcho(); }
    this.loop++; this.atmoIdx++; this.beginLoop(false);
  }

  private fail(reason: string): void {
    if (this.phase !== 'playing') return; this.P.dead = true; this.phase = 'failed'; this.pendingRec = this.rec; this.pendingN = this.recN; this.flushSave(); audio.sfx('fail'); audio.setScene({ running: false, tension: 0 });
    const st = this.makeStats(false); updateSave((s) => { s.stats.runs++; s.stats.distance += Math.round(this.P.d); if (this.endless && st.distance > s.bestEndless) s.bestEndless = st.distance; });
    this.cb.onEvent({ type: 'failed', reason, stats: st, canKeep: !this.endless && this.recN >= 90 }); this.emitHud(true);
  }

  private makeStats(done: boolean): RunStats {
    const save = getSave(); const key = this.stage.id; const best = this.endless ? save.bestEndless : save.best[key] ?? 0; const dist = Math.round(this.P.d);
    return { distance: dist, time: Math.round(this.runTime), coins: this.stats.coins, shards: this.stats.shards, echoes: this.stats.echoes, missions: done ? this.evalMissions() : [], best: Math.max(best, this.endless ? dist : 0), loop: this.loop, newBest: this.endless ? dist > best : false, stageId: key, hits: this.stats.hits };
  }

  private evalMissions(): string[] {
    const out: string[] = []; const lt = this.t;
    for (const m of this.stage.missions) {
      let ok = false;
      switch (m.kind) {
        case 'reach': case 'survive': ok = true; break; case 'time': ok = lt <= m.target; break; case 'shards': ok = this.loopStats.shards >= m.target; break; case 'coins': ok = this.loopStats.coins >= m.target; break;
        case 'nohit': ok = this.loopStats.hits === 0; break; case 'recordings': ok = Array.from(this.stageLore).filter((x) => x.startsWith('rec')).length >= m.target; break;
        case 'clues': ok = this.clueCount >= m.target; break; case 'distance': ok = this.P.d >= m.target; break;
      }
      if (ok) out.push(m.id);
    }
    return out;
  }

  private complete(): void {
    if (this.phase !== 'playing') return; this.phase = 'complete'; this.primaryDone = true; this.flushSave(); audio.sfx('win'); audio.setScene({ running: false, tension: 0 });
    if (this.stage.id === 'chrono-final') { this.setAtmosphere('morning'); this.finalT = 0; }
    const done = this.evalMissions(); const st = this.makeStats(true); st.missions = done; const id = this.stage.id; const mode = this.cfg?.mode ?? 'story';
    updateSave((s) => {
      for (const m of done) { const k = `${id}:${m}`; if (!s.missions.includes(k)) s.missions.push(k); }
      s.stats.runs++; s.stats.distance += Math.round(this.P.d);
      if (mode === 'story') { if (!s.completed.includes(id)) s.completed.push(id); const i = STORY_ORDER.indexOf(id); if (i >= 5 && s.echoCap < 4) s.echoCap = 4; if (i >= 9 && s.echoCap < 5) s.echoCap = 5; if (id === 'chrono-final') s.endingSeen = true; }
      if (mode === 'loop' && !s.trialsDone.includes(id)) s.trialsDone.push(id); if (mode === 'challenge' && !s.challengesDone.includes(id)) s.challengesDone.push(id);
      if (mode !== 'endless' && (!s.best[id] || this.runTime < s.best[id])) s.best[id] = Math.round(this.runTime);
    });
    this.cb.onEvent({ type: 'complete', stats: st, stage: this.stage }); this.emitHud(true);
  }

  // ------------------------------------------------------------------ stage objects
  private buildStageObjects(): void {
    const st = this.stage; const cos = cosmeticsFromSave(); const sg = this.stageGroup;
    for (const d of st.switches) {
      const isPlate = d.kind === 'plate'; const x = isPlate ? LANES[d.lane] : d.lane === 2 ? 4.3 : -4.3; const rt: SwRT = { def: d, x, vx: x, holdUntil: -1, until: -1, latched: false, active: false, by: '', handle: 1 };
      if (isPlate) { rt.plate = buildPlate(d.label); rt.plate.group.position.set(x, 0.0, -d.d); sg.add(rt.plate.group); }
      else { rt.lever = buildLever(d.label, d.kind === 'radio'); rt.lever.group.position.set(x, 0.0, -d.d); rt.lever.group.rotation.y = x > 0 ? -0.5 : 0.5; sg.add(rt.lever.group); }
      this.switches.push(rt);
      for (const b of st.blockers) if (b.requires.includes(d.id) && b.kind !== 'guard') { const len = Math.abs(b.d - d.d); const cab = buildCable(len, labelColor(d.label)); cab.position.set(isPlate ? x : x * 0.92, 0.035, -(d.d + b.d) / 2); sg.add(cab); }
    }
    for (const b of st.blockers) {
      const rt: BlRT = { def: b, prog: 0, want: false, xr: laneRange(b.lanes), off: Math.random() * 4, wasWant: false, cx: 0 }; const zc = -(b.d + b.len / 2);
      if (b.kind === 'gap') { rt.gap = buildGap(b.len); rt.gap.group.position.set(0, 0, zc); sg.add(rt.gap.group); }
      else if (b.kind === 'guard') { rt.guard = buildGuard(b.len, cos); rt.guard.group.position.set(0, 0, zc); sg.add(rt.guard.group); }
      else { rt.gate = buildGate(b.label, b.kind, b.lanes, b.len); rt.gate.group.position.set(0, 0, zc); sg.add(rt.gate.group); }
      this.blockers.push(rt);
    }
    for (const s of st.secrets) {
      const sw: SwitchDef = { id: 'sec@' + s.d, kind: 'lever', d: s.d - 5, lane: s.lane === 2 ? 2 : 0, label: '?' }; const x = s.lane === 2 ? 4.3 : -4.3;
      const rt: SwRT = { def: sw, x, vx: x, holdUntil: -1, until: -1, latched: false, active: false, by: '', handle: 1 }; rt.lever = buildLever('?', false); rt.lever.group.position.set(x, 0, -sw.d); rt.lever.group.rotation.y = x > 0 ? -0.5 : 0.5; sg.add(rt.lever.group); this.switches.push(rt);
      const b: BlockerDef = { id: 'secwall@' + s.d, kind: 'secret', d: s.d, len: 1.4, lanes: [s.lane], requires: [sw.id], label: '?' }; const brt: BlRT = { def: b, prog: 0, want: false, xr: laneRange(b.lanes), off: 0, wasWant: false, cx: 0 };
      brt.gate = buildGate('?', 'secret', b.lanes, b.len); brt.gate.group.position.set(0, 0, -(b.d + b.len / 2)); sg.add(brt.gate.group); this.blockers.push(brt);
      const cl = buildClue('graffiti', '', '◎', x > 0 ? 1 : -1); cl.position.set(x > 0 ? 6.8 : -6.8, 0, -(s.d - 5)); sg.add(cl);
    }
    for (const c of st.clues) { const p = buildClue(c.kind, c.title ?? '', c.text, c.side); p.position.set(c.side * (c.kind === 'graffiti' ? 9.6 : 7.4), 0.16, -c.d); sg.add(p); }
    for (const e of st.events) if (e.kind === 'vanish') { const m = buildModel('car', 1.85, 1.45, 4.2, mulberry32(e.d)); m.position.set(-5.2, 0, -e.d); m.rotation.y = 0; sg.add(m); this.vanishers.push({ obj: m, minLoop: e.minLoop }); }
    if (Number.isFinite(this.exitD)) { const ex = buildExit(this.stage.mode === 'challenge' || this.stage.chapter === 8 ? 'EXIT' : 'METRO · EXIT'); ex.position.set(0, 0, -this.exitD); sg.add(ex); }
  }

  // ------------------------------------------------------------------ segments
  private spawnSeg(data: SegData): void {
    const env = buildEnv(data); const group = env.group; const rng = mulberry32(data.seed + 5);
    for (const o of data.obs) {
      const len = o.d1 - o.d0; const zc = -(o.d0 + o.d1) / 2; const mesh = buildModel(o.model, o.vw, o.vh, o.kind === 'ramp' || o.kind === 'platform' ? len : o.vl, rng);
      if (o.kind === 'mover') { mesh.rotation.y = Math.PI / 2; mesh.position.set(o.mover!.from, 0, zc); } else mesh.position.set(o.cx, 0, zc);
      group.add(mesh); o.mesh = mesh; this.obsActive.push(o);
    }
    this.segsGroup.add(group); this.segs.push({ data, group, npcs: env.npcs });
  }
  private despawnSeg(s: SegRT): void { this.segsGroup.remove(s.group); disposeGroup(s.group); for (const o of s.data.obs) { o.mesh = undefined; } const set = new Set(s.data.obs); this.obsActive = this.obsActive.filter((o) => !set.has(o)); this.segs = this.segs.filter((x) => x !== s); }
  private syncSegments(all: boolean): void {
    const pd = this.P.d; let spawned = 0;
    for (const s of [...this.segs]) if (s.data.d1 < pd - BEHIND || s.data.d0 > pd + AHEAD + 120) this.despawnSeg(s);
    for (const d of this.level.segs) {
      if (d.d1 < pd - BEHIND || d.d0 > pd + AHEAD) continue; if (this.segs.some((s) => s.data === d)) continue;
      if (!all && spawned >= 1) break; this.spawnSeg(d); spawned++;
    }
  }

  // ------------------------------------------------------------------ simulation
  private prevStates(): void { this.pp.d = this.P.d; this.pp.x = this.P.x; this.pp.y = this.P.y; for (const e of this.echoes) { e.pd = e.d; e.px = e.x; e.py = e.y; } }

  private curSeg(): SegData | null { const d = this.P.d; for (const s of this.segs) if (d >= s.data.d0 && d < s.data.d1) return s.data; return null; }

  private laneBlocked(nl: number): boolean {
    const P = this.P; const cx = LANES[nl];
    for (const o of this.obsActive) {
      if (o.kind === 'mover' || o.kind === 'high') continue; if (o.d1 < P.d - 0.7 || o.d0 > P.d + 0.7) continue; if (o.x1 < cx - 0.5 || o.x0 > cx + 0.5) continue;
      const top = o.walkable ? (o.kind === 'ramp' ? (o.h0 as number) + ((o.h1 as number) - (o.h0 as number)) * clamp((P.d - o.d0) / (o.d1 - o.d0), 0, 1) : o.y1) : o.y1;
      if (P.y >= top - 0.3) continue; if (o.walkable && o.kind === 'ramp') continue; return true;
    }
    return false;
  }
  private changeLane(dir: number): void {
    const P = this.P; const nl = clamp(P.lane + dir, 0, 2); if (nl === P.lane) return;
    if (this.laneBlocked(nl)) { audio.sfx('bump', { pan: dir * 0.5 }); P.bump = 0.2; this.bumpedT = 0.4; return; } P.lane = nl;
  }

  private moverX(o: Obs, time: number): number {
    const m = o.mover!; const tt = Math.abs(m.to - m.from) / m.speed; const u = (time + m.phase) % m.cycle; if (u >= tt) return m.from * 1.5 + Math.sign(m.from) * 30;
    return m.from + Math.sign(m.to - m.from) * m.speed * u;
  }

  private step(dt: number): void {
    if (this.primaryDone) return;
    const P = this.P; const st = this.stage; const f = this.frame; const t = f * dt; this.t = t; this.runTime += dt; const cruise = st.cruise * (this.endless ? 1 + Math.min(0.55, P.d / 3200) : 1);
    this.moverT += dt * (P.slowT > 0 ? 0.45 : 1); const hasDash = true; const hasSlow = abilityUnlocked('slow'); const hasPhase = abilityUnlocked('phase'); const hasSync = abilityUnlocked('sync');
    // echoes first (deterministic order: recorded frame f is replayed on frame f)
    for (const e of this.echoes) this.stepEcho(e, f, t, hasSync);
    // input
    const inp = this.inp;
    if (inp.left) this.changeLane(-1); if (inp.right) this.changeLane(1);
    if (inp.jump) P.jumpBuf = 0.14; if (inp.slide) { if (P.grounded) { P.sliding = true; P.slideT = 0.78; audio.sfx('slide'); } else { P.vy = Math.min(P.vy, -15); P.slideQ = true; } }
    if (inp.dash && P.dashCd <= 0 && hasDash) { P.dashT = 0.4; P.dashCd = 3.5; audio.sfx('dash'); }
    if (inp.slow && hasSlow && P.slowCd <= 0) { P.slowT = 4; P.slowCd = 20; audio.sfx('slow'); this.showToast('SLOW TIME', 'info'); }
    if (inp.phase && hasPhase && P.phaseCd <= 0) { P.phaseT = 1.2; P.phaseCd = 12; audio.sfx('phase'); }
    const interact = inp.interact; inp.left = inp.right = inp.jump = inp.slide = inp.dash = inp.interact = inp.slow = inp.phase = false;
    // timers
    P.dashT = Math.max(0, P.dashT - dt); P.dashCd = Math.max(0, P.dashCd - dt); P.hitT = Math.max(0, P.hitT - dt); P.stumbleT = Math.max(0, P.stumbleT - dt); P.phaseT = Math.max(0, P.phaseT - dt); P.phaseCd = Math.max(0, P.phaseCd - dt);
    P.slowT = Math.max(0, P.slowT - dt); P.slowCd = Math.max(0, P.slowCd - dt); P.jumpBuf = Math.max(0, P.jumpBuf - dt); P.bump = Math.max(0, P.bump - dt); this.bumpedT = Math.max(0, this.bumpedT - dt);
    if (P.sliding) { P.slideT -= dt; if (P.slideT <= 0) P.sliding = false; }
    // speed
    let target = cruise; if (this.held.boost) target = cruise * 1.3; if (this.held.brake || this.held.touchBrake) target = 0; if (P.dashT > 0) target = cruise * 2.3; if (P.stumbleT > 0) target = Math.min(target, cruise * 0.35);
    const acc = target > P.speed ? 15 : 30; P.speed += clamp(target - P.speed, -acc * dt, acc * dt);
    let nd = P.d + P.speed * dt;
    // lane movement
    P.x += clamp(LANES[P.lane] - P.x, -14 * dt, 14 * dt);
    // blockers (soft walls, gaps, guards)
    this.lastBlock = null;
    for (const b of this.blockers) {
      const d = b.def; const inX = P.x + 0.4 > b.xr[0] && P.x - 0.4 < b.xr[1];
      if ((d.kind === 'gate' || d.kind === 'secret' || d.kind === 'phase') && b.prog < 0.6 && inX && !(d.kind === 'phase' && P.phaseT > 0)) {
        if (nd + 0.55 > d.d && P.d < d.d + d.len) { if (P.speed > 3) audio.sfx('bump'); nd = Math.min(nd, d.d - 0.55); P.speed = 0; }
        if (d.d - P.d < 28 && d.d - P.d > 0) this.lastBlock = b;
      } else if (d.kind === 'gap' && b.prog < 0.5 && P.grounded && P.y < 0.12 && P.d > d.d + 0.3 && P.d < d.d + d.len - 0.3 && P.dashT <= 0) { this.fail('fell'); return; }
      else if (d.kind === 'guard' && b.prog < 0.5 && P.d > d.d && P.d < d.d + d.len && P.hitT <= 0 && P.dashT <= 0) {
        const lane = [0, 1, 2, 1][Math.floor((t + b.off) / 1.5) % 4]; if (Math.abs(P.x - LANES[lane]) < 1.25) { this.damage(1, 'SPOTTED'); audio.sfx('alarm'); }
      }
    }
    P.d = nd;
    // vertical
    P.coyote = P.grounded ? 0.1 : Math.max(0, P.coyote - dt);
    if (P.jumpBuf > 0 && (P.grounded || P.coyote > 0)) { P.vy = 9.9; P.grounded = false; P.coyote = 0; P.jumpBuf = 0; P.sliding = false; audio.sfx('jump'); }
    const G = LevelGen.ground(this.obsActive, P.x, P.d);
    if (!P.grounded || P.y > G + 0.001) P.vy -= 27 * dt; P.y += P.vy * dt;
    if (P.y <= G + 0.001 && P.vy <= 0) { if (!P.grounded && P.vy < -4) audio.sfx('land', { vol: clamp(-P.vy / 12, 0.4, 1) }); P.y = G; P.vy = 0; P.grounded = true; if (P.slideQ) { P.slideQ = false; P.sliding = true; P.slideT = 0.7; audio.sfx('slide'); } }
    else if (P.grounded && P.vy <= 0 && P.y - G < 0.3) { P.y = G; P.vy = 0; } else P.grounded = false;
    // obstacle collisions
    this.collide(dt);
    if (this.phase !== 'playing') return;
    // movers (update boxes)
    for (const o of this.obsActive) if (o.kind === 'mover' && Math.abs(o.d0 - P.d) < 90) this.updateMover(o);
    // interactions for player
    this.interactAt(P.d, P.x, P.y, P.speed, interact, 'YOU', undefined, hasSync);
    // state of switches/blockers
    this.updateMechanisms(t, dt);
    // progress triggers
    this.triggers(t);
    // footsteps
    const ph = P.d * 0.95; if (P.grounded && P.speed > 2.5 && Math.floor(ph / Math.PI) !== Math.floor(P.lastStepPh / Math.PI)) audio.sfx('step', { surface: this.surface(), vol: 0.45 + 0.4 * clamp(P.speed / cruise, 0, 1.3) }); P.lastStepPh = ph;
    // record
    if (f < MAXF) { const o = f * FRAME; const fl = (P.sliding ? 1 : 0) | (!P.grounded && P.y > 0.05 ? 2 : 0) | (interact ? 4 : 0) | (P.dashT > 0 ? 8 : 0) | (P.stumbleT > 0 ? 16 : 0); this.rec[o] = P.d; this.rec[o + 1] = P.x; this.rec[o + 2] = P.y; this.rec[o + 3] = fl; this.rec[o + 4] = P.speed; this.recN = f + 1; }
    // mission / exit checks
    const prim = st.missions[0];
    if (prim.kind === 'reach' && P.d >= this.exitD) { this.complete(); return; }
    if (prim.kind === 'distance' && P.d >= prim.target) { this.complete(); return; }
    if (prim.kind === 'shards' && this.loopStats.shards >= prim.target) { this.complete(); return; }
    this.frame++;
    if (t >= st.loopSeconds - DT) {
      if (prim.kind === 'survive') { this.complete(); return; }
      if (this.cfg?.mode === 'endless') this.rolloverLoop(); else if (this.endless) this.fail('time'); else this.endLoopReset();
    }
  }

  private rolloverLoop(): void {
    this.commitEcho(); this.loop++; this.atmoIdx++; this.frame = 0; this.rec = new Float32Array(MAXF * FRAME); this.recN = 0; this.echoBase = this.P.d; this.loopStats = { coins: 0, shards: 0, hits: 0 };
    for (const e of this.echoes) { e.done = false; e.fade = 0; e.d = e.pd = this.echoBase; }
    const list = this.world.atmos; this.setAtmosphere(list[this.atmoIdx % list.length]); audio.sfx('echoBorn'); this.showToast(`LOOP ${String(this.loop).padStart(2, '0')} — YOUR PAST RUNS BESIDE YOU`, 'echo');
    this.pend.shards += 3; this.stats.shards += 3; this.flushSave();
  }

  private updateMover(o: Obs): void {
    const mt = this.moverT; const x = this.moverX(o, mt); const half = o.vl / 2; o.x0 = x - half; o.x1 = x + half; o.cx = x; if (o.mesh) o.mesh.position.x = x;
    // audio cue before entering the road
    const m = o.mover!; const u = (mt + m.phase) % m.cycle; const key = o.id + ':' + Math.floor((mt + m.phase) / m.cycle);
    if (u > m.cycle - 1.4 && !this.cuedMovers.has(key) && Math.abs(o.d0 - this.P.d) < 70 && this.P.d < o.d0) { this.cuedMovers.add(key); const pan = clamp(Math.sign(m.from) * 0.8, -1, 1); audio.sfx(o.model === 'train' ? 'train' : 'horn', { pan, vol: 0.8 }); if (o.model !== 'train') audio.sfx('engine', { pan, vol: 0.6 }); }
  }
  private collide(dt: number): void {
    const P = this.P; void dt; const x0 = P.x - 0.36; const x1 = P.x + 0.36; const fd0 = P.d - 0.3; const fd1 = P.d + 0.45; const head = P.y + (P.sliding ? 0.8 : 1.78);
    for (const o of this.obsActive) {
      if (o.d1 < fd0 || o.d0 > fd1) continue; if (x1 <= o.x0 || x0 >= o.x1) continue;
      if (o.walkable) { const top = o.kind === 'ramp' ? (o.h0 as number) + ((o.h1 as number) - (o.h0 as number)) * clamp((fd1 - o.d0) / (o.d1 - o.d0), 0, 1) : o.y1; if (P.y >= top - 0.34) continue; }
      if (P.y >= o.y1 - 0.02 || head <= o.y0 + 0.02) continue;
      if (P.hitT > 0 || P.dashT > 0) { if (o.kind === 'full' && P.dashT <= 0) { P.d = Math.min(P.d, o.d0 - 0.36); P.speed = 0; } continue; }
      this.damage(o.dmg, 'HIT'); if (o.kind === 'full' || o.kind === 'platform' || o.kind === 'mover') { P.d = Math.min(P.d, o.d0 - 0.4); P.speed = 0; } if (this.phase !== 'playing') return; break;
    }
  }

  private damage(n: number, why: string): void {
    const P = this.P; if (P.hitT > 0 || P.dashT > 0) return; P.hp = Math.max(0, P.hp - n); P.hitT = 1.3; P.stumbleT = 0.65; this.stats.hits++; this.loopStats.hits++; this.shake = 0.5; this.hitFlash = 0.35; audio.sfx('hit');
    if (why === 'SPOTTED') this.showToast('SPOTTED — THE GUARD SAW YOU', 'danger');
    const strict = this.stage.missions[0].strict; if (P.hp <= 0 || strict) this.fail(strict && P.hp > 0 ? 'hit-strict' : 'hit');
  }

  // echo stepping
  private stepEcho(e: EchoRT, f: number, t: number, sync: boolean): void {
    const off = e.rec.scripted ? 0 : Math.round((this.stage.echoLead ?? 0) * 60); const fi = f + off;
    if (fi >= e.rec.n) { if (!e.done) { e.done = true; e.status = 'GONE'; } return; }
    const o = fi * FRAME; const fr = e.rec.frames; e.d = fr[o] + (e.rec.rel ? this.echoBase : 0); e.x = fr[o + 1]; e.y = fr[o + 2]; e.flags = fr[o + 3]; e.speed = fr[o + 4];
    const inter = (e.flags & 4) !== 0; this.interactAt(e.d, e.x, e.y, e.speed, inter, e.label, e, sync);
    if (t > e.statusT) e.status = e.speed < 0.8 ? 'WAITING' : e.flags & 1 ? 'SLIDING' : e.flags & 2 ? 'JUMPING' : 'RUNNING';
  }

  private interactAt(d: number, x: number, y: number, speed: number, interact: boolean, who: string, e: EchoRT | undefined, sync: boolean): void {
    const t = this.t;
    for (const s of this.switches) {
      const def = s.def;
      if (def.kind === 'plate') {
        if (Math.abs(d - def.d) < 1.7 && Math.abs(x - s.x) < 1.5 && speed < 2.0 && y < 0.4) { if (t > s.holdUntil - 0.5 && !s.active) audio.sfx('plate', { pan: clamp((s.x - this.P.x) / 8, -1, 1) }); s.holdUntil = t + (sync ? 4.5 : 2.5); s.by = who; if (e) { e.status = 'HOLDING PLATE ' + def.label; e.statusT = t + 0.3; } }
      } else if (interact && Math.abs(d - def.d) < 3.2 && Math.abs(x - s.vx) < 5.0 && !(s.latched || t < s.until)) {
        s.latched = !def.duration; s.until = def.duration ? t + def.duration : Infinity; s.by = who; s.handle = 1; audio.sfx('switch', { pan: clamp((s.vx - this.P.x) / 8, -1, 1) });
        this.showToast(`${def.kind === 'radio' ? 'RADIO' : 'LEVER'} ${def.label} — ACTIVATED BY ${who}`, who === 'YOU' ? 'info' : 'echo'); if (e) { e.status = 'ACTIVATED ' + def.label; e.statusT = t + 3; }
      }
    }
    this.collectAt(d, x, y, who === 'YOU');
  }

  private collectAt(d: number, x: number, y: number, byPlayer: boolean): void {
    for (const s of this.segs) {
      if (d < s.data.d0 - 2 || d > s.data.d1 + 2) continue;
      for (const c of s.data.cols) { if (c.taken || Math.abs(c.d - d) > 1.1 || Math.abs(c.x - x) > 1.25 || c.y < y - 0.45 || c.y > y + 2.0) continue; this.takeCol(c, byPlayer, x); }
    }
  }
  private takeCol(c: Col, byPlayer: boolean, x: number): void {
    c.taken = true; const pan = clamp((c.x - this.P.x) / 6, -1, 1); const v = byPlayer ? 1 : 0.55;
    if (c.type === 'coin') { this.pend.coins++; this.stats.coins++; this.loopStats.coins++; audio.sfx('coin', { pan, vol: v }); }
    else if (c.type === 'shard') { this.pend.shards++; this.stats.shards++; this.loopStats.shards++; audio.sfx('shard', { pan, vol: v }); }
    else { const id = c.lore ?? ''; this.stageLore.add(id); const lore = LORE.find((l) => l.id === id); audio.sfx('rare', { pan });
      updateSave((s) => { if (c.type === 'core') { s.cores++; } else if (id.startsWith('rec')) { if (!s.recordings.includes(id)) s.recordings.push(id); } else if (!s.memories.includes(id)) s.memories.push(id); });
      this.showToast(lore ? (c.type === 'recording' ? 'LOST RECORDING FOUND — ' : c.type === 'core' ? 'ECHO CORE — ' : 'MEMORY FRAGMENT — ') + lore.title.replace(/^.*— /, '').toUpperCase() : 'COLLECTED', 'rare'); }
    void x;
  }

  private updateMechanisms(t: number, dt: number): void {
    const byId = new Map<string, SwRT>(); for (const s of this.switches) { s.active = s.latched || t < s.until || t < s.holdUntil; byId.set(s.def.id, s); }
    for (const b of this.blockers) {
      b.want = b.def.requires.length > 0 && b.def.requires.every((id) => byId.get(id)?.active);
      if (b.want !== b.wasWant) { b.wasWant = b.want; audio.sfx(b.want ? 'gate' : 'gateClose', { pan: clamp(((b.xr[0] + b.xr[1]) / 2 - this.P.x) / 8, -1, 1), vol: clamp(1 - Math.abs(b.def.d - this.P.d) / 120, 0.1, 1) }); }
      b.prog = clamp(b.prog + (b.want ? 1.5 : -3) * dt, 0, 1);
    }
  }

  private triggers(t: number): void {
    const P = this.P; const st = this.stage;
    if (st.timerShowAt > 0 && t >= st.timerShowAt && !this.timerNote && this.loop === 1) { this.timerNote = true; this.sub = { text: 'The clock says sixty seconds. When it reaches zero, everything resets.', t: 5.5 }; audio.sfx('whisper', { vol: 0.6 }); }
    st.tips.forEach((tp, i) => { if (P.d >= tp.d && !this.tipsShown.has(i) && P.d < tp.d + 30) { this.tipsShown.add(i); const touch = 'ontouchstart' in window; this.tip = { text: touch && tp.touch ? tp.touch : tp.text, t: 4.5 }; } });
    st.clues.forEach((c, i) => { if (Math.abs(P.d - c.d) < 7 && !this.cluesShown.has(i)) { this.cluesShown.add(i); this.clueCount++; this.sub = { text: (c.title ? c.title + ' — ' : '') + c.text, t: 5 }; audio.sfx('clue'); const id = `${st.id}:${c.d}`; updateSave((s) => { if (!s.clues.includes(id)) s.clues.push(id); }); } });
    st.events.forEach((e, i) => {
      if (P.d < e.d || this.evFired.has(i) || this.loop < e.minLoop) { if (e.kind === 'echoTurn') this.turnActive = this.loop >= e.minLoop && P.d > e.d - 10 && P.d < e.d + 70; return; }
      if (e.kind === 'vanish') return; this.evFired.add(i);
      if (e.kind === 'radio') { audio.sfx('radio'); this.sub = { text: e.text ?? '', t: 5.5 }; }
      else if (e.kind === 'glitch') { this.glitchT = 0.35; audio.sfx('glitch'); this.shake = Math.max(this.shake, 0.15); }
      else if (e.kind === 'flicker') this.flicker = 2.2;
      else if (e.kind === 'freeze') { if (e.text) this.sub = { text: e.text, t: 4 }; audio.sfx('whisper', { vol: 0.5 }); }
      else if (e.kind === 'figure') { const h = new Human({ jacket: '#101214', shirt: '#101214', pants: '#0c0d0f', shoes: '#0a0a0a', pack: 'none', acc: 'none' }); h.root.position.set((e.side ?? -1) * 7.6, 0.16, -(P.d + 46)); h.root.rotation.y = (e.side ?? -1) > 0 ? Math.PI / 2 : -Math.PI / 2; h.pose({ phase: 0, k: 0, air: false, slide: false, dash: false, stumble: false, dead: false, idle: true, t: 0 }); this.scene.add(h.root); if (this.figure) this.scene.remove(this.figure.h.root); this.figure = { h, d: P.d + 46 }; audio.sfx('whisper', { pan: (e.side ?? -1) * 0.7 }); }
    });
    if (this.figure && P.d > this.figure.d - 15) { this.scene.remove(this.figure.h.root); this.figure = null; }
    if (this.flicker > 0) { this.flicker = Math.max(0, this.flicker - DT); (M.lampGlow as THREE.MeshBasicMaterial).color.setHex(Math.random() < 0.5 ? 0x2a2a28 : this.atmo.night ? 0xffe0a0 : 0xd8d3bf); if (this.flicker === 0) applyAtmosphere(this.atmo); }
    void t;
  }

  private surface(): 'asphalt' | 'grass' | 'metal' | 'snow' | 'tile' | 'sand' {
    const k = this.curSeg()?.kind; if (k === 'tunnel' || k === 'metro' || k === 'core') return 'tile'; if (k === 'bridge' || k === 'rooftop') return 'metal';
    if (k === 'wild' || k === 'town') return this.world.id === 'verdant' ? 'grass' : this.world.id === 'frostline' ? 'snow' : this.world.id === 'dustfall' ? 'sand' : 'asphalt'; return 'asphalt';
  }

  private flushSave(): void { if (this.pend.coins || this.pend.shards) { const { coins, shards } = this.pend; this.pend = { coins: 0, shards: 0 }; updateSave((s) => { s.coins += coins; s.shards += shards; }); } }

  private showToast(text: string, tone = 'info'): void { this.toastO = { text, tone, t: 3.2 }; }

  // ------------------------------------------------------------------ frame loop
  private tick = (now: number): void => {
    if (this.disposed) return; this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000); this.last = now; this.now = now / 1000; if (!this.renderOn) return;
    if (this.phase === 'playing') { this.acc += dt; let n = 0; while (this.acc >= DT && n < 5) { this.prevStates(); this.step(DT); this.acc -= DT; n++; if (this.phase !== 'playing') break; } if (n >= 5) this.acc = 0; }
    else if (this.phase === 'reset') { this.resetT -= dt; if (this.resetT <= 0) this.beginLoop(false); }
    this.alpha = this.phase === 'playing' ? this.acc / DT : 1;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number): void {
    const P = this.P; const now = this.now; const playing = this.phase === 'playing' || this.phase === 'paused' || this.phase === 'failed' || this.phase === 'complete' || this.phase === 'reset'; const menu = this.phase === 'menu';
    this.menuT += dt; const a = this.alpha; const rd = lerp(this.pp.d, P.d, a); const rx = lerp(this.pp.x, P.x, a); const ry = lerp(this.pp.y, P.y, a);
    if (this.phase !== 'paused') { this.syncSegments(false); if (this.endless || this.level.hasMore()) this.level.ensureTo(rd + AHEAD); }
    // indoor factor
    const seg = this.curSeg(); const ind = seg && (seg.kind === 'tunnel' || seg.kind === 'hidden') ? 1 : seg?.kind === 'core' ? 0.35 : 0; this.indoor = lerp(this.indoor, ind, clamp(dt * 3, 0, 1));
    this.hemi.intensity = this.atmo.hemiInt * (1 - 0.5 * this.indoor); this.sun.intensity = this.atmo.sunInt * (1 - 0.88 * this.indoor);
    // player visuals
    const cruise = this.stage.cruise; const vx = (P.x - this.pp.x) / DT; const root = this.human.root;
    if (menu) {
      root.position.set(-0.6, 0, -34); root.rotation.set(0, Math.PI + 0.45, 0); this.human.pose({ phase: 0, k: 0, air: false, slide: false, dash: false, stumble: false, dead: false, idle: true, t: now });
      this.menuEcho.root.position.set(1.0, 0, -34.6); this.menuEcho.root.rotation.set(0, Math.PI + 0.25, 0); this.menuEcho.pose({ phase: 0, k: 0, air: false, slide: false, dash: false, stumble: false, dead: false, idle: true, t: now + 1.3 });
      this.menuEcho.setOpacity(0.38 + 0.12 * Math.sin(now * 1.3) + (Math.sin(now * 9) > 0.96 ? -0.15 : 0));
      const cs = cosmeticsFromSave(); const sig = JSON.stringify(cs); if (sig !== this.cosSig) { this.cosSig = sig; this.human.setCosmetic(cs); }
      this.cameraMenu();
    } else if (playing) {
      root.visible = this.P.hitT > 0 && !P.dead ? Math.floor(now * 16) % 2 === 0 : true; root.position.set(rx, ry, -rd); root.rotation.y = -clamp(vx * 0.03, -0.45, 0.45); root.rotation.z = -clamp(vx * 0.009, -0.18, 0.18);
      const calm = this.phase === 'complete';
      this.human.pose({ phase: rd * 0.95, k: clamp(P.speed / cruise, 0, 1.25), air: !P.grounded && P.y > 0.05, slide: P.sliding && !calm, dash: P.dashT > 0, stumble: P.stumbleT > 0, dead: P.dead, idle: (P.speed < 0.6 || calm) && P.grounded && !P.dead, t: now });
      if (calm && this.stage.id === 'chrono-final') {
        // the final Echo: it appears at the edge of the road, looks at you, then disappears
        this.finalT += dt; const f = this.menuEcho; f.root.visible = this.finalT < 9; f.root.position.set(P.x + 1.7, 0, -(P.d + 5)); f.root.rotation.y = Math.PI - 0.12;
        f.pose({ phase: 0, k: 0, air: false, slide: false, dash: false, stumble: false, dead: false, idle: true, t: now }); f.setOpacity(0.5 * clamp(Math.min(this.finalT / 1.5, (9 - this.finalT) / 3), 0, 1)); if (f.label) f.label.visible = false;
      }
      this.cameraFollow(dt, rd, rx, ry);
      this.head.position.set(rx, 2.4, -rd + 1.5); this.sun.target.position.set(rx, 0, -rd - 4);
    }
    // sun follows
    const sp = this.atmo.sunPos; const tx = this.sun.target.position; if (!menu && !playing) tx.set(0, 0, -34);
    if (menu) { tx.set(0, 0, -34); this.head.position.set(0, 2.4, -32); } this.sun.position.set(tx.x + sp[0], tx.y + sp[1], tx.z + sp[2] * 0.6 + 10);
    // echoes
    this.updateEchoes(dt, rd);
    // npcs
    for (const s of this.segs) for (const n of s.npcs) { if (Math.abs(s.data.d0 - rd) > 320) continue; if (!n.still && this.phase !== 'paused') { n.d += n.dir * n.speed * dt; if (n.d < s.data.d0 + 1 || n.d > s.data.d1 - 1) { n.dir *= -1; n.root.rotation.y = n.dir > 0 ? 0 : Math.PI; } n.root.position.z = -n.d; n.animate(dt); } }
    // movers visuals when not playing
    // obstacle mover positions updated in step; keep visible ones in sync while paused
    // collectibles
    this.updateInstances(rd, now);
    // mechanisms visuals
    this.updateMechVisuals(dt, now);
    // figure idle
    if (this.figure) this.figure.h.root.visible = true;
    // backdrop / sky follow
    const cp = this.camera.position; this.sky.position.copy(cp); if (this.backdrop) this.backdrop.position.set(cp.x * 0.98, 0, cp.z);
    this.updateWeather(dt, cp);
    // timers
    this.shake = Math.max(0, this.shake - dt * 1.6); this.glitchT = Math.max(0, this.glitchT - dt); this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.sub) { this.sub.t -= dt; if (this.sub.t <= 0) this.sub = null; } if (this.tip) { this.tip.t -= dt; if (this.tip.t <= 0) this.tip = null; } if (this.toastO) { this.toastO.t -= dt; if (this.toastO.t <= 0) this.toastO = null; }
    this.flushT += dt; if (this.flushT > 1.2) { this.flushT = 0; this.flushSave(); }
    this.audT -= dt; if (this.audT <= 0) { this.audT = 0.25; this.updateAudio(); } audio.update(dt);
    this.hudT -= dt; if (this.hudT <= 0 && this.phase !== 'menu') { this.hudT = 0.1; this.emitHud(false); }
  }

  private cameraFollow(dt: number, rd: number, rx: number, ry: number): void {
    const cam = this.camera; const P = this.P; const sp = clamp(P.speed / this.stage.cruise, 0, 1.6); const k = clamp(dt * 7, 0, 1);
    this.camX = lerp(this.camX, rx * 0.62, k); this.camY = lerp(this.camY, 3.05 + ry * 0.5 - (P.sliding ? 0.25 : 0), clamp(dt * 6, 0, 1));
    const sh = this.shake * getSave().settings.shake * 0.35; const jx = (Math.random() - 0.5) * sh; const jy = (Math.random() - 0.5) * sh;
    cam.position.set(this.camX + jx, this.camY + jy, -rd + 6.1 + sp * 0.35); cam.lookAt(rx * 0.8, 1.35 + ry * 0.4, -rd - 11);
    const fov = 60 + (P.dashT > 0 ? 8 : clamp(sp - 1, 0, 0.6) * 6); if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = lerp(cam.fov, fov, clamp(dt * 5, 0, 1)); cam.updateProjectionMatrix(); }
  }
  private cameraMenu(): void {
    const cam = this.camera; const s = Math.sin(this.menuT * 0.18) * 0.35; cam.position.set(3.0 + s, 1.5, -34 + 5.0); cam.lookAt(-0.7 + s * 0.3, 1.25, -37); if (cam.fov !== 54) { cam.fov = 54; cam.updateProjectionMatrix(); } this.camX = cam.position.x; this.camY = 3;
  }

  private updateEchoes(dt: number, rd: number): void {
    const cruise = this.stage.cruise; const a = this.alpha; const now = this.now;
    for (const e of this.echoes) {
      const r = e.human.root; const far = Math.abs(e.d - rd) > 230; r.visible = !far && e.fade > 0.02;
      if (e.done) e.fade = Math.max(0, e.fade - dt * 1.4); else e.fade = Math.min(1, e.fade + dt * 1.2);
      const d = lerp(e.pd, e.d, a); const x = lerp(e.px, e.x, a); const y = lerp(e.py, e.y, a); let xx = x;
      let op = 0.52 * e.fade; if (e.rec.broken) { op *= Math.sin(now * 23) > 0.55 ? 0.15 : 1; if (Math.floor(now * 7) % 11 === 0) xx += 0.4; }
      e.human.setOpacity(op); r.position.set(xx, y, -d);
      const fl = e.flags; const turn = this.turnActive && (e.rec.broken || e === this.echoes[0]) && Math.abs(d - rd) < 35 && e.speed < 1.5; e.turn = lerp(e.turn, turn ? Math.PI : 0, clamp(dt * 4, 0, 1)); r.rotation.y = e.turn;
      e.human.pose({ phase: d * 0.95, k: clamp(e.speed / cruise, 0, 1.25), air: (fl & 2) !== 0, slide: (fl & 1) !== 0, dash: (fl & 8) !== 0, stumble: (fl & 16) !== 0, dead: false, idle: e.speed < 0.6 && (fl & 2) === 0, t: now });
      if (e.human.label) e.human.label.visible = Math.abs(d - rd) < 50 && !e.done;
    }
  }

  private updateInstances(rd: number, now: number): void {
    const cnt: Record<string, number> = { coin: 0, shard: 0, memory: 0, recording: 0, core: 0 }; const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const s1 = new THREE.Vector3(1, 1, 1); const ax = new THREE.Vector3(0, 1, 0);
    for (const s of this.segs) {
      if (s.data.d1 < rd - 10 || s.data.d0 > rd + 170) continue;
      for (const c of s.data.cols) {
        if (c.taken || c.d < rd - 8 || c.d > rd + 165) continue; const im = this.inst[c.type]; const i = cnt[c.type]; if (i >= im.instanceMatrix.count) continue;
        q.setFromAxisAngle(ax, now * (c.type === 'coin' ? 3 : 1.6) + c.id); v.set(c.x, c.y + Math.sin(now * 2.6 + c.id) * 0.07, -c.d); const sc = c.type === 'memory' || c.type === 'recording' || c.type === 'core' ? 1.25 : 1; s1.set(sc, sc, sc);
        m.compose(v, q, s1); im.setMatrixAt(i, m); cnt[c.type] = i + 1;
      }
    }
    for (const k of Object.keys(cnt)) { const im = this.inst[k]; im.count = cnt[k]; im.instanceMatrix.needsUpdate = true; }
  }

  private updateMechVisuals(dt: number, now: number): void {
    const t = this.t;
    for (const s of this.switches) {
      if (s.plate) { const c = s.active ? 0x5fe08a : labelColor(s.def.label); s.plate.lamp.color.setHex(c); s.plate.ring.color.setHex(s.active ? 0x2b6b43 : 0x3b3f44); }
      if (s.lever) { s.handle += ((s.active ? 0 : 1) - s.handle) * clamp(dt * 10, 0, 1); s.lever.handle.rotation.x = lerp(-0.9, 0.7, 1 - s.handle) * (s.def.kind === 'radio' ? 0 : 1); s.lever.lamp.color.setHex(s.active ? 0x5fe08a : 0xd93b2e); }
    }
    for (const b of this.blockers) {
      if (b.gate) { const g = b.gate; g.door.position.y = b.prog * g.openY; const col = b.prog > 0.6 ? 0x5fe08a : b.want ? 0xf2c23b : 0xd93b2e; g.lamps.forEach((l) => l.color.setHex(col)); if (g.phaseMat) g.phaseMat.opacity = lerp(0.75, 0.04, b.prog) * (0.85 + 0.15 * Math.sin(now * 5)); }
      if (b.gap) b.gap.bridge.visible = b.prog > 0.3;
      if (b.guard) {
        const gv = b.guard; const seq = [0, 1, 2, 1]; const step = Math.floor((t + b.off) / 1.5); const lane = seq[step % 4]; const nxt = seq[(step + 1) % 4]; const frac = ((t + b.off) % 1.5) / 1.5; const dis = b.prog > 0.5;
        gv.strips.forEach((m, i) => { const target = dis ? 0 : i === lane ? 0.36 : i === nxt && frac > 0.72 ? 0.14 : 0; m.opacity += (target - m.opacity) * clamp(dt * 12, 0, 1); });
        const faceY = dis ? Math.PI * 0.9 : Math.PI / 2 + (LANES[lane] > 0 ? 0.2 : LANES[lane] < 0 ? -0.2 : 0) * 0 - (LANES[lane] - 0) * 0.04; gv.human.root.rotation.y = lerp(gv.human.root.rotation.y, faceY, clamp(dt * 5, 0, 1));
        gv.human.pose({ phase: 0, k: 0, air: false, slide: false, dash: false, stumble: false, dead: false, idle: true, t: now });
      }
    }
  }

  private updateWeather(dt: number, cp: THREE.Vector3): void {
    if (this.rainN > 0) { const p = this.rainP; const n = this.rainN; const sp = this.atmo.id === 'heavyRain' ? 30 : 24; for (let i = 0; i < n; i++) { const o = i * 6; let y = p[o + 1] - sp * dt; let x = p[o]; let z = p[o + 2] + 6 * dt; if (y < 0) { y += 16; x = (Math.random() - 0.5) * 30; z = -Math.random() * 44 + 4; } p[o] = x; p[o + 1] = y; p[o + 2] = z; p[o + 3] = x - 0.04; p[o + 4] = y + 0.7; p[o + 5] = z - 0.08; }
      (this.rain.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true; this.rain.position.set(cp.x, cp.y - 3, cp.z); }
    if (this.snowN > 0) { const p = this.snowP; for (let i = 0; i < this.snowN; i++) { const o = i * 3; p[o + 1] -= 1.6 * dt; p[o] += Math.sin(this.now * 0.8 + i) * 0.4 * dt; if (p[o + 1] < 0) { p[o + 1] += 14; p[o] = (Math.random() - 0.5) * 30; p[o + 2] = -Math.random() * 40 + 4; } } (this.snow.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true; this.snow.position.set(cp.x, cp.y - 3, cp.z); }
    if (this.dustN > 0) { const p = this.dustP; for (let i = 0; i < this.dustN; i++) { const o = i * 3; p[o] += 4 * dt; p[o + 1] += Math.sin(this.now + i) * 0.1 * dt; if (p[o] > 17) { p[o] = -17; p[o + 2] = -Math.random() * 45 + 4; p[o + 1] = Math.random() * 6; } } (this.dust.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true; this.dust.position.set(cp.x, cp.y - 3, cp.z); }
  }

  private updateAudio(): void {
    const k = this.curSeg()?.kind ?? 'street'; const a = this.atmo; const urban = ['street', 'boulevard', 'cafe', 'metro', 'fracture', 'town', 'park', 'construction', 'industrial', 'riverfront'].includes(k); const tun = k === 'tunnel' || k === 'hidden' || k === 'core';
    const P = this.P; let danger = 0; if (this.phase === 'playing') {
      for (const o of this.obsActive) { if (o.kind === 'ramp' || o.kind === 'platform') continue; const dd = o.d0 - P.d; if (dd < -1 || dd > 22) continue; if (o.x1 < P.x - 0.6 || o.x0 > P.x + 0.6) continue; danger = Math.max(danger, 1 - dd / 22); }
      if (P.hp <= 1) danger = Math.max(danger, 0.5); if (this.lastBlock) danger = Math.max(danger, 0.3);
    }
    this.danger = lerp(this.danger, danger, 0.4); const remain = this.stage.loopSeconds - this.t; const timeTen = this.phase === 'playing' && !this.endless ? clamp((20 - remain) / 20, 0, 1) * 0.6 : 0;
    audio.setScene({ urban: this.world.id === 'chrono' ? 0.1 : urban ? (this.world.id === 'monsoon' ? 0.9 : 0.75) : 0.12, birds: a.id === 'clear' || a.id === 'morning' ? (tun ? 0 : 0.8) : 0, wind: ['wild', 'bridge', 'rooftop', 'rail'].includes(k) || a.snow > 0 ? 0.7 : 0.2, rain: a.rain > 0 ? (tun ? 0.25 : a.rain > 800 ? 1 : 0.6) : 0, tunnel: tun ? 1 : 0, indoor: tun ? 1 : 0, water: k === 'riverfront' || k === 'bridge' ? 0.7 : 0,
      tension: Math.max(this.danger * 0.8, timeTen), mystery: this.stage.id.startsWith('paris-1') ? 0.3 : 0.15, loopRemain: remain, running: this.phase === 'playing' });
  }

  // ------------------------------------------------------------------ HUD
  private hudTextMission(): { mission: string; progress: string } {
    const m = this.stage.missions[0]; const t = this.stage.loopSeconds; let progress = '';
    if (m.kind === 'shards') progress = `${this.loopStats.shards}/${m.target}`; else if (m.kind === 'distance') progress = m.target < 1e8 ? `${Math.round(this.P.d)}/${m.target} m` : `${Math.round(this.P.d)} m`; else if (m.kind === 'survive') progress = `${Math.max(0, Math.ceil(t - this.t))} s`;
    else if (m.kind === 'reach') progress = Number.isFinite(this.exitD) ? `${Math.max(0, Math.round(this.exitD - this.P.d))} m to go` : '';
    return { mission: m.text, progress };
  }

  private computeHint(): string | null {
    const P = this.P; if (this.phase !== 'playing') return null;
    for (const s of this.switches) { if (s.def.kind !== 'plate' && Math.abs(P.d - s.def.d) < 3.2 && Math.abs(P.x - s.vx) < 5 && !(s.latched || this.t < s.until)) return `[E] ${s.def.kind === 'radio' ? 'USE RADIO' : s.def.id.startsWith('sec@') ? 'EXAMINE SYMBOL' : 'PULL LEVER'} ${s.def.label}`; }
    if (this.lastBlock) { const b = this.lastBlock; return b.def.kind === 'secret' ? 'A SEALED WALL — LOOK FOR A SYMBOL' : `GATE ${b.def.label} CLOSED — BRAKE (S) AND WAIT FOR YOUR ECHO`; }
    for (const s of this.switches) if (s.def.kind === 'plate' && s.def.d - P.d > 0 && s.def.d - P.d < 14 && !s.active) return `STAND ON PLATE ${s.def.label} — BRAKE (S)`;
    return null;
  }

  private emitHud(force: boolean): void {
    void force; const P = this.P; const save = getSave(); const { mission, progress } = this.hudTextMission(); const cruise = this.stage.cruise; const a = this.atmo;
    const show = this.stage.timerShowAt <= this.t || this.loop > 1; const cap = this.endless ? 1 : save.echoCap;
    this.hintText = this.computeHint();
    const h: HudState = {
      phase: this.phase, mode: this.cfg?.mode ?? 'story', stageName: this.stage.name, loop: this.loop, timeLeft: Math.max(0, this.stage.loopSeconds - this.t), timerVisible: show, dist: Math.round(P.d), coins: save.coins + this.pend.coins, shards: save.shards + this.pend.shards, memories: save.memories.length + save.recordings.length,
      hp: P.hp, maxHp: this.maxHp, speed: P.speed / cruise, dash: 1 - clamp(P.dashCd / 3.5, 0, 1), slow: 1 - clamp(P.slowCd / 20, 0, 1), phaseStep: 1 - clamp(P.phaseCd / 12, 0, 1), hasSlow: abilityUnlocked('slow'), hasPhase: abilityUnlocked('phase'),
      echoes: this.echoes.map((e) => ({ label: e.label, status: e.status, rel: Math.round(e.d - P.d), color: '#' + (e.rec.broken ? 0xd98a8a : ECHO_COLORS[(e.rec.serial - 1) % 5]).toString(16).padStart(6, '0') })), echoCap: cap, echoCount: this.echoes.filter((e) => !e.rec.scripted).length,
      mission, progress, hint: this.hintText, subtitle: save.settings.subtitles ? this.sub?.text ?? null : null, tip: this.tip?.text ?? null, toast: this.toastO ? { text: this.toastO.text, tone: this.toastO.tone } : null, glitch: this.glitchT > 0, danger: this.danger,
      atmo: a.label, canReset: !this.endless && this.t > 1.5, hit: this.hitFlash, bumped: this.bumpedT > 0, touchHold: this.held.touchBrake, loopLabel: this.endless ? 'LOOP' : 'LOOP',
    };
    this.cb.onHud(h);
  }
}
