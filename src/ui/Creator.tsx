import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Btn, LoopMark, cx } from './kit';

// ---- Creator data: taken from the creator's public portfolio repository (Chadarasipalli-Ramcharan/MY-PORTOFOLIO) ----
const CDN = 'https://cdn.jsdelivr.net/gh/Chadarasipalli-Ramcharan/MY-PORTOFOLIO@main/client/src/assets/';
const RAW = 'https://raw.githubusercontent.com/Chadarasipalli-Ramcharan/MY-PORTOFOLIO/main/client/src/assets/';
const asset = (p: string): string[] => [CDN + p, RAW + p];
export const CREATOR_LOGO: string[] = [...asset('Favicon/123.png'), ...asset('Favicon/1.jpg')];

export const CREATOR = {
  name: 'CHADARASIPALLI RAMCHARAN', role: "AI & ML Engineer", profileName: 'CHADARASIPALLI RAMCHARAN☑️', pronouns: 'HE/HIM',
  headline: ['Web Developer & AI Enthusiast | B.Tech CSE @ SPSU |', 'Leading Through Sport, Growing Through Code |'], location: 'Udaipur, Rajasthan, India', education: 'B.Tech CSE @ SPSU',
  intro: 'Passionate about creating intelligent, scalable, and elegant digital solutions. Skilled in blending technology with thoughtful design and performance. Driven by curiosity, creativity, and a commitment to continuous improvement.',
  github: 'https://github.com/Chadarasipalli-Ramcharan', linkedin: 'https://www.linkedin.com/in/chadarasipalli-ramcharan', email: 'ch.charan2006@gmail.com', whatsapp: 'https://wa.me/918639202608', portfolio: 'https://rc25.netlify.app/',
  profile: asset('Profile/15.jpg'),
};
const PROJECTS = [
  { title: 'Farmers Marketing Hub', tech: ['HTML', 'CSS', 'NODE.JS', 'REACT'], img: asset('Projects/farmer.jpg'), desc: 'A web platform that connects farmers directly with buyers, enabling real-time crop listings and transparent communication.' },
  { title: 'AI Tools Explorer Hub', tech: ['Glide', 'No-Code', 'AI APIs', 'UI/UX'], img: asset('Projects/aitool.jpg'), desc: 'A no-code web application that curates and showcases AI tools for students and developers with dynamic search functionality.' },
  { title: 'AI Image Recognition', tech: ['Python', 'TensorFlow', 'Computer Vision'], img: asset('Projects/IMAGE.jpg'), desc: 'A machine learning model that can identify objects in images with high accuracy using convolutional neural networks.' },
];
const GALLERY = ['College Study Group Session', 'Hackathon Team Collaboration', 'Award Ceremony at Tech Event', 'Late Night Coding Session', 'College Campus Event', 'Group Discussion During Project Planning', 'Workshop on AI Technologies', 'Presentation at Technical Symposium'].map((t, i) => ({ title: t, img: asset(`Gallery/img${i + 1}.jpg`) }));

