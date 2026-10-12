// LOOPBREAK — obstacle, mechanism, clue and collectible models. Each obstacle model is merged to ~3 meshes.
import * as THREE from 'three';
import { Batch, Human, M, T, lam, paint, textTex, wrap, type Cosmetic } from './gfx';

export const LABEL_COLOR: Record<string, number> = { A: 0xf2a93b, B: 0x4da3ff, C: 0x59c98a, D: 0xe36459, E: 0xc9a0ff, R: 0xb98cf0, G: 0xb98cf0, 'Ω': 0xf4f4f4 };
export const labelColor = (l: string): number => LABEL_COLOR[l] ?? 0xd0d0d0;
const CAR_COLORS = [0x2f4b6e, 0x8c2f2f, 0xe3e2dc, 0x1f2124, 0x6b7176, 0xc7c2b2, 0x3d5a45, 0x9a7a3a];

function vehicle(b: Batch, w: number, h: number, l: number, color: number, kind: string): void {
  const body = paint(color); const bottom = 0.26;
  if (kind === 'bus' || kind === 'van') {
    const bh = h - bottom; b.box(body, w, bh, l, 0, bottom, 0); b.box(M.glass, w + 0.02, bh * 0.3, l * 0.86, 0, bottom + bh * 0.52, 0);
    b.box(M.white, w + 0.01, 0.12, l * 0.98, 0, bottom + bh * 0.4, 0); b.box(M.dark, w * 0.96, 0.08, l, 0, h - 0.03, 0);
  } else if (kind === 'truck') {
    b.box(body, w, h * 0.62, l * 0.26, 0, bottom, -l * 0.37); b.box(M.glass, w + 0.02, h * 0.2, l * 0.2, 0, bottom + h * 0.28, -l * 0.39);
    b.box(paint(0xc9ccd0), w, h - bottom, l * 0.68, 0, bottom, l * 0.16, { tile: [2, 1] }); b.box(M.dark, w * 0.9, 0.12, l * 0.7, 0, bottom - 0.05, l * 0.15);
  } else {
    b.box(body, w, h * 0.42, l, 0, bottom, 0); b.box(body, w * 0.9, h * 0.34, l * 0.52, 0, bottom + h * 0.4, l * 0.04);
    b.box(M.glass, w * 0.92, h * 0.26, l * 0.5, 0, bottom + h * 0.44, l * 0.04); b.box(body, w * 0.86, 0.05, l * 0.5, 0, bottom + h * 0.72, l * 0.04);
    if (kind === 'taxi') b.box(paint(0xf3e29a), 0.6, 0.18, 0.28, 0, h - 0.06, l * 0.04);
  }
  b.box(paint(0xf2efe2), w * 0.78, 0.12, 0.05, 0, bottom + 0.2, -l / 2 - 0.01); b.box(paint(0xb02820), w * 0.78, 0.1, 0.05, 0, bottom + 0.2, l / 2 + 0.01);
  for (const sx of [-1, 1]) for (const z of [-0.32, 0.32]) b.cyl(M.tire, 0.33, 0.33, 0.24, sx * (w / 2 - 0.08), 0.21, z * l, 10, { rz: Math.PI / 2 });
}

