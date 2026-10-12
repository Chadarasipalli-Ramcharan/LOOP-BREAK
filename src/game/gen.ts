// LOOPBREAK — deterministic level generation (same stage = same obstacles every loop, so Echoes replay correctly).
import { LANES, type RowType, type ScriptedEchoDef, type SegDef, type SegKind, type StageDef, type WorldDef, type WorldId } from './data';
import { mulberry32 } from './gfx';

export type ObsKind = 'low' | 'high' | 'full' | 'ramp' | 'platform' | 'mover';
export interface Obs {
  id: number; model: string; kind: ObsKind; x0: number; x1: number; d0: number; d1: number; y0: number; y1: number;
  walkable?: boolean; h0?: number; h1?: number; dmg: number; vw: number; vh: number; vl: number; cx: number;
  mover?: { from: number; to: number; speed: number; cycle: number; phase: number }; mesh?: import('three').Object3D; soft?: boolean;
}
export interface Col { id: number; type: 'coin' | 'shard' | 'memory' | 'recording' | 'core'; x: number; y: number; d: number; taken: boolean; lore?: string }
export interface NpcSpec { d: number; x: number; dir: number; still: boolean; seed: number }
export interface SegData { idx: number; kind: SegKind; d0: number; d1: number; obs: Obs[]; cols: Col[]; npcs: NpcSpec[]; marks: number[]; seed: number; dens: number; world: WorldId }

// [width, height, length]
export const DIMS: Record<string, [number, number, number]> = {
  car: [1.9, 1.5, 4.3], taxi: [1.9, 1.5, 4.3], van: [2.1, 2.3, 5.2], bus: [2.4, 3.2, 10.5], truck: [2.3, 3.0, 7.5], wreck: [1.9, 1.4, 4.3], snowcar: [1.9, 1.6, 4.3],
  container: [2.3, 2.6, 6], excavator: [2.6, 3.0, 6], barricade: [2.2, 2.0, 0.7], boulder: [2.3, 1.9, 2.3], ruin: [2.3, 2.4, 1.4],
  barrier: [2.2, 0.95, 0.6], bench: [2.0, 1.0, 0.7], cones: [1.8, 0.8, 0.7], crates: [2.0, 1.05, 1.1], cart: [2.0, 1.1, 1.3], log: [2.3, 0.9, 1.1], barrels: [1.8, 1.0, 1.4], snowdrift: [2.3, 0.85, 1.5],
  beam: [2.3, 1.75, 0.5], pipe: [2.3, 1.75, 0.5], sign: [2.3, 2.0, 0.5], branch: [2.3, 1.75, 0.8], train: [2.8, 3.6, 22],
};

const LOW: Record<WorldId, string[]> = {
  paris: ['barrier', 'bench', 'cones', 'crates', 'cart'], verdant: ['log', 'log', 'barrier', 'crates'], dustfall: ['barrels', 'crates', 'barrier', 'cones'],
  frostline: ['snowdrift', 'barrier', 'crates'], monsoon: ['barrier', 'cones', 'crates', 'cart'], fractured: ['barrier', 'bench', 'cones', 'crates'], chrono: ['barrier', 'cones', 'crates'],
};
const HIGH: Record<WorldId, string[]> = {
  paris: ['beam', 'pipe', 'sign'], verdant: ['branch', 'pipe'], dustfall: ['beam', 'pipe'], frostline: ['beam', 'pipe', 'sign'], monsoon: ['beam', 'pipe', 'sign'], fractured: ['beam', 'sign'], chrono: ['beam', 'pipe'],
};
const FULL: Record<WorldId, string[]> = {
  paris: ['car', 'taxi', 'van', 'bus', 'truck', 'car'], verdant: ['boulder', 'wreck', 'ruin', 'barricade'], dustfall: ['wreck', 'truck', 'container', 'ruin'],
  frostline: ['snowcar', 'container', 'boulder', 'barricade'], monsoon: ['car', 'taxi', 'van', 'bus'], fractured: ['car', 'van', 'ruin', 'container'], chrono: ['container', 'barricade', 'ruin'],
};
const URBAN_CROSS: SegKind[] = ['street', 'boulevard', 'cafe', 'fracture', 'town'];

