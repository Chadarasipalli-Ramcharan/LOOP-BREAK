// LOOPBREAK — environment segment builder. Everything static is merged per material for performance.
import * as THREE from 'three';
import { Batch, M, T, lam, paint, mulberry32, Npc } from './gfx';
import { buildModel } from './models';
import type { SegData } from './gen';
import type { SegKind, WorldId } from './data';

const glowBlue = new THREE.MeshBasicMaterial({ color: 0xaecbe0 });
const glowWarm = new THREE.MeshBasicMaterial({ color: 0xffc97a });
const glowRed = new THREE.MeshBasicMaterial({ color: 0xff4a36 });
const AWN = [0x2f5d46, 0x7c2f36, 0x24364f, 0x1f2326, 0xa6842f];
const MET = paint(0x2c5a45); const leafMats = [paint(0x5d7f3d), paint(0x4d7038), paint(0x6d8a45)]; const pineMat = paint(0x2f5a3a); const snowPine = paint(0x8fae9f);
const bark = lam(T.wood, 0x6b5a48); const cactusMat = paint(0x4d7a48); const hedgeMat = paint(0x3f6a34);

interface Prof { road: string; half: number; outer: number; l: string; r: string; ceil?: boolean; ground: string; walk: boolean; narrow?: boolean }

function cityStyle(w: WorldId): string { return w === 'monsoon' ? 'modern' : w === 'dustfall' ? 'adobe' : w === 'frostline' ? 'cabin' : w === 'verdant' ? 'ruins' : w === 'chrono' ? 'core' : 'haussmann'; }
function wildStyle(w: WorldId): string { return w === 'dustfall' ? 'desert' : w === 'frostline' ? 'snowpine' : w === 'verdant' ? 'forest' : w === 'chrono' ? 'core' : 'forest'; }
function groundMat(w: WorldId): string { return w === 'verdant' ? 'grass' : w === 'dustfall' ? 'sand' : w === 'frostline' ? 'snow' : 'concreteWall'; }

function profile(w: WorldId, k: SegKind): Prof {
  const city = cityStyle(w); const g = groundMat(w); const wild = wildStyle(w);
  const wr = w === 'verdant' ? 'dirtRoad' : w === 'dustfall' ? 'dirtRoad' : w === 'frostline' ? 'snowRoad' : w === 'chrono' ? 'slab' : 'road';
  switch (k) {
    case 'street': return { road: w === 'paris' || w === 'monsoon' || w === 'fractured' ? 'road' : wr, half: 6.2, outer: 10.2, l: city, r: city, ground: g, walk: true };
    case 'boulevard': return { road: w === 'paris' || w === 'monsoon' || w === 'fractured' ? 'road' : wr, half: 6.2, outer: 13.5, l: city, r: city, ground: g, walk: true };
    case 'cafe': return { road: 'road', half: 6.2, outer: 11.5, l: city, r: city, ground: g, walk: true };
    case 'metro': return { road: 'road', half: 6.2, outer: 10.2, l: city, r: city, ground: g, walk: true };
    case 'alley': return { road: 'roadN', half: 4.2, outer: 4.5, l: 'alleywall', r: 'alleywall', ground: g, walk: false, narrow: true };
    case 'tunnel': return { road: w === 'paris' || w === 'monsoon' ? 'roadN' : 'slab', half: 4.2, outer: 4.8, l: 'tunnelwall', r: 'tunnelwall', ceil: true, ground: g, walk: false, narrow: true };
    case 'hidden': return { road: 'slab', half: 4.2, outer: 4.8, l: 'stonewall', r: 'stonewall', ceil: true, ground: g, walk: false, narrow: true };
    case 'riverfront': return { road: w === 'paris' || w === 'monsoon' ? 'road' : wr, half: 6.2, outer: 9.5, l: w === 'paris' || w === 'monsoon' || w === 'fractured' ? city : wild, r: w === 'frostline' ? 'ice' : 'water', ground: g, walk: true };
    case 'bridge': return { road: w === 'paris' || w === 'monsoon' ? 'roadN' : 'slab', half: 4.2, outer: 4.6, l: 'parapet', r: 'parapet', ground: g, walk: false, narrow: true };
    case 'park': return { road: 'road', half: 6.2, outer: 9, l: 'park', r: 'park', ground: 'grass', walk: true };
    case 'construction': return { road: 'road', half: 6.2, outer: 10.2, l: 'scaffold', r: 'construction', ground: g, walk: true };
    case 'rooftop': return { road: 'slab', half: 4.2, outer: 4.6, l: 'rooftop', r: 'rooftop', ground: g, walk: false, narrow: true };
    case 'wild': return { road: wr, half: 5, outer: 7, l: wild, r: wild, ground: g, walk: false };
    case 'town': return { road: wr, half: 5.5, outer: 8.5, l: city, r: city, ground: g, walk: false };
    case 'industrial': return { road: w === 'dustfall' ? 'dirtRoad' : w === 'frostline' ? 'slab' : 'road', half: 6.2, outer: 10, l: 'warehouse', r: 'warehouse', ground: g, walk: false };
    case 'rail': return { road: 'dirtRoad', half: 6, outer: 9, l: 'warehouse', r: 'adobe', ground: g, walk: false };
    case 'fracture': return { road: 'road', half: 6.2, outer: 10.2, l: 'fracture', r: 'fracture', ground: g, walk: true };
    case 'core': return { road: 'slab', half: 5.5, outer: 8, l: 'core', r: 'core', ground: g, walk: false };
  }
}