export function buildModel(id: string, w: number, h: number, l: number, rng: () => number): THREE.Group {
  const b = new Batch(); const cc = CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)];
  switch (id) {
    case 'car': vehicle(b, w, h, l, cc, 'car'); break;
    case 'taxi': vehicle(b, w, h, l, 0xd4a72c, 'taxi'); break;
    case 'van': vehicle(b, w, h, l, 0xe6e6e1, 'van'); break;
    case 'bus': vehicle(b, w, h, l, 0x2d5f8f, 'bus'); break;
    case 'truck': vehicle(b, w, h, l, 0xb8452f, 'truck'); break;
    case 'wreck': vehicle(b, w, h, l, 0x7b5a45, 'car'); b.box(paint(0x5b3a22), w * 0.6, 0.06, l * 0.4, 0, h * 0.78, 0); break;
    case 'snowcar': vehicle(b, w, h, l, cc, 'car'); b.box(M.white, w * 0.92, 0.14, l * 0.55, 0, h - 0.04, 0); b.box(M.white, w, 0.1, l, 0, h * 0.68, 0); break;
    case 'barrier':
      b.box(M.barrier, w * 0.92, 0.42, 0.07, 0, 0.5, 0, { tile: [1.2, 0.6] }); for (const s of [-1, 1]) { b.box(M.iron, 0.07, 0.58, 0.42, s * (w / 2 - 0.25), 0, 0); }
      b.box(paint(0xffa81f), 0.16, 0.12, 0.16, -w / 2 + 0.3, 0.92, 0); break;
    case 'bench':
      b.box(M.wood, w * 0.9, 0.08, 0.5, 0, 0.46, 0); b.box(M.wood, w * 0.9, 0.42, 0.06, 0, 0.56, 0.22); for (const s of [-1, 1]) b.box(M.iron, 0.08, 0.46, 0.5, s * (w * 0.4), 0, 0); break;
    case 'cones': for (let i = 0; i < 3; i++) { const x = (i - 1) * 0.6; b.box(M.dark, 0.42, 0.04, 0.42, x, 0, 0); b.cone(paint(0xf0661b), 0.19, 0.78, x, 0.04, 0, 8); b.cyl(M.white, 0.12, 0.14, 0.1, x, 0.32, 0, 8); } break;
    case 'crates': for (let i = 0; i < 2; i++) b.box(M.wood, 0.95, 0.95, 0.95, (i - 0.5) * 1.0, 0, (i - 0.5) * 0.15, { tile: [0.95, 0.95] }); b.box(M.wood, 0.9, 0.12, 0.9, -0.5, 0.95, 0); break;
    case 'cart': b.box(M.wood, w * 0.75, 0.5, 1.1, 0, 0.32, 0); b.box(paint(0xb9372c), w * 0.75, 0.28, 0.5, 0, 0.82, 0.28); b.cyl(M.tire, 0.2, 0.2, 0.08, -0.7, 0, 0.45, 8, { rz: Math.PI / 2 }); b.cyl(M.tire, 0.2, 0.2, 0.08, 0.7, 0, 0.45, 8, { rz: Math.PI / 2 }); break;
    case 'log': b.cyl(lam(T.wood, 0x8a6a4a), 0.42, 0.45, w * 0.95, 0, 0.42, 0, 9, { rz: Math.PI / 2 }); b.cyl(lam(T.wood, 0x6d553b), 0.08, 0.1, 0.8, 0.4, 0.7, 0.1, 5, { rz: 0.6 }); break;
    case 'barrels': for (let i = 0; i < 4; i++) b.cyl(paint(i % 2 ? 0x7a3c2a : 0x355a7a), 0.36, 0.36, 1.0, ((i % 2) - 0.5) * 0.85, 0, (i >> 1) * 0.8 - 0.4, 10); break;
    case 'snowdrift': b.sph(M.snow, 1.15, 0, 0.05, 0, 0.68, 10, 6); b.sph(M.snow, 0.8, 0.7, 0.05, 0.3, 0.6, 8, 6); break;
    case 'beam':
      for (const s of [-1, 1]) b.cyl(M.iron, 0.07, 0.07, 2.3, s * (w / 2 - 0.05), 0, 0, 6);
      b.box(M.hazard, w, 0.4, 0.22, 0, 1.3, 0, { tile: [1.2, 0.4] }); break;
    case 'pipe':
      for (const s of [-1, 1]) b.cyl(M.steel, 0.06, 0.06, 2.4, s * (w / 2 - 0.05), 0, 0, 6);
      b.cyl(M.steel, 0.06, 0.06, w, 0, 1.4, 0, 6, { rz: Math.PI / 2 }); b.cyl(M.hazard, 0.08, 0.08, w, 0, 1.62, 0.1, 6, { rz: Math.PI / 2 }); break;
    case 'sign': {
      for (const s of [-1, 1]) b.cyl(M.iron, 0.04, 0.04, 2.4, s * (w / 2 - 0.05), 0, 0, 6);
      const tx = textTex('ROADCLOSED', 256, 96, (g, ww, hh) => { g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, ww, hh); g.fillStyle = '#c9322b'; g.fillRect(0, 0, ww, 10); g.fillRect(0, hh - 10, ww, 10); g.fillStyle = '#1b1b1b'; g.font = '700 44px Oswald, Arial Narrow, sans-serif'; g.textAlign = 'center'; g.fillText('ROAD CLOSED', ww / 2, 62); });
      b.box(lam(tx, 0xffffff, 'sign'), w * 0.9, 0.7, 0.07, 0, 1.3, 0); break; }
    case 'branch': b.cyl(lam(T.wood, 0x5d4530), 0.14, 0.2, w + 2, 0, 1.45, 0, 6, { rz: Math.PI / 2 }); for (let i = 0; i < 4; i++) b.sph(paint(0x3f6a34), 0.6, (i - 1.5) * 0.9, 1.6, 0, 0.7, 7, 5);
      for (const s of [-1, 1]) b.cyl(lam(T.wood, 0x5d4530), 0.22, 0.3, 2.4, s * (w / 2 + 0.9), 0, 0, 6); break;
    case 'barricade':
      b.box(M.hazard, w * 0.96, 0.5, 0.12, 0, 1.15, 0, { tile: [1.2, 0.5] }); b.box(M.barrier, w * 0.96, 0.5, 0.12, 0, 0.55, 0, { tile: [1.2, 0.5] });
      for (const s of [-1, 1]) b.box(M.iron, 0.12, 1.9, 0.5, s * (w / 2 - 0.1), 0, 0); b.box(paint(0xffa81f), 0.2, 0.14, 0.2, 0, 1.92, 0); break;
    case 'container': b.box(lam(T.metal, [0x9b3d2f, 0x2f5d8a, 0x3a6b4a, 0xb08a2f][Math.floor(rng() * 4)]), w, h, l, 0, 0, 0, { tile: [2, 2] }); b.box(M.dark, w + 0.03, 0.1, l + 0.03, 0, 0.0, 0); b.box(M.dark, w + 0.03, 0.1, l + 0.03, 0, h - 0.1, 0); break;
    case 'excavator':
      b.box(M.dark, w, 0.55, l * 0.75, 0, 0, l * 0.1); b.box(paint(0xe0a526), w * 0.85, 0.9, l * 0.4, 0, 0.55, l * 0.2); b.box(M.glass, w * 0.7, 0.7, 0.7, 0, 1.45, -0.1);
      b.box(paint(0xe0a526), 0.35, 0.35, l * 0.62, 0, 1.6, -l * 0.3, { rx: -0.35 }); b.box(paint(0xc78a18), 0.5, 0.6, 0.8, 0, 0.75, -l * 0.52); break;
    case 'boulder': b.add(M.rock, new THREE.IcosahedronGeometry(1, 0), 0, h * 0.4, 0, { ry: rng() * 3 }, w * 0.52, h * 0.52, l * 0.46); b.add(M.rock, new THREE.IcosahedronGeometry(1, 0), w * 0.25, h * 0.2, l * 0.2, { ry: 1 }, w * 0.3, h * 0.3, l * 0.3); break;
    case 'ruin': b.box(M.stone, w, h * 0.7, l, 0, 0, 0, { tile: [2, 2] }); b.box(M.stone, w * 0.4, h * 0.3, l, -w * 0.25, h * 0.7, 0); b.box(M.stone, w * 0.25, h * 0.15, l * 0.8, w * 0.25, h * 0.7, 0); break;
    case 'train':
      b.box(paint(0x46668a), w, h - 0.5, l, 0, 0.5, 0); b.box(M.glass, w + 0.03, 0.8, l * 0.94, 0, 1.6, 0); b.box(M.white, w + 0.02, 0.2, l, 0, 1.15, 0); b.box(M.dark, w, 0.5, l, 0, 0, 0);
      for (let i = -3; i <= 3; i++) b.box(M.dark, w + 0.05, h - 0.6, 0.12, 0, 0.5, i * (l / 7)); break;
    case 'rampUp': case 'rampDown': {
      const th = Math.atan2(h, l); const hyp = Math.sqrt(h * h + l * l); const sgn = id === 'rampUp' ? 1 : -1;
      b.box(M.wood, w, 0.16, hyp, 0, h / 2 - 0.08, 0, { rx: sgn * th, tile: [1.2, 1.2] });
      for (const s of [-1, 1]) b.box(M.hazard, 0.12, 0.2, hyp, s * (w / 2 - 0.06), h / 2 - 0.1, 0, { rx: sgn * th, tile: [0.4, 0.4] });
      b.box(M.dark, w * 0.9, h * 0.5, 0.2, 0, 0, sgn > 0 ? l / 2 - 0.1 : -l / 2 + 0.1); break; }
    case 'flatbed':
      b.box(lam(T.metal, 0x5d6d7c), w, h, l, 0, 0, 0, { tile: [2, 2] }); b.box(M.hazard, w, 0.05, l, 0, h, 0, { tile: [1.2, 1.2] }); b.box(M.dark, w + 0.05, 0.12, l + 0.05, 0, 0, 0);
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) b.box(M.steel, 0.08, 0.3, 0.08, s * (w / 2 - 0.04), h + 0.05, -l / 2 + 0.6 + i * ((l - 1.2) / 4)); break;
    default: b.box(M.concreteWall, w, h, l, 0, 0, 0);
  }
  const g = b.build(true, false); return g;
}