interface Zone { a: number; b: number }

export class LevelGen {
  segs: SegData[] = []; exitD = Infinity; nextD = 0; private zones: Zone[] = []; private defs: SegDef[]; private cycleI = 0; private oid = 1; private cid = 1;
  private rng: () => number;
  constructor(public stage: StageDef, public world: WorldDef, public endless: boolean) {
    this.rng = mulberry32(stage.seed * 7919 + 13);
    this.defs = [...stage.segs];
    if (!endless) {
      this.exitD = this.defs.reduce((s, d) => s + d.len, 0);
      const last = this.defs[this.defs.length - 1]; this.defs.push({ kind: last.kind, len: 80, density: 0 });
    }
    this.zones.push({ a: 0, b: 28 });
    for (const b of stage.blockers) this.zones.push({ a: b.d - 14, b: b.d + b.len + 10 });
    for (const s of stage.switches) this.zones.push({ a: s.d - 9, b: s.d + 9 });
    for (const s of stage.secrets) this.zones.push({ a: s.d - 12, b: s.d + 14 });
    for (const l of stage.loot) this.zones.push({ a: l.d - 5, b: l.d + 5 });
    if (!endless) this.zones.push({ a: this.exitD - 14, b: this.exitD + 40 });
  }

  private reserved(a: number, b: number): boolean { return this.zones.some((z) => a < z.b && b > z.a); }
  private density(d: number): number { return Math.min(0.78, 0.1 + Math.max(0, d - 60) / 1500); }
  hasMore(): boolean { return this.endless || this.segs.length < this.defs.length; }

  ensureTo(d: number): void { while (this.nextD < d && this.hasMore()) this.add(); }

  add(): SegData {
    const idx = this.segs.length; let def: SegDef;
    if (this.endless) {
      const cyc = this.world.cycle; const kind = cyc[this.cycleI++ % cyc.length];
      def = { kind, len: 90 + Math.floor(this.rng() * 3) * 10, density: this.nextD < 60 ? 0 : this.density(this.nextD) };
    } else def = this.defs[idx];
    const seg = this.gen(def, this.nextD, idx); this.segs.push(seg); this.nextD = seg.d1; return seg;
  }

  private pick(rng: () => number, def: SegDef): RowType {
    const k = def.kind; const dn = def.density; const r = rng();
    const tight = k === 'tunnel' || k === 'alley' || k === 'hidden' || k === 'rooftop' || k === 'bridge';
    if (dn < 0.2) return r < 0.5 ? 'low1' : r < 0.75 ? 'none' : 'beam1';
    if (dn < 0.36) return r < 0.22 ? 'low1' : r < 0.4 ? 'car1' : r < 0.55 ? 'lowAll' : r < 0.72 ? 'beam1' : r < 0.86 ? 'beamAll' : 'none';
    const cross = !tight && (URBAN_CROSS.includes(k) || k === 'rail');
    if (r < 0.12) return 'low1'; if (r < 0.24) return 'car1'; if (r < 0.38) return 'car2'; if (r < 0.48) return 'mix'; if (r < 0.58) return 'beamAll';
    if (r < 0.68) return tight ? 'lowAll' : 'platform'; if (r < 0.8) return 'slalom'; if (r < 0.9) return cross ? 'cross' : 'beam1'; return 'lowAll';
  }

  private lowModel(rng: () => number, k: SegKind): string { return k === 'construction' && rng() < 0.6 ? (rng() < 0.5 ? 'barrier' : 'cones') : LOW[this.world.id][Math.floor(rng() * LOW[this.world.id].length)]; }
  private fullModel(rng: () => number, k: SegKind): string { const w = this.world.id; if (k === 'construction' && w !== 'verdant') { const a = ['container', 'excavator', 'barricade']; return a[Math.floor(rng() * 3)]; } if (k === 'tunnel' && w === 'paris') return 'van'; const a = FULL[w]; return a[Math.floor(rng() * a.length)]; }
  private highModel(rng: () => number): string { const a = HIGH[this.world.id]; return a[Math.floor(rng() * a.length)]; }

