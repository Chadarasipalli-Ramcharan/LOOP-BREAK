import { useEffect, useState } from 'react';
import { ABILITIES, COSMETICS, LORE, STAGE_BY_ID, STORY_ORDER, type CosSlot } from '../game/data';
import { DEFAULT_SETTINGS, resetSave, storyProgress, updateSave, useSave, type Settings } from '../game/storage';
import { Btn, Screen, Slider, Stat, Toggle, cx, click } from './kit';

const pretty = (c: string): string => c.replace('Key', '').replace('Arrow', '').replace('ShiftLeft', 'SHIFT').replace('ControlLeft', 'CTRL').replace('Space', 'SPACE');
const KEY_ROWS: { id: keyof Settings['keys']; label: string }[] = [{ id: 'left', label: 'Move left' }, { id: 'right', label: 'Move right' }, { id: 'jump', label: 'Jump' }, { id: 'slide', label: 'Slide' }, { id: 'dash', label: 'Dash' }, { id: 'interact', label: 'Interact' }, { id: 'reset', label: 'Reset loop' }, { id: 'slow', label: 'Slow time' }, { id: 'phase', label: 'Phase step' }];

export function SettingsScreen({ onBack, onApply }: { onBack: () => void; onApply: () => void }) {
  const s = useSave().settings; const [listen, setListen] = useState<keyof Settings['keys'] | null>(null); const [confirm, setConfirm] = useState(false);
  const set = (fn: (x: Settings) => void) => { updateSave((d) => fn(d.settings)); onApply(); };
  useEffect(() => { if (!listen) return; const f = (e: KeyboardEvent) => { e.preventDefault(); e.stopPropagation(); if (e.code !== 'Escape') set((x) => { x.keys[listen] = e.code; }); setListen(null); }; window.addEventListener('keydown', f, true); return () => window.removeEventListener('keydown', f, true); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen]);
  return (
    <Screen title="Settings" subtitle="Audio · controls · accessibility · graphics" onBack={onBack}>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2"><h3 className="font-display text-sm uppercase tracking-[0.3em] text-[#f2a93b]">Audio</h3>
          <Slider label="Master volume" value={s.master} onChange={(v) => set((x) => { x.master = v; })} /><Slider label="Music" value={s.music} onChange={(v) => set((x) => { x.music = v; })} /><Slider label="Effects & ambience" value={s.sfx} onChange={(v) => set((x) => { x.sfx = v; })} />
          <h3 className="pt-4 font-display text-sm uppercase tracking-[0.3em] text-[#f2a93b]">Accessibility</h3>
          <Slider label="Swipe / control sensitivity" value={s.sensitivity} onChange={(v) => set((x) => { x.sensitivity = v; })} /><Slider label="Camera shake" value={s.shake} onChange={(v) => set((x) => { x.shake = v; })} /><Toggle label="Subtitles" on={s.subtitles} onChange={(v) => set((x) => { x.subtitles = v; })} />
          <h3 className="pt-4 font-display text-sm uppercase tracking-[0.3em] text-[#f2a93b]">Graphics quality</h3>
          <div className="grid grid-cols-3 gap-2">{(['low', 'medium', 'high'] as const).map((q) => <button key={q} onClick={() => { click(); set((x) => { x.quality = q; }); }} className={cx('pointer-events-auto border px-3 py-2 font-display text-sm uppercase tracking-[0.18em]', s.quality === q ? 'border-[#f2a93b] bg-[#f2a93b]/20 text-[#f2a93b]' : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10')}>{q}</button>)}</div>
          <p className="text-xs text-white/40">Low disables shadows and lowers resolution for weaker devices.</p>
        </section>
        <section className="space-y-2"><h3 className="font-display text-sm uppercase tracking-[0.3em] text-[#f2a93b]">Controls</h3>
          {KEY_ROWS.map((r) => (<button key={r.id} onClick={() => { click(); setListen(r.id); }} className="pointer-events-auto flex w-full items-center justify-between border border-white/10 bg-white/5 px-4 py-2.5 text-left hover:bg-white/10"><span className="font-display text-sm uppercase tracking-[0.14em] text-white/90">{r.label}</span><span className={cx('min-w-16 border px-2 py-0.5 text-center text-xs uppercase tracking-widest', listen === r.id ? 'border-[#f2a93b] text-[#f2a93b]' : 'border-white/20 text-white/70')}>{listen === r.id ? 'press key…' : pretty(s.keys[r.id])}</span></button>))}
          <p className="text-xs text-white/40">Also works: arrow keys, W/↑ sprint, S/↓ brake, CTRL slide, ESC pause. Touch: swipe to steer, jump and slide.</p>
          <div className="flex gap-2 pt-2"><Btn small onClick={() => set((x) => { x.keys = { ...DEFAULT_SETTINGS.keys }; })}>Reset keys</Btn>
            {confirm ? <Btn small primary onClick={() => { resetSave(); setConfirm(false); onApply(); }}>Confirm erase save</Btn> : <Btn small onClick={() => setConfirm(true)}>Erase save data</Btn>}</div>
        </section>
      </div>
    </Screen>
  );
}

function Swatch({ c, label, tone }: { c: string; label: string; tone: string }) {
  return <div className="flex items-start gap-3 border border-white/10 bg-white/5 p-3"><span className="mt-0.5 h-8 w-8 shrink-0" style={{ background: c }} /><div><div className="font-display text-sm uppercase tracking-[0.16em]" style={{ color: tone }}>{label}</div></div></div>;
}

export function HowToScreen({ onBack }: { onBack: () => void }) {
  const cards: { t: string; k: string; d: string }[] = [
    { t: 'Move', k: 'A / D · ← → · swipe', d: 'Steer between three lanes. The route is always readable: coins show the way.' }, { t: 'Jump', k: 'SPACE · swipe up', d: 'Clear low barriers, benches and gaps. Jump early — there is a short grace window.' },
    { t: 'Slide', k: 'C / CTRL · swipe down', d: 'Duck under yellow/black beams and low signs. Slide in mid-air to drop fast.' }, { t: 'Dash', k: 'SHIFT', d: 'A short temporal burst with brief invulnerability. 3.5 s cooldown.' },
    { t: 'Interact', k: 'E · USE', d: 'Pull levers, use radios, examine symbols. Plates need you to stand still on them (hold S).' }, { t: 'Collect', k: 'Shards · Coins · Memories', d: 'Time Shards and Chrono Coins fuel progress. Memory Fragments and Lost Recordings tell the story.' },
    { t: 'Avoid', k: 'Red/white · yellow/black', d: 'Striped obstacles hurt. Vehicles block lanes. Listen for horns and trains — sound warns you first.' }, { t: 'Use your Echo', k: 'R — end the loop', d: 'Every run becomes an Echo that replays it. Leave one on a plate, reset, then pass the gate it opens.' },
  ];
  return (
    <Screen title="How to Play" subtitle="Run → observe → adapt → use your Echo → escape" onBack={onBack} wide>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map((c) => (<div key={c.t} className="border border-white/10 bg-white/5 p-4"><div className="font-display text-xl uppercase tracking-[0.2em] text-white">{c.t}</div><div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#f2a93b]">{c.k}</div><p className="mt-2 text-sm leading-relaxed text-white/60">{c.d}</p></div>))}</div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><Swatch c="repeating-linear-gradient(45deg,#c9322b 0 8px,#f1f1ee 8px 16px)" label="Dangerous — red / white" tone="#ff8a72" /><Swatch c="repeating-linear-gradient(45deg,#e3b82c 0 8px,#1d1d1d 8px 16px)" label="Slide under — yellow / black" tone="#f2c23b" /><Swatch c="#5fe08a" label="Interactive — plates & levers glow" tone="#7fe3a2" /></div>
      <div className="mt-8 border border-white/10 bg-black/30 p-5">
        <h3 className="font-display text-lg uppercase tracking-[0.25em] text-[#8cc4ff]">The loop, explained</h3>
        <svg viewBox="0 0 720 230" className="mt-4 w-full">
          <style>{`@keyframes runA{0%{transform:translateX(0)}100%{transform:translateX(560px)}}@keyframes runB{0%{transform:translateX(0)}100%{transform:translateX(560px)}}.rA{animation:runA 4s linear infinite}.rB{animation:runB 4s linear infinite}`}</style>
          <text x="10" y="22" fill="#f2a93b" fontSize="13" fontFamily="Oswald,sans-serif" letterSpacing="3">LOOP 01 — YOU LEAVE THE GATE CLOSED… AND STAND ON THE PLATE</text>
          <line x1="60" y1="55" x2="680" y2="55" stroke="#ffffff33" strokeWidth="2" /><rect x="300" y="48" width="36" height="14" fill="#5fe08a" opacity="0.8" /><rect x="470" y="30" width="8" height="50" fill="#d93b2e" /><circle className="rA" cx="70" cy="55" r="8" fill="#e8e4d8" />
          <text x="10" y="112" fill="#8cc4ff" fontSize="13" fontFamily="Oswald,sans-serif" letterSpacing="3">LOOP 02 — YOUR ECHO HOLDS THE PLATE. YOU RUN THROUGH.</text>
          <line x1="60" y1="145" x2="680" y2="145" stroke="#ffffff33" strokeWidth="2" /><rect x="300" y="138" width="36" height="14" fill="#5fe08a" opacity="0.8" /><rect x="470" y="140" width="8" height="8" fill="#5fe08a" />
          <circle cx="318" cy="145" r="8" fill="#8cc4ff" opacity="0.6" /><circle className="rB" cx="70" cy="145" r="8" fill="#e8e4d8" />
          <text x="10" y="205" fill="#ffffff88" fontSize="12" fontFamily="Inter,sans-serif">Every Echo is a perfect copy of a previous run. Combine up to five to open a path no single run could take.</text>
        </svg>
      </div>
    </Screen>
  );
}

type Tab = 'items' | 'archive' | 'abilities' | 'wardrobe';
const SLOTS: { id: CosSlot; label: string }[] = [{ id: 'jacket', label: 'Jackets' }, { id: 'shirt', label: 'Shirts' }, { id: 'pants', label: 'Pants' }, { id: 'shoes', label: 'Shoes' }, { id: 'pack', label: 'Backpacks' }, { id: 'acc', label: 'Accessories' }];

export function CollectionScreen({ onBack }: { onBack: () => void }) {
  const save = useSave(); const [tab, setTab] = useState<Tab>('items'); const prog = storyProgress(save, STORY_ORDER);
  const tabs: [Tab, string][] = [['items', 'Collectibles'], ['archive', 'Archive'], ['abilities', 'Abilities'], ['wardrobe', 'Wardrobe']];
  const buy = (id: string, cost: number, slot: CosSlot) => updateSave((s) => { if (!s.owned.includes(id)) { if (s.coins < cost) return; s.coins -= cost; s.owned.push(id); } s.equipped[slot] = id; });
  return (
    <Screen title="Collection" subtitle="Everything the loop has given you" onBack={onBack} wide>
      <div className="mb-6 flex flex-wrap gap-2">{tabs.map(([id, l]) => <button key={id} onClick={() => { click(); setTab(id); }} className={cx('pointer-events-auto border px-4 py-2 font-display text-sm uppercase tracking-[0.2em]', tab === id ? 'border-[#f2a93b] bg-[#f2a93b]/15 text-[#f2a93b]' : 'border-white/15 text-white/70 hover:bg-white/10')}>{l}</button>)}</div>
      {tab === 'items' && (<div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Chrono Coins" value={save.coins} /><Stat label="Time Shards" value={save.shards} /><Stat label="Echo Cores" value={save.cores} /><Stat label="Echo capacity" value={save.echoCap} sub="max 5" />
        <Stat label="Memory Fragments" value={save.memories.length} sub={`of ${LORE.filter((l) => l.kind === 'memory').length}`} /><Stat label="Lost Recordings" value={save.recordings.length} sub={`of ${LORE.filter((l) => l.kind === 'recording').length}`} /><Stat label="Clues found" value={save.clues.length} /><Stat label="Missions done" value={save.missions.length} />
        <Stat label="Distance run" value={`${Math.round(save.stats.distance)} m`} /><Stat label="Echoes created" value={save.stats.echoes} /><Stat label="Runs" value={save.stats.runs} /><Stat label="Best endless" value={`${save.bestEndless} m`} /></div>)}
      {tab === 'archive' && (<div className="grid gap-3 sm:grid-cols-2">{LORE.map((l) => { const got = l.id === 'core-1' ? save.cores > 0 : save.memories.includes(l.id) || save.recordings.includes(l.id); return (
        <div key={l.id} className={cx('border p-4', got ? 'border-white/15 bg-white/5' : 'border-white/5 bg-white/[0.02]')}><div className="font-display text-sm uppercase tracking-[0.18em]" style={{ color: got ? (l.kind === 'recording' ? '#7fe3a2' : '#e8e4d8') : '#ffffff55' }}>{got ? l.title : '??? — undiscovered'}</div><p className="mt-2 font-sans text-sm italic leading-relaxed text-white/70">{got ? l.text : 'Something is hidden in the loop. Explore side lanes and sealed walls.'}</p></div>); })}</div>)}
      {tab === 'abilities' && (<div className="grid gap-3 sm:grid-cols-2">{ABILITIES.map((a) => { const on = prog >= a.unlockStage; const need = STAGE_BY_ID[STORY_ORDER[a.unlockStage - 1]]; return (
        <div key={a.id} className={cx('border p-4', on ? 'border-[#f2a93b]/50 bg-[#f2a93b]/5' : 'border-white/10 bg-white/[0.02] opacity-70')}><div className="flex items-baseline justify-between"><span className="font-display text-lg uppercase tracking-[0.18em] text-white">{a.name}</span><span className="text-xs uppercase tracking-widest text-white/50">{a.key}</span></div><p className="mt-2 text-sm text-white/60">{a.desc}</p><p className="mt-2 text-[11px] uppercase tracking-widest text-white/40">{on ? 'Unlocked' : `Unlocks after ${need ? need.name : 'story progress'}`}</p></div>); })}
        <div className="border border-[#8cc4ff]/40 bg-[#8cc4ff]/5 p-4"><div className="font-display text-lg uppercase tracking-[0.18em] text-white">Echo capacity: {save.echoCap}</div><p className="mt-2 text-sm text-white/60">How many previous runs can replay at once. Grows to 4 after The Observer and 5 after Chrono Core.</p></div></div>)}
      {tab === 'wardrobe' && (<div className="space-y-6"><p className="text-sm text-white/50">Spend Chrono Coins ({save.coins}) on grounded, everyday gear. Your Echoes wear the same clothes.</p>
        {SLOTS.map((sl) => (<div key={sl.id}><h3 className="mb-2 font-display text-sm uppercase tracking-[0.3em] text-[#f2a93b]">{sl.label}</h3><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{COSMETICS.filter((c) => c.slot === sl.id).map((c) => { const owned = save.owned.includes(c.id); const eq = save.equipped[sl.id] === c.id; return (
          <button key={c.id} onClick={() => buy(c.id, c.cost, sl.id)} className={cx('pointer-events-auto border p-3 text-left', eq ? 'border-[#f2a93b] bg-[#f2a93b]/10' : 'border-white/10 bg-white/5 hover:bg-white/10', !owned && save.coins < c.cost && 'opacity-50')}>
            <span className="mb-2 block h-6 w-full border border-white/10" style={{ background: c.value.startsWith('#') ? c.value : '#2a2d31' }} /><div className="font-display text-xs uppercase tracking-[0.14em] text-white">{c.name}</div><div className="text-[11px] uppercase tracking-widest text-white/50">{eq ? 'equipped' : owned ? 'equip' : `${c.cost} coins`}</div></button>); })}</div></div>))}</div>)}
    </Screen>
  );
}
