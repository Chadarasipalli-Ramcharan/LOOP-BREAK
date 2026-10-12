// LOOPBREAK — static game data: worlds, atmospheres, stages, story, lore, cosmetics.

export type Mode = 'story' | 'loop' | 'endless' | 'challenge';
export type WorldId = 'paris' | 'verdant' | 'dustfall' | 'frostline' | 'monsoon' | 'fractured' | 'chrono';
export type AtmoId = 'morning' | 'clear' | 'cloudy' | 'rain' | 'heavyRain' | 'fog' | 'sunset' | 'night' | 'snow' | 'dust';
export type SegKind =
  | 'street' | 'alley' | 'boulevard' | 'cafe' | 'metro' | 'tunnel' | 'riverfront' | 'bridge' | 'park'
  | 'construction' | 'rooftop' | 'hidden' | 'wild' | 'town' | 'industrial' | 'rail' | 'fracture' | 'core';
export type RowType =
  | 'none' | 'low1' | 'lowAll' | 'car1' | 'car2' | 'beamAll' | 'beam1' | 'mix' | 'platform' | 'cross' | 'slalom' | 'rand';

export const LANES = [-2.4, 0, 2.4];
export const LOOP_SECONDS = 60;

export interface AtmoDef {
  id: AtmoId; label: string;
  skyTop: number; skyMid: number; skyBot: number;
  fog: number; fogNear: number; fogFar: number;
  sun: number; sunInt: number; sunPos: [number, number, number];
  hemiSky: number; hemiGround: number; hemiInt: number;
  rain: number; snow: number; dust: number; wet: boolean; night: boolean; exposure: number;
}

const A = (o: Partial<AtmoDef> & Pick<AtmoDef, 'id' | 'label' | 'skyTop' | 'skyBot' | 'fog' | 'sun' | 'hemiSky' | 'hemiGround'>): AtmoDef => ({
  skyMid: o.skyBot, fogNear: 45, fogFar: 180, sunInt: 2.2, sunPos: [-30, 50, -20], hemiInt: 0.95,
  rain: 0, snow: 0, dust: 0, wet: false, night: false, exposure: 1.0, ...o,
});

export const ATMOS: Record<AtmoId, AtmoDef> = {
  morning: A({ id: 'morning', label: 'MORNING', skyTop: 0x7da4cc, skyMid: 0xbcd0df, skyBot: 0xeadcc4, fog: 0xd8d1c3, sun: 0xffe0b0, sunInt: 2.3, sunPos: [-45, 38, -25], hemiSky: 0xc3d5e8, hemiGround: 0x8b8577, hemiInt: 0.9 }),
  clear: A({ id: 'clear', label: 'CLEAR', skyTop: 0x5a92d0, skyMid: 0x9fc2e3, skyBot: 0xd3e2ef, fog: 0xc8d8e6, sun: 0xfff0d4, sunInt: 2.7, sunPos: [-25, 60, -20], hemiInt: 1.0, hemiSky: 0xc6dcf0, hemiGround: 0x8d8a80 }),
  cloudy: A({ id: 'cloudy', label: 'CLOUDY', skyTop: 0x8595a6, skyMid: 0xaab5c0, skyBot: 0xc9ced3, fog: 0xb9bfc5, sun: 0xdfe6ee, sunInt: 1.1, hemiInt: 1.15, hemiSky: 0xcfd6dd, hemiGround: 0x858481 }),
  rain: A({ id: 'rain', label: 'RAIN', skyTop: 0x5b6671, skyMid: 0x7d8892, skyBot: 0x98a1a8, fog: 0x8c959c, fogNear: 28, fogFar: 140, sun: 0xaab4be, sunInt: 0.6, hemiInt: 1.0, hemiSky: 0xaab4bd, hemiGround: 0x6a6d70, rain: 520, wet: true, exposure: 0.95 }),
  heavyRain: A({ id: 'heavyRain', label: 'HEAVY RAIN', skyTop: 0x434c55, skyMid: 0x5f6870, skyBot: 0x747d85, fog: 0x6f787f, fogNear: 20, fogFar: 115, sun: 0x8d98a3, sunInt: 0.4, hemiInt: 0.9, hemiSky: 0x8f9aa4, hemiGround: 0x56595c, rain: 1000, wet: true, exposure: 0.92 }),
  fog: A({ id: 'fog', label: 'FOG', skyTop: 0x9aa3a9, skyMid: 0xb4bbc0, skyBot: 0xc6cbce, fog: 0xb5bbbf, fogNear: 12, fogFar: 100, sun: 0xdde2e6, sunInt: 0.7, hemiInt: 1.05, hemiSky: 0xc0c6ca, hemiGround: 0x7a7c7c }),
  sunset: A({ id: 'sunset', label: 'SUNSET', skyTop: 0x3c5888, skyMid: 0xc98f8a, skyBot: 0xf2a573, fog: 0xd7a48a, sun: 0xff9850, sunInt: 2.1, sunPos: [-10, 14, -70], hemiInt: 0.78, hemiSky: 0xe3b090, hemiGround: 0x5d4f52 }),
  night: A({ id: 'night', label: 'NIGHT', skyTop: 0x080f20, skyMid: 0x18243a, skyBot: 0x2a3850, fog: 0x1a2537, fogNear: 25, fogFar: 135, sun: 0x7a98c8, sunInt: 0.45, sunPos: [30, 50, -30], hemiInt: 0.6, hemiSky: 0x425878, hemiGround: 0x1c202a, night: true, exposure: 1.05 }),
  snow: A({ id: 'snow', label: 'SNOWFALL', skyTop: 0x8da1b5, skyMid: 0xb7c4d0, skyBot: 0xdde4ea, fog: 0xdce3e9, fogNear: 22, fogFar: 120, sun: 0xf0f4ff, sunInt: 1.3, hemiInt: 1.2, hemiSky: 0xdfe8f2, hemiGround: 0x9aa3ab, snow: 420 }),
  dust: A({ id: 'dust', label: 'DUST HAZE', skyTop: 0xaa865e, skyMid: 0xd2b184, skyBot: 0xe5c48f, fog: 0xd0ae7e, fogNear: 22, fogFar: 125, sun: 0xffd9a0, sunInt: 1.7, sunPos: [-40, 34, -30], hemiInt: 0.95, hemiSky: 0xe6cfa6, hemiGround: 0x9a7d5c, dust: 160 }),
};