// ---------- mechanisms ----------
function letterMat(label: string, color: number): THREE.MeshBasicMaterial {
  const hex = '#' + color.toString(16).padStart(6, '0');
  const tx = textTex('let' + label + color, 128, 128, (g, w, h) => { g.fillStyle = '#14181c'; g.beginPath(); g.arc(w / 2, h / 2, 58, 0, 7); g.fill(); g.strokeStyle = hex; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, h / 2, 52, 0, 7); g.stroke(); g.fillStyle = hex; g.font = '700 70px Oswald, Arial Narrow, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, w / 2, h / 2 + 4); });
  return new THREE.MeshBasicMaterial({ map: tx, transparent: true });
}

export interface GateVis { group: THREE.Group; door: THREE.Object3D; lamps: THREE.MeshBasicMaterial[]; openY: number; phaseMat?: THREE.MeshBasicMaterial }
export function laneRange(lanes: number[], all = 6.2): [number, number] {
  if (lanes.length >= 3) return [-all, all];
  const lo = Math.min(...lanes); const hi = Math.max(...lanes); return [(lo - 1) * 2.4 - 1.2, (hi - 1) * 2.4 + 1.2];
}

export function buildGate(label: string, kind: string, lanes: number[], len: number): GateVis {
  const g = new THREE.Group(); const col = labelColor(label); const [x0, x1] = laneRange(lanes); const w = x1 - x0; const cx = (x0 + x1) / 2;
  const lamps: THREE.MeshBasicMaterial[] = [];
  const door = new THREE.Group(); g.add(door);
  if (kind === 'phase') {
    const bt = new Batch(); for (const s of [x0, x1]) { bt.box(M.steel, 0.3, 3.8, 0.3, s, 0, 0); } bt.box(M.steel, w, 0.25, 0.3, cx, 3.7, 0); g.add(bt.build(false, false));
    const mat = new THREE.MeshBasicMaterial({ map: T.phase, color: 0x9fd0ff, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.6), mat); p.position.set(cx, 1.85, 0); door.add(p);
    return { group: g, door, lamps, openY: 0, phaseMat: mat };
  }
  const b = new Batch();
  if (kind === 'secret') {
    b.box(lam(T.glyph), w, 3.2, Math.max(len, 1), cx, 0, 0, { tile: [2.4, 2.4] }); door.add(b.build(true, false));
    const lm = new THREE.MeshBasicMaterial({ color: 0xff5a3c }); lamps.push(lm); const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.05), lm); m.position.set(cx, 2.4, len / 2 + 0.06); g.add(m);
    return { group: g, door, lamps, openY: -3.4 };
  }
  for (const s of [x0 - 0.3, x1 + 0.3]) { b.box(M.dark, 0.6, 4.3, 0.7, s, 0, 0); b.box(M.hazard, 0.62, 0.6, 0.72, s, 0, 0, { tile: [0.6, 0.6] }); }
  b.box(M.dark, w + 1.2, 0.6, 0.7, cx, 3.75, 0); g.add(b.build(true, false));
  const db = new Batch(); db.box(M.metal, w, 3.45, 0.22, cx, 0, 0, { tile: [3, 3] }); db.box(M.hazard, w, 0.3, 0.26, cx, 0, 0, { tile: [1.2, 0.3] }); door.add(db.build(true, false));
  for (const s of [x0 - 0.3, x1 + 0.3]) { const lm = new THREE.MeshBasicMaterial({ color: 0xd93b2e }); lamps.push(lm); const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.12), lm); m.position.set(s, 4.5, 0.36); g.add(m); }
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), letterMat(label, col)); pl.position.set(cx, 3.75, 0.37); g.add(pl);
  return { group: g, door, lamps, openY: 3.5 };
}