  private obs(seg: SegData, model: string, kind: ObsKind, lane: number | 'all', d: number, o: Partial<Obs> = {}): Obs {
    const dim = DIMS[model] ?? [2, 1, 1]; let [w, h, l] = dim; if (lane === 'all') w = 7.4;
    const c = lane === 'all' ? 0 : LANES[lane]; const half = lane === 'all' ? 3.7 : Math.min(w / 2, 1.05);
    let y0 = 0, y1 = h; if (kind === 'high') { y0 = 1.25; y1 = 1.78; }
    const ob: Obs = { id: this.oid++, model, kind, x0: c - half, x1: c + half, d0: d - Math.max(l, 0.6) / 2, d1: d + Math.max(l, 0.6) / 2, y0, y1, dmg: 1, vw: w, vh: h, vl: l, cx: c, ...o };
    seg.obs.push(ob); return ob;
  }
  private coin(seg: SegData, lane: number, d: number, y = 0.85, type: Col['type'] = 'coin', lore?: string): void { seg.cols.push({ id: this.cid++, type, x: LANES[lane], y, d, taken: false, lore }); }
  private coinLine(seg: SegData, lane: number, a: number, b: number, y = 0.85): void { for (let d = a; d <= b; d += 2.5) this.coin(seg, lane, d, y); }

  private row(seg: SegData, type: RowType, d: number, rng: () => number, def: SegDef): { free: number[]; foot: number } {
    const all = [0, 1, 2]; const k = def.kind; const L = Math.floor(rng() * 3); const others = all.filter((x) => x !== L);
    switch (type) {
      case 'low1': { this.obs(seg, this.lowModel(rng, k), 'low', L, d); for (let i = -2; i <= 2; i++) this.coin(seg, L, d + i * 1.3, 0.95 + 1.1 * Math.cos(i * 0.6) * 0.6 + 0.05); return { free: others, foot: 6 }; }
      case 'lowAll': { this.obs(seg, this.lowModel(rng, k), 'low', 'all', d); for (let i = -3; i <= 3; i++) this.coin(seg, 1, d + i * 1.2, 1.0 + 1.0 * Math.cos(i * 0.5)); return { free: all, foot: 7 }; }
      case 'car1': { this.obs(seg, this.fullModel(rng, k), 'full', L, d); return { free: others, foot: 8 }; }
      case 'car2': { const f = Math.floor(rng() * 3); for (const l of all.filter((x) => x !== f)) this.obs(seg, this.fullModel(rng, k), 'full', l, d + (rng() - 0.5) * 2); this.coinLine(seg, f, d - 5, d + 5); return { free: [f], foot: 10 }; }
      case 'beamAll': { this.obs(seg, this.highModel(rng), 'high', 'all', d); this.coinLine(seg, 1, d - 3, d + 3, 0.6); return { free: all, foot: 6 }; }
      case 'beam1': { this.obs(seg, this.highModel(rng), 'high', L, d); return { free: others, foot: 5 }; }
      case 'mix': { const a = others[0]; const b2 = others[1]; this.obs(seg, this.lowModel(rng, k), 'low', L, d); this.obs(seg, this.fullModel(rng, k), 'full', a, d + 1); this.coinLine(seg, b2, d - 4, d + 4); return { free: [b2, L], foot: 10 }; }
      case 'slalom': { let prev = Math.floor(rng() * 3); for (let i = 0; i < 3; i++) { const l = i === 0 ? prev : (prev + 1 + Math.floor(rng() * 2)) % 3; prev = l; this.obs(seg, this.fullModel(rng, k), 'full', l, d + i * 14); this.coinLine(seg, (l + 1) % 3, d + i * 14 - 4, d + i * 14 + 4); } return { free: all, foot: 34 }; }
      case 'platform': {
        if (this.reserved(d - 4, d + 26)) { this.obs(seg, this.lowModel(rng, k), 'low', L, d); return { free: others, foot: 6 }; }
        const top = 1.6; const dd = d - 3;
        this.obs(seg, 'rampUp', 'ramp', L, dd + 2.5, { d0: dd, d1: dd + 5, walkable: true, h0: 0, h1: top, y0: 0, y1: top, vh: top, vl: 5, vw: 2.2 });
        this.obs(seg, 'flatbed', 'platform', L, dd + 11, { d0: dd + 5, d1: dd + 17, walkable: true, y0: 0, y1: top, vh: top, vl: 12, vw: 2.2 });
        this.obs(seg, 'rampDown', 'ramp', L, dd + 19.5, { d0: dd + 17, d1: dd + 22, walkable: true, h0: top, h1: 0, y0: 0, y1: top, vh: top, vl: 5, vw: 2.2 });
        for (let i = 0; i < 5; i++) this.coin(seg, L, dd + 6.5 + i * 2.4, top + 0.85); seg.cols.push({ id: this.cid++, type: 'shard', x: LANES[L], y: top + 0.95, d: dd + 12, taken: false });
        if (rng() < 0.6) this.obs(seg, this.lowModel(rng, k), 'low', others[0], dd + 10); return { free: others, foot: 24 };
      }
      case 'cross': {
        if (this.reserved(d - 4, d + 4)) return { free: all, foot: 4 };
        const train = k === 'rail'; const model = train ? 'train' : (rng() < 0.3 ? 'bus' : rng() < 0.5 ? 'taxi' : 'car'); const dim = DIMS[model]; const dirSign = rng() < 0.5 ? 1 : -1; const len = train ? 22 : dim[2];
        const from = dirSign * (train ? 26 : 12 + len / 2); const to = -from; const speed = train ? 19 : 11; const cycle = (train ? 10 : 7.5) + rng() * 3;
        const dw = train ? 3 : 2.2; this.obs(seg, model, 'mover', 'all', d, { d0: d - dw / 2, d1: d + dw / 2, x0: -1, x1: 1, y0: 0, y1: dim[1], dmg: 2, vw: dim[0], vh: dim[1], vl: len, mover: { from, to, speed, cycle, phase: rng() * cycle } });
        seg.marks.push(d); return { free: all, foot: 14 };
      }
      default: { // 'none': coin line guides steering
        const l = Math.floor(rng() * 3); this.coinLine(seg, l, d - 8, d + 8); return { free: all, foot: 0 };
      }
    }
  }