export interface WorldDef {
  id: WorldId; name: string; blurb: string; cruise: number; cycle: SegKind[]; atmos: AtmoId[]; unlockStage: number;
}
export const WORLDS: Record<WorldId, WorldDef> = {
  paris: { id: 'paris', name: 'PARIS', blurb: 'Limestone streets, café terraces, metro stairs and a river that remembers.', cruise: 10, unlockStage: 0,
    cycle: ['street', 'alley', 'boulevard', 'cafe', 'metro', 'tunnel', 'riverfront', 'bridge', 'park', 'construction', 'rooftop', 'hidden'],
    atmos: ['morning', 'clear', 'cloudy', 'sunset', 'rain', 'night', 'fog'] },
  verdant: { id: 'verdant', name: 'VERDANT WILDS', blurb: 'Forest roads, rope bridges and abandoned structures swallowed by green.', cruise: 10.5, unlockStage: 4,
    cycle: ['wild', 'bridge', 'wild', 'town', 'tunnel', 'riverfront', 'wild', 'hidden'], atmos: ['fog', 'cloudy', 'rain', 'clear', 'morning'] },
  dustfall: { id: 'dustfall', name: 'DUSTFALL', blurb: 'Desert highways, rail crossings and warehouses baked by a patient sun.', cruise: 10.5, unlockStage: 5,
    cycle: ['wild', 'town', 'rail', 'industrial', 'tunnel', 'wild', 'bridge', 'industrial'], atmos: ['dust', 'clear', 'sunset', 'morning'] },
  frostline: { id: 'frostline', name: 'FROSTLINE', blurb: 'Mountain roads, frozen lakes and research stations sealed from the inside.', cruise: 10.5, unlockStage: 6,
    cycle: ['wild', 'bridge', 'riverfront', 'industrial', 'tunnel', 'town', 'wild'], atmos: ['snow', 'cloudy', 'fog', 'morning'] },
  monsoon: { id: 'monsoon', name: 'MONSOON CITY', blurb: 'Endless rain, flooded underpasses and a metro that never quite empties.', cruise: 11, unlockStage: 7,
    cycle: ['street', 'boulevard', 'cafe', 'metro', 'tunnel', 'bridge', 'rooftop', 'construction'], atmos: ['heavyRain', 'rain', 'night', 'fog'] },
  fractured: { id: 'fractured', name: 'FRACTURED REALITY', blurb: 'The same street, repeated. The buildings no longer agree with each other.', cruise: 11, unlockStage: 8,
    cycle: ['fracture', 'street', 'fracture', 'boulevard', 'fracture', 'tunnel', 'fracture', 'rooftop'], atmos: ['cloudy', 'fog', 'night', 'sunset'] },
  chrono: { id: 'chrono', name: 'CHRONO CORE', blurb: 'The source of the loop. Quiet, enormous, and waiting for you.', cruise: 11, unlockStage: 9,
    cycle: ['core', 'tunnel', 'core', 'bridge', 'core', 'core', 'hidden'], atmos: ['fog', 'night', 'cloudy'] },
};

export interface SwitchDef { id: string; kind: 'plate' | 'lever' | 'radio'; d: number; lane: number; label: string; duration?: number }
export interface BlockerDef { id: string; kind: 'gate' | 'gap' | 'guard' | 'phase' | 'secret'; d: number; len: number; lanes: number[]; requires: string[]; label: string }
export interface ClueDef { d: number; side: -1 | 1; kind: 'newspaper' | 'clock' | 'radio' | 'graffiti' | 'screen' | 'sign'; text: string; title?: string }
export interface EventDef { d: number; kind: 'figure' | 'glitch' | 'radio' | 'freeze' | 'vanish' | 'flicker' | 'echoTurn'; minLoop: number; text?: string; side?: number }
export interface SegDef { kind: SegKind; len: number; density: number; rows?: RowType[]; shards?: number }
export interface MissionDef { id: string; text: string; kind: 'reach' | 'survive' | 'shards' | 'coins' | 'nohit' | 'time' | 'recordings' | 'distance' | 'clues'; target: number; strict?: boolean }
export interface LootDef { d: number; lane: number; type: 'memory' | 'recording' | 'core'; id: string }
export interface SecretDef { d: number; lane: number; loot: string[] }
export interface ScriptedEchoDef { lead: number; holds: { d: number; lane: number; hold: number }[]; broken?: boolean; label?: string }
export interface TipDef { d: number; text: string; touch?: string }

export interface StageDef {
  id: string; name: string; subtitle: string; mode: Mode; chapter?: number; world: WorldId; atmos: AtmoId;
  cruise: number; segs: SegDef[]; switches: SwitchDef[]; blockers: BlockerDef[]; clues: ClueDef[]; events: EventDef[];
  loot: LootDef[]; secrets: SecretDef[]; tips: TipDef[]; missions: MissionDef[];
  hint: string; maxEchoes: number; timerShowAt: number; loopSeconds: number; seed: number;
  preEchoes?: ScriptedEchoDef[]; echoLead?: number; endlessGen?: boolean; rotateAtmos?: boolean; needEchoCap?: number;
}

const S = (kind: SegKind, len: number, density = 0.3, rows?: RowType[], shards?: number): SegDef => ({ kind, len, density, rows, shards });
const plate = (id: string, label: string, d: number, lane = 1): SwitchDef => ({ id, kind: 'plate', d, lane, label });
const lever = (id: string, label: string, d: number, lane: number, duration?: number, kind: 'lever' | 'radio' = 'lever'): SwitchDef => ({ id, kind, d, lane, label, duration });
const gate = (id: string, label: string, d: number, requires: string[], kind: BlockerDef['kind'] = 'gate', len = 2, lanes = [0, 1, 2]): BlockerDef => ({ id, kind, d, len, lanes, requires, label });