function splitLen(len: number, rng: () => number, min: number, max: number): number[] {
  const parts: number[] = []; let rem = len; while (rem > max + min) { const p = min + rng() * (max - min); parts.push(p); rem -= p; } parts.push(rem); return parts;
}

function lampPost(b: Batch, x: number, z: number, s: number, dark = false): void {
  b.cyl(M.ironGreen, 0.07, 0.11, 4.6, x, 0, z, 6); b.box(M.ironGreen, 0.9, 0.07, 0.07, x - s * 0.4, 4.45, z); b.box(M.lampGlow, 0.3, 0.14, 0.3, x - s * 0.85, 4.3, z); b.box(M.ironGreen, 0.2, 0.05, 0.2, x - s * 0.85, 4.46, z);
  if (dark) b.box(M.dark, 0.3, 0.3, 0.3, x, 0, z);
}
function tree(b: Batch, x: number, z: number, kind: string, rng: () => number): void {
  const sc = 0.8 + rng() * 0.6;
  if (kind === 'pine' || kind === 'snowpine') { const m = kind === 'snowpine' ? snowPine : pineMat; b.cyl(bark, 0.2 * sc, 0.3 * sc, 2.2 * sc, x, 0, z, 6); for (let i = 0; i < 3; i++) b.cone(m, (2.3 - i * 0.55) * sc, 2.6 * sc, x, (1.6 + i * 1.5) * sc, z, 7); if (kind === 'snowpine') b.cone(M.snow, 0.6 * sc, 0.9 * sc, x, 5.6 * sc, z, 6); }
  else if (kind === 'dead') { b.cyl(bark, 0.14 * sc, 0.26 * sc, 3.6 * sc, x, 0, z, 5); b.cyl(bark, 0.06, 0.1, 1.6, x + 0.6, 2.4 * sc, z, 4, { rz: -0.9 }); b.cyl(bark, 0.05, 0.09, 1.4, x - 0.5, 2.8 * sc, z, 4, { rz: 0.8 }); }
  else if (kind === 'cactus') { b.cyl(cactusMat, 0.26 * sc, 0.3 * sc, 2.6 * sc, x, 0, z, 7); b.cyl(cactusMat, 0.16, 0.18, 0.9, x + 0.55, 1.0 * sc, z, 6); b.cyl(cactusMat, 0.14, 0.16, 0.8, x - 0.5, 1.4 * sc, z, 6); }
  else { b.cyl(bark, 0.17 * sc, 0.26 * sc, 3.4 * sc, x, 0, z, 6); const lm = leafMats[Math.floor(rng() * 3)]; b.sph(lm, 2.2 * sc, x, 5.0 * sc, z, 0.85, 8, 6); b.sph(lm, 1.5 * sc, x + 0.9 * sc, 4.3 * sc, z + 0.5, 0.85, 7, 5); }
}