  private gen(def: SegDef, d0: number, idx: number): SegData {
    const rng = mulberry32(this.stage.seed * 131 + idx * 977 + 7); const d1 = d0 + def.len;
    const seg: SegData = { idx, kind: def.kind, d0, d1, obs: [], cols: [], npcs: [], marks: [], seed: this.stage.seed * 31 + idx * 101, dens: def.density, world: this.world.id };
    const gap = Math.round(34 - 18 * Math.min(1, def.density / 0.55)); let skipUntil = -1; let i = 0; const tight = def.kind === 'tunnel' || def.kind === 'alley';
    for (let d = d0 + 20; d < d1 - 8; d += gap, i++) {
      let type: RowType = def.rows && i < def.rows.length ? def.rows[i] : def.density <= 0 ? 'none' : 'rand';
      if (type === 'rand') type = this.pick(rng, def);
      if (tight && type === 'cross') type = 'car1';
      if (d < skipUntil) continue;
      const foot = ({ low1: 6, lowAll: 7, car1: 8, car2: 10, beamAll: 6, beam1: 5, mix: 10, slalom: 34, platform: 26, cross: 14, none: 0 } as Record<string, number>)[type] ?? 8;
      if (type !== 'none' && this.reserved(d - 7, d + foot + 6)) type = 'none';
      const r = this.row(seg, type, d, rng, def); skipUntil = d + r.foot;
    }
    // shards in risky spots
    const nSh = def.shards ?? Math.round(1 + def.density * 4);
    for (let s = 0; s < nSh; s++) {
      const d = d0 + 25 + rng() * (def.len - 45); const lane = Math.floor(rng() * 3); const x = LANES[lane];
      if (this.reserved(d - 2, d + 2) || seg.obs.some((o) => o.kind !== 'mover' && o.x0 < x + 1 && o.x1 > x - 1 && o.d0 - 1.5 < d && o.d1 + 1.5 > d && !o.walkable)) continue;
      if (seg.obs.some((o) => o.walkable && o.d0 - 1 < d && o.d1 + 1 > d && o.x0 < x + 1 && o.x1 > x - 1)) continue;
      seg.cols.push({ id: this.cid++, type: 'shard', x, y: 0.95, d, taken: false });
    }
    // loot / secrets
    for (const l of this.stage.loot) if (l.d >= d0 && l.d < d1) seg.cols.push({ id: this.cid++, type: l.type, x: LANES[l.lane], y: 1.0, d: l.d, taken: false, lore: l.id });
    for (const sc of this.stage.secrets) if (sc.d >= d0 && sc.d < d1) {
      for (let k = 0; k < sc.loot.length; k++) { const ld = sc.d + 8 + k * 14; const id = sc.loot[k]; seg.cols.push({ id: this.cid++, type: id.startsWith('rec') ? 'recording' : 'memory', x: LANES[sc.lane], y: 1.0, d: ld, taken: false, lore: id }); }
      for (let d = sc.d + 4; d < sc.d + 34; d += 2.5) this.coin(seg, sc.lane, d); for (let k = 0; k < 3; k++) seg.cols.push({ id: this.cid++, type: 'shard', x: LANES[sc.lane], y: 0.95, d: sc.d + 12 + k * 7, taken: false });
    }
    // pedestrians
    const urban = ['street', 'boulevard', 'cafe', 'park', 'riverfront', 'metro', 'town'].includes(def.kind) && ['paris', 'monsoon', 'fractured', 'dustfall'].includes(this.world.id);
    if (urban) { const n = 2 + Math.floor(rng() * 3); for (let k = 0; k < n; k++) seg.npcs.push({ d: d0 + rng() * def.len, x: (rng() < 0.5 ? -1 : 1) * (6.9 + rng() * 1.9), dir: rng() < 0.5 ? 1 : -1, still: false, seed: Math.floor(rng() * 1e6) }); }
    for (const e of this.stage.events) if (e.kind === 'freeze' && e.d >= d0 && e.d < d1) seg.npcs.push({ d: e.d, x: 7.4, dir: 0, still: true, seed: 4242 + idx });
    return seg;
  }