const base = (o: Partial<StageDef> & Pick<StageDef, 'id' | 'name' | 'subtitle' | 'world' | 'atmos' | 'segs'>): StageDef => ({
  mode: 'story', cruise: WORLDS[o.world].cruise, switches: [], blockers: [], clues: [], events: [], loot: [], secrets: [], tips: [],
  missions: [{ id: 'reach', text: 'Reach the exit', kind: 'reach', target: 1 }], hint: '', maxEchoes: 3, timerShowAt: 0, loopSeconds: LOOP_SECONDS, seed: 1, ...o,
});

export const STAGES: StageDef[] = [
  base({ id: 'paris-1', name: 'FIRST LOOP', subtitle: 'Paris — Morning', chapter: 1, world: 'paris', atmos: 'morning', cruise: 9.5, seed: 11, timerShowAt: 28,
    segs: [S('street', 100, 0, ['none', 'none', 'none']), S('street', 100, 0.15, ['low1', 'none', 'low1']), S('boulevard', 100, 0.25, ['beamAll', 'none', 'low1']),
      S('cafe', 110, 0.3), S('boulevard', 110, 0.35), S('metro', 100, 0.35), S('street', 100, 0.4), S('riverfront', 100, 0.4), S('bridge', 100, 0.4), S('park', 100, 0.4)],
    tips: [
      { d: 5, text: 'STEER — A / D or ← →', touch: 'STEER — swipe left / right' },
      { d: 38, text: 'Collect Time Shards and Chrono Coins' },
      { d: 88, text: 'JUMP — SPACE or ↑', touch: 'JUMP — swipe up' },
      { d: 188, text: 'SLIDE — C / CTRL', touch: 'SLIDE — swipe down' },
      { d: 290, text: 'Hold W to sprint · hold S to brake' },
      { d: 455, text: 'Something is wrong with this street.' },
    ],
    clues: [{ d: 165, side: -1, kind: 'newspaper', title: 'LE PARISIEN', text: 'STRANGE POWER FAILURE REPORTED AGAIN.' }, { d: 340, side: 1, kind: 'clock', title: 'TOWN CLOCK', text: '03:17' }],
    events: [{ d: 410, kind: 'freeze', minLoop: 1, text: 'A pedestrian stands perfectly still.' }, { d: 470, kind: 'radio', minLoop: 1, text: '"...nothing has happened today. Nothing has happened today. Nothing has—"' },
      { d: 640, kind: 'figure', minLoop: 1, side: -1 }, { d: 720, kind: 'glitch', minLoop: 1 }],
    loot: [{ d: 265, lane: 0, type: 'memory', id: 'mem-1' }],
    missions: [{ id: 'survive', text: 'Survive the loop', kind: 'survive', target: 60 }, { id: 'shards', text: 'Collect 5 Time Shards', kind: 'shards', target: 5 }, { id: 'coins', text: 'Collect 30 Chrono Coins', kind: 'coins', target: 30 }],
    hint: 'Run. Watch the street. Notice what repeats.' }),

  base({ id: 'paris-2', name: 'SECOND SELF', subtitle: 'Paris — Overcast', chapter: 2, world: 'paris', atmos: 'cloudy', cruise: 10, seed: 22, timerShowAt: 0,
    segs: [S('street', 70, 0.2, ['none', 'low1']), S('alley', 80, 0.3), S('cafe', 100, 0.3), S('boulevard', 100, 0.35), S('metro', 90, 0.35), S('tunnel', 80, 0.35)],
    switches: [plate('p1', 'A', 215)], blockers: [gate('g1', 'A', 245, ['p1'])],
    preEchoes: [{ lead: 26, holds: [{ d: 215, lane: 1, hold: 9 }] }],
    tips: [{ d: 30, text: 'Someone is running ahead of you.' }, { d: 150, text: 'That figure is wearing your jacket.' }, { d: 185, text: 'Your Echo is holding the gate open. Run through.' }],
    clues: [{ d: 120, side: 1, kind: 'graffiti', title: 'WALL', text: 'LOOP 07' }, { d: 300, side: -1, kind: 'radio', title: 'CAFÉ RADIO', text: '"Something is wrong with the city..."' }],
    events: [{ d: 160, kind: 'freeze', minLoop: 1 }, { d: 330, kind: 'glitch', minLoop: 2 }],
    loot: [{ d: 120, lane: 2, type: 'recording', id: 'rec-1' }],
    missions: [{ id: 'reach', text: 'Reach the metro entrance', kind: 'reach', target: 1 }, { id: 'time', text: 'Arrive in under 50 s', kind: 'time', target: 50 }, { id: 'shards', text: 'Collect 6 Time Shards', kind: 'shards', target: 6 }],
    hint: 'Your past self can hold the door. Follow your Echo.' }),

  base({ id: 'paris-3', name: 'CITY THAT REMEMBERS', subtitle: 'Paris — Sunset', chapter: 3, world: 'paris', atmos: 'sunset', cruise: 10, seed: 33,
    segs: [S('street', 70, 0.25), S('boulevard', 100, 0.3), S('cafe', 90, 0.35), S('construction', 90, 0.35), S('riverfront', 90, 0.35), S('bridge', 100, 0.35)],
    switches: [plate('p1', 'A', 180)], blockers: [gate('g1', 'A', 210, ['p1'])], secrets: [{ d: 300, lane: 0, loot: ['rec-2', 'mem-2'] }],
    tips: [{ d: 110, text: 'Stand on the plate (hold S), then press R to end the loop — you leave an Echo.', touch: 'Stand on the plate (HOLD), then tap RESET — you leave an Echo.' }],
    clues: [{ d: 90, side: -1, kind: 'newspaper', title: 'LE MONDE', text: 'CITY HALL CLOCK STOPS AT 03:17. AGAIN.' }, { d: 280, side: 1, kind: 'graffiti', title: 'WALL', text: 'THE CITY REMEMBERS' }],
    events: [{ d: 140, kind: 'vanish', minLoop: 2 }, { d: 390, kind: 'figure', minLoop: 2, side: 1 }, { d: 240, kind: 'radio', minLoop: 3, text: '"You are early this time."' }],
    missions: [{ id: 'reach', text: 'Reach the bridge exit', kind: 'reach', target: 1 }, { id: 'rec', text: 'Find the hidden passage recording', kind: 'recordings', target: 1 }, { id: 'nohit', text: 'Finish without being hit', kind: 'nohit', target: 0 }],
    hint: 'Hold the plate. Reset. Let your Echo open the gate.' }),

  base({ id: 'paris-4', name: 'CITY THAT REMEMBERS II', subtitle: 'Paris — Night', chapter: 3, world: 'paris', atmos: 'night', cruise: 10, seed: 44, maxEchoes: 3,
    segs: [S('street', 60, 0.25), S('alley', 80, 0.3), S('metro', 80, 0.35), S('tunnel', 100, 0.35), S('construction', 90, 0.4), S('rooftop', 100, 0.4), S('hidden', 60, 0.2)],
    switches: [plate('p1', 'A', 150), lever('l1', 'B', 300, 2, 4)], blockers: [gate('g1', 'A', 180, ['p1']), gate('g2', 'B', 345, ['l1'])],
    tips: [{ d: 90, text: 'Gate B opens for only 4 seconds. Get ahead of your Echo — then wait.' }],
    clues: [{ d: 210, side: -1, kind: 'screen', title: 'METRO TERMINAL', text: 'ECHO SYNCHRONIZATION FAILED' }],
    events: [{ d: 100, kind: 'flicker', minLoop: 1 }, { d: 420, kind: 'figure', minLoop: 2, side: -1 }],
    loot: [{ d: 240, lane: 1, type: 'memory', id: 'mem-3' }],
    missions: [{ id: 'reach', text: 'Reach the hidden passage', kind: 'reach', target: 1 }, { id: 'shards', text: 'Collect 8 Time Shards', kind: 'shards', target: 8 }],
    hint: 'Two Echoes. Two mechanisms. One of you.' }),

  base({ id: 'verdant-1', name: 'BROKEN ECHO', subtitle: 'Verdant Wilds — Fog', chapter: 4, world: 'verdant', atmos: 'fog', seed: 55,
    segs: [S('wild', 80, 0.25), S('wild', 90, 0.3), S('bridge', 80, 0.3), S('wild', 100, 0.35), S('tunnel', 90, 0.3), S('town', 80, 0.35)],
    switches: [plate('p1', 'A', 170), plate('p2', 'B', 235)], blockers: [gate('g1', 'A', 200, ['p1']), gate('g2', 'B', 262, ['p2'], 'gap', 5)],
    preEchoes: [{ lead: 0, broken: true, holds: [{ d: 148, lane: 2, hold: 40 }] }],
    tips: [{ d: 60, text: 'Your Echo is not doing what you did.' }, { d: 120, text: 'It stopped. It is looking at you.' }],
    clues: [{ d: 50, side: 1, kind: 'sign', title: 'TRAIL MARKER', text: 'YOU HAVE WALKED THIS TRAIL 6 TIMES' }],
    events: [{ d: 100, kind: 'echoTurn', minLoop: 1 }, { d: 300, kind: 'figure', minLoop: 1, side: 1 }, { d: 350, kind: 'radio', minLoop: 1, text: '"Echoes are not people. Do not trust them."' }],
    loot: [{ d: 330, lane: 1, type: 'recording', id: 'rec-3' }],
    missions: [{ id: 'reach', text: 'Cross the wilds', kind: 'reach', target: 1 }, { id: 'nohit', text: 'Finish without being hit', kind: 'nohit', target: 0 }],
    hint: 'A broken Echo cannot be trusted. Make a new one.' }),

  base({ id: 'dustfall-1', name: 'THE OBSERVER', subtitle: 'Dustfall — Haze', chapter: 5, world: 'dustfall', atmos: 'dust', seed: 66,
    segs: [S('wild', 80, 0.3), S('town', 90, 0.35), S('rail', 100, 0.35), S('industrial', 100, 0.4), S('tunnel', 80, 0.35), S('wild', 100, 0.4)],
    switches: [lever('r1', 'R', 210, 2, 5, 'radio'), plate('p1', 'A', 360)],
    blockers: [gate('g1', 'G', 262, ['r1'], 'guard', 14), gate('g2', 'A', 390, ['p1'])],
    tips: [{ d: 150, text: 'The guard sweeps the lanes. The radio will draw him away — briefly.' }],
    clues: [{ d: 100, side: -1, kind: 'screen', title: 'DEPOT TERMINAL', text: 'OBSERVER: SUBJECT 001 — LOOP 14 — STILL RUNNING' }],
    events: [{ d: 200, kind: 'radio', minLoop: 1, text: '"I have been watching you run. You are getting faster."' }, { d: 450, kind: 'figure', minLoop: 1, side: -1 }],
    loot: [{ d: 150, lane: 0, type: 'recording', id: 'rec-4' }, { d: 430, lane: 2, type: 'memory', id: 'mem-4' }],
    missions: [{ id: 'reach', text: 'Escape the depot', kind: 'reach', target: 1 }, { id: 'rec', text: 'Find the Observer recording', kind: 'recordings', target: 1 }],
    hint: 'Someone is watching. Use an Echo to distract the guard.' }),

  base({ id: 'frostline-1', name: 'THE OBSERVER II', subtitle: 'Frostline — Snowfall', chapter: 5, world: 'frostline', atmos: 'snow', seed: 77,
    segs: [S('wild', 80, 0.3), S('bridge', 100, 0.35), S('riverfront', 90, 0.35), S('industrial', 100, 0.4), S('tunnel', 80, 0.35), S('town', 90, 0.4)],
    switches: [plate('p1', 'A', 150), lever('l1', 'B', 280, 0, 4), plate('p2', 'C', 410)],
    blockers: [gate('g1', 'A', 180, ['p1']), gate('g2', 'B', 325, ['l1'], 'gap', 5), gate('g3', 'C', 440, ['p2'])],
    tips: [{ d: 200, text: 'The ice bridge extends only while the lever is active.' }],
    clues: [{ d: 120, side: 1, kind: 'screen', title: 'RESEARCH STATION', text: 'SUBJECT RETURNED. LOOP COUNT NOT RESETTING AS PREDICTED.' }],
    events: [{ d: 260, kind: 'glitch', minLoop: 2 }, { d: 500, kind: 'figure', minLoop: 1, side: 1 }],
    loot: [{ d: 350, lane: 1, type: 'memory', id: 'mem-5' }],
    missions: [{ id: 'reach', text: 'Reach the station', kind: 'reach', target: 1 }, { id: 'shards', text: 'Collect 10 Time Shards', kind: 'shards', target: 10 }],
    hint: 'Three mechanisms. Three Echoes. Keep track of the clock.' }),

  base({ id: 'monsoon-1', name: 'FRACTURED REALITY', subtitle: 'Monsoon City — Heavy Rain', chapter: 6, world: 'monsoon', atmos: 'heavyRain', seed: 88, maxEchoes: 4,
    segs: [S('street', 70, 0.35), S('boulevard', 100, 0.4), S('metro', 90, 0.4), S('tunnel', 100, 0.35), S('bridge', 90, 0.4), S('rooftop', 100, 0.4)],
    switches: [plate('p1', 'A', 140), lever('r1', 'R', 250, 0, 5, 'radio'), plate('p2', 'B', 420)],
    blockers: [gate('g1', 'A', 170, ['p1']), gate('g2', 'G', 300, ['r1'], 'guard', 12), gate('g3', 'B', 450, ['p2'])],
    tips: [{ d: 40, text: 'Cars cross on the boulevard. Listen for the horn.' }],
    clues: [{ d: 230, side: -1, kind: 'newspaper', title: 'MONSOON TIMES', text: 'THE RAIN HAS NOT STOPPED. THE DATE HAS NOT CHANGED.' }],
    events: [{ d: 180, kind: 'glitch', minLoop: 1 }, { d: 330, kind: 'echoTurn', minLoop: 2 }, { d: 480, kind: 'figure', minLoop: 1, side: -1 }],
    loot: [{ d: 210, lane: 2, type: 'recording', id: 'rec-5' }],
    missions: [{ id: 'reach', text: 'Escape the flooded city', kind: 'reach', target: 1 }, { id: 'nohit', text: 'Finish without being hit', kind: 'nohit', target: 0 }],
    hint: 'The rain is heavy. The plan is not. Trust the Echoes.' }),

  base({ id: 'fractured-1', name: 'FRACTURED REALITY II', subtitle: 'Fractured Reality — Overcast', chapter: 6, world: 'fractured', atmos: 'cloudy', seed: 99, maxEchoes: 4,
    segs: [S('fracture', 90, 0.35), S('street', 80, 0.4), S('fracture', 100, 0.4), S('tunnel', 80, 0.35), S('fracture', 100, 0.4), S('rooftop', 90, 0.4)],
    switches: [plate('p1', 'A', 130), plate('p2', 'B', 250), lever('l1', 'C', 340, 2, 4)],
    blockers: [gate('g1', 'A', 160, ['p1']), gate('g2', 'B', 280, ['p2']), gate('g3', 'C', 385, ['l1'])],
    tips: [{ d: 60, text: 'The buildings no longer agree. The road does.' }],
    clues: [{ d: 200, side: 1, kind: 'graffiti', title: 'IMPOSSIBLE WALL', text: 'LOOP 99' }],
    events: [{ d: 100, kind: 'glitch', minLoop: 1 }, { d: 220, kind: 'echoTurn', minLoop: 2 }, { d: 420, kind: 'glitch', minLoop: 2 }],
    loot: [{ d: 300, lane: 0, type: 'memory', id: 'mem-6' }],
    missions: [{ id: 'reach', text: 'Hold the street together', kind: 'reach', target: 1 }, { id: 'shards', text: 'Collect 10 Time Shards', kind: 'shards', target: 10 }],
    hint: 'Reality is breaking. Keep to the road.' }),

  base({ id: 'chrono-1', name: 'CHRONO CORE', subtitle: 'Chrono Core — Approach', chapter: 7, world: 'chrono', atmos: 'fog', seed: 111, maxEchoes: 4, needEchoCap: 4,
    segs: [S('core', 90, 0.35), S('tunnel', 80, 0.4), S('core', 100, 0.4), S('bridge', 90, 0.4), S('core', 100, 0.4), S('hidden', 60, 0.2)],
    switches: [plate('p1', 'A', 120), lever('l1', 'B', 220, 1, 4), plate('p2', 'C', 330), lever('l2', 'D', 385, 0, 4)],
    blockers: [gate('g1', 'A', 150, ['p1']), gate('g2', 'B', 265, ['l1']), gate('g3', 'C', 360, ['p2']), gate('g4', 'P', 430, ['l2'], 'phase', 1.5)],
    tips: [{ d: 300, text: 'The shimmer is a temporal barrier. Phase Step (F) passes through it.' }],
    clues: [{ d: 160, side: -1, kind: 'screen', title: 'CORE TERMINAL', text: 'THE LOOP WAS BUILT ON PURPOSE. SUBJECT 001 IS THE ANCHOR.' }],
    events: [{ d: 120, kind: 'radio', minLoop: 1, text: '"Almost there. You are nearly at the start."' }, { d: 480, kind: 'figure', minLoop: 1, side: 1 }],
    loot: [{ d: 240, lane: 2, type: 'recording', id: 'rec-6' }, { d: 470, lane: 1, type: 'core', id: 'core-1' }],
    missions: [{ id: 'reach', text: 'Reach the core chamber', kind: 'reach', target: 1 }, { id: 'nohit', text: 'Finish without being hit', kind: 'nohit', target: 0 }],
    hint: 'Four mechanisms. Four Echoes. You already know how.' }),

  base({ id: 'chrono-final', name: 'BREAK THE LOOP', subtitle: 'Chrono Core — The Final Loop', chapter: 8, world: 'chrono', atmos: 'night', seed: 222, maxEchoes: 5, needEchoCap: 4,
    segs: [S('core', 80, 0.35), S('tunnel', 70, 0.4), S('core', 90, 0.4), S('bridge', 80, 0.4), S('core', 90, 0.4), S('core', 100, 0.4), S('hidden', 50, 0.2)],
    switches: [plate('p1', 'A', 100), lever('r1', 'R', 200, 2, 5, 'radio'), plate('p2', 'B', 320), lever('l3', 'C', 400, 0, 4), lever('fin', 'Ω', 520, 1)],
    blockers: [gate('g1', 'A', 130, ['p1']), gate('g2', 'G', 250, ['r1'], 'guard', 12), gate('g3', 'B', 350, ['p2']), gate('g4', 'C', 445, ['l3'], 'gap', 6), gate('g5', 'Ω', 540, ['fin'], 'gate', 2)],
    tips: [{ d: 40, text: 'Echo 1 opens the first mechanism. Echo 2 distracts the guard. Echo 3 the second. Echo 4 builds the bridge.' }, { d: 480, text: 'The last action is yours. Pull the lever.' }],
    clues: [{ d: 300, side: 1, kind: 'screen', title: 'CORE', text: 'DESTROY · CONTROL · ESCAPE — SUBJECT MAY CHOOSE' }],
    events: [{ d: 110, kind: 'radio', minLoop: 1, text: '"You have been here before. Every time, you chose to run."' }, { d: 380, kind: 'echoTurn', minLoop: 2 }, { d: 500, kind: 'figure', minLoop: 1, side: -1 }],
    loot: [{ d: 290, lane: 0, type: 'recording', id: 'rec-7' }],
    missions: [{ id: 'reach', text: 'Break the loop', kind: 'reach', target: 1 }],
    hint: 'Everything you learned. One last loop.' }),
];

