// LOOPBREAK — graphics toolkit: procedural textures, materials, geometry batching, human rig, NPCs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { AtmoDef } from './data';

export function mulberry32(a: number): () => number {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type Ctx2 = CanvasRenderingContext2D;
function ctex(w: number, h: number, draw: (g: Ctx2, w: number, h: number) => void, srgb = true): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!; draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function speckle(g: Ctx2, w: number, h: number, n: number, col: string, a: number, s = 1): void {
  g.fillStyle = col; g.globalAlpha = a; for (let i = 0; i < n; i++) g.fillRect(Math.random() * w, Math.random() * h, s, s); g.globalAlpha = 1;
}
const fill = (g: Ctx2, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(0, 0, w, h); };

export const T: Record<string, THREE.CanvasTexture> = {};
export const M: Record<string, THREE.Material> = {};
const cache = new Map<string, THREE.Material>();
const roadMats: THREE.MeshStandardMaterial[] = [];
const nightMats: THREE.MeshLambertMaterial[] = [];
let inited = false;

export function lam(tx: THREE.Texture | null, color = 0xffffff, key = '', extra: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial {
  const k = `${tx ? tx.uuid : '-'}|${color}|${key}`;
  let m = cache.get(k) as THREE.MeshLambertMaterial | undefined;
  if (!m) { m = new THREE.MeshLambertMaterial({ map: tx, color, ...extra }); cache.set(k, m); }
  return m;
}
export const paint = (c: number) => lam(null, c);

function windowsTex(lit: boolean, balcony: boolean): THREE.CanvasTexture {
  return ctex(1024, 256, (g, w, h) => {
    if (lit) fill(g, w, h, '#000'); else {
      fill(g, w, h, '#ddd4c0'); speckle(g, w, h, 2500, '#b9ae98', 0.35, 2); speckle(g, w, h, 1500, '#fff', 0.2, 2);
      g.fillStyle = '#c4baa4'; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 10, w, 10); g.fillStyle = '#efe7d6'; g.fillRect(0, 8, w, 3);
    }
    for (let b = 0; b < 4; b++) {
      const cx = b * 256 + 128; const on = Math.random() < 0.38;
      if (lit) { if (on) { g.fillStyle = '#ffd59a'; g.fillRect(cx - 38, 50, 76, 140); g.fillStyle = '#000'; g.fillRect(cx - 2, 50, 4, 140); g.fillRect(cx - 38, 100, 76, 4); } continue; }
      g.fillStyle = '#efe7d5'; g.fillRect(cx - 52, 34, 104, 168); g.fillStyle = '#a79c86'; g.fillRect(cx - 52, 34, 104, 4);
      const gr = g.createLinearGradient(0, 46, 0, 190); gr.addColorStop(0, '#56677a'); gr.addColorStop(1, '#27313c'); g.fillStyle = gr; g.fillRect(cx - 40, 46, 80, 144);
      g.fillStyle = '#e8e4da'; g.fillRect(cx - 2, 46, 4, 144); g.fillRect(cx - 40, 98, 80, 4); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(cx - 36, 50, 22, 130);
      g.fillStyle = '#cfc5ae'; g.fillRect(cx - 60, 196, 120, 9);
      if (balcony) { g.fillStyle = '#1b1d1f'; g.fillRect(cx - 62, 205, 124, 3); for (let k = 0; k < 13; k++) g.fillRect(cx - 60 + k * 9.5, 208, 2, 38); g.fillRect(cx - 62, 244, 124, 6); }
    }
  });
}

function shopTex(): THREE.CanvasTexture {
  return ctex(1024, 256, (g, w, h) => {
    fill(g, w, h, '#d6cdb9'); speckle(g, w, h, 2000, '#b3a891', 0.3, 2);
    for (let b = 0; b < 4; b++) {
      const x0 = b * 256; g.fillStyle = '#20282a'; g.fillRect(x0 + 10, 62, 236, 194);
      const gr = g.createLinearGradient(0, 70, 0, 250); gr.addColorStop(0, '#506068'); gr.addColorStop(1, '#232b30'); g.fillStyle = gr; g.fillRect(x0 + 22, 74, 212, 172);
      g.fillStyle = '#1c2422'; g.fillRect(x0 + 126, 74, 4, 172); g.fillStyle = 'rgba(255,230,180,0.25)'; g.fillRect(x0 + 34, 90, 80, 50); g.fillRect(x0 + 140, 110, 70, 60);
      if (b === 1) { g.fillStyle = '#1c2422'; g.fillRect(x0 + 160, 74, 70, 172); g.fillStyle = '#6a7a80'; g.fillRect(x0 + 170, 84, 50, 110); }
      g.fillStyle = '#26332d'; g.fillRect(x0 + 6, 12, 244, 44); g.fillStyle = '#d8c9a0'; for (let k = 0; k < 7; k++) g.fillRect(x0 + 24 + k * 30, 26, 18 + Math.random() * 6, 16);
    }
  });
}

function asphalt(half: number, markings: boolean, base = '#3b3d40'): THREE.CanvasTexture {
  return ctex(512, 512, (g, w, h) => {
    fill(g, w, h, base); speckle(g, w, h, 9000, '#555a5e', 0.5, 1); speckle(g, w, h, 6000, '#26282a', 0.5, 1); speckle(g, w, h, 500, '#6a6f73', 0.6, 2);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(w * (0.5 - 0.06 * 6.2 / half), 0, w * 0.06 * 6.2 / half * 2 * 0.25, h);
    if (!markings) return;
    const px = (x: number) => (x + half) / (half * 2) * w;
    g.fillStyle = 'rgba(235,235,225,0.85)';
    for (const x of [-1.2, 1.2]) for (let k = 0; k < 4; k++) g.fillRect(px(x) - 3, k * 128 + 16, 6, 62);
    for (const x of [-3.75, 3.75]) g.fillRect(px(x) - 3, 0, 6, h);
    g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(0, 0, px(-3.75), h); g.fillRect(px(3.75), 0, w - px(3.75), h);
  });
}

export function initGfx(): void {
  if (inited) return; inited = true;
  T.asphaltWide = asphalt(6.2, true); T.asphaltNarrow = asphalt(4.2, true);
  T.dirt = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#7d6648'); speckle(g, w, h, 6000, '#5a4830', 0.5, 2); speckle(g, w, h, 3000, '#9c8560', 0.5, 2); g.fillStyle = 'rgba(40,30,20,0.25)'; g.fillRect(w * 0.3, 0, 14, h); g.fillRect(w * 0.64, 0, 14, h); });
  T.snowRoad = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#dfe5ea'); speckle(g, w, h, 4000, '#b8c3cd', 0.5, 2); g.fillStyle = 'rgba(90,100,110,0.3)'; g.fillRect(w * 0.3, 0, 12, h); g.fillRect(w * 0.64, 0, 12, h); });
  T.concrete = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#8e9093'); speckle(g, w, h, 5000, '#6f7174', 0.4, 2); speckle(g, w, h, 2000, '#b0b2b4', 0.4, 2); g.strokeStyle = 'rgba(40,40,40,0.4)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); });
  T.pavers = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#a8a397'); speckle(g, w, h, 4000, '#8d887d', 0.4, 2); g.strokeStyle = '#85807a'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } });
  T.grass = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#4f6d3b'); speckle(g, w, h, 6000, '#3d5a2d', 0.5, 2); speckle(g, w, h, 4000, '#6f8c50', 0.4, 2); });
  T.snow = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#eef2f6'); speckle(g, w, h, 3500, '#c6d0da', 0.5, 2); });
  T.sand = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#d3b27c'); speckle(g, w, h, 5000, '#b8955f', 0.4, 2); speckle(g, w, h, 3000, '#e6ca9a', 0.4, 2); g.strokeStyle = 'rgba(150,110,60,0.25)'; for (let i = 0; i < 10; i++) { g.beginPath(); g.moveTo(0, i * 26); g.quadraticCurveTo(w / 2, i * 26 + 10, w, i * 26); g.stroke(); } });
  T.rock = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#6f6c68'); speckle(g, w, h, 5000, '#524f4b', 0.5, 3); speckle(g, w, h, 2500, '#8b8781', 0.5, 2); g.strokeStyle = 'rgba(30,30,30,0.4)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.lineTo(Math.random() * w, Math.random() * h); g.stroke(); } });
  T.wood = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#7b5d41'); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#6d5138' : '#86664a'; g.fillRect(0, i * 32, w, 30); } speckle(g, w, h, 2500, '#4b3726', 0.3, 2); });
  T.metal = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#8b9093'); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#7d8285' : '#9a9fa2'; g.fillRect(i * 16, 0, 8, h); } speckle(g, w, h, 1500, '#b77a4a', 0.25, 3); });
  T.hazard = ctex(128, 128, (g, w, h) => { fill(g, w, h, '#e3b82c'); g.fillStyle = '#1d1d1d'; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, h); g.lineTo(i * 32 + 16, h); g.lineTo(i * 32 + 16 + h, 0); g.lineTo(i * 32 + h, 0); g.fill(); } });
  T.barrier = ctex(128, 128, (g, w, h) => { fill(g, w, h, '#f1f1ee'); g.fillStyle = '#c9322b'; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, h); g.lineTo(i * 32 + 16, h); g.lineTo(i * 32 + 16 + h, 0); g.lineTo(i * 32 + h, 0); g.fill(); } });
  T.water = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#2b4650'); g.strokeStyle = 'rgba(160,200,210,0.22)'; g.lineWidth = 2; for (let i = 0; i < 18; i++) { const y = Math.random() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y - 8, w * 0.6, y + 8, w, y); g.stroke(); } });
  T.roof = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#3e4550'); for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) { g.fillStyle = (r + c) % 3 ? '#485060' : '#3a414b'; g.fillRect(c * 32 + (r % 2) * 16, r * 16, 30, 14); } });
  T.brick = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#b7a898'); for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) { const v = 120 + Math.random() * 40; g.fillStyle = `rgb(${v + 30},${v - 35},${v - 50})`; g.fillRect(c * 32 + (r % 2) * 16 - 16, r * 16 + 1, 30, 14); } speckle(g, w, h, 1500, '#000', 0.12, 2); });
  T.tile = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#b4b3ab'); for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) { g.fillStyle = (r + c) % 5 ? '#e7e5dc' : '#dfddd3'; g.fillRect(c * 32 + 1, r * 16 + 1, 30, 14); } g.fillStyle = 'rgba(30,70,55,0.55)'; g.fillRect(0, 0, w, 20); });
  T.plaster = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#d2b48a'); speckle(g, w, h, 5000, '#b5966b', 0.4, 2); speckle(g, w, h, 2500, '#e6cfaa', 0.4, 2); g.fillStyle = 'rgba(40,25,15,0.65)'; g.fillRect(40, 70, 44, 70); g.fillRect(160, 70, 44, 70); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 210, w, 46); });
  T.modern = ctex(512, 256, (g, w, h) => { fill(g, w, h, '#9a9da0'); speckle(g, w, h, 3000, '#7d8083', 0.4, 2); for (let r = 0; r < 4; r++) { const gr = g.createLinearGradient(0, r * 64, 0, r * 64 + 50); gr.addColorStop(0, '#5d7487'); gr.addColorStop(1, '#2d3b47'); g.fillStyle = gr; g.fillRect(12, r * 64 + 10, w - 24, 44); g.fillStyle = 'rgba(200,210,220,0.4)'; for (let c = 1; c < 6; c++) g.fillRect(c * 85, r * 64 + 10, 3, 44); } });
  T.modernLit = ctex(512, 256, (g, w, h) => { fill(g, w, h, '#000'); for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) if (Math.random() < 0.4) { g.fillStyle = '#ffdca6'; g.fillRect(c * 85 + 4, r * 64 + 10, 80, 44); } });
  T.facade = windowsTex(false, false); T.facadeLit = windowsTex(true, false); T.facadeBal = windowsTex(false, true); T.facadeBalLit = windowsTex(true, true); T.shop = shopTex();
  T.fence = ctex(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#1e2a25'; g.fillRect(0, 8, w, 8); g.fillRect(0, h - 26, w, 6); for (let i = 0; i < 16; i++) { g.fillRect(i * 16 + 6, 6, 4, h - 6); g.beginPath(); g.moveTo(i * 16 + 4, 6); g.lineTo(i * 16 + 8, -2); g.lineTo(i * 16 + 12, 6); g.fill(); } });
  T.glyph = ctex(256, 256, (g, w, h) => { fill(g, w, h, '#77726a'); speckle(g, w, h, 4000, '#55514a', 0.5, 3); g.strokeStyle = 'rgba(25,30,40,0.75)'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 56, 0.4, 6.0); g.stroke(); g.beginPath(); g.arc(128, 128, 30, 3.6, 9.4); g.stroke(); });
  T.phase = ctex(64, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(150,200,255,${0.06 + (i % 3) * 0.06})`; g.fillRect(0, i * 10, w, 4); } g.fillStyle = 'rgba(180,220,255,0.35)'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); });

  const rm = (t: THREE.Texture, key: string) => { const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.92, metalness: 0 }); roadMats.push(m); M[key] = m; };
  rm(T.asphaltWide, 'road'); rm(T.asphaltNarrow, 'roadN'); rm(T.dirt, 'dirtRoad'); rm(T.snowRoad, 'snowRoad'); rm(T.concrete, 'slab');
  const nm = (tx: THREE.Texture, lit: THREE.Texture, color: number, key: string) => { const m = new THREE.MeshLambertMaterial({ map: tx, color, emissive: 0xffffff, emissiveMap: lit, emissiveIntensity: 0 }); nightMats.push(m); M[key] = m; };
  [0xffffff, 0xf3e6cc, 0xe3dacb, 0xd9d3cb].forEach((c, i) => { nm(T.facade, T.facadeLit, c, 'facade' + i); nm(T.facadeBal, T.facadeBalLit, c, 'facadeBal' + i); });
  [0xffffff, 0xd4dde0].forEach((c, i) => nm(T.modern, T.modernLit, c, 'modern' + i));
  M.shop = lam(T.shop); M.roof = lam(T.roof); M.brick0 = lam(T.brick); M.brick1 = lam(T.brick, 0xd9c2b8); M.plaster = lam(T.plaster); M.tile = lam(T.tile);
  M.sidewalk = lam(T.pavers); M.grass = lam(T.grass); M.snow = lam(T.snow); M.sand = lam(T.sand); M.rock = lam(T.rock); M.wood = lam(T.wood); M.metal = lam(T.metal);
  M.concreteWall = lam(T.concrete); M.hazard = lam(T.hazard); M.barrier = lam(T.barrier);
  M.water = lam(T.water, 0xffffff, 'w', { transparent: true, opacity: 0.93 });
  M.fence = lam(T.fence, 0xffffff, 'f', { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  M.glass = lam(null, 0x3b4b5a, 'glass'); M.iron = paint(0x2a2d2f); M.ironGreen = paint(0x2f4a3c); M.tire = paint(0x1a1a1b); M.white = paint(0xe8e8e4); M.stone = paint(0xcbc3b2);
  M.lampGlow = new THREE.MeshBasicMaterial({ color: 0xe2ddc8 }); M.ceilLight = new THREE.MeshBasicMaterial({ color: 0xdfe6e2 });
  M.pit = paint(0x0b0c0d); M.steel = paint(0x7f868b); M.dark = paint(0x25282b);
}

export function applyAtmosphere(a: AtmoDef): void {
  for (const m of roadMats) { m.roughness = a.wet ? 0.42 : 0.92; m.metalness = a.wet ? 0.18 : 0; m.color.setHex(a.wet ? 0xa9adb3 : 0xffffff); }
  for (const m of nightMats) m.emissiveIntensity = a.night ? 1.0 : 0;
  (M.lampGlow as THREE.MeshBasicMaterial).color.setHex(a.night ? 0xffe0a0 : 0xd8d3bf);
}

// ---------- Geometry batch (merges static geometry per material) ----------
function scaleBoxUV(g: THREE.BufferGeometry, w: number, h: number, d: number, tw: number, th: number): void {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let f = 0; f < 6; f++) {
    const su = f < 2 ? d / tw : f < 4 ? w / tw : w / tw; const sv = f < 2 ? h / th : f < 4 ? d / th : h / th;
    for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * su, uv.getY(k) * sv); }
  }
}

const _m = new THREE.Matrix4(); const _q = new THREE.Quaternion(); const _e = new THREE.Euler(); const _v = new THREE.Vector3(); const _s = new THREE.Vector3();
export interface BoxOpt { ry?: number; rx?: number; rz?: number; tile?: [number, number] }

export class Batch {
  private map = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(mat: THREE.Material, geo: THREE.BufferGeometry, x: number, y: number, z: number, o: BoxOpt = {}, sx = 1, sy = 1, sz = 1): void {
    _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_v, _q, _s);
    let g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(_m);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    let arr = this.map.get(mat); if (!arr) { arr = []; this.map.set(mat, arr); } arr.push(g); g = null as unknown as THREE.BufferGeometry;
  }
  box(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, o: BoxOpt = {}): void {
    const g = new THREE.BoxGeometry(w, h, d); if (o.tile) scaleBoxUV(g, w, h, d, o.tile[0], o.tile[1]); this.add(mat, g, x, y + h / 2, z, o); g.dispose();
  }
  cyl(mat: THREE.Material, rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 8, o: BoxOpt = {}): void {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg); this.add(mat, g, x, y + h / 2, z, o); g.dispose();
  }
  sph(mat: THREE.Material, r: number, x: number, y: number, z: number, sy = 1, ws = 8, hs = 6): void {
    const g = new THREE.SphereGeometry(r, ws, hs); this.add(mat, g, x, y, z, {}, 1, sy, 1); g.dispose();
  }
  cone(mat: THREE.Material, r: number, h: number, x: number, y: number, z: number, seg = 7): void {
    const g = new THREE.ConeGeometry(r, h, seg); this.add(mat, g, x, y + h / 2, z); g.dispose();
  }
  // truncated pyramid (mansard) w x d at base, top scaled by k
  frustum(mat: THREE.Material, w: number, d: number, h: number, k: number, x: number, y: number, z: number, o: BoxOpt = {}): void {
    const g = new THREE.CylinderGeometry(0.7071 * k, 0.7071, 1, 4, 1); g.rotateY(Math.PI / 4); this.add(mat, g, x, y + h / 2, z, o, w, h, d); g.dispose();
  }
  // gable prism: width w (x), depth d (z), height h
  prism(mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, o: BoxOpt = {}): void {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); this.add(mat, g, x, y, z, o); g.dispose();
  }
  isEmpty(): boolean { return this.map.size === 0; }
  build(castShadow = false, receiveShadow = false): THREE.Group {
    const grp = new THREE.Group();
    this.map.forEach((geos, mat) => {
      const merged = mergeGeometries(geos, false); geos.forEach((g) => g.dispose());
      if (!merged) return; const mesh = new THREE.Mesh(merged, mat); mesh.userData.own = true; mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow; grp.add(mesh);
    });
    this.map.clear(); return grp;
  }
}

export function disposeGroup(o: THREE.Object3D): void {
  o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh && m.userData.own) m.geometry.dispose(); const t = c.userData.tex as THREE.Texture | undefined; if (t) t.dispose(); });
}

// ---------- Text / label textures ----------
const textCache = new Map<string, THREE.CanvasTexture>();
export function textTex(key: string, w: number, h: number, draw: (g: Ctx2, w: number, h: number) => void): THREE.CanvasTexture {
  let t = textCache.get(key); if (!t) { t = ctex(w, h, draw); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; textCache.set(key, t); } return t;
}
export function wrap(g: Ctx2, text: string, x: number, y: number, maxW: number, lh: number): void {
  const words = text.split(' '); let line = ''; for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); line = wd; y += lh; } else line = t; } g.fillText(line, x, y);
}

export function labelSprite(text: string, color = '#9cc7ff'): THREE.Sprite {
  const tx = textTex('lbl' + text + color, 256, 64, (g, w, h) => {
    g.fillStyle = 'rgba(12,16,22,0.72)'; g.beginPath(); if (typeof g.roundRect === 'function') g.roundRect(4, 8, w - 8, h - 16, 14); else g.rect(4, 8, w - 8, h - 16); g.fill(); g.fillStyle = color; g.font = '700 30px "Oswald","Arial Narrow",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 1);
  });
  tx.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false, fog: false }));
  s.scale.set(1.25, 0.31, 1); s.renderOrder = 20; return s;
}

// ---------- Human rig ----------
export interface Cosmetic { jacket: string; shirt: string; pants: string; shoes: string; pack: string; acc: string }
export interface PoseIn { phase: number; k: number; air: boolean; slide: boolean; dash: boolean; stumble: boolean; dead: boolean; idle: boolean; t: number; vy?: number }

const G = {
  torso: new THREE.BoxGeometry(0.42, 0.58, 0.23), shirt: new THREE.BoxGeometry(0.2, 0.3, 0.02), head: new THREE.SphereGeometry(0.115, 12, 10), hair: new THREE.SphereGeometry(0.122, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  upArm: new THREE.BoxGeometry(0.088, 0.3, 0.088), foreArm: new THREE.BoxGeometry(0.078, 0.28, 0.078), thigh: new THREE.BoxGeometry(0.15, 0.47, 0.15), shin: new THREE.BoxGeometry(0.12, 0.45, 0.12),
  foot: new THREE.BoxGeometry(0.11, 0.07, 0.27), pack: new THREE.BoxGeometry(0.3, 0.38, 0.14), cap: new THREE.CylinderGeometry(0.125, 0.128, 0.07, 10), brim: new THREE.BoxGeometry(0.16, 0.015, 0.11),
  glasses: new THREE.BoxGeometry(0.2, 0.04, 0.03), scarf: new THREE.TorusGeometry(0.11, 0.035, 6, 12), hand: new THREE.SphereGeometry(0.042, 6, 5),
};

export class Human {
  root = new THREE.Group(); hips = new THREE.Group(); torso = new THREE.Group(); head = new THREE.Group();
  armL = new THREE.Group(); armR = new THREE.Group(); foreL = new THREE.Group(); foreR = new THREE.Group();
  legL = new THREE.Group(); legR = new THREE.Group(); shinL = new THREE.Group(); shinR = new THREE.Group();
  private mJ: THREE.MeshLambertMaterial; private mS: THREE.MeshLambertMaterial; private mP: THREE.MeshLambertMaterial; private mSh: THREE.MeshLambertMaterial;
  private mPk: THREE.MeshLambertMaterial; private mSk: THREE.MeshLambertMaterial; private mH: THREE.MeshLambertMaterial;
  private pack: THREE.Mesh; private cap: THREE.Group; private beanie: THREE.Mesh; private glasses: THREE.Mesh; private scarf: THREE.Mesh;
  ghost: boolean; label: THREE.Sprite | null = null; meshes: THREE.Mesh[] = []; ghostMats: THREE.MeshLambertMaterial[] = [];

  constructor(cos: Cosmetic, ghost?: { color: number; opacity: number; label?: string }) {
    this.ghost = !!ghost;
    const mk = (c: string | number) => new THREE.MeshLambertMaterial({ color: c as THREE.ColorRepresentation, ...(ghost ? { transparent: true, opacity: ghost.opacity, depthWrite: false } : {}) });
    this.mJ = mk(cos.jacket); this.mS = mk(cos.shirt); this.mP = mk(cos.pants); this.mSh = mk(cos.shoes); this.mPk = mk(cos.pack === 'none' ? '#444' : cos.pack); this.mSk = mk('#c69a7b'); this.mH = mk('#2b2522');
    if (ghost) { const base = new THREE.Color(ghost.color); this.mJ.color.copy(base); this.mS.color.copy(base).multiplyScalar(1.25); this.mP.color.copy(base).multiplyScalar(0.6); this.mSh.color.copy(base).multiplyScalar(0.45); this.mPk.color.copy(base).multiplyScalar(0.8); this.mSk.color.copy(base).lerp(new THREE.Color(0xffffff), 0.45); this.mH.color.copy(base).multiplyScalar(0.4);
      this.ghostMats = [this.mJ, this.mS, this.mP, this.mSh, this.mPk, this.mSk, this.mH]; }
    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = !ghost; parent.add(m); this.meshes.push(m); return m; };
    this.root.add(this.hips); this.hips.position.y = 0.92; this.hips.add(this.torso);
    add(this.torso, G.torso, this.mJ, 0, 0.3, 0); add(this.torso, G.shirt, this.mS, 0, 0.36, -0.118);
    this.torso.add(this.head); this.head.position.set(0, 0.74, 0); add(this.head, G.head, this.mSk, 0, 0, 0); add(this.head, G.hair, this.mH, 0, 0.01, 0.005);
    this.cap = new THREE.Group(); this.head.add(this.cap); this.cap.position.set(0, 0.075, 0); add(this.cap, G.cap, this.mJ, 0, 0.03, 0); add(this.cap, G.brim, this.mJ, 0, 0.0, -0.12);
    this.beanie = add(this.head, G.hair, this.mP, 0, 0.03, 0.005); this.beanie.scale.set(1.08, 1.12, 1.08);
    this.glasses = add(this.head, G.glasses, this.mH, 0, 0.02, -0.108); this.scarf = add(this.torso, G.scarf, this.mS, 0, 0.6, 0); this.scarf.rotation.x = Math.PI / 2;
    this.pack = add(this.torso, G.pack, this.mPk, 0, 0.32, 0.18);
    for (const s of [-1, 1]) {
      const arm = s < 0 ? this.armL : this.armR; const fore = s < 0 ? this.foreL : this.foreR; this.torso.add(arm); arm.position.set(s * 0.255, 0.52, 0);
      add(arm, G.upArm, this.mJ, 0, -0.15, 0); arm.add(fore); fore.position.y = -0.3; add(fore, G.foreArm, this.mJ, 0, -0.14, 0); add(fore, G.hand, this.mSk, 0, -0.29, 0);
      const leg = s < 0 ? this.legL : this.legR; const shin = s < 0 ? this.shinL : this.shinR; this.hips.add(leg); leg.position.set(s * 0.1, 0, 0);
      add(leg, G.thigh, this.mP, 0, -0.235, 0); leg.add(shin); shin.position.y = -0.47; add(shin, G.shin, this.mP, 0, -0.225, 0); add(shin, G.foot, this.mSh, 0, -0.45, -0.06);
    }
    this.setCosmetic(cos);
    if (ghost?.label) { this.label = labelSprite(ghost.label); this.label.position.set(0, 2.25, 0); this.root.add(this.label); }
  }

  setCosmetic(c: Cosmetic): void {
    if (!this.ghost) { this.mJ.color.set(c.jacket); this.mS.color.set(c.shirt); this.mP.color.set(c.pants); this.mSh.color.set(c.shoes); if (c.pack !== 'none') this.mPk.color.set(c.pack); }
    this.pack.visible = c.pack !== 'none'; this.cap.visible = c.acc === 'cap'; this.beanie.visible = c.acc === 'beanie'; this.glasses.visible = c.acc === 'glasses'; this.scarf.visible = false;
  }

  setOpacity(o: number): void { this.ghostMats.forEach((m) => { m.opacity = o; }); if (this.label) (this.label.material as THREE.SpriteMaterial).opacity = Math.min(1, o * 1.8); }

  pose(p: PoseIn): void {
    const { phase, k, t } = p; const s = Math.sin(phase); const c = Math.cos(phase);
    let hipsY = 0.92; let lean = 0; let twist = 0;
    let thL = 0, thR = 0, knL = 0, knR = 0, arL = 0.04, arR = 0.04, elL = 0.12, elR = 0.12; let headX = 0; let armZ = 0.06;
    if (p.dead) { hipsY = 0.3; lean = -1.4; thL = 0.25; thR = 0.05; knL = -0.3; knR = -0.2; arL = 1.5; arR = 1.3; elL = 0.3; elR = 0.3; }
    else if (p.slide) { hipsY = 0.27; lean = 1.15; thL = 1.4; thR = 1.3; knL = -0.2; knR = -0.3; arL = -0.9; arR = 0.6; elL = 0.3; elR = 0.4; headX = -0.5; }
    else if (p.stumble) { lean = -0.65; thL = 0.6; thR = -0.3; knL = -0.5; knR = -0.6; arL = 1.1; arR = 0.8; elL = 0.6; elR = 0.7; twist = Math.sin(t * 30) * 0.15; }
    else if (p.air) { lean = -0.14; thL = 0.95; thR = -0.3; knL = -1.3; knR = -0.7; arL = 1.15; arR = -0.6; elL = 0.9; elR = 0.5; }
    else if (p.idle) { const b = Math.sin(t * 1.7); hipsY = 0.92 + b * 0.004; lean = -0.02 + b * 0.012; arL = 0.06 + b * 0.02; arR = 0.06 - b * 0.02; elL = 0.14; elR = 0.14; twist = Math.sin(t * 0.5) * 0.04; }
    else {
      const amp = 0.7 * k + 0.15; thL = s * amp * 1.2; thR = -s * amp * 1.2; knL = -(0.25 + 0.95 * k * Math.max(0, c)); knR = -(0.25 + 0.95 * k * Math.max(0, -c));
      arL = -s * amp * 1.05; arR = s * amp * 1.05; elL = 0.9 + 0.35 * k; elR = 0.9 + 0.35 * k; hipsY = 0.91 + 0.035 * k * Math.cos(phase * 2); lean = -(0.1 + 0.2 * k + (p.dash ? 0.3 : 0)); twist = 0.16 * s * k; headX = -lean * 0.6;
      if (p.dash) { arL -= 0.5; arR -= 0.5; }
    }
    this.hips.position.y = hipsY; this.torso.rotation.set(-lean, twist, 0); this.head.rotation.x = headX * 0.6;
    this.legL.rotation.x = thL; this.legR.rotation.x = thR; this.shinL.rotation.x = knL; this.shinR.rotation.x = knR;
    this.armL.rotation.set(arL, 0, armZ); this.armR.rotation.set(arR, 0, -armZ); this.foreL.rotation.x = elL; this.foreR.rotation.x = elR;
  }
}

// ---------- NPC pedestrian (light) ----------
const NG = { torso: new THREE.BoxGeometry(0.46, 0.62, 0.26), head: new THREE.SphereGeometry(0.12, 8, 6), leg: new THREE.BoxGeometry(0.15, 0.88, 0.15) };
const NPC_JACKETS = [0x7a5a4a, 0x4a5d73, 0x8a8f94, 0x6e3b3b, 0x3f5b4a, 0xb5a27a, 0x2f3338, 0x9b7fa0];
const NPC_PANTS = [0x2a2d34, 0x4c5460, 0x6a5a48, 0x1f2328];
export class Npc {
  root = new THREE.Group(); legL = new THREE.Group(); legR = new THREE.Group(); still = false; speed = 1.2; dir = 1; baseX = 0; d = 0; phase = Math.random() * 6; cyc = false;
  constructor(seed: number) {
    const r = mulberry32(seed); const j = lam(null, NPC_JACKETS[Math.floor(r() * NPC_JACKETS.length)]); const p = lam(null, NPC_PANTS[Math.floor(r() * NPC_PANTS.length)]); const sk = lam(null, r() > 0.5 ? 0xc79c7d : 0x8d6a52);
    const t = new THREE.Mesh(NG.torso, j); t.position.y = 1.2; const h = new THREE.Mesh(NG.head, sk); h.position.y = 1.64; this.root.add(t, h);
    for (const s of [-1, 1]) { const leg = s < 0 ? this.legL : this.legR; leg.position.set(s * 0.1, 0.9, 0); const m = new THREE.Mesh(NG.leg, p); m.position.y = -0.44; leg.add(m); this.root.add(leg); }
    this.root.scale.setScalar(0.95 + r() * 0.12);
  }
  animate(dt: number): void { if (this.still) { this.legL.rotation.x = 0; this.legR.rotation.x = 0; return; } this.phase += dt * 5.2; const s = Math.sin(this.phase) * 0.5; this.legL.rotation.x = s; this.legR.rotation.x = -s; }
}