export function RemoteImage({ srcs, alt, className, fallback }: { srcs: string[]; alt: string; className?: string; fallback?: string }) {
  const [i, setI] = useState(0);
  if (i >= srcs.length) return <div className={cx(className, 'flex items-center justify-center bg-white/10 px-2 text-center font-display text-xs uppercase tracking-widest text-white/60')}>{fallback ?? alt}</div>;
  return <img src={srcs[i]} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setI(i + 1)} />;
}

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null); const [on, setOn] = useState(false);
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12 }); io.observe(el); return () => io.disconnect(); }, []);
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={cx('transition-all duration-700 ease-out', on ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0', className)}>{children}</div>;
}

const LinkBtn = ({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={cx('pointer-events-auto inline-block border px-5 py-2.5 font-display text-sm uppercase tracking-[0.16em] transition-all hover:-translate-y-0.5', primary ? 'border-[#f2a93b] bg-[#f2a93b] font-semibold text-[#15120c] hover:bg-[#ffc266]' : 'border-white/25 bg-white/5 text-white hover:border-white/60 hover:bg-white/15')}>{children}</a>
);
const H = ({ id, children, sub }: { id: string; children: ReactNode; sub?: string }) => (<div id={id} className="mb-6 scroll-mt-6"><h3 className="font-display text-2xl uppercase tracking-[0.22em] text-white sm:text-3xl">{children}</h3>{sub && <p className="mt-1 text-xs uppercase tracking-[0.25em] text-[#f2a93b]">{sub}</p>}<div className="mt-3 h-[2px] w-16 bg-[#f2a93b]" /></div>);

export function CreatorScreen({ onBack }: { onBack: () => void }) {
  const scroller = useRef<HTMLDivElement>(null); const [y, setY] = useState(0); const [lightbox, setLightbox] = useState<number | null>(null);
  const go = (id: string) => scroller.current?.querySelector('#' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.code === 'Escape') { if (lightbox !== null) setLightbox(null); else onBack(); } }; window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [lightbox, onBack]);
  return (
    <div className="fixed inset-0 z-20 bg-[#080a0d]">
      <div ref={scroller} onScroll={(e) => setY((e.target as HTMLDivElement).scrollTop)} className="h-full overflow-y-auto scroll-smooth">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#080a0d]/85 px-5 py-3 backdrop-blur sm:px-10">
          <div className="flex items-center gap-3"><LoopMark size={26} /><span className="font-display text-sm uppercase tracking-[0.3em] text-white/70">LOOPBREAK · About the Creator</span></div><Btn small onClick={onBack}>← Back to game</Btn>
        </div>
        {/* Header */}
        <header className="relative overflow-hidden px-5 pb-16 pt-14 sm:px-10 sm:pt-20">
          <div className="pointer-events-none absolute inset-0 opacity-70" style={{ transform: `translateY(${y * 0.25}px)`, background: 'radial-gradient(ellipse at 75% 20%, rgba(242,169,59,0.14), transparent 55%), radial-gradient(ellipse at 10% 80%, rgba(140,196,255,0.10), transparent 50%)' }} />
          <div className="relative mx-auto flex max-w-6xl flex-col-reverse items-center gap-10 md:flex-row md:justify-between">
            <div className="max-w-xl">
              <p className="font-display text-lg uppercase tracking-[0.3em] text-[#f2a93b]">Hello, it's me</p>
              <h1 className="mt-2 font-display text-4xl uppercase leading-tight tracking-[0.06em] text-white sm:text-6xl">{CREATOR.name}</h1>
              <h2 className="mt-3 font-display text-xl tracking-[0.06em] text-white sm:text-2xl">And I'm a <span className="font-bold text-[#8cc4ff]">{CREATOR.role}</span></h2>
              <p className="mt-6 font-sans text-base leading-relaxed text-white/70 sm:text-lg">{CREATOR.intro}</p>
              <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => go('projects')} className="pointer-events-auto border border-[#f2a93b] bg-[#f2a93b] px-6 py-3 font-display text-sm font-semibold uppercase tracking-[0.16em] text-[#15120c] transition-all hover:-translate-y-0.5 hover:bg-[#ffc266]">💡 View Projects</button>
                <button onClick={() => go('contact')} className="pointer-events-auto border border-[#8cc4ff] px-6 py-3 font-display text-sm uppercase tracking-[0.16em] text-[#8cc4ff] transition-all hover:-translate-y-0.5 hover:bg-[#8cc4ff] hover:text-black">📞 Contact Me</button></div>
            </div>
            <div className="group relative" style={{ transform: `translateY(${-y * 0.06}px)` }}>
              <div className="absolute -inset-3 rounded-full border border-[#f2a93b]/30" />
              <RemoteImage srcs={CREATOR.profile} alt="Chadarasipalli Ramcharan" fallback="CR" className="h-64 w-64 rounded-full border-4 border-[#8cc4ff] object-cover shadow-2xl transition-transform duration-500 group-hover:scale-[1.03] sm:h-80 sm:w-80" />
              <RemoteImage srcs={CREATOR_LOGO} alt="Creator logo" fallback="CR" className="absolute -bottom-2 -right-2 h-14 w-14 rounded-full border-2 border-[#080a0d] object-cover opacity-90" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-20 px-5 pb-20 sm:px-10">
          {/* Profile */}
          <Reveal><section><H id="profile" sub="Profile">The person behind the loop</H>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="border border-white/10 bg-white/5 p-6 md:col-span-2"><div className="font-display text-xl tracking-[0.08em] text-white sm:text-2xl">{CREATOR.profileName}</div><div className="mt-1 text-xs uppercase tracking-[0.3em] text-[#f2a93b]">{CREATOR.pronouns}</div>
                <p className="mt-4 font-sans text-base text-white/80">{CREATOR.headline[0]}</p><p className="mt-1 font-sans text-base text-white/80">{CREATOR.headline[1]}</p><p className="mt-4 flex items-center gap-2 text-sm text-white/60">📍 {CREATOR.location}</p></div>
              <div className="space-y-3">{[['Primary identity', 'Web Developer & AI Enthusiast'], ['Technical identity', 'AI & ML Engineer'], ['Education', CREATOR.education]].map(([a, b]) => (<div key={a} className="border border-white/10 bg-white/5 px-4 py-3"><div className="text-[10px] uppercase tracking-[0.25em] text-white/40">{a}</div><div className="font-display text-sm uppercase tracking-[0.1em] text-white">{b}</div></div>))}</div>
            </div></section></Reveal>

          {/* Projects */}
          <section><H id="projects" sub="Creator Projects">Projects</H>
            <div className="grid gap-5 md:grid-cols-3">{PROJECTS.map((p, i) => (
              <Reveal key={p.title} delay={i * 120}><article className="group flex h-full flex-col overflow-hidden border border-white/10 bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-[#f2a93b]/60">
                <div className="relative h-44 overflow-hidden"><RemoteImage srcs={p.img} alt={p.title} fallback={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /><span className="absolute left-3 top-3 bg-black/70 px-2 py-0.5 font-display text-xs tracking-[0.25em] text-[#f2a93b]">PROJECT 0{i + 1}</span></div>
                <div className="flex flex-1 flex-col p-5"><h4 className="font-display text-xl uppercase tracking-[0.1em] text-white">{p.title}</h4>
                  <div className="mt-3 flex flex-wrap gap-1.5">{p.tech.map((t) => <span key={t} className="border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#8cc4ff]">{t}</span>)}</div>
                  <p className="mt-3 flex-1 font-sans text-sm leading-relaxed text-white/65">{p.desc}</p><div className="mt-5"><LinkBtn href={CREATOR.portfolio + '#projects'} primary>Live Demo</LinkBtn></div></div></article></Reveal>))}</div>
            <div className="mt-8 flex flex-wrap gap-3"><LinkBtn href={CREATOR.github} primary>View All Projects</LinkBtn><LinkBtn href={CREATOR.linkedin}>View All Certificates</LinkBtn></div></section>

          {/* Gallery */}
          <section><H id="gallery" sub="Creator Gallery">Gallery</H>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{GALLERY.map((g, i) => (
              <Reveal key={g.title} delay={(i % 4) * 90}><button onClick={() => setLightbox(i)} className="group pointer-events-auto block w-full overflow-hidden border border-white/10 bg-white/5 text-left transition-all hover:-translate-y-1 hover:border-[#8cc4ff]/60">
                <div className="h-36 overflow-hidden sm:h-44"><RemoteImage srcs={g.img} alt={g.title} fallback={g.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" /></div>
                <div className="px-3 py-2.5 font-display text-[11px] uppercase leading-snug tracking-[0.14em] text-white/80 sm:text-xs">{g.title}</div></button></Reveal>))}</div></section>

          {/* Contact */}
          <section><H id="contact" sub="Contact">Get in touch</H>
            <div className="grid gap-3 sm:grid-cols-2">
              {[{ k: 'LinkedIn', v: 'linkedin.com/in/chadarasipalli-ramcharan', href: CREATOR.linkedin, b: 'Open LinkedIn' }, { k: 'Email', v: CREATOR.email, href: 'mailto:' + CREATOR.email, b: 'Send Email' },
                { k: 'GitHub', v: 'github.com/Chadarasipalli-Ramcharan', href: CREATOR.github, b: 'Open GitHub' }, { k: 'WhatsApp', v: 'wa.me/918639202608 · 8639202608', href: CREATOR.whatsapp, b: 'Chat on WhatsApp' }].map((c, i) => (
                <Reveal key={c.k} delay={i * 80}><div className="flex h-full items-center justify-between gap-3 border border-white/10 bg-white/5 p-4"><div className="min-w-0"><div className="text-[10px] uppercase tracking-[0.3em] text-[#f2a93b]">{c.k}</div><div className="truncate font-sans text-sm text-white/80">{c.v}</div></div><LinkBtn href={c.href}>{c.b}</LinkBtn></div></Reveal>))}
              <Reveal><div className="border border-white/10 bg-white/5 p-4 sm:col-span-2"><div className="text-[10px] uppercase tracking-[0.3em] text-[#f2a93b]">Location</div><div className="font-sans text-sm text-white/80">📍 {CREATOR.location}</div></div></Reveal>
            </div></section>

          {/* Note + About */}
          <Reveal><section className="border-l-2 border-[#f2a93b] bg-white/[0.03] p-6 sm:p-8"><h3 className="font-display text-xl uppercase tracking-[0.25em] text-white">Note from the Creator</h3>
            <blockquote className="mt-4 font-sans text-lg italic leading-relaxed text-white/80">“LOOPBREAK began with a simple curiosity: what would happen if your previous decisions could come back and become part of your next attempt?”</blockquote>
            <div className="mt-5 flex flex-wrap gap-2">{['curiosity', 'technology', 'storytelling', 'experimentation', 'gameplay'].map((t) => <span key={t} className="border border-[#8cc4ff]/40 px-3 py-1 font-display text-xs uppercase tracking-[0.2em] text-[#8cc4ff]">{t}</span>)}</div></section></Reveal>
          <Reveal><section><H id="about" sub="About the Game">LOOPBREAK</H>
            <p className="max-w-3xl font-sans text-base leading-relaxed text-white/70">LOOPBREAK is a 3D action runner built around one simple question: What if your past self could run beside you? Every run changes what comes next. Every mistake leaves an Echo. Every Echo becomes part of your strategy. Run through realistic environments, escape dangerous situations, discover hidden paths, solve time-based puzzles and uncover the mystery behind the repeating world. The goal is not simply to survive. The goal is to understand the loop — and break it.</p></section></Reveal>
        </main>

        <footer className="border-t border-white/10 px-5 py-10 text-center sm:px-10">
          <RemoteImage srcs={CREATOR_LOGO} alt="Creator logo" fallback="CR" className="mx-auto h-14 w-14 rounded-full border border-white/20 object-cover" />
          <div className="mt-3 font-display text-sm uppercase tracking-[0.3em] text-white/70">{CREATOR.name}</div><div className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/40">Credits — Design, code & story · LOOPBREAK</div>
        </footer>
      </div>
      {lightbox !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <div className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}><RemoteImage srcs={GALLERY[lightbox].img} alt={GALLERY[lightbox].title} className="max-h-[80vh] w-full object-contain" /><div className="mt-3 flex items-center justify-between font-display text-sm uppercase tracking-[0.2em] text-white"><span>{GALLERY[lightbox].title}</span><div className="flex gap-2"><Btn small onClick={() => setLightbox((lightbox + 7) % 8)}>←</Btn><Btn small onClick={() => setLightbox((lightbox + 1) % 8)}>→</Btn><Btn small onClick={() => setLightbox(null)}>Close</Btn></div></div></div>
        </div>
      )}
    </div>
  );
}