export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s]));

// ---- Loop Mode trials (generated puzzle chains) ----
function trial(id: string, name: string, world: WorldId, atmos: AtmoId, n: number, kinds: SegKind[], seed: number): StageDef {
  const gapD = n >= 5 ? 100 : 110;
  const switches: SwitchDef[] = []; const blockers: BlockerDef[] = [];
  for (let k = 1; k <= n; k++) {
    const dp = 90 + (k - 1) * gapD; const L = String.fromCharCode(64 + k);
    if (k % 2 === 1) { switches.push(plate('p' + k, L, dp)); blockers.push(gate('g' + k, L, dp + 30, ['p' + k])); }
    else { switches.push(lever('l' + k, L, dp, k % 4 === 0 ? 0 : 2, 4)); blockers.push(gate('g' + k, L, dp + 45, ['l' + k])); }
  }
  const total = 90 + n * gapD + 60; const segs: SegDef[] = []; let acc = 0; let i = 0;
  while (acc < total) { const len = Math.min(100, total - acc); segs.push(S(kinds[i % kinds.length], len, 0.3 + Math.min(0.2, i * 0.04))); acc += len; i++; }
  return base({ id, name, subtitle: `${WORLDS[world].name} — ${n} Echo${n > 1 ? 'es' : ''}`, mode: 'loop', world, atmos, segs, switches, blockers, seed, maxEchoes: Math.max(3, n), needEchoCap: n,
    tips: [{ d: 50, text: 'Each Echo is a previous run. Leave one, then beat the gates.' }],
    missions: [{ id: 'reach', text: 'Reach the exit', kind: 'reach', target: 1 }],
    hint: `Solve the chain with ${n} Echo${n > 1 ? 'es' : ''}.` });
}
export const TRIALS: StageDef[] = [
  trial('trial-1', 'HOLD THE DOOR', 'paris', 'clear', 1, ['street', 'boulevard', 'cafe'], 301),
  trial('trial-2', 'DOUBLE SHIFT', 'paris', 'sunset', 2, ['alley', 'boulevard', 'metro', 'tunnel'], 302),
  trial('trial-3', 'THREE’S COMPANY', 'verdant', 'fog', 3, ['wild', 'bridge', 'town'], 303),
  trial('trial-4', 'FOUR CORNERS', 'dustfall', 'dust', 4, ['wild', 'town', 'industrial', 'rail'], 304),
  trial('trial-5', 'FIVE FOLD', 'monsoon', 'heavyRain', 5, ['street', 'boulevard', 'metro', 'rooftop'], 305),
];