export interface PlateVis { group: THREE.Group; lamp: THREE.MeshBasicMaterial; ring: THREE.MeshBasicMaterial }
export function buildPlate(label: string): PlateVis {
  const g = new THREE.Group(); const b = new Batch(); const col = labelColor(label);
  b.box(M.dark, 2.1, 0.07, 2.1, 0, 0, 0); b.box(M.steel, 1.8, 0.09, 1.8, 0, 0, 0); g.add(b.build(false, true));
  const lamp = new THREE.MeshBasicMaterial({ color: col }); const ring = new THREE.MeshBasicMaterial({ color: 0x3b3f44 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.02, 20), ring); disc.position.y = 0.105; g.add(disc);
  const lampM = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.82, 24), lamp); lampM.rotation.x = -Math.PI / 2; lampM.position.y = 0.12; g.add(lampM);
  const lt = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), letterMat(label, col)); lt.rotation.x = -Math.PI / 2; lt.position.y = 0.125; g.add(lt);
  return { group: g, lamp, ring };
}

export function buildCable(len: number, color: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, len), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 })); m.rotation.x = -Math.PI / 2; m.position.y = 0.035; return m;
}

export interface LeverVis { group: THREE.Group; handle: THREE.Group; lamp: THREE.MeshBasicMaterial }
export function buildLever(label: string, radio: boolean): LeverVis {
  const g = new THREE.Group(); const b = new Batch(); const col = labelColor(label);
  b.box(M.dark, 0.7, 0.14, 0.7, 0, 0, 0); b.box(M.steel, 0.3, 1.1, 0.3, 0, 0.14, 0);
  if (radio) { b.box(paint(0x2f3a3f), 0.62, 0.36, 0.3, 0, 1.24, 0); b.cyl(M.steel, 0.012, 0.012, 0.7, 0.22, 1.6, 0, 4); b.box(paint(0xc8b98c), 0.36, 0.16, 0.02, -0.04, 1.32, 0.16); } else b.box(M.dark, 0.5, 0.36, 0.12, 0, 1.0, 0.18);
  g.add(b.build(true, false));
  const handle = new THREE.Group(); handle.position.set(0, 1.1, 0.26); g.add(handle);
  if (!radio) { const hm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 6), paint(0xb9bec2)); hm.position.y = 0.26; handle.add(hm); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), paint(0xd2452f)); kn.position.y = 0.55; handle.add(kn); }
  const lamp = new THREE.MeshBasicMaterial({ color: 0xd93b2e }); const lm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.05), lamp); lm.position.set(0, 1.42, 0.17); if (!radio) g.add(lm);
  else { lm.position.set(0.2, 1.3, 0.16); g.add(lm); }
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), letterMat(label, col)); pl.position.set(0, 1.85, 0.2); g.add(pl);
  return { group: g, handle, lamp };
}

