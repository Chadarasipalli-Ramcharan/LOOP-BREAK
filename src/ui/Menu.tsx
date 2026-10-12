import { CHALLENGES, CHAPTERS, STAGE_BY_ID, STORY_ORDER, TRIALS, WORLDS, type StageDef, type WorldId } from '../game/data';
import { storyProgress, useSave } from '../game/storage';
import { Btn, LoopMark, Screen, cx, fmtTime } from './kit';
import { CREATOR_LOGO, RemoteImage } from './Creator';

export type NavId = 'story' | 'loop' | 'endless' | 'challenges' | 'collection' | 'settings' | 'howto' | 'creator';

export function MainMenu({ onNav, onContinue }: { onNav: (id: NavId) => void; onContinue: () => void }) {
  const save = useSave(); const prog = storyProgress(save, STORY_ORDER); const done = prog >= STORY_ORDER.length;
  const next = STAGE_BY_ID[STORY_ORDER[Math.min(prog, STORY_ORDER.length - 1)]];
  const items: { id: NavId | 'play'; label: string; sub?: string }[] = [
    { id: 'play', label: prog === 0 ? 'Play' : done ? 'Replay Finale' : 'Continue', sub: prog === 0 ? 'Chapter 1 — First Loop' : `Chapter ${next.chapter} — ${next.name}` },
    { id: 'story', label: 'Story', sub: 'Eight chapters' }, { id: 'loop', label: 'Loop Mode', sub: 'Pure Echo puzzles' }, { id: 'endless', label: 'Endless', sub: `Best ${save.bestEndless} m` },
    { id: 'challenges', label: 'Challenges', sub: `${save.challengesDone.length}/${CHALLENGES.length}` }, { id: 'collection', label: 'Collection' }, { id: 'settings', label: 'Settings' }, { id: 'howto', label: 'How to Play' }, { id: 'creator', label: 'About the Creator' },
  ];
  return (
    <div className="fixed inset-0 z-10 flex">
      <div className="flex h-full w-full flex-col justify-between bg-gradient-to-r from-black/85 via-black/55 to-transparent px-6 py-6 sm:w-[520px] sm:px-10 sm:py-10">
        <div>
          <div className="flex items-center gap-3"><LoopMark size={44} /><div className="font-display text-[10px] uppercase tracking-[0.4em] text-white/50">A time-loop action runner</div></div>
          <h1 className="mt-2 font-display text-5xl uppercase leading-none tracking-[0.12em] text-white sm:text-7xl">Loop<span className="text-[#f2a93b]">break</span></h1>
          <p className="mt-2 max-w-sm font-display text-[11px] uppercase tracking-[0.22em] text-white/70 sm:text-xs">Run your past. Change your future. Break the loop.</p>
        </div>
        <nav className="my-4 space-y-1 overflow-y-auto">
          {items.map((it, i) => (
            <button key={it.id} onClick={() => { if (it.id === 'play') onContinue(); else onNav(it.id as NavId); }}
              className={cx('group pointer-events-auto flex w-full items-baseline gap-3 border-l-2 px-4 py-1.5 text-left transition-all duration-150 hover:translate-x-2 hover:bg-white/10', i === 0 ? 'border-[#f2a93b] bg-[#f2a93b]/10' : 'border-white/15 hover:border-[#f2a93b]')}>
              <span className={cx('font-display uppercase tracking-[0.2em]', i === 0 ? 'text-2xl text-[#f2a93b] sm:text-3xl' : 'text-lg text-white sm:text-xl')}>{it.label}</span>
              {it.sub && <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 sm:text-[11px]">{it.sub}</span>}
            </button>
          ))}
        </nav>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-white/40">
          <span>{save.coins} coins · {save.shards} shards</span>
          <button onClick={() => onNav('creator')} className="pointer-events-auto flex items-center gap-2 hover:text-white"><RemoteImage srcs={CREATOR_LOGO} alt="Creator logo" className="h-5 w-5 rounded-full object-cover" fallback="CR" />by Ramcharan</button>
        </div>
      </div>
    </div>
  );
}

function Card({ children, locked, onClick, done }: { children: React.ReactNode; locked?: boolean; onClick?: () => void; done?: boolean }) {
  return (
    <button disabled={locked} onClick={onClick} className={cx('pointer-events-auto relative w-full border p-4 text-left transition-all', locked ? 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50' : 'border-white/15 bg-white/5 hover:-translate-y-0.5 hover:border-[#f2a93b]/70 hover:bg-white/10')}>
      {done && <span className="absolute right-3 top-3 text-xs uppercase tracking-widest text-[#f2a93b]">✓ done</span>}
      {locked && <span className="absolute right-3 top-3 text-xs uppercase tracking-widest text-white/40">locked</span>}
      {children}
    </button>
  );
}

export function StoryScreen({ onBack, onPlay }: { onBack: () => void; onPlay: (id: string) => void }) {
  const save = useSave(); const prog = storyProgress(save, STORY_ORDER);
  return (
    <Screen title="Story Mode" subtitle="Something is wrong." onBack={onBack}>
      <div className="space-y-4">
        {CHAPTERS.map((c) => (
          <div key={c.n} className="border border-white/10 bg-black/30 p-4">
            <div className="flex flex-wrap items-baseline gap-3"><span className="font-display text-sm tracking-[0.3em] text-[#f2a93b]">CH {c.n}</span><h3 className="font-display text-xl uppercase tracking-[0.16em] text-white">{c.title}</h3><span className="text-xs uppercase tracking-[0.18em] text-white/50">{c.tagline}</span></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {c.stages.map((id) => { const i = STORY_ORDER.indexOf(id); const s = STAGE_BY_ID[id]; const best = save.best[id];
                return (<Card key={id} locked={i > prog} done={save.completed.includes(id)} onClick={() => onPlay(id)}>
                  <div className="font-display text-base uppercase tracking-[0.14em] text-white">{s.name}</div><div className="text-xs uppercase tracking-[0.16em] text-white/50">{s.subtitle}</div>
                  <div className="mt-2 text-[11px] text-white/40">{s.missions.map((m) => m.text).join(' · ')}{best ? ` · best ${fmtTime(best)}` : ''}</div></Card>); })}
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

export function LoopScreen({ onBack, onPlay }: { onBack: () => void; onPlay: (s: StageDef) => void }) {
  const save = useSave();
  return (
    <Screen title="Loop Mode" subtitle="Pure time-loop puzzles — leave Echoes, then beat the gates" onBack={onBack}>
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-white/60">Each run becomes an Echo. Stand on plates, pull levers, then press <b className="text-white">R</b> to end the loop early. Use every Echo to open the way for your final run. More Echo capacity unlocks as the story progresses.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {TRIALS.map((t) => { const locked = (t.needEchoCap ?? 0) > save.echoCap; return (
          <Card key={t.id} locked={locked} done={save.trialsDone.includes(t.id)} onClick={() => onPlay(t)}>
            <div className="font-display text-lg uppercase tracking-[0.16em] text-white">{t.name}</div><div className="text-xs uppercase tracking-[0.16em] text-[#8cc4ff]">{t.subtitle}</div>
            <div className="mt-2 text-xs text-white/50">{locked ? `Needs Echo capacity ${t.needEchoCap} — progress the story` : t.hint}{save.best[t.id] ? ` · best ${fmtTime(save.best[t.id])}` : ''}</div></Card>); })}
      </div>
    </Screen>
  );
}

export function EndlessScreen({ onBack, onPlay }: { onBack: () => void; onPlay: (w: WorldId) => void }) {
  const save = useSave(); const prog = storyProgress(save, STORY_ORDER);
  return (
    <Screen title="Endless Mode" subtitle={`Best distance ${save.bestEndless} m`} onBack={onBack}>
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-white/60">Run through connected routes that never end. Speed and danger rise with distance. Every 60 seconds the loop turns — the weather changes and your last minute runs beside you, collecting what it passes.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.values(WORLDS).map((w) => (
          <Card key={w.id} locked={prog < w.unlockStage} onClick={() => onPlay(w.id)}><div className="font-display text-lg uppercase tracking-[0.16em] text-white">{w.name}</div><div className="mt-1 text-xs leading-relaxed text-white/55">{w.blurb}</div>
            {prog < w.unlockStage && <div className="mt-2 text-[11px] uppercase tracking-widest text-white/40">Unlocks in story</div>}</Card>))}
      </div>
    </Screen>
  );
}

export function ChallengeScreen({ onBack, onPlay }: { onBack: () => void; onPlay: (s: StageDef) => void }) {
  const save = useSave();
  return (
    <Screen title="Challenges" subtitle="Short special missions" onBack={onBack}>
      <div className="grid gap-3 sm:grid-cols-2">
        {CHALLENGES.map((c) => (<Card key={c.id} done={save.challengesDone.includes(c.id)} onClick={() => onPlay(c)}><div className="font-display text-lg uppercase tracking-[0.16em] text-white">{c.name}</div><div className="text-xs uppercase tracking-[0.16em] text-[#f2a93b]">{c.subtitle}</div><div className="mt-2 text-xs text-white/50">{c.hint} · {WORLDS[c.world].name}</div></Card>))}
      </div>
    </Screen>
  );
}
export { Btn };