// ---- Challenges ----
const ch = (o: Partial<StageDef> & Pick<StageDef, 'id' | 'name' | 'subtitle' | 'world' | 'atmos' | 'segs' | 'missions'>) => base({ mode: 'challenge', ...o });
export const CHALLENGES: StageDef[] = [
  ch({ id: 'ch-shards', name: 'SHARD RUSH', subtitle: 'Collect 25 Time Shards before the loop ends', world: 'paris', atmos: 'clear', seed: 401, endlessGen: true, segs: [],
    missions: [{ id: 'shards', text: 'Collect 25 Time Shards', kind: 'shards', target: 25 }], hint: 'Shards glow in risky lanes. Go get them.' }),
  ch({ id: 'ch-clean', name: 'CLEAN RUN', subtitle: 'Reach 450 m without a single hit', world: 'paris', atmos: 'cloudy', seed: 402, endlessGen: true, segs: [],
    missions: [{ id: 'distance', text: 'Run 450 m without a hit', kind: 'distance', target: 450, strict: true }], hint: 'One mistake and the loop fails.' }),
  ch({ id: 'ch-follow', name: 'FOLLOW YOUR ECHO', subtitle: 'Your Echo holds the door. Keep up.', world: 'paris', atmos: 'morning', seed: 403, cruise: 10,
    segs: [S('street', 80, 0.25), S('boulevard', 100, 0.3), S('cafe', 100, 0.3)], switches: [plate('p1', 'A', 130)], blockers: [gate('g1', 'A', 160, ['p1'])],
    preEchoes: [{ lead: 18, holds: [{ d: 130, lane: 1, hold: 7 }] }], missions: [{ id: 'reach', text: 'Reach the exit through Gate A', kind: 'reach', target: 1 }], hint: 'Stay behind your Echo. Let it open the gate.' }),
  ch({ id: 'ch-sprint', name: 'SPRINT TO THE METRO', subtitle: 'Reach the exit in 40 seconds', world: 'paris', atmos: 'sunset', seed: 404, loopSeconds: 40, cruise: 10.5,
    segs: [S('street', 90, 0.3), S('boulevard', 100, 0.35), S('cafe', 90, 0.35), S('metro', 90, 0.35)], missions: [{ id: 'reach', text: 'Reach the metro in 40 s', kind: 'reach', target: 1 }], hint: 'Hold W. Dash (Shift) through the gaps.' }),
  ch({ id: 'ch-rain', name: 'RAIN CHECK', subtitle: 'Survive 600 m of Monsoon City', world: 'monsoon', atmos: 'heavyRain', seed: 405, endlessGen: true, segs: [],
    missions: [{ id: 'distance', text: 'Run 600 m', kind: 'distance', target: 600 }], hint: 'Low visibility. Listen for vehicles.' }),
  ch({ id: 'ch-secret', name: 'THE HIDDEN ROUTE', subtitle: 'Find the hidden passage and its recording', world: 'paris', atmos: 'night', seed: 406,
    segs: [S('street', 80, 0.25), S('alley', 100, 0.3), S('alley', 100, 0.3), S('metro', 80, 0.3)], secrets: [{ d: 150, lane: 0, loot: ['rec-8'] }],
    clues: [{ d: 100, side: 1, kind: 'graffiti', title: 'WALL', text: 'THE WALL IS NOT A WALL' }],
    missions: [{ id: 'recordings', text: 'Recover the hidden recording', kind: 'recordings', target: 1 }], hint: 'Some walls are levers. Look for the symbol.' }),
];

