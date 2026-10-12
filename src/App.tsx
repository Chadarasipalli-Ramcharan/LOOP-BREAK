import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Game, makeEndlessStage, type GameEvent, type HudState, type RunStats } from './game/engine';
import { CHAPTERS, HINTS, STAGE_BY_ID, STORY_ORDER, type Mode, type StageDef, type WorldId } from './game/data';
import { storyProgress, useSave } from './game/storage';
import { audio } from './game/audio';
import { ChapterCard, CompleteOverlay, EndingOverlay, FailedOverlay, Hud, Loading, PauseOverlay, ResetOverlay } from './ui/Hud';
import { ChallengeScreen, EndlessScreen, LoopScreen, MainMenu, StoryScreen, type NavId } from './ui/Menu';
import { CollectionScreen, HowToScreen, SettingsScreen } from './ui/Panels';
import { CreatorScreen } from './ui/Creator';

type Screen = 'menu' | NavId | 'play';
type Overlay =
  | { k: 'none' } | { k: 'chapter'; stageId: string } | { k: 'failed'; stats: RunStats; reason: string; canKeep: boolean }
  | { k: 'complete'; stats: RunStats; stage: StageDef } | { k: 'reset'; loop: number; label: string; echoes: number } | { k: 'ending' };
const NONE: Overlay = { k: 'none' };

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null); const gameRef = useRef<Game | null>(null); const handler = useRef<(e: GameEvent) => void>(() => {});
  const [progress, setProgress] = useState(0); const [started, setStarted] = useState(false); const [screen, setScreen] = useState<Screen>('menu'); const [overlay, setOverlay] = useState<Overlay>(NONE);
  const [hud, setHud] = useState<HudState | null>(null); const [busy, setBusy] = useState(false); const [pauseSettings, setPauseSettings] = useState(false); const [mode, setMode] = useState<Mode>('story');
  const save = useSave(); const touch = useMemo(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0, []);

  handler.current = (e) => {
    if (e.type === 'failed') setOverlay({ k: 'failed', stats: e.stats, reason: e.reason, canKeep: e.canKeep });
    else if (e.type === 'complete') setOverlay(e.stage.id === 'chrono-final' ? { k: 'ending' } : { k: 'complete', stats: e.stats, stage: e.stage });
    else if (e.type === 'loopReset') setOverlay({ k: 'reset', loop: e.loop, label: e.label, echoes: e.echoes });
    else if (e.type === 'phase' && e.phase === 'playing') setOverlay(NONE);
  };

  useEffect(() => {
    const g = new Game(canvasRef.current as HTMLCanvasElement, { onHud: setHud, onEvent: (e) => handler.current(e) }); gameRef.current = g;
    return () => { g.dispose(); gameRef.current = null; };
  }, []);
  useEffect(() => { let p = 0; const t = setInterval(() => { p = Math.min(100, p + 4 + Math.random() * 6); setProgress(p); if (p >= 100) clearInterval(t); }, 90); return () => clearInterval(t); }, []);
  useEffect(() => { gameRef.current?.setRenderEnabled(screen !== 'creator' && started); }, [screen, started]);
  useEffect(() => { gameRef.current?.applySettings(); }, [save.settings]);

  const onStart = useCallback(() => { audio.init(); audio.sfx('uiPlay'); setStarted(true); }, []);
  const toMenu = useCallback(() => { setOverlay(NONE); setPauseSettings(false); setScreen('menu'); gameRef.current?.showMenu(); }, []);
  const launch = useCallback((stage: StageDef, m: Mode, world?: WorldId) => {
    setOverlay(NONE); setScreen('play'); setMode(m); setBusy(true); setHud(null);
    setTimeout(() => { gameRef.current?.startRun({ mode: m, stage, world }); setBusy(false); }, 140);
  }, []);
  const openStory = (id: string) => setOverlay({ k: 'chapter', stageId: id });
  const cont = () => { const p = storyProgress(save, STORY_ORDER); openStory(STORY_ORDER[Math.min(p, STORY_ORDER.length - 1)]); };

  const chapterStage = overlay.k === 'chapter' ? STAGE_BY_ID[overlay.stageId] : null;
  const chapter = chapterStage ? CHAPTERS.find((c) => c.n === chapterStage.chapter) : null;
  const nextStoryId = overlay.k === 'complete' && mode === 'story' ? STORY_ORDER[STORY_ORDER.indexOf(overlay.stage.id) + 1] : undefined;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#05070a]">
      <canvas ref={canvasRef} className="fixed inset-0 h-full w-full touch-none" />
      {started && screen === 'menu' && <MainMenu onNav={(id) => setScreen(id)} onContinue={cont} />}
      {started && screen === 'story' && <StoryScreen onBack={() => setScreen('menu')} onPlay={openStory} />}
      {started && screen === 'loop' && <LoopScreen onBack={() => setScreen('menu')} onPlay={(s) => launch(s, 'loop')} />}
      {started && screen === 'endless' && <EndlessScreen onBack={() => setScreen('menu')} onPlay={(w) => launch(makeEndlessStage(w), 'endless', w)} />}
      {started && screen === 'challenges' && <ChallengeScreen onBack={() => setScreen('menu')} onPlay={(s) => launch(s, 'challenge')} />}
      {started && screen === 'collection' && <CollectionScreen onBack={() => setScreen('menu')} />}
      {started && screen === 'settings' && <SettingsScreen onBack={() => setScreen('menu')} onApply={() => gameRef.current?.applySettings()} />}
      {started && screen === 'howto' && <HowToScreen onBack={() => setScreen('menu')} />}
      {started && screen === 'creator' && <CreatorScreen onBack={() => setScreen('menu')} />}
      {started && screen === 'play' && hud && hud.phase !== 'menu' && gameRef.current && <Hud hud={hud} touch={touch} game={gameRef.current} />}
      {screen === 'play' && hud?.phase === 'paused' && !pauseSettings && <PauseOverlay onResume={() => gameRef.current?.resume()} onRestart={() => { setOverlay(NONE); gameRef.current?.restartStage(); }} onMenu={toMenu} onSettings={() => setPauseSettings(true)} />}
      {pauseSettings && <div className="fixed inset-0 z-40"><SettingsScreen onBack={() => setPauseSettings(false)} onApply={() => gameRef.current?.applySettings()} /></div>}
      {overlay.k === 'chapter' && chapter && chapterStage && <ChapterCard chapter={chapter} stage={chapterStage} onBack={() => setOverlay(NONE)} onBegin={() => launch(chapterStage, 'story')} />}
      {overlay.k === 'reset' && <ResetOverlay loop={overlay.loop} label={overlay.label} echoes={overlay.echoes} />}
      {overlay.k === 'failed' && <FailedOverlay stats={overlay.stats} reason={overlay.reason} canKeep={overlay.canKeep} endless={mode === 'endless'} onRetry={(keep) => gameRef.current?.retry(keep)} onMenu={toMenu} />}
      {overlay.k === 'complete' && <CompleteOverlay stats={overlay.stats} stage={overlay.stage} nextLabel={nextStoryId ? `Next: ${STAGE_BY_ID[nextStoryId].name}` : null} onNext={() => nextStoryId && openStory(nextStoryId)} onReplay={() => { setOverlay(NONE); gameRef.current?.restartStage(); }} onMenu={toMenu} />}
      {overlay.k === 'ending' && <EndingOverlay onMenu={toMenu} />}
      {busy && <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#07090c]"><div className="font-display text-3xl uppercase tracking-[0.4em] text-white">Loopbreak</div><div className="mt-4 h-[2px] w-48 overflow-hidden bg-white/10"><div className="h-full w-1/3 animate-[slideBar_.9s_ease-in-out_infinite] bg-[#f2a93b]" /></div><div className="mt-4 text-sm italic text-white/50">{HINTS[Math.floor(Math.random() * HINTS.length)]}</div></div>}
      {!started && <Loading progress={progress} ready={progress >= 100} onStart={onStart} />}
    </div>
  );
}