function facadeBlock(b: Batch, s: number, xIn: number, cz: number, bw: number, rng: () => number, floors: number, shops: boolean, slant = 0): void {
  const depth = 14; const cx = s * (xIn + depth / 2); const t = Math.floor(rng() * 4); const gh = 4.2; const o = slant ? { rz: slant } : {};
  b.box(shops ? M.shop : M['facade' + t], depth, gh, bw, cx, 0, cz, { tile: [12.8, shops ? gh : 3.4], ...o });
  b.box(M['facadeBal' + t], depth, 3.4, bw, cx, gh, cz, { tile: [12.8, 3.4], ...o });
  const mid = floors - 3; if (mid > 0) b.box(M['facade' + t], depth, 3.4 * mid, bw, cx, gh + 3.4, cz, { tile: [12.8, 3.4], ...o });
  const topY = gh + 3.4 * (mid + 1); b.box(M['facadeBal' + t], depth, 3.4, bw, cx, topY, cz, { tile: [12.8, 3.4], ...o });
  const roofY = topY + 3.4; b.box(M.stone, depth + 0.3, 0.3, bw, cx, roofY - 0.15, cz, o); b.box(M.stone, depth + 0.25, 0.22, bw, cx, gh - 0.1, cz, o);
  b.frustum(M.roof, depth * 0.97, bw * 0.97, 3.0, 0.8, cx, roofY, cz, o);
  for (let i = 0; i < 2; i++) b.box(M.stone, 0.9, 2.2, 0.9, cx + (rng() - 0.5) * 6, roofY + 2.2, cz + (rng() - 0.5) * (bw - 3), o);
  if (shops) b.box(paint(AWN[Math.floor(rng() * AWN.length)]), 1.3, 0.1, bw * 0.7, s * (xIn - 0.65), 3.0, cz, { rz: s * 0.22 });
}