export interface ChapterDef { n: number; title: string; tagline: string; intro: string; observer: string; stages: string[] }
export const CHAPTERS: ChapterDef[] = [
  { n: 1, title: 'FIRST LOOP', tagline: 'Something is wrong.', intro: 'A quiet morning in Paris. You run, because that is what you do. The clock on the tower says 03:17.', observer: '…', stages: ['paris-1'] },
  { n: 2, title: 'SECOND SELF', tagline: 'Your previous self is still here.', intro: 'It is morning again. Somebody is running ahead of you — and they are wearing your jacket.', observer: 'You noticed. Good.', stages: ['paris-2'] },
  { n: 3, title: 'CITY THAT REMEMBERS', tagline: 'The city is repeating.', intro: 'The newspaper headlines repeat. A car is missing. A door that was locked is open. The city remembers what you did.', observer: 'Every loop leaves a mark.', stages: ['paris-3', 'paris-4'] },
  { n: 4, title: 'BROKEN ECHO', tagline: 'Not every Echo is yours.', intro: 'The road leaves the city. Your Echo does not follow your steps anymore. It stops. It turns to look at you.', observer: 'That one is not yours anymore.', stages: ['verdant-1'] },
  { n: 5, title: 'THE OBSERVER', tagline: 'Someone is watching.', intro: 'Desert, then snow. Signals, terminals, recordings. Someone has been keeping count of your loops.', observer: 'I have been watching you run. Loop fourteen.', stages: ['dustfall-1', 'frostline-1'] },
  { n: 6, title: 'FRACTURED REALITY', tagline: 'The world begins to break.', intro: 'Rain that never stops. Streets that repeat. The buildings no longer agree with each other.', observer: 'It is getting harder to hold together.', stages: ['monsoon-1', 'fractured-1'] },
  { n: 7, title: 'CHRONO CORE', tagline: 'The loop was created intentionally.', intro: 'At the heart of every loop, a place that was built for you. Quiet. Enormous. Waiting.', observer: 'You built me to watch you. Do you remember?', stages: ['chrono-1'] },
  { n: 8, title: 'BREAK THE LOOP', tagline: 'Destroy. Control. Escape.', intro: 'Every Echo you left is still out there. Use all of them. One last run.', observer: 'Whatever you decide — make it yours.', stages: ['chrono-final'] },
];

