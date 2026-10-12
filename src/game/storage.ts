// LOOPBREAK — local save system (browser storage only, no accounts).
import { useSyncExternalStore } from 'react';
import { COSMETICS, type CosSlot } from './data';

export interface Settings {
  master: number; music: number; sfx: number; sensitivity: number; shake: number;
  quality: 'low' | 'medium' | 'high'; subtitles: boolean;
  keys: { left: string; right: string; jump: string; slide: string; dash: string; interact: string; reset: string; slow: string; phase: string };
}

export interface SaveData {
  v: 1;
  completed: string[]; coins: number; shards: number; memories: string[]; recordings: string[]; cores: number; clues: string[];
  missions: string[]; best: Record<string, number>; bestEndless: number; echoCap: number;
  owned: string[]; equipped: Record<CosSlot, string>; trialsDone: string[]; challengesDone: string[];
  endingSeen: boolean; stats: { distance: number; loops: number; echoes: number; runs: number };
  settings: Settings; tutorialSeen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8, music: 0.55, sfx: 0.8, sensitivity: 0.5, shake: 0.5, quality: 'medium', subtitles: true,
  keys: { left: 'KeyA', right: 'KeyD', jump: 'Space', slide: 'KeyC', dash: 'ShiftLeft', interact: 'KeyE', reset: 'KeyR', slow: 'KeyQ', phase: 'KeyF' },
};

const defaults = (): SaveData => ({
  v: 1, completed: [], coins: 0, shards: 0, memories: [], recordings: [], cores: 0, clues: [], missions: [], best: {}, bestEndless: 0, echoCap: 3,
  owned: COSMETICS.filter((c) => c.cost === 0).map((c) => c.id),
  equipped: { jacket: 'jk-grey', shirt: 'sh-white', pants: 'pt-jeans', shoes: 'sn-white', pack: 'pk-grey', acc: 'ac-none' },
  trialsDone: [], challengesDone: [], endingSeen: false, stats: { distance: 0, loops: 0, echoes: 0, runs: 0 },
  settings: { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_SETTINGS.keys } }, tutorialSeen: false,
});

const KEY = 'loopbreak.save.v1';
let data: SaveData = load();
const listeners = new Set<() => void>();
let version = 0;

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const p = JSON.parse(raw);
    const d = defaults();
    return { ...d, ...p, settings: { ...d.settings, ...(p.settings || {}), keys: { ...d.settings.keys, ...((p.settings || {}).keys || {}) } }, equipped: { ...d.equipped, ...(p.equipped || {}) }, stats: { ...d.stats, ...(p.stats || {}) } };
  } catch { return defaults(); }
}

export function getSave(): SaveData { return data; }

export function updateSave(fn: (s: SaveData) => void): void {
  fn(data);
  version++;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

export function resetSave(): void { data = defaults(); updateSave(() => {}); }

export function subscribe(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }

export function useSave(): SaveData {
  useSyncExternalStore(subscribe, () => version);
  return data;
}

export function storyProgress(s: SaveData, order: string[]): number {
  let n = 0;
  for (const id of order) { if (s.completed.includes(id)) n++; else break; }
  return n; // index of next unlocked stage
}
