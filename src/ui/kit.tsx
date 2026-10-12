import type { ReactNode } from 'react';
import { audio } from '../game/audio';

export const cx = (...a: (string | false | null | undefined)[]): string => a.filter(Boolean).join(' ');
export const ACCENT = '#f2a93b';
export const ECHO = '#8cc4ff';
export const fmtTime = (s: number): string => { const t = Math.max(0, Math.ceil(s)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
export const click = (): void => audio.sfx('ui');

export function Btn({ children, onClick, primary, className, disabled, small, title }: { children: ReactNode; onClick?: () => void; primary?: boolean; className?: string; disabled?: boolean; small?: boolean; title?: string }) {
  return (
    <button title={title} disabled={disabled} onClick={() => { if (disabled) return; click(); onClick?.(); }}
      className={cx('pointer-events-auto font-display uppercase tracking-[0.14em] transition-all duration-150 select-none border',
        small ? 'px-3 py-1.5 text-xs' : 'px-6 py-3 text-sm',
        primary ? 'bg-[#f2a93b] text-[#15120c] border-[#f2a93b] hover:bg-[#ffc266] font-semibold' : 'bg-white/5 text-white/90 border-white/20 hover:bg-white/15 hover:border-white/50',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-white/5', className)}>
      {children}
    </button>
  );
}

export function Screen({ title, subtitle, onBack, children, wide }: { title: string; subtitle?: string; onBack: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#0a0d11]/90 backdrop-blur-sm animate-[fadeIn_.25s_ease-out]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-10">
        <div>
          <h2 className="font-display text-2xl uppercase tracking-[0.18em] text-white sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-white/50 sm:text-sm">{subtitle}</p>}
        </div>
        <Btn onClick={onBack} small>← Back</Btn>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-10">
        <div className={cx('mx-auto', wide ? 'max-w-6xl' : 'max-w-4xl')}>{children}</div>
      </div>
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => { click(); onChange(!on); }} className="pointer-events-auto flex w-full items-center justify-between border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
      <span className="font-display text-sm uppercase tracking-[0.14em] text-white/90">{label}</span>
      <span className={cx('relative h-5 w-10 rounded-full transition-colors', on ? 'bg-[#f2a93b]' : 'bg-white/20')}><span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', on ? 'left-[22px]' : 'left-0.5')} /></span>
    </button>
  );
}

export function Slider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <label className="block border border-white/10 bg-white/5 px-4 py-3">
      <div className="mb-2 flex justify-between"><span className="font-display text-sm uppercase tracking-[0.14em] text-white/90">{label}</span><span className="text-sm tabular-nums text-white/60">{Math.round(value * 100)}</span></div>
      <input type="range" min={0} max={100} value={Math.round(value * 100)} onChange={(e) => onChange(Number(e.target.value) / 100)} onPointerUp={click} className="h-1 w-full cursor-pointer appearance-none bg-white/20 accent-[#f2a93b]" />
    </label>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">{label}</div>
      <div className="font-display text-2xl tabular-nums text-white">{value}</div>
      {sub && <div className="text-[11px] text-white/40">{sub}</div>}
    </div>
  );
}

export function LoopMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none">
      <path d="M24 6a18 18 0 1 0 17.6 14.4" stroke="#f2a93b" strokeWidth="4" strokeLinecap="round" />
      <path d="M41.6 20.4 L44 12 L36 14.5" stroke="#f2a93b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="5" fill="#8cc4ff" opacity="0.85" /><circle cx="24" cy="24" r="9" stroke="#8cc4ff" strokeOpacity="0.4" strokeWidth="1.5" />
    </svg>
  );
}