export const STORY_ORDER: string[] = CHAPTERS.flatMap((c) => c.stages);

// ---- Lore ----
export interface LoreEntry { id: string; kind: 'memory' | 'recording'; title: string; text: string }
export const LORE: LoreEntry[] = [
  { id: 'mem-1', kind: 'memory', title: 'Memory — Morning Run', text: 'A photograph of a runner crossing a bridge at dawn. On the back: "Start line. You always started here."' },
  { id: 'rec-1', kind: 'recording', title: 'Recording 01 — Café Tape', text: '"Day nine. Or day one. The coffee machine says 03:17 every time. I stopped asking why."' },
  { id: 'rec-2', kind: 'recording', title: 'Recording 02 — Hidden Passage', text: '"If you found this wall, you are already learning. The city remembers every door you open."' },
  { id: 'mem-2', kind: 'memory', title: 'Memory — The Wrong Clock', text: 'A town clock, hands stopped. Someone has scratched beneath it: "It stopped the first time I did this."' },
  { id: 'mem-3', kind: 'memory', title: 'Memory — Metro Platform', text: 'A ticket stamped 03:17. The destination has been scratched out.' },
  { id: 'rec-3', kind: 'recording', title: 'Recording 03 — Field Note', text: '"The Echo stopped and looked back at me. I swear it was afraid of me."' },
  { id: 'rec-4', kind: 'recording', title: 'Recording 04 — The Observer', text: '"Subject 001 is on loop fourteen. Behavior: stable. Adaptation: improving. Continue observation."' },
  { id: 'mem-4', kind: 'memory', title: 'Memory — Depot Radio', text: 'A battered radio tuned to static. Within the static, a voice counting: "…thirteen… fourteen…"' },
  { id: 'mem-5', kind: 'memory', title: 'Memory — Station Window', text: 'Frost on a window. Someone has drawn the loop symbol in it — a circle that does not quite close.' },
  { id: 'rec-5', kind: 'recording', title: 'Recording 05 — Monsoon Times', text: '"The date is wrong in every newspaper. The rain has not stopped since I got here."' },
  { id: 'mem-6', kind: 'memory', title: 'Memory — Fractured Street', text: 'Two identical photographs of one street. In one, you are in the frame. In the other, you are behind the camera.' },
  { id: 'rec-6', kind: 'recording', title: 'Recording 06 — Core Log', text: '"The loop is not a fault. The loop is a room. Someone built it so that one person could never leave."' },
  { id: 'core-1', kind: 'memory', title: 'Echo Core', text: 'A compact device that hums at the pitch of your footsteps. It remembers how you ran.' },
  { id: 'rec-7', kind: 'recording', title: 'Recording 07 — Final Transmission', text: '"You can destroy the loop, control it, or escape it. All three are possible. Only one is kind."' },
  { id: 'rec-8', kind: 'recording', title: 'Recording 08 — Challenge Tape', text: '"Not every wall is a wall. Some are invitations."' },
];