function sideStyle(b: Batch, style: string, s: number, xIn: number, d0: number, d1: number, rng: () => number, _world: WorldId, kind: SegKind, gaps: number[] = []): void {
  const len = d1 - d0; const zc = -(d0 + d1) / 2; const Z = (d: number) => -d;
  switch (style) {
    case 'haussmann': case 'fracture': {
      let d = d0; const tall = kind === 'boulevard' ? 1 : 0; const frac = style === 'fracture';
      for (const bw of splitLen(len, rng, 11, 18)) {
        if (gaps.some((g) => d < g + 6 && d + bw > g - 6)) { d += bw; continue; } // cross street opening
        const cz = Z(d + bw / 2); const fl = 5 + tall + (rng() < 0.4 ? 1 : 0); const slant = frac ? (rng() - 0.5) * 0.22 : 0;
        facadeBlock(b, s, xIn + (frac ? rng() * 2 : 0), cz, bw, rng, fl, !frac || rng() < 0.6, slant);
        if (frac) { const t = Math.floor(rng() * 4); b.box(M['facadeBal' + t], 10, 3.4 * 3, bw * 0.8, s * (xIn + 6 + rng() * 3), 26 + rng() * 10, cz, { tile: [12.8, 3.4], rz: (rng() - 0.5) * 0.6, ry: (rng() - 0.5) * 0.5 }); b.box(paint(0xcfd4d8), 1.6, 1.6, 1.6, s * (xIn - 0.5 + rng() * 2), 6 + rng() * 14, Z(d + rng() * bw), { rx: rng(), rz: rng() }); }
        d += bw;
      }
      break; }
    case 'modern': { let d = d0; for (const bw of splitLen(len, rng, 13, 22)) { if (gaps.some((g) => d < g + 6 && d + bw > g - 6)) { d += bw; continue; } const H = 16 + rng() * 22; const t = Math.floor(rng() * 2); const cz = Z(d + bw / 2); const cx = s * (xIn + 7);
      b.box(M.shop, 14, 4.2, bw, cx, 0, cz, { tile: [12.8, 4.2] }); b.box(M['modern' + t], 14, H, bw, cx, 4.2, cz, { tile: [12, 14.4] }); b.box(M.concreteWall, 14.4, 0.6, bw + 0.3, cx, 4.2 + H, cz);
      for (let i = 0; i < 2; i++) b.box(M.steel, 2.4, 1.3, 2.4, cx + (rng() - 0.5) * 6, 4.8 + H, cz + (rng() - 0.5) * (bw - 4)); b.box(paint(AWN[Math.floor(rng() * 5)]), 1.4, 0.1, bw * 0.75, s * (xIn - 0.7), 3.2, cz, { rz: s * 0.2 }); d += bw; } break; }
    case 'adobe': { let d = d0; for (const bw of splitLen(len, rng, 7, 11)) { const H = 3.6 + rng() * 3; const cz = Z(d + bw / 2); const w2 = bw - 1.6 - rng() * 2; const off = rng() * 2; const cx = s * (xIn + 4 + off);
      b.box(M.plaster, 8, H, w2, cx, 0, cz, { tile: [5, 5] }); b.box(M.plaster, 8.3, 0.4, w2 + 0.3, cx, H, cz); if (rng() < 0.4) b.cyl(M.steel, 0.9, 0.9, 1.6, cx + s * 1.5, H + 0.4, cz, 8);
      b.box(paint(0x2d2118), 0.12, 2.0, 1.2, s * (xIn + off - 0.02), 0, cz); d += bw; } b.cyl(bark, 0.14, 0.16, 7, s * (xIn - 1), 0, Z(d0 + len * 0.3), 6); b.box(bark, 0.08, 0.08, 2.2, s * (xIn - 1), 6.4, Z(d0 + len * 0.3), { ry: 0 }); break; }
    case 'cabin': { let d = d0; for (const bw of splitLen(len, rng, 8, 12)) { const cz = Z(d + bw / 2); const w2 = bw - 2; const cx = s * (xIn + 4 + rng() * 3);
      b.box(M.wood, 7, 3.6, w2, cx, 0, cz, { tile: [3, 3] }); b.prism(M.snow, 8, 2.6, w2 + 0.6, cx, 3.6, cz, { ry: 0 }); b.box(M.stone, 0.7, 2.4, 0.7, cx + s * 1.5, 4.4, cz + 1); b.box(M.glass, 0.1, 1, 1.4, s * (xIn + 0.45 - 0), 1.4, cz, {}); d += bw; } break; }
    case 'ruins': { let d = d0; for (const bw of splitLen(len, rng, 8, 14)) { const cz = Z(d + bw / 2); const cx = s * (xIn + 4 + rng() * 4); const H = 3 + rng() * 5; const w2 = bw - 2;
      b.box(M.stone, 6, H, w2 * 0.6, cx, 0, cz, { tile: [3, 3] }); b.box(M.stone, 6, H * 0.5, w2 * 0.3, cx, 0, cz + w2 * 0.4); b.sph(hedgeMat, 2 + rng() * 1.5, cx + s * 2, H * 0.8, cz, 0.6, 7, 5); d += bw; }
      for (let i = 0; i < len / 6; i++) tree(b, s * (xIn + 14 + rng() * 25), Z(d0 + rng() * len), 'oak', rng); break; }
    case 'warehouse': { let d = d0; for (const bw of splitLen(len, rng, 16, 28)) { const H = 7 + rng() * 5; const cz = Z(d + bw / 2); const cx = s * (xIn + 9); const tint = [0xb9b2a4, 0x8a9aa6, 0xa6654a][Math.floor(rng() * 3)];
      b.box(lam(T.metal, tint), 16, H, bw - 2, cx, 0, cz, { tile: [4, 4] }); b.prism(lam(T.metal, 0x7a7e80), bw - 2, 2.2, 16.4, cx, H, cz, { ry: Math.PI / 2 }); b.box(M.dark, 0.2, 4.2, 5, s * (xIn + 0.9), 0, cz, {});
      if (rng() < 0.6) for (let k = 0; k < 3; k++) b.box(lam(T.metal, [0x9b3d2f, 0x2f5d8a, 0x3a6b4a][k]), 2.4, 2.6, 6, s * (xIn + 14), k === 2 ? 2.6 : 0, cz + (k % 2) * 3, {}); d += bw; } break; }
    case 'forest': case 'snowpine': case 'desert': {
      const n = Math.floor(len / (style === 'desert' ? 9 : 4.2));
      for (let i = 0; i < n; i++) { const x = s * (xIn + 1 + Math.pow(rng(), 1.3) * 42); const z = Z(d0 + rng() * len); const k = style === 'desert' ? (rng() < 0.5 ? 'cactus' : rng() < 0.4 ? 'dead' : 'rock') : style === 'snowpine' ? 'snowpine' : (rng() < 0.75 ? 'oak' : 'pine');
        if (k === 'rock') b.add(M.rock, new THREE.IcosahedronGeometry(1, 0), x, 0.5, z, { ry: rng() * 3 }, 1 + rng() * 1.6, 0.8 + rng() * 1.2, 1 + rng()); else tree(b, x, z, k, rng); }
      if (style === 'desert') for (let i = 0; i < 4; i++) b.sph(M.sand, 9 + rng() * 6, s * (xIn + 26 + rng() * 30), -3, Z(d0 + rng() * len), 0.35, 8, 6);
      if (style === 'forest') for (let i = 0; i < len / 12; i++) b.sph(hedgeMat, 0.9 + rng() * 0.6, s * (xIn + 0.6 + rng() * 2), 0.3, Z(d0 + rng() * len), 0.7, 6, 4);
      break; }
    case 'water': case 'ice': { const top = style === 'ice' ? -0.3 : -2.0; b.box(M.stone, 0.7, 2.7, len, s * (xIn + 0.35), -2.7, zc); b.box(M.stone, 0.5, 0.95, len, s * (xIn + 0.3), 0, zc);
      b.box(style === 'ice' ? lam(T.snow, 0xbfe0f0, 'ice') : M.water, 160, 0.3, len, s * (xIn + 80), top - 0.3, zc, { tile: [12, 12] });
      if (style === 'water') { for (let i = 0; i < 2; i++) b.box(paint(0x355b4a), 1.6, 0.9, 1.1, s * (xIn - 0.3), 0.95, Z(d0 + 10 + i * 40), {}); let d = d0; for (const bw of splitLen(len, rng, 18, 26)) { b.box(M['facade' + Math.floor(rng() * 4)], 12, 16 + rng() * 6, bw, s * (xIn + 70), 0, Z(d + bw / 2), { tile: [12.8, 3.4] }); d += bw; } }
      break; }
    case 'park': { b.box(M.grass, 40, 0.2, len, s * (xIn + 20), -0.2, zc, { tile: [6, 6] }); for (let i = 0; i < len / 9; i++) tree(b, s * (xIn + 3 + rng() * 14), Z(d0 + rng() * len), 'plane', rng);
      for (let i = 0; i < len / 14; i++) b.box(hedgeMat, 0.9, 0.9, 6 + rng() * 4, s * (xIn + 1), 0, Z(d0 + rng() * len)); for (let i = 0; i < 3; i++) { b.box(M.wood, 0.5, 0.06, 1.8, s * (xIn + 2), 0.45, Z(d0 + 14 + i * 28), {}); b.box(M.iron, 0.5, 0.45, 0.06, s * (xIn + 2), 0, Z(d0 + 13.3 + i * 28)); }
      b.box(M.stone, 6, 0.6, 6, s * (xIn + 8), 0, Z(d0 + len * 0.5)); b.cyl(M.stone, 1.2, 1.4, 0.8, s * (xIn + 8), 0.6, Z(d0 + len * 0.5), 12); break; }
    case 'scaffold': { let d = d0; for (const bw of splitLen(len, rng, 14, 20)) { const cz = Z(d + bw / 2); b.box(M.concreteWall, 10, 16, bw - 1, s * (xIn + 6), 0, cz, { tile: [4, 4] }); d += bw; }
      for (let i = 0; i < len / 4; i++) { const z = Z(d0 + i * 4); for (let f = 0; f < 4; f++) b.box(M.steel, 0.1, 4, 0.1, s * (xIn + 0.6), f * 4, z); } for (let f = 0; f < 5; f++) { b.box(M.wood, 1.0, 0.08, len, s * (xIn + 0.3), f * 3.6 + 1.6, zc); b.box(M.steel, 0.06, 0.06, len, s * (xIn + 0.85), f * 3.6 + 2.6, zc); }
      b.box(paint(0x3a6a8a), 0.04, 14, len, s * (xIn + 0.9), 1, zc); break; }
    case 'construction': { b.box(M.concreteWall, 10, 14, len * 0.5, s * (xIn + 6), 0, Z(d0 + len * 0.75), { tile: [4, 4] }); for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) b.box(M.concreteWall, 0.7, 12, 0.7, s * (xIn + 1.6 + k * 4.2), 0, Z(d0 + 4 + i * (len * 0.22))); for (let f = 1; f < 3; f++) b.box(M.concreteWall, 12, 0.5, len * 0.8, s * (xIn + 6), f * 4.5, zc);
      b.box(paint(0xe8b42a), 0.9, 34, 0.9, s * (xIn + 14), 0, Z(d0 + 20)); b.box(paint(0xe8b42a), 0.7, 0.7, 30, s * (xIn + 6), 33, Z(d0 + 20 + 10)); b.box(M.concreteWall, 3, 2.4, 2, s * (xIn + 14), 31, Z(d0 + 8)); for (let i = 0; i < 4; i++) b.box(lam(T.metal, 0x8b6f3a), 2.4, 2.6, 6, s * (xIn + 4), 0, Z(d0 + 10 + i * 22)); break; }
    case 'alleywall': { b.box(M.brick0, 0.6, 9, len, s * (xIn + 0.3), 0, zc, { tile: [4, 4] }); b.box(M.brick1, 14, 16, len, s * (xIn + 7.5), 0, zc, { tile: [4, 4] });
      for (let i = 0; i < len / 11; i++) { const z = Z(d0 + 4 + i * 11 + rng() * 3); b.box(M.dark, 0.15, 2.1, 1.1, s * (xIn - 0.02), 0, z); b.box(M.glass, 0.15, 1.3, 0.9, s * (xIn - 0.02), 3.4 + rng() * 2, z + 3); b.cyl(M.steel, 0.07, 0.07, 9, s * (xIn - 0.12), 0, z + 5, 6); if (rng() < 0.5) b.box(paint(0x2f5a45), 0.8, 1.2, 1.6, s * (xIn - 0.5), 0, z - 2); }
      break; }
    case 'tunnelwall': case 'stonewall': { const m = style === 'tunnelwall' ? M.tile : lam(T.rock, 0xb8b2a4); b.box(m, 0.6, 6, len, s * (xIn + 0.3), 0, zc, { tile: [style === 'tunnelwall' ? 4 : 3, 3] });
      const step = 12; for (let d = Math.ceil(d0 / step) * step; d < d1; d += step) { b.box(M.concreteWall, 0.7, 5.8, 0.7, s * (xIn - 0.3), 0, Z(d)); if (style === 'tunnelwall') b.box(paint(0x244a3a), 0.05, 0.6, 2.4, s * (xIn - 0.03), 1.6, Z(d + 6)); else b.box(glowWarm, 0.2, 0.3, 0.2, s * (xIn - 0.4), 3.2, Z(d + 6)); } break; }
    case 'parapet': { b.box(M.stone, 0.7, 1.15, len, s * (xIn + 0.35), 0, zc, { tile: [2, 1] }); b.box(M.stone, 0.95, 0.15, len, s * (xIn + 0.35), 1.15, zc); for (let d = Math.ceil(d0 / 18) * 18; d < d1; d += 18) lampPost(b, s * (xIn + 0.4), Z(d), s);
      b.box(M.water, 200, 0.3, len, 0, -7.4, zc, { tile: [12, 12] }); for (let d = d0; d < d1; d += 14) b.box(M.stone, 9.2, 6.5, 2.6, 0, -6.8, Z(d + 7), { tile: [3, 3] }); b.box(M.stone, 9, 0.6, len, 0, -0.9, zc); break; }
    case 'rooftop': { b.box(M.concreteWall, 0.5, 1.0, len, s * (xIn + 0.25), 0, zc, { tile: [2, 1] }); b.box(M.stone, 0.7, 0.12, len, s * (xIn + 0.25), 1.0, zc);
      for (let i = 0; i < len / 16; i++) { const z = Z(d0 + 6 + i * 16 + rng() * 4); const k = rng(); if (k < 0.4) b.box(M.steel, 2.4, 1.4, 2.4, s * (xIn + 2 + rng() * 2), 0, z); else if (k < 0.7) { b.cyl(M.metal, 1.3, 1.3, 2.6, s * (xIn + 3), 0, z, 10); b.cone(M.dark, 1.5, 0.6, s * (xIn + 3), 2.6, z, 10); } else b.box(M.stone, 1, 4, 1, s * (xIn + 2), 0, z); }
      b.box(M.concreteWall, 40, 12, len, s * (xIn + 40), -13, zc, { tile: [6, 6] }); let d = d0; for (const bw of splitLen(len, rng, 14, 22)) { b.box(M['facade' + Math.floor(rng() * 4)], 14, 6 + rng() * 10, bw, s * (xIn + 20 + rng() * 8), -6, Z(d + bw / 2), { tile: [12.8, 3.4] }); d += bw; } break; }
    case 'core': { b.box(M.dark, 1.2, 12, len, s * (xIn + 0.6), 0, zc); b.box(lam(T.concrete, 0x6e747a), 10, 24, len, s * (xIn + 6), 0, zc, { tile: [6, 6] });
      for (let d = Math.ceil(d0 / 24) * 24; d < d1; d += 24) { if (s < 0) { b.box(M.dark, 12, 0.7, 1.0, 0, 8.6, Z(d)); b.box(glowBlue, 11, 0.08, 0.12, 0, 8.2, Z(d)); b.box(M.dark, 12, 0.7, 1.0, 0, -0.1, Z(d)); } b.cyl(M.steel, 2.6, 2.6, 0.4, s * (xIn + 0.3), 4.5, Z(d + 8), 18, { rz: Math.PI / 2 }); b.box(glowBlue, 0.06, 0.2, 3.4, s * (xIn - 0.05), 1.6, Z(d + 12)); } break; }
    default: break;
  }
}