export interface GuardVis { group: THREE.Group; human: Human; strips: THREE.MeshBasicMaterial[]; stripMeshes: THREE.Mesh[] }
export function buildGuard(len: number, cos: Cosmetic): GuardVis {
  const g = new THREE.Group(); const human = new Human({ ...cos, jacket: '#1e242b', pants: '#15181c', shirt: '#2a3038', shoes: '#0d0d0f', pack: 'none', acc: 'cap' });
  human.root.position.set(5.6, 0, 0); human.root.rotation.y = Math.PI / 2; human.root.scale.setScalar(1.05); g.add(human.root);
  const strips: THREE.MeshBasicMaterial[] = []; const stripMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3b2a, transparent: true, opacity: 0, depthWrite: false }); strips.push(mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, len), mat); m.rotation.x = -Math.PI / 2; m.position.set((i - 1) * 2.4, 0.06, 0); g.add(m); stripMeshes.push(m);
  }
  const post = new Batch(); post.box(M.dark, 0.25, 0.25, 0.25, 6.6, 0, 0); g.add(post.build(false, false));
  return { group: g, human, strips, stripMeshes };
}

export interface GapVis { group: THREE.Group; bridge: THREE.Group }
export function buildGap(len: number): GapVis {
  const g = new THREE.Group(); const b = new Batch(); b.box(M.pit, 12.4, 0.03, len, 0, 0.03, 0); b.box(M.steel, 12.4, 0.12, 0.3, 0, 0, len / 2 + 0.05); b.box(M.steel, 12.4, 0.12, 0.3, 0, 0, -len / 2 - 0.05);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) b.box(M.hazard, 0.5, 0.5, 0.5, s * 5.9, 0, -len / 2 + (i + 0.5) * (len / 4), { tile: [0.5, 0.5] });
  g.add(b.build(false, true));
  const br = new Batch(); br.box(M.steel, 8.4, 0.14, len + 0.4, 0, 0.0, 0); br.box(M.hazard, 8.4, 0.03, 0.3, 0, 0.14, len / 2 + 0.05, { tile: [1, 0.3] }); br.box(M.hazard, 8.4, 0.03, 0.3, 0, 0.14, -len / 2 - 0.05, { tile: [1, 0.3] });
  for (let i = 0; i < 6; i++) br.box(M.dark, 8.4, 0.02, 0.06, 0, 0.145, -len / 2 + (i + 0.5) * (len / 6)); const bridge = br.build(false, true); bridge.visible = false; g.add(bridge);
  return { group: g, bridge };
}