// ---- Abilities & cosmetics ----
export interface AbilityDef { id: string; name: string; key: string; desc: string; unlockStage: number }
export const ABILITIES: AbilityDef[] = [
  { id: 'dash', name: 'TIME DASH', key: 'SHIFT', desc: 'A short temporal burst of speed. Brief invulnerability.', unlockStage: 0 },
  { id: 'sync', name: 'ECHO SYNC', key: 'PASSIVE', desc: 'Pressure plates stay active 2 seconds longer after your Echo steps off.', unlockStage: 3 },
  { id: 'slow', name: 'SLOW TIME', key: 'Q', desc: 'Slows vehicles and trains for 4 seconds. 20 second cooldown.', unlockStage: 4 },
  { id: 'phase', name: 'PHASE STEP', key: 'F', desc: 'Pass through a temporal barrier for 1.2 seconds. 12 second cooldown.', unlockStage: 8 },
];

export type CosSlot = 'jacket' | 'shirt' | 'pants' | 'shoes' | 'pack' | 'acc';
export interface CosmeticDef { id: string; slot: CosSlot; name: string; cost: number; value: string }
export const COSMETICS: CosmeticDef[] = [
  { id: 'jk-grey', slot: 'jacket', name: 'Slate Jacket', cost: 0, value: '#5d6670' },
  { id: 'jk-olive', slot: 'jacket', name: 'Field Olive', cost: 60, value: '#5b6444' },
  { id: 'jk-navy', slot: 'jacket', name: 'Navy Windbreaker', cost: 80, value: '#27384f' },
  { id: 'jk-rust', slot: 'jacket', name: 'Rust Parka', cost: 100, value: '#8a4f34' },
  { id: 'jk-black', slot: 'jacket', name: 'Black Shell', cost: 120, value: '#23262b' },
  { id: 'sh-white', slot: 'shirt', name: 'White Tee', cost: 0, value: '#e6e3da' },
  { id: 'sh-black', slot: 'shirt', name: 'Black Tee', cost: 40, value: '#24262a' },
  { id: 'sh-mustard', slot: 'shirt', name: 'Mustard Tee', cost: 50, value: '#c2953a' },
  { id: 'pt-jeans', slot: 'pants', name: 'Indigo Jeans', cost: 0, value: '#2e3f5c' },
  { id: 'pt-black', slot: 'pants', name: 'Black Trousers', cost: 50, value: '#1f2024' },
  { id: 'pt-khaki', slot: 'pants', name: 'Khaki Cargo', cost: 60, value: '#8b7d5e' },
  { id: 'sn-white', slot: 'shoes', name: 'White Sneakers', cost: 0, value: '#ddddd8' },
  { id: 'sn-black', slot: 'shoes', name: 'Black Runners', cost: 40, value: '#1c1c1e' },
  { id: 'sn-red', slot: 'shoes', name: 'Signal Red', cost: 70, value: '#a83a2e' },
  { id: 'pk-grey', slot: 'pack', name: 'Grey Daypack', cost: 0, value: '#474c52' },
  { id: 'pk-green', slot: 'pack', name: 'Green Rucksack', cost: 70, value: '#45573e' },
  { id: 'pk-none', slot: 'pack', name: 'No Pack', cost: 0, value: 'none' },
  { id: 'ac-none', slot: 'acc', name: 'None', cost: 0, value: 'none' },
  { id: 'ac-cap', slot: 'acc', name: 'Runner Cap', cost: 60, value: 'cap' },
  { id: 'ac-beanie', slot: 'acc', name: 'Wool Beanie', cost: 60, value: 'beanie' },
  { id: 'ac-glasses', slot: 'acc', name: 'Sport Glasses', cost: 90, value: 'glasses' },
];

export const HINTS = [
  'Your past is part of your strategy.', 'Every mistake creates an Echo.', 'Watch what your previous self does.', 'The city remembers.',
  'Gates that close behind your Echo can still open for you.', 'Brake (S) to wait for your Echo at a gate.', 'Not every wall is a wall.',
];

export const OBSERVER_LINES = [
  '"You are early this time."', '"Loop after loop. Still curious."', '"Do you remember the first time?"', '"Somebody is keeping count."',
];