  /** ground height over walkable obstacles */
  static ground(obs: Obs[], x: number, d: number): number {
    let g = 0;
    for (const o of obs) {
      if (!o.walkable || d < o.d0 || d > o.d1 || x + 0.3 < o.x0 || x - 0.3 > o.x1) continue;
      const h = o.kind === 'ramp' ? (o.h0 as number) + ((o.h1 as number) - (o.h0 as number)) * ((d - o.d0) / (o.d1 - o.d0)) : o.y1; if (h > g) g = h;
    }
    return g;
  }
}

// frames: [d, x, y, flags, speed] per 1/60 s
export const FRAME = 5;
export function scriptedFrames(def: ScriptedEchoDef, cruise: number, frames = 3600): Float32Array {
  const out = new Float32Array(frames * FRAME); const dt = 1 / 60; let d = def.lead; let v = def.lead > 0 ? cruise : 0; let x = 0; let hi = 0; let holdT = 0;
  for (let f = 0; f < frames; f++) {
    let target = cruise; const h = def.holds[hi]; let wantX = 0;
    if (h) {
      const dist = h.d - d; if (dist < 18) wantX = LANES[h.lane];
      if (holdT > 0) { target = 0; v = 0; holdT -= dt; wantX = LANES[h.lane]; if (holdT <= 0) hi++; }
      else if (dist <= 0.1) { d = h.d; v = 0; holdT = h.hold; wantX = LANES[h.lane]; }
      else if (dist < 7) target = Math.min(cruise, Math.max(1.2, Math.sqrt(2 * 9 * dist)));
    }
    const acc = target > v ? 7 : 16; v += Math.max(-acc * dt, Math.min(acc * dt, target - v)); d += v * dt;
    x += Math.max(-6 * dt, Math.min(6 * dt, wantX - x));
    const o = f * FRAME; out[o] = d; out[o + 1] = x; out[o + 2] = 0; out[o + 3] = 0; out[o + 4] = v;
  }
  return out;
}