export function buildExit(label: string): THREE.Group {
  const g = new THREE.Group(); const b = new Batch();
  for (const s of [-6.4, 6.4]) b.box(M.dark, 0.8, 5.2, 0.9, s, 0, 0); b.box(M.dark, 13.6, 0.9, 0.9, 0, 5.0, 0);
  g.add(b.build(true, false));
  const tx = textTex('exit' + label, 512, 128, (c, w, h) => { c.fillStyle = '#0f3d2b'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8f3ec'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = '#f2f7f3'; c.font = '700 66px Oswald, Arial Narrow, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, w / 2, h / 2 + 4); });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: tx })); p.position.set(0, 5.0, 0.47); g.add(p);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), new THREE.MeshBasicMaterial({ color: 0xbfe8d0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })); beam.position.set(0, 2.5, 0); g.add(beam);
  return g;
}

// ---------- clue props ----------
export function buildClue(kind: string, title: string, text: string, side: number): THREE.Group {
  const g = new THREE.Group(); const b = new Batch();
  const face = textTex('clue' + kind + title + text, 512, 340, (c, w, h) => {
    if (kind === 'newspaper') { c.fillStyle = '#e9e2cf'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b1b1b'; c.font = '700 46px Georgia, serif'; c.textAlign = 'center'; c.fillText(title || 'GAZETTE', w / 2, 62); c.fillRect(24, 76, w - 48, 3); c.font = '700 38px Georgia, serif'; c.textAlign = 'left'; wrap(c, text, 28, 132, w - 56, 46); c.fillStyle = '#9d978a'; for (let i = 0; i < 5; i++) c.fillRect(28, 250 + i * 16, w - 56 - (i % 2) * 60, 5); }
    else if (kind === 'screen') { c.fillStyle = '#04110a'; c.fillRect(0, 0, w, h); c.fillStyle = '#5fe39a'; c.font = '700 26px "Courier New", monospace'; c.textAlign = 'left'; c.fillText('> ' + (title || 'TERMINAL'), 24, 46); c.font = '700 32px "Courier New", monospace'; c.fillStyle = '#9dffc6'; wrap(c, text, 24, 110, w - 48, 42); }
    else if (kind === 'graffiti') { c.clearRect(0, 0, w, h); c.fillStyle = '#e8e2d2'; c.font = '700 96px "Arial Black", Impact, sans-serif'; c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 6; wrap(c, text, w / 2, 130, w - 40, 100); }
    else if (kind === 'sign') { c.fillStyle = '#6d4e31'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8dcc0'; c.font = '700 40px Georgia, serif'; c.textAlign = 'center'; wrap(c, text, w / 2, 110, w - 60, 52); }
    else { c.fillStyle = '#1a1d21'; c.fillRect(0, 0, w, h); c.fillStyle = '#f0d9a0'; c.font = '700 40px Georgia, serif'; c.textAlign = 'center'; wrap(c, text, w / 2, 120, w - 40, 50); }
  });
  const ry = -side * Math.PI / 3;
  if (kind === 'clock') {
    b.cyl(M.ironGreen, 0.09, 0.12, 3.6, 0, 0, 0, 8); b.cyl(M.ironGreen, 0.42, 0.42, 0.22, 0, 3.4, 0, 16, { rx: Math.PI / 2 }); g.add(b.build(true, false));
    const cv = textTex('clock' + text, 256, 256, (c, w, h) => { c.fillStyle = '#f2efe4'; c.beginPath(); c.arc(w / 2, h / 2, 120, 0, 7); c.fill(); c.strokeStyle = '#1b1b1b'; c.lineWidth = 6; c.stroke(); c.lineWidth = 4; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(w / 2 + Math.sin(a) * 100, h / 2 - Math.cos(a) * 100); c.lineTo(w / 2 + Math.sin(a) * 112, h / 2 - Math.cos(a) * 112); c.stroke(); }
      const [hh, mm] = text.split(':').map(Number); const ha = ((hh % 12) + mm / 60) * Math.PI / 6; const ma = mm * Math.PI / 30; c.lineWidth = 9; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.sin(ha) * 60, h / 2 - Math.cos(ha) * 60); c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.sin(ma) * 92, h / 2 - Math.cos(ma) * 92); c.stroke(); });
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshBasicMaterial({ map: cv })); face.position.set(0, 3.4, 0.12); const grp = new THREE.Group(); grp.add(face); const f2 = face.clone(); f2.rotation.y = Math.PI; f2.position.z = -0.12; grp.add(f2); grp.position.y = 0; g.add(grp);
    g.rotation.y = ry; return g;
  }
  if (kind === 'graffiti') { const p = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2), new THREE.MeshBasicMaterial({ map: face, transparent: true })); p.position.set(0, 2.6, 0); p.rotation.y = -side * Math.PI / 2 + 0; g.add(p); return g; }
  b.box(M.iron, 0.08, 1.0, 0.08, -0.6, 0, 0); b.box(M.iron, 0.08, 1.0, 0.08, 0.6, 0, 0); b.box(M.dark, 1.7, 1.12, 0.1, 0, 0.72, 0); g.add(b.build(true, false));
  const p = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 1.04), new THREE.MeshBasicMaterial({ map: face })); p.position.set(0, 1.28, 0.06); g.add(p);
  if (kind === 'radio') { const r = new Batch(); r.box(paint(0x5a3d2a), 0.55, 0.34, 0.22, 0, 0, 0); r.box(paint(0xc9b98c), 0.3, 0.2, 0.02, -0.06, 0.06, 0.12); g.add(r.build(true, false)); }
  g.rotation.y = ry; return g;
}

