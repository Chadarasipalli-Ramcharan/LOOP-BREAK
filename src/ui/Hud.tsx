import { useEffect, useState } from 'react';
import type { Game, HudState, RunStats } from '../game/engine';
import { CHAPTERS, HINTS, type ChapterDef, type StageDef } from '../game/data';
import { Btn, LoopMark, Stat, cx, fmtTime } from './kit';
import { CREATOR_LOGO, RemoteImage } from './Creator';

export function Hud({ hud, touch, game }: { hud: HudState; touch: boolean; game: Game }) {
  const urgent = hud.timeLeft <= 10;
  const tone: Record<string, string> = { info: 'border-white/30 text-white', echo: 'border-[#8cc4ff] text-[#cfe6ff]', rare: 'border-[#f2a93b] text-[#ffd99a]', danger: 'border-[#ff6a55] text-[#ffb3a7]' };
  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none font-display text-white">
      {hud.hit > 0 && <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 160px rgba(200,40,30,${Math.min(0.6, hud.hit * 1.4)})` }} />}
      {hud.danger > 0.6 && <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 120px rgba(120,20,10,${(hud.danger - 0.6) * 0.5})` }} />}
      {hud.glitch && <div className="absolute inset-0 animate-[glitch_.3s_steps(3)_1] bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.04)_0_2px,transparent_2px_4px)]" style={{ mixBlendMode: 'screen' }} />}
      {/* top-left: loop timer */}
      <div className="absolute left-3 top-3 sm:left-6 sm:top-5">
        {hud.timerVisible && (
          <div className="border-l-2 border-[#f2a93b] bg-black/35 px-3 py-1.5 backdrop-blur-[2px]">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/60 sm:text-xs">{hud.mode === 'endless' ? 'LOOP' : 'LOOP'} {String(hud.loop).padStart(2, '0')}</div>
            <div className={cx('text-3xl leading-none tabular-nums sm:text-5xl', urgent ? 'text-[#ff9a6e] animate-[pulseSoft_1s_ease-in-out_infinite]' : 'text-white')}>{fmtTime(hud.timeLeft)}</div>
          </div>
        )}
        <div className="mt-2 pl-3 text-xs uppercase tracking-[0.25em] text-white/70 sm:text-sm">{hud.dist} m <span className="ml-2 text-white/35">{hud.atmo}</span></div>
        <div className="mt-2 flex gap-1 pl-3">{Array.from({ length: hud.maxHp }).map((_, i) => <span key={i} className={cx('h-2.5 w-6 skew-x-[-20deg]', i < hud.hp ? 'bg-[#e8e4d8]' : 'bg-white/15')} />)}</div>
      </div>
      {/* top-center: mission */}
      <div className="absolute left-1/2 top-3 hidden -translate-x-1/2 text-center sm:top-5 sm:block">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#f2a93b]">{hud.stageName}</div>
        <div className="text-sm uppercase tracking-[0.16em] text-white/90">{hud.mission} {hud.progress && <span className="ml-2 text-white/60">· {hud.progress}</span>}</div>
      </div>
      {/* top-right: collectibles + pause */}
      <div className="absolute right-3 top-3 flex items-start gap-3 sm:right-6 sm:top-5">
        <div className="flex gap-3 bg-black/30 px-3 py-1.5 text-sm tabular-nums backdrop-blur-[2px] sm:text-base">
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-2 bg-[#86d4ff]" style={{ clipPath: 'polygon(50% 0,100% 50%,50% 100%,0 50%)' }} />{hud.shards}</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full bg-[#d9a93a]" />{hud.coins}</span>
        </div>
        <button onClick={() => game.pause()} className="pointer-events-auto border border-white/25 bg-black/30 px-2.5 py-1 text-xs uppercase tracking-widest text-white/80 hover:bg-white/15">II</button>
      </div>
      {/* echo indicators */}
      <div className="absolute left-3 top-[118px] space-y-1 sm:left-6 sm:top-[150px]">
        {hud.echoes.map((e) => (
          <div key={e.label} className="flex items-center gap-2 border-l-2 bg-black/35 px-2 py-1 text-[11px] uppercase tracking-[0.14em] backdrop-blur-[2px] sm:text-xs" style={{ borderColor: e.color }}>
            <span className="h-2 w-2 rounded-full" style={{ background: e.color }} /><span className="text-white">{e.label}</span><span className="text-white/60">{e.status}</span>
            {e.status !== 'GONE' && <span className="text-white/40">{e.rel >= 0 ? '+' : ''}{e.rel} m</span>}
          </div>
        ))}
        {hud.mode !== 'endless' && <div className="pl-3 text-[10px] uppercase tracking-[0.25em] text-white/40">Echoes {hud.echoCount}/{hud.echoCap}</div>}
      </div>
      {/* bottom center messages */}
      <div className="absolute bottom-24 left-1/2 w-[92vw] max-w-2xl -translate-x-1/2 space-y-2 text-center sm:bottom-10">
        {hud.toast && <div className={cx('mx-auto w-fit border-l-2 bg-black/55 px-4 py-1.5 text-xs uppercase tracking-[0.18em] sm:text-sm', tone[hud.toast.tone] ?? tone.info)}>{hud.toast.text}</div>}
        {hud.hint && <div className="mx-auto w-fit bg-[#f2a93b] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#15120c] sm:text-sm">{hud.hint}</div>}
        {hud.tip && <div className="mx-auto w-fit bg-black/60 px-5 py-2 text-sm uppercase tracking-[0.14em] text-white sm:text-base">{hud.tip}</div>}
        {hud.subtitle && <div className="mx-auto w-fit max-w-full bg-black/70 px-5 py-2 font-sans text-sm italic text-white/90 sm:text-base">{hud.subtitle}</div>}
      </div>
      {/* ability chips + reset hint */}
      <div className="absolute bottom-3 right-3 hidden items-end gap-2 text-[10px] uppercase tracking-[0.2em] sm:bottom-5 sm:right-6 sm:flex">
        <Chip label="DASH" k="SHIFT" v={hud.dash} />{hud.hasSlow && <Chip label="SLOW" k="Q" v={hud.slow} />}{hud.hasPhase && <Chip label="PHASE" k="F" v={hud.phaseStep} />}
        {hud.canReset && <div className="border border-white/20 bg-black/35 px-2 py-1 text-white/70">[R] RESET LOOP</div>}
      </div>
      {/* touch controls */}
      {touch && (
        <>
          <div className="absolute bottom-4 left-4 flex gap-3"><TBtn label="HOLD" onDown={() => game.setTouchBrake(true)} onUp={() => game.setTouchBrake(false)} active={hud.touchHold} /></div>
          <div className="absolute bottom-4 right-4 flex flex-wrap justify-end gap-3">
            {hud.canReset && <TBtn label="RESET" onTap={() => game.touchAction('reset')} />}
            {hud.hasSlow && <TBtn label="SLOW" onTap={() => game.touchAction('slow')} />}
            {hud.hasPhase && <TBtn label="PHASE" onTap={() => game.touchAction('phase')} />}
            <TBtn label="USE" onTap={() => game.touchAction('interact')} /><TBtn label="DASH" onTap={() => game.touchAction('dash')} />
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ label, k, v }: { label: string; k: string; v: number }) {
  return (<div className="relative overflow-hidden border border-white/20 bg-black/35 px-2 py-1 text-white/80"><div className="absolute inset-y-0 left-0 bg-white/15" style={{ width: `${v * 100}%` }} /><span className="relative">{label} <span className="text-white/40">{k}</span></span></div>);
}
function TBtn({ label, onTap, onDown, onUp, active }: { label: string; onTap?: () => void; onDown?: () => void; onUp?: () => void; active?: boolean }) {
  return (
    <button onPointerDown={(e) => { e.preventDefault(); onTap?.(); onDown?.(); }} onPointerUp={() => onUp?.()} onPointerLeave={() => onUp?.()} onPointerCancel={() => onUp?.()}
      className={cx('pointer-events-auto h-14 w-14 touch-none rounded-full border text-[10px] uppercase tracking-widest backdrop-blur-sm', active ? 'border-[#f2a93b] bg-[#f2a93b]/40 text-white' : 'border-white/40 bg-black/40 text-white/90')}>{label}</button>
  );
}

// ---------------- overlays ----------------
export function PauseOverlay({ onResume, onRestart, onMenu, onSettings }: { onResume: () => void; onRestart: () => void; onMenu: () => void; onSettings: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[90vw] max-w-sm border border-white/15 bg-[#0c0f13]/95 p-6 text-center">
        <h2 className="font-display text-3xl uppercase tracking-[0.25em] text-white">Paused</h2>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">The loop waits for you</p>
        <div className="mt-6 grid gap-3"><Btn primary onClick={onResume}>Resume</Btn><Btn onClick={onRestart}>Restart Stage</Btn><Btn onClick={onSettings}>Settings</Btn><Btn onClick={onMenu}>Main Menu</Btn></div>
        <p className="mt-5 text-[11px] leading-relaxed text-white/40">A/D steer · SPACE jump · C slide · SHIFT dash · W sprint · S brake · E interact · R reset loop</p>
      </div>
    </div>
  );
}

const REASONS: Record<string, string> = { hit: 'You took too much damage.', fell: 'You fell into the gap.', 'hit-strict': 'One hit ends a clean run.', time: 'The loop ended before you finished.' };
export function FailedOverlay({ stats, reason, canKeep, endless, onRetry, onMenu }: { stats: RunStats; reason: string; canKeep: boolean; endless: boolean; onRetry: (keep: boolean) => void; onMenu: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-[3px]">
      <div className="w-[92vw] max-w-lg animate-[fadeUp_.35s_ease-out] border border-white/15 bg-[#0b0d10]/95 p-6">
        <div className="text-center"><h2 className="font-display text-4xl uppercase tracking-[0.22em] text-[#ff8a72] sm:text-5xl">Loop Failed</h2><p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">{REASONS[reason] ?? 'The loop took you back.'}</p></div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Distance" value={`${stats.distance} m`} /><Stat label="Time survived" value={fmtTime(stats.time)} /><Stat label="Collectibles" value={stats.coins + stats.shards} sub={`${stats.shards} shards · ${stats.coins} coins`} />
          <Stat label="Echoes created" value={stats.echoes} /><Stat label="Missions" value={stats.missions.length} /><Stat label="Best distance" value={`${stats.best} m`} />
        </div>
        <div className="mt-6 grid gap-2"><Btn primary onClick={() => onRetry(true)}>Retry {canKeep && <span className="ml-2 text-[10px] opacity-70">(keeps Echo · ENTER)</span>}</Btn>
          {canKeep && !endless && <Btn onClick={() => onRetry(false)}>Retry without Echo <span className="ml-2 text-[10px] opacity-60">(X)</span></Btn>}<Btn onClick={onMenu}>Main Menu</Btn></div>
      </div>
    </div>
  );
}

export function ResetOverlay({ loop, label, echoes }: { loop: number; label: string; echoes: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center bg-[#0a1118]/70 animate-[resetFlash_1.9s_ease-in-out_1]">
      <div className="font-display text-xs uppercase tracking-[0.5em] text-white/60">Loop {String(loop).padStart(2, '0')} begins</div>
      <h2 className="mt-2 font-display text-5xl uppercase tracking-[0.3em] text-white sm:text-7xl">Loop Reset</h2>
      <div className="mt-4 border-y border-[#8cc4ff]/40 px-6 py-1 font-display text-sm uppercase tracking-[0.3em] text-[#8cc4ff]">{label ? `${label} created` : 'Time folds back'} · {echoes} in the loop</div>
    </div>
  );
}

export function ChapterCard({ chapter, stage, onBegin, onBack }: { chapter: ChapterDef; stage: StageDef; onBegin: () => void; onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[92vw] max-w-2xl animate-[fadeUp_.5s_ease-out] px-2 text-center">
        <div className="font-display text-xs uppercase tracking-[0.5em] text-[#f2a93b]">Chapter {chapter.n}</div>
        <h2 className="mt-2 font-display text-4xl uppercase tracking-[0.2em] text-white sm:text-6xl">{chapter.title}</h2>
        <p className="mt-2 font-display text-sm uppercase tracking-[0.3em] text-white/60">{stage.subtitle}</p>
        <p className="mx-auto mt-6 max-w-lg font-sans text-base leading-relaxed text-white/80">{chapter.intro}</p>
        <p className="mt-5 font-mono text-sm text-[#8cc4ff]">THE OBSERVER: “{chapter.observer}”</p>
        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-white/40">{stage.hint}</p>
        <div className="mt-8 flex justify-center gap-3"><Btn onClick={onBack}>Back</Btn><Btn primary onClick={onBegin}>Begin</Btn></div>
      </div>
    </div>
  );
}

export function CompleteOverlay({ stats, stage, nextLabel, onNext, onReplay, onMenu }: { stats: RunStats; stage: StageDef; nextLabel: string | null; onNext: () => void; onReplay: () => void; onMenu: () => void }) {
  const ch = stage.chapter ? CHAPTERS.find((c) => c.n === stage.chapter) : null;
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[92vw] max-w-lg animate-[fadeUp_.4s_ease-out] border border-white/15 bg-[#0b0d10]/95 p-6">
        <div className="text-center"><div className="text-xs uppercase tracking-[0.4em] text-[#8cc4ff]">{ch ? `Chapter ${ch.n}` : stage.mode}</div><h2 className="font-display text-4xl uppercase tracking-[0.2em] text-white">{stage.id === 'chrono-final' ? 'Loop Broken' : 'Complete'}</h2><p className="text-xs uppercase tracking-[0.2em] text-white/50">{stage.name}</p></div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3"><Stat label="Distance" value={`${stats.distance} m`} /><Stat label="Time" value={fmtTime(stats.time)} /><Stat label="Loops" value={stats.loop} /><Stat label="Shards" value={stats.shards} /><Stat label="Coins" value={stats.coins} /><Stat label="Echoes" value={stats.echoes} /></div>
        <ul className="mt-4 space-y-1.5">{stage.missions.map((m) => (<li key={m.id} className="flex items-center gap-2 text-sm uppercase tracking-[0.12em] text-white/80"><span className={cx('flex h-4 w-4 items-center justify-center border text-[10px]', stats.missions.includes(m.id) ? 'border-[#f2a93b] bg-[#f2a93b] text-black' : 'border-white/30 text-transparent')}>✓</span>{m.text}</li>))}</ul>
        <div className="mt-6 grid gap-2">{nextLabel && <Btn primary onClick={onNext}>{nextLabel}</Btn>}<Btn onClick={onReplay}>Replay</Btn><Btn onClick={onMenu}>Main Menu</Btn></div>
      </div>
    </div>
  );
}

export function EndingOverlay({ onMenu }: { onMenu: () => void }) {
  const [step, setStep] = useState(0);
  const lines = ['The city is quiet.', 'No distortion. No echoes.', 'One last Echo stands at the edge of the road.', 'It looks at you.', 'Then it disappears.'];
  useEffect(() => { const t = setTimeout(() => setStep((s) => s + 1), step < lines.length ? 2600 : step === lines.length ? 3400 : 4200); return () => clearTimeout(t); }, [step, lines.length]);
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/85 text-center" style={{ transition: 'background 2s' }}>
      {step < lines.length && <p key={step} className="animate-[fadeUp_1.2s_ease-out] font-sans text-lg italic text-white/80 sm:text-2xl">{lines[step]}</p>}
      {step === lines.length && <h2 className="animate-[fadeUp_1.5s_ease-out] font-display text-5xl uppercase tracking-[0.35em] text-white sm:text-8xl">Loop Broken</h2>}
      {step > lines.length && (<div className="animate-[fadeUp_1.5s_ease-out]"><h2 className="font-display text-3xl uppercase tracking-[0.5em] text-[#8cc4ff] sm:text-5xl">Or was it?</h2><p className="mt-6 text-xs uppercase tracking-[0.3em] text-white/40">Thank you for playing LOOPBREAK</p><div className="mt-8 flex justify-center gap-3"><Btn primary onClick={onMenu}>Main Menu</Btn></div></div>)}
    </div>
  );
}

export function Loading({ progress, ready, onStart }: { progress: number; ready: boolean; onStart: () => void }) {
  const [h, setH] = useState(0);
  useEffect(() => { const t = setInterval(() => setH((x) => (x + 1) % HINTS.length), 2200); return () => clearInterval(t); }, []);
  useEffect(() => { if (!ready) return; const f = () => onStart(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [ready, onStart]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07090c]" onClick={() => ready && onStart()}>
      <LoopMark size={64} className="animate-[spin_6s_linear_infinite]" />
      <h1 className="mt-4 font-display text-5xl uppercase tracking-[0.35em] text-white sm:text-7xl">Loopbreak</h1>
      <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-white/50 sm:text-xs">Run your past. Change your future. Break the loop.</p>
      <div className="mt-10 h-[3px] w-64 bg-white/10 sm:w-96"><div className="h-full bg-[#f2a93b] transition-all duration-200" style={{ width: `${progress}%` }} /></div>
      <p className="mt-4 h-5 text-sm italic text-white/60">{ready ? '' : HINTS[h]}</p>
      {ready && <button className="mt-2 animate-[pulseSoft_1.4s_ease-in-out_infinite] border border-[#f2a93b] px-8 py-3 font-display text-sm uppercase tracking-[0.3em] text-[#f2a93b]">Click or press any key</button>}
      <div className="absolute bottom-6 flex items-center gap-2 opacity-70"><RemoteImage srcs={CREATOR_LOGO} alt="Creator logo" className="h-6 w-6 rounded-full object-cover" fallback="CR" /><span className="text-[10px] uppercase tracking-[0.3em] text-white/50">Chadarasipalli Ramcharan</span></div>
    </div>
  );
}