function parked(group: THREE.Group, rng: () => number, x: number, d: number, model = 'car'): THREE.Group {
  const m = buildModel(model, 1.85, 1.45, 4.2, rng); m.position.set(x, 0, -d); group.add(m); return m;
}

export interface EnvOut { group: THREE.Group; npcs: Npc[] }
export function buildEnv(seg: SegData): EnvOut {
  const b = new Batch(); const rng = mulberry32(seg.seed); const w = seg.world; const k = seg.kind; const p = profile(w, k);
  const len = seg.d1 - seg.d0; const zc = -(seg.d0 + seg.d1) / 2; const group = new THREE.Group(); const Z = (d: number) => -d;
  // road
  const rm = M[p.road]; const tl = p.road === 'road' || p.road === 'roadN' ? [p.half * 2, 16] as [number, number] : [8, 8] as [number, number];
  b.box(rm, p.half * 2, 0.4, len, 0, -0.4, zc, { tile: tl });
  // sidewalks + ground
  const gm = M[p.ground]; const water = p.l === 'water' || p.r === 'water' || p.l === 'ice' || p.r === 'ice';
  for (const s of [-1, 1]) {
    const style = s < 0 ? p.l : p.r; const isWater = style === 'water' || style === 'ice';
    if (p.walk) { b.box(M.sidewalk, p.outer - p.half, 0.16, len, s * (p.half + (p.outer - p.half) / 2), 0, zc, { tile: [3, 3] }); b.box(M.stone, 0.18, 0.2, len, s * (p.half + 0.09), 0, zc); }
    if (!p.walk && p.narrow) b.box(M.concreteWall, p.outer - p.half + 0.05, 0.12, len, s * (p.half + (p.outer - p.half) / 2), 0, zc, { tile: [2, 2] });
    if (p.ceil === undefined && !['parapet', 'rooftop'].includes(style) && !isWater) b.box(gm, 130, 0.4, len, s * (p.half + 65), -0.46, zc, { tile: [10, 10] });
    if (k === 'cafe' && !isWater) { for (let d = seg.d0 + 6; d < seg.d1 - 6; d += 9) { const tx = s * (p.half + 1.6 + rng()); b.cyl(M.iron, 0.4, 0.4, 0.05, tx, 0.75, Z(d), 10); b.cyl(M.iron, 0.04, 0.04, 0.75, tx, 0, Z(d), 4); for (const c of [-0.6, 0.6]) b.box(M.wood, 0.4, 0.05, 0.4, tx, 0.45, Z(d + c)); b.box(M.stone, 0.02, 0.02, 0.02, tx, 0.8, Z(d)); b.cyl(paint(AWN[Math.floor(rng() * 4)]), 1.2, 1.2, 0.06, tx, 2.2, Z(d), 10); b.cyl(M.iron, 0.03, 0.03, 2.2, tx, 0, Z(d), 4); } }
    if (k === 'metro' && !isWater) { const d = seg.d0 + len * (0.35 + s * 0.1); const x = s * (p.half + 1.8); for (const q of [-1.3, 1.3]) { b.box(MET, 0.12, 2.4, 0.12, x, 0, Z(d + q)); b.box(MET, 0.06, 1.0, 0.06, x, 0.9, Z(d + q)); } b.box(MET, 0.12, 0.12, 2.8, x, 2.3, Z(d)); b.cyl(MET, 0.6, 0.6, 0.1, x, 2.75, Z(d), 12, { rx: Math.PI / 2 }); b.box(glowWarm, 0.12, 0.55, 1.4, x, 2.45, Z(d)); b.box(M.dark, 2.4, 0.2, 2.6, x + 0 * s, 0, Z(d)); for (let i = 0; i < 5; i++) b.box(M.concreteWall, 2.2, 0.12, 0.4, x, 0.04 - i * 0.01, Z(d - 0.8 + i * 0.35)); }
    sideStyle(b, style, s, p.outer, seg.d0, seg.d1, rng, w, k, seg.marks);
    if (p.walk && !isWater) { for (let d = seg.d0 + 8 + (s > 0 ? 11 : 0); d < seg.d1 - 4; d += 22) lampPost(b, s * (p.half + 0.6), Z(d), s); if (k === 'boulevard' || k === 'street' || k === 'cafe') for (let d = seg.d0 + 6 + (s > 0 ? 7 : 0); d < seg.d1 - 4; d += 14) { b.cyl(w === 'paris' ? bark : M.dark, 0.17, 0.24, 3.3, s * (p.half + 2.2), 0, Z(d), 6); const lm = leafMats[Math.floor(rng() * 3)]; b.sph(lm, 2.1, s * (p.half + 2.2), 5.0, Z(d), 0.85, 8, 6); b.box(M.iron, 1.1, 0.04, 1.1, s * (p.half + 2.2), 0.16, Z(d)); }
      for (let d = seg.d0 + 15; d < seg.d1 - 5; d += 30) { b.box(M.wood, 0.5, 0.06, 1.7, s * (p.half + 1.0), 0.5, Z(d + rng() * 6)); } if (w === 'paris' && rng() < 0.5) { b.cyl(MET, 0.5, 0.5, 2.6, s * (p.half + 1.3), 0, Z(seg.d0 + len * 0.5), 10); b.cyl(MET, 0.6, 0.5, 0.3, s * (p.half + 1.3), 2.6, Z(seg.d0 + len * 0.5), 10); } }
  }
  // crosswalks
  for (const d of seg.marks) for (let x = -p.half + 0.6; x < p.half - 0.3; x += 1.1) b.box(M.white, 0.55, 0.012, 3.4, x, 0.002, Z(d));
  for (const d of seg.marks) for (const s of [-1, 1]) { const lx = s * (p.half + 0.4); b.cyl(M.dark, 0.06, 0.07, 3.4, lx, 0, Z(d - 2.6), 6); b.box(M.dark, 0.32, 0.95, 0.32, lx, 2.5, Z(d - 2.6)); b.box(glowRed, 0.16, 0.16, 0.05, lx, 3.2, Z(d - 2.6) + 0.17); }
  // tunnel / ceiling features
  if (p.ceil) {
    b.box(k === 'hidden' ? lam(T.rock, 0x9a9488) : M.concreteWall, p.half * 2 + 2.4, 0.6, len, 0, 5.6, zc, { tile: [4, 4] });
    for (let d = Math.ceil(seg.d0 / 10) * 10 + 4; d < seg.d1; d += 10) b.box(k === 'hidden' ? glowWarm : M.ceilLight, 1.8, 0.08, 0.35, 0, 5.52, Z(d));
    if (k === 'tunnel') for (let d = seg.d0 + 4; d < seg.d1; d += 4) b.box(M.steel, 0.12, 0.12, 0.12, 0, 0.0, Z(d)); // expansion joints hint
  }
  if (k === 'bridge' && (w === 'verdant' || w === 'frostline' || w === 'dustfall')) for (let d = Math.ceil(seg.d0 / 10) * 10; d < seg.d1; d += 10) for (const s of [-1, 1]) { b.box(M.steel, 0.14, 4.6, 0.14, s * 4.9, 0, Z(d)); if (d + 5 < seg.d1) b.box(M.steel, 0.1, 0.1, 10, s * 4.9, 4.4, Z(d + 5)); }
  if (k === 'riverfront' && water) for (let d = seg.d0 + 5; d < seg.d1 - 5; d += 26) { b.box(M.stone, 0.3, 0.3, 0.3, 0, 0, 0); }
  if (w === 'monsoon' && (k === 'street' || k === 'boulevard' || k === 'tunnel')) b.box(lam(T.water, 0x9fb5c0, 'flood', { transparent: true, opacity: 0.35 }), p.half * 2 - 1, 0.01, 6, (rng() - 0.5) * 3, 0.03, Z(seg.d0 + len * (0.3 + rng() * 0.4)));
  const built = b.build(false, true); group.add(built);
  // parked cars (street kinds)
  if (p.walk && ['street', 'boulevard', 'cafe', 'metro', 'fracture'].includes(k) && w !== 'frostline') {
    const n = k === 'boulevard' ? 2 : 4; const models = w === 'monsoon' ? ['car', 'van', 'taxi'] : ['car', 'car', 'taxi', 'van'];
    for (let i = 0; i < n; i++) { const s = rng() < 0.5 ? -1 : 1; const d = seg.d0 + 10 + rng() * (len - 20); parked(group, rng, s * 5.2, d, models[Math.floor(rng() * models.length)]); }
  }
  if (k === 'industrial' || k === 'wild' && w === 'dustfall') for (let i = 0; i < 2; i++) { const s = rng() < 0.5 ? -1 : 1; parked(group, rng, s * (p.half + 3.2), seg.d0 + 12 + rng() * (len - 24), 'wreck'); }
  // NPCs
  const npcs: Npc[] = [];
  for (const n of seg.npcs) { const npc = new Npc(n.seed); npc.still = n.still; npc.d = n.d; npc.baseX = n.x; npc.dir = n.dir || 1; npc.speed = 1.0 + (n.seed % 7) * 0.12; npc.root.position.set(n.x, 0.16, Z(n.d));
    npc.root.rotation.y = n.still ? (n.x > 0 ? Math.PI / 2 : -Math.PI / 2) : (npc.dir > 0 ? 0 : Math.PI); group.add(npc.root); npcs.push(npc); }
  return { group, npcs };
}