// ---------- collectibles ----------
export const COL = {
  coin: { geo: (() => { const g = new THREE.CylinderGeometry(0.27, 0.27, 0.07, 14); g.rotateX(Math.PI / 2); return g; })(), mat: new THREE.MeshStandardMaterial({ color: 0xd9a93a, metalness: 0.35, roughness: 0.4, emissive: 0x4a3409, emissiveIntensity: 0.6 }) },
  shard: { geo: (() => { const g = new THREE.OctahedronGeometry(0.3); g.scale(0.8, 1.45, 0.8); return g; })(), mat: new THREE.MeshStandardMaterial({ color: 0x86d4ff, metalness: 0.1, roughness: 0.25, emissive: 0x1f6a95, emissiveIntensity: 0.7, transparent: true, opacity: 0.92 }) },
  memory: { geo: new THREE.BoxGeometry(0.42, 0.5, 0.03), mat: new THREE.MeshStandardMaterial({ color: 0xf0ede2, emissive: 0x8d8a7c, emissiveIntensity: 0.5, roughness: 0.8 }) },
  recording: { geo: new THREE.BoxGeometry(0.42, 0.28, 0.1), mat: new THREE.MeshStandardMaterial({ color: 0x67c995, emissive: 0x1f6b47, emissiveIntensity: 0.6, roughness: 0.5 }) },
  core: { geo: new THREE.TorusGeometry(0.28, 0.08, 8, 16), mat: new THREE.MeshStandardMaterial({ color: 0xf29a45, emissive: 0x8a3f0a, emissiveIntensity: 0.6, roughness: 0.4 }) },
};
