import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, ClipboardList, Target, BarChart3 } from 'lucide-react';
import cityBackground from 'figma:asset/b06399fe4c9c24f9ce21884751670df3937a40b9.png';
import ArcadeExplosionEffect from './ArcadeExplosionEffect';

interface OnboardingFlowProps {
  onComplete: (firstTask?: string) => void;
  backgroundImage: string;
  onBackToLogin?: () => void;
}

// ─── Step visuals ─────────────────────────────────────────────────────────────

const DEMO_TASKS = ['Call the dentist', 'Pay rent'];

export function AddTasksVisual() {
  const [typed, setTyped] = useState('');
  const [addedTasks, setAddedTasks] = useState<string[]>([]);
  const [buttonFlash, setButtonFlash] = useState(false);

  useEffect(() => {
    let mounted = true;

    const typeText = (text: string, onDone: () => void) => {
      let i = 0;
      const id = setInterval(() => {
        if (!mounted) { clearInterval(id); return; }
        i++;
        setTyped(text.slice(0, i));
        if (i >= text.length) { clearInterval(id); onDone(); }
      }, 75);
    };

    const addTask = (task: string, onDone: () => void) => {
      setButtonFlash(true);
      setTimeout(() => {
        if (!mounted) return;
        setButtonFlash(false);
        setTyped('');
        setAddedTasks(prev => [...prev, task]);
        setTimeout(onDone, 700);
      }, 220);
    };

    const cycle = () => {
      if (!mounted) return;
      setTyped('');
      setAddedTasks([]);

      setTimeout(() => {
        typeText(DEMO_TASKS[0], () => {
          setTimeout(() => addTask(DEMO_TASKS[0], () => {
            typeText(DEMO_TASKS[1], () => {
              setTimeout(() => addTask(DEMO_TASKS[1], () => {
                setTimeout(() => { if (mounted) cycle(); }, 2200);
              }), 400);
            });
          }), 400);
        });
      }, 400);
    };

    cycle();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="w-64 pixel-notebook rounded-2xl shadow-lg border border-white/60 overflow-hidden">
      {/* Input row — mirrors the sticky input section in TodoListScreen */}
      <div className="border-b border-white/60 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 flex items-center min-h-[30px] overflow-hidden">
            {typed ? (
              <span className="font-space-mono text-[10px] text-gray-800 flex items-center gap-0.5 truncate">
                <span className="truncate">{typed}</span>
                <motion.span
                  className="inline-block w-px h-3 bg-gray-600 flex-shrink-0 ml-px"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
              </span>
            ) : (
              <span className="font-space-mono text-[10px] text-gray-400 truncate">Add a task...</span>
            )}
          </div>
          <motion.div
            animate={{
              backgroundColor: buttonFlash ? '#1e293b' : '#475569',
              scale: buttonFlash ? 0.9 : 1,
            }}
            transition={{ duration: 0.12 }}
            className="px-2.5 py-1.5 text-white font-pixel text-[8px] border-2 border-slate-800 rounded-lg flex-shrink-0 leading-none"
          >
            Submit
          </motion.div>
        </div>
      </div>

      {/* Task list */}
      <div className="px-3 py-2 space-y-1.5 min-h-[80px]">
        {addedTasks.length === 0 && (
          <p className="font-space-mono text-[9px] text-gray-400 text-center pt-4">
            Your tasks appear here
          </p>
        )}
        <AnimatePresence initial={false}>
          {addedTasks.map(task => (
            <motion.div
              key={task}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="flex items-center gap-2 px-2.5 py-2 bg-white/80 border border-white/60 rounded-xl overflow-hidden"
            >
              <div
                className="w-3.5 h-3.5 border-2 border-gray-400 flex-shrink-0"
                style={{ borderRadius: '2px' }}
              />
              <span className="font-space-mono text-[10px] text-gray-700">{task}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function CheckOffVisual() {
  const [checked, setChecked] = useState(false);
  const [page, setPage] = useState<'tasks' | 'space'>('tasks');

  useEffect(() => {
    let mounted = true;
    const cycle = () => {
      if (!mounted) return;
      setPage('tasks');
      setChecked(false);
      setTimeout(() => { if (mounted) setChecked(true); }, 900);
      setTimeout(() => { if (mounted) setPage('space'); }, 1900);
      setTimeout(() => { if (mounted) cycle(); }, 5400);
    };
    cycle();
    return () => { mounted = false; };
  }, []);

  const navItems = [
    { id: 'tasks', label: 'Tasks', Icon: ClipboardList },
    { id: 'space', label: 'Space',  Icon: Target,        badge: checked && page === 'tasks' },
    { id: 'record', label: 'Record', Icon: BarChart3 },
  ];

  return (
    <div className="w-64 rounded-2xl overflow-hidden shadow-xl" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
      {/* Content area — slides between pages */}
      <div className="relative overflow-hidden" style={{ height: 116 }}>
        <AnimatePresence initial={false}>
          {page === 'tasks' ? (
            <motion.div
              key="tasks"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 pixel-notebook flex flex-col"
            >
              {/* Header — mirrors the real Tasks header */}
              <div className="px-3 pt-2.5 pb-2 border-b border-white/40 flex items-center gap-2 flex-shrink-0">
                <span className="font-pixel text-[9px] text-gray-900">Tasks</span>
                <span className="font-space-mono text-[9px] text-gray-500">2 remaining</span>
              </div>

              {/* Task rows */}
              <div className="flex flex-col justify-center gap-1.5 px-3 py-2 flex-1">
                {/* The task being checked */}
                <div className="flex items-center gap-2 px-2.5 py-2 bg-white/80 border border-white/60 rounded-xl">
                  <motion.div
                    className="w-4 h-4 flex-shrink-0 flex items-center justify-center border-2"
                    style={{ borderRadius: '2px' }}
                    animate={{
                      backgroundColor: checked ? '#2563eb' : '#ffffff',
                      borderColor:     checked ? '#1d4ed8' : '#9ca3af',
                      scale: checked ? [1, 1.3, 1] : 1,
                    }}
                    transition={{ duration: 0.16 }}
                  >
                    {checked && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-white font-bold"
                        style={{ fontSize: '8px', lineHeight: 1 }}
                      >
                        ✓
                      </motion.span>
                    )}
                  </motion.div>
                  <span className="font-space-mono text-[10px] text-gray-700">Buy fresh groceries</span>
                </div>

                {/* Second static task for context */}
                <div className="flex items-center gap-2 px-2.5 py-2 bg-white/80 border border-white/60 rounded-xl opacity-50">
                  <div className="w-4 h-4 flex-shrink-0 border-2 border-gray-400" style={{ borderRadius: '2px' }} />
                  <span className="font-space-mono text-[10px] text-gray-700">Call the dentist</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="space"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: `url(${cityBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                imageRendering: 'pixelated',
              }}
            >
              <div className="absolute inset-0 bg-black/30" />
              {/* Entrance wrapper */}
              <motion.div
                className="relative z-10"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              >
                {/* Continuous bob */}
                <motion.div
                  className="bg-white border-2 border-black rounded-2xl px-3 py-1.5"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                >
                  <span className="font-pixel text-[8px] text-black whitespace-nowrap">Buy fresh groceries</span>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom nav — exact match to NavigationBar mobile layout */}
      <div className="bg-gray-900/95 border-t border-gray-700/50 px-2 py-2 flex items-center justify-around">
        {navItems.map(({ id, label, Icon, badge }) => {
          const active = page === (id === 'space' ? 'space' : id === 'tasks' ? 'tasks' : 'record');
          return (
            <div key={id} className="relative flex flex-col items-center gap-0.5 px-2">
              <div className="relative">
                <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-gray-400'}`} />
                {badge && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full"
                  />
                )}
              </div>
              <span className={`font-inter text-[8px] font-medium leading-none ${active ? 'text-blue-400' : 'text-gray-400'}`}>
                {label}
              </span>
              {active && (
                <motion.div
                  layoutId="onboarding-nav-underline"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-400 rounded-full"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type ExplosionPos = { x: number; y: number; w: number; h: number };

export function PopItVisual() {
  const [tapCount, setTapCount]         = useState(0);
  const [popped, setPopped]             = useState(false);
  const [explosionPos, setExplosionPos] = useState<ExplosionPos | null>(null);
  const [showXP, setShowXP]             = useState(false);
  const pillRef      = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef   = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const capturePillPos = (): ExplosionPos | null => {
    const pill = pillRef.current;
    const box  = containerRef.current;
    if (!pill || !box) return null;
    const pr = pill.getBoundingClientRect();
    const cr = box.getBoundingClientRect();
    return { x: pr.left - cr.left, y: pr.top - cr.top, w: pr.width, h: pr.height };
  };

  const startCycle = () => {
    if (!mountedRef.current) return;
    setTapCount(0);
    setPopped(false);
    setExplosionPos(null);
    setShowXP(false);

    const t = (ms: number, fn: () => void) =>
      setTimeout(() => { if (mountedRef.current) fn(); }, ms);

    t(700,  () => setTapCount(1));
    t(1400, () => setTapCount(2));
    t(2100, () => setTapCount(3));
    t(2300, () => {
      const pos = capturePillPos();
      setExplosionPos(pos);
      setPopped(true);
    });
  };

  useEffect(() => { startCycle(); }, []);

  const handleExplosionComplete = () => {
    if (!mountedRef.current) return;
    setExplosionPos(null);
    setShowXP(true);
    setTimeout(() => { if (mountedRef.current) startCycle(); }, 2200);
  };

  const progress = (tapCount / 3) * 100;

  return (
    <div
      ref={containerRef}
      className="w-64 relative overflow-hidden rounded-2xl"
      style={{
        height: 120,
        backgroundImage: `url(${cityBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
      }}
    >
      <div className="absolute inset-0 bg-black/30" />

      {/* Progress bar */}
      <AnimatePresence>
        {tapCount > 0 && !popped && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-24 bg-white/25 rounded-full p-0.5"
          >
            <motion.div
              className="h-1.5 bg-white rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating pill */}
      <AnimatePresence>
        {!popped && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-10"
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
          >
            <motion.div
              ref={pillRef}
              className="bg-white border-2 border-black rounded-2xl px-3 py-1.5"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ boxShadow: tapCount > 0 ? '0 0 14px rgba(255,255,255,0.45)' : 'none' }}
            >
              <span className="font-pixel text-[8px] text-black whitespace-nowrap">Buy groceries</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real arcade explosion at the pill's exact position */}
      {explosionPos && (
        <ArcadeExplosionEffect
          x={explosionPos.x}
          y={explosionPos.y}
          width={explosionPos.w}
          height={explosionPos.h}
          duration={1400}
          onComplete={handleExplosionComplete}
        />
      )}

      {/* +XP badge */}
      <AnimatePresence>
        {showXP && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
            className="absolute inset-0 flex items-center justify-center z-20"
          >
            <span
              className="font-pixel text-sm text-white"
              style={{ textShadow: '0 0 24px rgba(255,255,255,0.6)' }}
            >
              +100 XP ✨
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint */}
      <p className="absolute bottom-2 left-0 right-0 text-center font-space-mono text-[9px] text-white/50 z-10">
        Tap 3 times to pop
      </p>
    </div>
  );
}

const INTRO_PILLS = [
  { task: 'Call mom', delay: 0 },
  { task: 'Buy groceries', delay: 0.3 },
  { task: 'Water plants', delay: 0.6 },
];

const PILL_SPEED = 1.2;

function IntroVisual() {
  const [pills, setPills] = useState<Array<{ id: string; x: number; y: number; vx: number; vy: number; w: number; h: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>();
  const lastTsRef = useRef<number>(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const box = containerRef.current;
    if (!box) return;
    const W = box.clientWidth, H = box.clientHeight;
    const w = 80, h = 32;

    const initial = INTRO_PILLS.map((p, i) => {
      const angle = (i / INTRO_PILLS.length) * Math.PI * 2;
      return {
        id: String(i),
        x: Math.max(0, Math.min(W - w, W / 2 + Math.cos(angle) * 30)),
        y: Math.max(0, Math.min(H - h, H / 2 + Math.sin(angle) * 30)),
        vx: Math.cos(angle) * PILL_SPEED,
        vy: Math.sin(angle) * PILL_SPEED,
        w, h,
      };
    });
    setPills(initial);
  }, []);

  useEffect(() => {
    const animate = (ts: number) => {
      if (!mountedRef.current) return;
      const dt = lastTsRef.current ? Math.min((ts - lastTsRef.current) / 16.67, 3) : 1;
      lastTsRef.current = ts;
      const box = containerRef.current;
      if (!box) { animRef.current = requestAnimationFrame(animate); return; }
      const W = box.clientWidth, H = box.clientHeight;

      setPills(prev => {
        if (prev.length === 0) return prev;

        // Step 1: normalise speed
        let result = prev.map(p => {
          const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (s < 0.01) {
            const a = Math.random() * Math.PI * 2;
            return { ...p, vx: Math.cos(a) * PILL_SPEED, vy: Math.sin(a) * PILL_SPEED };
          }
          return { ...p, vx: (p.vx / s) * PILL_SPEED, vy: (p.vy / s) * PILL_SPEED };
        });

        // Step 2: move + wall bounce
        result = result.map(p => {
          let { vx, vy, x, y } = p;
          x += vx * dt; y += vy * dt;
          if (x <= 0) { x = 0; vx = Math.abs(vx); }
          else if (x + p.w >= W) { x = W - p.w; vx = -Math.abs(vx); }
          if (y <= 0) { y = 0; vy = Math.abs(vy); }
          else if (y + p.h >= H) { y = H - p.h; vy = -Math.abs(vy); }
          return { ...p, x, y, vx, vy };
        });

        // Step 3: elastic collisions
        for (let i = 0; i < result.length; i++) {
          for (let j = i + 1; j < result.length; j++) {
            const a = result[i], b = result[j];
            const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
            const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const min = (Math.max(a.w, a.h) + Math.max(b.w, b.h)) / 2 + 2;
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

        // Step 4: re-normalise
        return result.map(p => {
          const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (s < 0.01) return p;
          return { ...p, vx: (p.vx / s) * PILL_SPEED, vy: (p.vy / s) * PILL_SPEED };
        });
      });

      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-80 h-56 relative overflow-hidden rounded-2xl border-2 border-white/20"
      style={{
        backgroundImage: `url(${cityBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
      }}
    >
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0">
        {pills.map((pill, idx) => (
          <motion.div
            key={pill.id}
            className="absolute"
            style={{ left: pill.x, top: pill.y, width: 80, height: 32 }}
          >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: INTRO_PILLS[idx].delay, type: 'spring', stiffness: 300, damping: 20 }}
            className="w-full h-full bg-white border-2 border-black rounded-xl flex items-center justify-center px-2"
          >
            <span className="font-pixel text-[7px] text-black text-center whitespace-normal leading-tight">{INTRO_PILLS[idx].task}</span>
          </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FirstTaskVisual({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="w-64 pixel-notebook rounded-2xl border border-white/60 px-4 py-4 flex flex-col gap-3">
      <p className="font-space-mono text-[10px] text-gray-500 leading-relaxed">
        What's one thing you need to get done today?
      </p>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. Call the dentist"
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 font-space-mono text-[11px] text-gray-800 placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all"
        autoFocus
        maxLength={80}
      />
    </div>
  );
}

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    title: "Welcome to Popple.",
    description: "An interactive to-do list where your productivity becomes visible, tangible, and fun.",
    Visual: IntroVisual,
  },
  {
    title: 'Add your tasks',
    description: 'Type what you need to do. Big tasks, small tasks — everything goes in.',
    Visual: AddTasksVisual,
  },
  {
    title: 'Check one off',
    description: 'Mark it done. Watch it float into Your Space as a bubble you can see and interact with.',
    Visual: CheckOffVisual,
  },
  {
    title: 'Pop it to earn XP',
    description: 'Drag it, interact with it, pop it when you\'re ready. Every bubble destroyed levels you up.',
    Visual: PopItVisual,
  },
  {
    title: 'Start with one task',
    description: "Name it. We'll add it to your list right now.",
    Visual: FirstTaskVisual,
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingFlow({ onComplete, backgroundImage, onBackToLogin }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [firstTask, setFirstTask] = useState('');
  const isLast = step === STEPS.length - 1;

  const finish = (task?: string) => onComplete(task?.trim() || undefined);

  const advance = () => {
    if (isLast) finish(firstTask);
    else setStep(s => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center pixelated"
        style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', imageRendering: 'pixelated' }}
      >
        <div className="absolute inset-0 bg-black/55" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Card */}
        <div className="w-full bg-gray-800 rounded-3xl p-8 flex flex-col items-center border-2 border-gray-700">
          {/* Step dots */}
          <div className="flex gap-2 mb-8">
            {STEPS.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i === step ? 24 : 8,
                  backgroundColor: i === step ? '#22d3ee' : i < step ? '#164e63' : '#374151',
                }}
                transition={{ duration: 0.25 }}
                className="h-2 rounded-full"
              />
            ))}
          </div>

          {/* Animated step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
              className="flex flex-col items-center w-full"
            >
              {/* Visual */}
              <div className="mb-8 flex items-center justify-center w-full" style={{ minHeight: '9rem' }}>
                {isLast
                  ? <FirstTaskVisual value={firstTask} onChange={setFirstTask} />
                  : React.createElement(STEPS[step].Visual)
                }
              </div>

              {/* Text */}
              <h2 className="font-pixel text-base text-white text-center mb-3 leading-relaxed">
                {STEPS[step].title}
              </h2>
              <p className="font-space-mono text-sm text-white text-center leading-relaxed">
                {STEPS[step].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="mt-8 w-full flex gap-3">
            {step > 0 && (
              <button
                onClick={goBack}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-pixel text-xs border-2 border-gray-600 rounded-xl transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={advance}
              className={`${step > 0 ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 py-3 px-6 bg-cyan-600 hover:bg-cyan-700 text-white font-pixel text-xs border-2 border-cyan-800 rounded-xl transition-all duration-200 shadow-lg`}
            >
              {isLast
                ? (firstTask.trim() ? "Let's go!" : 'Start fresh')
                : 'Next'
              }
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom escape — back to login on step 0, skip on later steps */}
        {step === 0 && onBackToLogin ? (
          <button
            onClick={onBackToLogin}
            className="mt-4 font-space-mono text-xs text-gray-400 hover:text-gray-200 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" />
            Back to login
          </button>
        ) : (
          <button
            onClick={() => finish()}
            className="mt-4 font-space-mono text-xs text-gray-400 hover:text-gray-200 transition-colors underline"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
