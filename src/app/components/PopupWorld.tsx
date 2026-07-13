import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import TaskContainer from './TaskPill';
import ArcadeExplosionEffect from './ArcadeExplosionEffect';
import { toast } from 'sonner';
import type { Todo, GameSettings } from '../App';

interface PillState extends Todo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isSelected: boolean;
  isDragging: boolean;
  transformationPhase: 'task' | 'transitioning' | 'pill';
}

interface ArcadeExplosion {
  id: string;
  pillId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  duration?: number;
}

interface PopupWorldProps {
  completedTodos: Todo[];
  onRemovePill: (id: string) => void;
  onRemoveMultiplePills: (ids: string[]) => void;
  gameSettings: GameSettings;
  addXP: (amount: number) => void;
  backgroundImage: string;
  onPillPopped: () => void;
  onClose: () => void;
}

const PILL_SPEED = 1.2;

const toastMessages = [
  'Gone. You handled it.',
  'Off the list. Feels good.',
  'Progress looks good on you.',
  'Look at you, getting things done.',
  "One down. You're on a roll.",
  'Every task counts. This one too.',
  'Handled. Moving forward.',
];

export default function PopupWorld({
  completedTodos,
  onRemovePill,
  onRemoveMultiplePills,
  gameSettings,
  addXP,
  backgroundImage,
  onPillPopped,
  onClose,
}: PopupWorldProps) {
  const [pills, setPills] = useState<PillState[]>([]);
  const [arcadeExplosions, setArcadeExplosions] = useState<ArcadeExplosion[]>([]);

  const containerRef  = useRef<HTMLDivElement>(null);
  const animationRef  = useRef<number>();
  const lastTsRef     = useRef<number>(0);
  const toastQueueRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const lastToastRef  = useRef(0);

  // ── Pill sizing helper ──────────────────────────────────────────────────────
  const getDims = (text: string) => {
    const words = text.trim().split(/\s+/);
    const wc = words.length;
    if (wc >= 3 && wc <= 5) {
      const width  = Math.max(80, Math.min(140, text.length * 8 + 16));
      const height = wc <= 3 ? 48 : wc === 4 ? 56 : 64;
      return { width, height };
    }
    return { width: 120, height: 48 };
  };

  // ── Sync completedTodos → pills ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    setPills(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const newTodos = completedTodos.filter(t => !existingIds.has(t.id));
      if (newTodos.length === 0) return prev;

      const added: PillState[] = newTodos.map(todo => {
        const { width, height } = getDims(todo.text);
        const x = Math.random() * Math.max(0, cw - width);
        const y = Math.random() * Math.max(0, ch - height);
        const angle = Math.random() * Math.PI * 2;
        return {
          ...todo,
          x, y,
          vx: Math.cos(angle) * PILL_SPEED,
          vy: Math.sin(angle) * PILL_SPEED,
          width, height,
          isSelected: false,
          isDragging: false,
          transformationPhase: 'pill',
        };
      });
      return [...prev, ...added];
    });
  }, [completedTodos]);

  // ── Physics loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    const animate = (ts: number) => {
      const dt = lastTsRef.current ? Math.min((ts - lastTsRef.current) / 16.67, 3) : 1;
      lastTsRef.current = ts;

      const c = containerRef.current;
      if (!c) { animationRef.current = requestAnimationFrame(animate); return; }
      const cw = c.clientWidth;
      const ch = c.clientHeight;

      setPills(prev => {
        if (prev.length === 0) return prev;

        // normalize speed
        const norm = prev.map(p => {
          if (p.isDragging || p.isSelected) return p;
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (spd < 0.01) {
            const a = Math.random() * Math.PI * 2;
            return { ...p, vx: Math.cos(a) * PILL_SPEED, vy: Math.sin(a) * PILL_SPEED };
          }
          return { ...p, vx: (p.vx / spd) * PILL_SPEED, vy: (p.vy / spd) * PILL_SPEED };
        });

        // move + wall bounce
        const moved = norm.map(p => {
          if (p.isDragging || p.isSelected) return p;
          let { vx, vy } = p;
          let x = p.x + vx * dt;
          let y = p.y + vy * dt;
          if (x <= 0)                { x = 0;           vx =  Math.abs(vx); }
          else if (x + p.width >= cw){ x = cw - p.width; vx = -Math.abs(vx); }
          if (y <= 0)                 { y = 0;            vy =  Math.abs(vy); }
          else if (y + p.height >= ch){ y = ch - p.height; vy = -Math.abs(vy); }
          return { ...p, x, y, vx, vy };
        });

        // elastic collisions
        const res = [...moved];
        for (let i = 0; i < res.length; i++) {
          if (res[i].isDragging || res[i].isSelected) continue;
          for (let j = i + 1; j < res.length; j++) {
            if (res[j].isDragging || res[j].isSelected) continue;
            const a = res[i], b = res[j];
            const dx  = (a.x + a.width / 2) - (b.x + b.width / 2);
            const dy  = (a.y + a.height / 2) - (b.y + b.height / 2);
            const d   = Math.sqrt(dx * dx + dy * dy);
            const min = (Math.max(a.width, a.height) + Math.max(b.width, b.height)) / 2 + 4;
            if (d < min && d > 0) {
              const nx  = dx / d, ny = dy / d;
              const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (dvn < 0) {
                res[i] = { ...a, vx: a.vx - dvn * nx, vy: a.vy - dvn * ny };
                res[j] = { ...b, vx: b.vx + dvn * nx, vy: b.vy + dvn * ny };
              }
              const ov = (min - d) / 2;
              res[i] = { ...res[i], x: res[i].x + nx * ov, y: res[i].y + ny * ov };
              res[j] = { ...res[j], x: res[j].x - nx * ov, y: res[j].y - ny * ov };
            }
          }
        }

        // re-normalize
        return res.map(p => {
          if (p.isDragging || p.isSelected) return p;
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (spd < 0.01) return p;
          return { ...p, vx: (p.vx / spd) * PILL_SPEED, vy: (p.vy / spd) * PILL_SPEED };
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  // ── Toast queue ────────────────────────────────────────────────────────────
  const queueToast = (msg: string) => {
    toastQueueRef.current.push(msg);
    processNext();
  };

  const processNext = () => {
    if (processingRef.current || toastQueueRef.current.length === 0) return;
    processingRef.current = true;
    const gap = Math.max(0, 800 - (Date.now() - lastToastRef.current));
    setTimeout(() => {
      const m = toastQueueRef.current.shift();
      if (m) { toast.success(m, { duration: 2800 }); lastToastRef.current = Date.now(); }
      processingRef.current = false;
      if (toastQueueRef.current.length > 0) setTimeout(processNext, 200);
    }, gap);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTaskSelect = (id: string) => {
    setPills(prev => prev.map(p => ({ ...p, isSelected: p.id === id, isDragging: false })));
  };

  const handleTaskDrag = (id: string, nx: number, ny: number) => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    setPills(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === -1) return prev;
      const dragged = prev[idx];
      const cx = Math.max(0, Math.min(cw - dragged.width,  nx));
      const cy = Math.max(0, Math.min(ch - dragged.height, ny));
      return prev.map(p => {
        if (p.id === id) return { ...p, x: cx, y: cy, isDragging: true, vx: 0, vy: 0 };
        if (!p.isSelected && !p.isDragging) {
          const dx = (cx + dragged.width / 2)  - (p.x + p.width / 2);
          const dy = (cy + dragged.height / 2) - (p.y + p.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const min  = (Math.max(dragged.width, dragged.height) + Math.max(p.width, p.height)) / 2 + 4;
          if (dist < min && dist > 0) {
            const nx2 = dx / dist, ny2 = dy / dist;
            const ov  = min - dist;
            return {
              ...p,
              x: Math.max(0, Math.min(cw - p.width,  p.x - nx2 * ov)),
              y: Math.max(0, Math.min(ch - p.height, p.y - ny2 * ov)),
              vx: -nx2 * PILL_SPEED,
              vy: -ny2 * PILL_SPEED,
            };
          }
        }
        return p;
      });
    });
  };

  const handleTaskRelease = (id: string, vel?: { vx: number; vy: number }) => {
    setPills(prev => prev.map(p =>
      p.id === id ? {
        ...p,
        isSelected: false,
        isDragging: false,
        vx: vel?.vx ?? Math.cos(Math.random() * Math.PI * 2) * PILL_SPEED,
        vy: vel?.vy ?? Math.sin(Math.random() * Math.PI * 2) * PILL_SPEED,
      } : p
    ));
  };

  const handleTaskDestroy = (id: string) => {
    const task = pills.find(p => p.id === id);
    if (!task) return;

    addXP(100);
    onRemovePill(id);

    setArcadeExplosions(prev => [...prev, {
      id: Date.now().toString(),
      pillId: id,
      x: task.x, y: task.y,
      width: task.width, height: task.height,
    }]);
    setPills(prev => prev.filter(p => p.id !== id));

    // Tell GameScreen to celebrate existing Popples
    setTimeout(() => onPillPopped(), 1400);

    queueToast(toastMessages[Math.floor(Math.random() * toastMessages.length)]);
  };

  const handleExplosionComplete = (expId: string) => {
    setArcadeExplosions(prev => prev.filter(e => e.id !== expId));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[10000] flex flex-col"
      style={{
        bottom: 'calc(5rem + env(safe-area-inset-bottom))',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <div className="bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/60">
          <span className="font-pixel text-xs text-gray-700">
            {pills.length > 0
              ? `${pills.length} task${pills.length !== 1 ? 's' : ''} to pop`
              : 'all clear ✦'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full border border-white/60 shadow-sm hover:bg-white transition-colors"
        >
          <X className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      {/* Pill physics area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">

        {/* Empty state */}
        {pills.length === 0 && arcadeExplosions.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 text-center border border-white/60 shadow-lg max-w-xs"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              <p className="font-pixel text-sm text-gray-700">Nothing to pop.</p>
              <p className="font-pixel text-xs text-gray-500 mt-2">Complete tasks and they'll appear here.</p>
            </motion.div>
          </div>
        )}

        {/* Pills */}
        {pills.map(pill => (
          <TaskContainer
            key={`popup-${pill.id}`}
            pill={pill}
            onSelect={handleTaskSelect}
            onDrag={handleTaskDrag}
            onRelease={handleTaskRelease}
            onDestroy={handleTaskDestroy}
          />
        ))}

        {/* Explosions */}
        {arcadeExplosions.map(exp => (
          <ArcadeExplosionEffect
            key={`exp-${exp.id}`}
            x={exp.x} y={exp.y}
            width={exp.width} height={exp.height}
            duration={exp.duration}
            onComplete={() => handleExplosionComplete(exp.id)}
          />
        ))}
      </div>
    </motion.div>
  );
}
