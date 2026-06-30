import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ArcadeExplosionEffect from './ArcadeExplosionEffect';
import { AddTasksVisual, CheckOffVisual, PopItVisual } from './OnboardingFlow';
import cityBackground from 'figma:asset/b06399fe4c9c24f9ce21884751670df3937a40b9.png';
import skyBackground from 'figma:asset/730a2b5730fb297ff69baf12c868d97ded365bc0.png';
import johannaPhoto from '../../assets/johanna.jpeg';

interface LandingPageProps {
  onEnter: () => void;
  onGuestMode: () => void;
}

// ─── Interactive demo ─────────────────────────────────────────────────────────

const DEMO_SPEED = 1.2;
const DEMO_TASKS = ['Call the dentist', 'Pay rent', 'Buy groceries'];

interface DemoPill {
  id: string;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  isDragging: boolean;
}

type Explosion = { id: string; x: number; y: number; w: number; h: number };

type LetterRect = { x: number; y: number; w: number; h: number };

function LandingDemo({ fullBleed, showWordmark = true }: { fullBleed?: boolean; showWordmark?: boolean }) {
  const [pills, setPills]           = useState<DemoPill[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [hint, setHint]             = useState(true);
  const containerRef  = useRef<HTMLDivElement>(null);
  const letterRefs    = useRef<(HTMLSpanElement | null)[]>([]);
  const letterRectsRef = useRef<LetterRect[]>([]);
  const animRef       = useRef<number>();
  const lastTsRef     = useRef<number>(0);
  const mountedRef    = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Measure letter bounding boxes relative to container
  useEffect(() => {
    const measure = () => {
      const box = containerRef.current;
      if (!box) return;
      const cr = box.getBoundingClientRect();
      letterRectsRef.current = letterRefs.current
        .map(ref => {
          if (!ref) return null;
          const r = ref.getBoundingClientRect();
          return { x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height };
        })
        .filter((r): r is LetterRect => r !== null);
    };
    const timer = setTimeout(measure, 150);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(timer); window.removeEventListener('resize', measure); };
  }, []);

  // Initialise pills at corners so they don't spawn inside the word
  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    const W = box.clientWidth, H = box.clientHeight;
    const corners = [
      { x: 10,       y: 10 },
      { x: W - 110,  y: 10 },
      { x: 10,       y: H - 42 },
    ];
    const initial: DemoPill[] = DEMO_TASKS.map((text, i) => {
      const w = Math.max(90, text.length * 7 + 24);
      const h = 32;
      const angle = (Math.PI / 4) + (i * Math.PI / 2.5);
      return {
        id: String(i), text,
        x: corners[i].x, y: corners[i].y,
        vx: Math.cos(angle) * DEMO_SPEED,
        vy: Math.sin(angle) * DEMO_SPEED,
        w, h, isDragging: false,
      };
    });
    setPills(initial);
  }, []);

  // Physics loop with letter collision
  useEffect(() => {
    const animate = (ts: number) => {
      const dt = lastTsRef.current ? Math.min((ts - lastTsRef.current) / 16.67, 3) : 1;
      lastTsRef.current = ts;
      const box = containerRef.current;
      if (!box) { animRef.current = requestAnimationFrame(animate); return; }
      const W = box.clientWidth, H = box.clientHeight;
      const lrs = letterRectsRef.current;

      setPills(prev => {
        if (prev.length === 0) return prev;

        // Step 1: normalise speed
        const normed = prev.map(p => {
          if (p.isDragging) return p;
          const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (s < 0.01) {
            const a = Math.random() * Math.PI * 2;
            return { ...p, vx: Math.cos(a) * DEMO_SPEED, vy: Math.sin(a) * DEMO_SPEED };
          }
          return { ...p, vx: (p.vx / s) * DEMO_SPEED, vy: (p.vy / s) * DEMO_SPEED };
        });

        // Step 2: move + wall bounce
        const moved = normed.map(p => {
          if (p.isDragging) return p;
          let { vx, vy, x, y } = p;
          x += vx * dt; y += vy * dt;
          if (x <= 0)           { x = 0;       vx =  Math.abs(vx); }
          else if (x + p.w >= W){ x = W - p.w; vx = -Math.abs(vx); }
          if (y <= 0)           { y = 0;        vy =  Math.abs(vy); }
          else if (y + p.h >= H){ y = H - p.h;  vy = -Math.abs(vy); }
          return { ...p, x, y, vx, vy };
        });

        // Step 3: letter AABB collision
        const lettered = moved.map(p => {
          if (p.isDragging) return p;
          let { x, y, vx, vy } = p;
          for (const lr of lrs) {
            const ox = Math.min(x + p.w, lr.x + lr.w) - Math.max(x, lr.x);
            const oy = Math.min(y + p.h, lr.y + lr.h) - Math.max(y, lr.y);
            if (ox > 0 && oy > 0) {
              const pillCX = x + p.w / 2, pillCY = y + p.h / 2;
              const lrCX = lr.x + lr.w / 2, lrCY = lr.y + lr.h / 2;
              if (ox < oy) {
                x += pillCX < lrCX ? -ox : ox;
                vx = pillCX < lrCX ? -Math.abs(vx) : Math.abs(vx);
              } else {
                y += pillCY < lrCY ? -oy : oy;
                vy = pillCY < lrCY ? -Math.abs(vy) : Math.abs(vy);
              }
            }
          }
          return { ...p, x, y, vx, vy };
        });

        // Step 4: pill-pill elastic collisions
        const result = [...lettered];
        for (let i = 0; i < result.length; i++) {
          if (result[i].isDragging) continue;
          for (let j = i + 1; j < result.length; j++) {
            if (result[j].isDragging) continue;
            const a = result[i], b = result[j];
            const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
            const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const min  = (Math.max(a.w, a.h) + Math.max(b.w, b.h)) / 2 + 4;
            if (dist < min && dist > 0) {
              const nx = dx / dist, ny = dy / dist;
              const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (dvn < 0) {
                result[i] = { ...a, vx: a.vx - dvn * nx, vy: a.vy - dvn * ny };
                result[j] = { ...b, vx: b.vx + dvn * nx, vy: b.vy + dvn * ny };
              }
              const ov = (min - dist) / 2;
              result[i] = { ...result[i], x: result[i].x + nx * ov, y: result[i].y + ny * ov };
              result[j] = { ...result[j], x: result[j].x - nx * ov, y: result[j].y - ny * ov };
            }
          }
        }

        // Step 5: re-normalise
        return result.map(p => {
          if (p.isDragging) return p;
          const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (s < 0.01) return p;
          return { ...p, vx: (p.vx / s) * DEMO_SPEED, vy: (p.vy / s) * DEMO_SPEED };
        });
      });

      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const popPill = (pill: DemoPill) => {
    if (!mountedRef.current) return;
    setHint(false);
    setExplosions(prev => [...prev, { id: Date.now().toString(), x: pill.x, y: pill.y, w: pill.w, h: pill.h }]);
    setPills(prev => prev.filter(p => p.id !== pill.id));
    setTimeout(() => {
      if (!mountedRef.current) return;
      const box = containerRef.current;
      if (!box) return;
      const W = box.clientWidth, H = box.clientHeight;
      const text = DEMO_TASKS[Math.floor(Math.random() * DEMO_TASKS.length)];
      const w = Math.max(90, text.length * 7 + 24), h = 32;
      const angle = Math.random() * Math.PI * 2;
      // Respawn at a corner, away from center text
      const corners = [{ x: 10, y: 10 }, { x: W - w - 10, y: 10 }, { x: 10, y: H - h - 10 }, { x: W - w - 10, y: H - h - 10 }];
      const c = corners[Math.floor(Math.random() * corners.length)];
      setPills(prev => [...prev, { id: Date.now().toString(), text, x: c.x, y: c.y, vx: Math.cos(angle) * DEMO_SPEED, vy: Math.sin(angle) * DEMO_SPEED, w, h, isDragging: false }]);
    }, 1500);
  };

  const dragRef = useRef<{ pillId: string; startX: number; startY: number; pillX: number; pillY: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent, pill: DemoPill) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setHint(false);
    dragRef.current = { pillId: pill.id, startX: e.clientX, startY: e.clientY, pillX: pill.x, pillY: pill.y };
    setPills(prev => prev.map(p => p.id === pill.id ? { ...p, isDragging: true } : p));
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { pillId, startX, startY, pillX, pillY } = dragRef.current;
    const box = containerRef.current;
    if (!box) return;
    const W = box.clientWidth, H = box.clientHeight;
    setPills(prev => prev.map(p => {
      if (p.id !== pillId) return p;
      return { ...p, x: Math.max(0, Math.min(W - p.w, pillX + e.clientX - startX)), y: Math.max(0, Math.min(H - p.h, pillY + e.clientY - startY)) };
    }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { pillId, startX, startY } = dragRef.current;
    dragRef.current = null;
    const dist = Math.sqrt((e.clientX - startX) ** 2 + (e.clientY - startY) ** 2);
    if (dist < 6) {
      const pill = pills.find(p => p.id === pillId);
      if (pill) popPill(pill);
    } else {
      setPills(prev => prev.map(p => p.id === pillId ? { ...p, isDragging: false, vx: (e.movementX || 0) * 0.5, vy: (e.movementY || 0) * 0.5 } : p));
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden ${fullBleed ? '' : 'rounded-2xl'}`}
      style={{
        height: fullBleed ? '100%' : 260,
        backgroundImage: `url(${cityBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="absolute inset-0 bg-black/30" />

      {/* Large "Popple" wordmark — letters measured for collision */}
      {showWordmark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
          <div className="flex">
            {'Popple'.split('').map((char, i) => (
              <span
                key={i}
                ref={el => { letterRefs.current[i] = el; }}
                className="font-pixel text-white"
                style={{
                  fontSize: 'clamp(3rem, 14vw, 5rem)',
                  textShadow: '0 4px 24px rgba(0,0,0,0.7)',
                  opacity: 0.92,
                  letterSpacing: '0.02em',
                }}
              >
                {char}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ delay: 1 }}
            className="absolute bottom-4 left-0 right-0 flex justify-center z-30 pointer-events-none"
          >
            <span className="font-space-mono text-[11px] text-white bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
              Tap or drag the bubbles
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pills — z-20 so they float above the wordmark */}
      {pills.map(pill => (
        <div
          key={pill.id}
          className="absolute cursor-pointer touch-none select-none z-20"
          style={{ left: pill.x, top: pill.y, width: pill.w, height: pill.h }}
          onPointerDown={e => onPointerDown(e, pill)}
        >
          <motion.div
            className="w-full h-full bg-white border-2 border-black rounded-2xl flex items-center justify-center"
            animate={{ scale: pill.isDragging ? 1.08 : 1 }}
            transition={{ duration: 0.1 }}
          >
            <span className="font-pixel text-[7px] text-black whitespace-nowrap px-1">{pill.text}</span>
          </motion.div>
        </div>
      ))}

      {/* Explosions */}
      {explosions.map(exp => (
        <ArcadeExplosionEffect
          key={exp.id}
          x={exp.x} y={exp.y} width={exp.w} height={exp.h}
          duration={1200}
          onComplete={() => setExplosions(prev => prev.filter(e => e.id !== exp.id))}
        />
      ))}
    </div>
  );
}

// ─── Level titles teaser ──────────────────────────────────────────────────────

const TEASER_LEVELS = [
  { emoji: '', title: 'Bubble Novice' },
  { emoji: '', title: 'Bubble Wrangler' },
  { emoji: '', title: 'Grand Popper' },
  { emoji: '', title: 'Popper of Worlds' },
  { emoji: '', title: 'Bubble Deity' },
  { emoji: '', title: 'The Bubble Final Boss' },
];

// ─── FAQ item ─────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  { q: 'Is it really free?', a: 'Yes. Create an account and start playing — no paywall.' },
  { q: 'Do I need an account?', a: 'Nope. Try it as a guest first. Your progress saves when you sign up.' },
  { q: 'What are bubbles?', a: 'Every task you complete turns into a bubble in your Space. Pop them to earn XP.' },
  { q: 'What are levels for?', a: 'There are 50 levels with titles like "Bubble Wrangler" and "Grand Popper." Pure fun.' },
  { q: 'Is it accessible?', a: 'Designed to be. High contrast, readable fonts, no overwhelming animations.' },
];

function FaqList() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="bg-gray-800 rounded-3xl border-2 border-gray-700 flex flex-col divide-y divide-gray-700 overflow-hidden">
      {FAQ_ITEMS.map(({ q, a }, i) => (
        <FaqItem
          key={q}
          question={q}
          answer={a}
          dark
          open={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </div>
  );
}

function FaqItem({ question, answer, dark, open, onToggle }: { question: string; answer: string; dark?: boolean; open: boolean; onToggle: () => void }) {
  return (
    <div className="px-6 py-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <span className={`font-space-mono text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{question}</span>
        <span className="font-space-mono text-lg text-gray-400 flex-shrink-0">{open ? '−' : '+'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`font-space-mono text-xs leading-relaxed pt-3 overflow-hidden ${dark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            {answer}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

type FooterPop = { id: string; x: number; y: number };

function LandingFooter({ onEnter, onGuestMode }: { onEnter: () => void; onGuestMode: () => void }) {
  const [pops, setPops] = useState<FooterPop[]>([]);
  const footerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    const box = footerRef.current;
    if (!box) return;
    const r = box.getBoundingClientRect();
    const id = Date.now().toString();
    setPops(prev => [...prev, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
  };

  return (
    <footer
      ref={footerRef}
      onClick={handleClick}
      className="relative bg-gray-950 overflow-hidden cursor-pointer select-none"
    >
      {/* ── CTA + Links ── */}
      <div className="px-8 pt-14 pb-12 flex items-start justify-between gap-8">
        {/* Left: header + body */}
        <div className="flex flex-col gap-4 max-w-[55%]">
          <p className="font-pixel text-2xl text-white leading-snug">
            Your tasks deserve more than a checkmark.
          </p>
          <p className="font-space-mono text-xs text-gray-500 leading-relaxed">
            Sign up to save your progress, build a streak, and climb 50 levels — one pop at a time.
          </p>
        </div>

        {/* Right: links */}
        <div className="flex flex-col gap-3 items-end">
          <button onClick={e => { e.stopPropagation(); onEnter(); }} className="font-space-mono text-xs text-gray-300 hover:text-white transition-colors text-right">
            Start today →
          </button>
          <button onClick={e => { e.stopPropagation(); onGuestMode(); }} className="font-space-mono text-xs text-gray-500 hover:text-gray-300 transition-colors text-right">
            Try as guest →
          </button>
          <button onClick={e => e.stopPropagation()} className="font-space-mono text-xs text-gray-500 hover:text-gray-300 transition-colors text-right">
            How it works →
          </button>
        </div>
      </div>

      {/* ── Oversized wordmark ── */}
      <div className="overflow-hidden pt-4">
        <p
          className="font-pixel text-white whitespace-nowrap leading-none"
          style={{ fontSize: '23vw', letterSpacing: '-0.02em', opacity: 0.9 }}
        >
          Popple
        </p>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-gray-800">
        <span className="font-space-mono text-[10px] text-gray-700">© {new Date().getFullYear()} Popple</span>
        <span className="font-space-mono text-[10px] text-gray-700">Made with ★ and bubbles</span>
      </div>

      {/* ── Arcade pop explosions ── */}
      {pops.map(pop => (
        <ArcadeExplosionEffect
          key={pop.id}
          x={pop.x}
          y={pop.y}
          width={40}
          height={40}
          duration={1200}
          onComplete={() => setPops(prev => prev.filter(p => p.id !== pop.id))}
        />
      ))}
    </footer>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────

export default function LandingPage({ onEnter, onGuestMode }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── Hero — full-bleed background, floating card ── */}
      <section className="relative flex items-center justify-center" style={{ minHeight: '85vh' }}>
        {/* Full-bleed animated background */}
        <div className="absolute inset-0">
          <LandingDemo fullBleed showWordmark={false} />
        </div>

        {/* Column: card on top, CTAs below */}
        <div className="relative z-20 flex flex-col items-center gap-6 w-full max-w-sm mx-6">

          {/* Floating pixel-notebook card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="pixel-notebook rounded-2xl shadow-2xl px-10 py-10 flex flex-col items-center gap-4 text-center w-full"
            style={{ border: '1px solid rgba(255,255,255,0.6)' }}
          >
            <h1 className="font-pixel text-4xl text-gray-900 tracking-wider leading-snug">Popple</h1>
            <p className="font-space-mono text-sm text-gray-500 leading-relaxed">
              Your productivity, made visible.
            </p>
          </motion.div>

          {/* CTAs — below the card, against the dark background */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="flex flex-col items-center gap-3 w-full"
          >
            <motion.button
              onClick={onEnter}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-pixel text-sm rounded-xl transition-colors duration-200 shadow-lg border border-gray-700"
            >
              Get started
            </motion.button>
            <button
              onClick={onGuestMode}
              className="font-space-mono text-sm text-white/60 hover:text-white transition-colors"
            >
              Try without an account
            </button>
          </motion.div>

        </div>
      </section>

      {/* ── How it works ── */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 23px,
              rgba(6, 182, 212, 0.12) 24px,
              rgba(6, 182, 212, 0.12) 26px,
              transparent 27px,
              transparent 31px
            ),
            linear-gradient(
              90deg,
              transparent 0px,
              transparent 39px,
              rgba(6, 182, 212, 0.18) 40px,
              rgba(6, 182, 212, 0.18) 42px,
              transparent 43px
            )
          `,
          backgroundSize: '100% 32px, 100% 100%',
        }}
      >
        <div className="absolute inset-0 bg-transparent" />
        <div className="relative z-10">

          {/* Header — fades up */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="px-8 pt-12 pb-6 flex flex-col items-center text-center"
          >
            <p className="font-space-mono text-[10px] text-cyan-600 uppercase tracking-widest mb-3">How it works</p>
            <p className="font-pixel text-2xl text-gray-900 leading-snug">Three steps to a better list.</p>
          </motion.div>

          {/* Chapter 1 — text from left, visual from right */}
          <div className="border-t border-cyan-100">
            <div className="flex items-center justify-between py-14" style={{ minHeight: 252 }}>
              <motion.div
                initial={{ opacity: 0, x: -48 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="flex-shrink-0 pl-16 flex flex-col gap-3"
                style={{ maxWidth: '38%' }}
              >
                <p className="font-space-mono text-xs text-cyan-600 uppercase tracking-widest">01</p>
                <p className="font-pixel text-2xl text-gray-900 leading-snug">Add your<br />tasks.</p>
                <p className="font-space-mono text-sm text-gray-500 leading-relaxed">
                  Type what you need to do. Big or small, everything goes in.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 48 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
                className="flex items-center justify-end px-16"
                style={{ width: '55%' }}
              >
                <div className="bg-gray-800 rounded-3xl border-2 border-gray-700 flex items-center justify-center flex-shrink-0" style={{ width: 432, height: 288 }}>
                  <div style={{ zoom: 1.5 }}><AddTasksVisual /></div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Chapter 2 — visual from left, text from right */}
          <div className="border-t border-cyan-100">
            <div className="flex items-center justify-between py-14" style={{ minHeight: 252 }}>
              <motion.div
                initial={{ opacity: 0, x: -48 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="flex items-center px-16"
                style={{ width: '55%' }}
              >
                <div className="bg-gray-800 rounded-3xl border-2 border-gray-700 flex items-center justify-center flex-shrink-0" style={{ width: 432, height: 288 }}>
                  <div style={{ zoom: 1.5 }}><CheckOffVisual /></div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 48 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
                className="flex-shrink-0 pr-16 flex flex-col gap-3"
                style={{ maxWidth: '38%' }}
              >
                <p className="font-space-mono text-xs text-cyan-600 uppercase tracking-widest">02</p>
                <p className="font-pixel text-2xl text-gray-900 leading-snug">Watch it<br />come alive.</p>
                <p className="font-space-mono text-sm text-gray-500 leading-relaxed">
                  Mark it done. It leaves your list and floats into your space as a bubble.
                </p>
              </motion.div>
            </div>
          </div>

          {/* Chapter 3 — text from left, visual drops in with scale */}
          <div className="border-t border-cyan-100 pb-14">
            <div className="flex items-center justify-between py-14" style={{ minHeight: 252 }}>
              <motion.div
                initial={{ opacity: 0, x: -48 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="flex-shrink-0 pl-16 flex flex-col gap-3"
                style={{ maxWidth: '38%' }}
              >
                <p className="font-space-mono text-xs text-cyan-600 uppercase tracking-widest">03</p>
                <p className="font-pixel text-2xl text-gray-900 leading-snug">Pop it.</p>
                <p className="font-space-mono text-sm text-gray-500 leading-relaxed">
                  Tap to destroy it. Earn XP. Climb 50 levels.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 16 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
                className="flex items-center justify-end px-16"
                style={{ width: '55%' }}
              >
                <div className="bg-gray-800 rounded-3xl border-2 border-gray-700 flex items-center justify-center flex-shrink-0" style={{ width: 432, height: 288 }}>
                  <div style={{ zoom: 1.5 }}><PopItVisual /></div>
                </div>
              </motion.div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Why Popple ── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden flex items-center justify-center py-20 px-6"
        style={{
          backgroundImage: `url(${skyBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
          minHeight: 360,
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/55" />

        {/* Dark card — slides up */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-lg bg-gray-800 rounded-3xl border-2 border-gray-700 p-6 flex flex-col items-center gap-5"
        >
          <div className="pixel-notebook w-full rounded-2xl px-6 py-6 flex flex-col gap-4">
            <p className="font-space-mono text-[10px] text-cyan-600 uppercase tracking-widest">Why Popple</p>
            <p className="font-pixel text-2xl text-gray-900 leading-snug">
              Born from a love of lists and a need for joy.
            </p>
            <p className="font-space-mono text-sm text-gray-700 leading-relaxed">
              "I have always used to-do lists — digital, paper, even on my hand. I wanted to make a delightful to-do list that does not require a lot of effort. And that is how Popple came to be."
            </p>
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <img
                src={johannaPhoto}
                alt="Johanna"
                className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-cyan-300"
              />
              <div>
                <p className="font-pixel text-[10px] text-gray-900">Johanna</p>
                <p className="font-space-mono text-[10px] text-gray-400">Creator of Popple</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── FAQ ── */}
      <section className="pixel-notebook border-t border-cyan-100 px-6 py-14 flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col gap-2"
        >
          <p className="font-space-mono text-[10px] text-cyan-600 uppercase tracking-widest">FAQ</p>
          <p className="font-pixel text-2xl text-gray-900 leading-snug">Good questions.</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
        >
          <FaqList />
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <LandingFooter onEnter={onEnter} onGuestMode={onGuestMode} />

    </div>
  );
}
