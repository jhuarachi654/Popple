import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import PoppleCharacter from './PoppleCharacter';
import type { ExtractedTask } from './TaskSwipeDeck';

const DIFF: Record<string, { pill: string; label: string }> = {
  easy:   { pill: 'bg-emerald-100 text-emerald-700', label: 'quick win'   },
  medium: { pill: 'bg-amber-100 text-amber-700',     label: 'some effort' },
  hard:   { pill: 'bg-rose-100 text-rose-700',       label: 'big one'     },
};

type Phase = 'scanning' | 'reviewing';

interface Props {
  imagePreview: string;
  tasks: ExtractedTask[] | null;
  onAccept: (task: ExtractedTask) => void;
  onDecline: (task: ExtractedTask) => void;
  onDone: () => void;
}

const MIN_SCAN_MS = 2800;

const SWIPE_THRESHOLD = 80;
const isTouch = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

function SwipeCard({
  task, diff, cardAtBottom, onAccept, onDecline,
}: {
  task: ExtractedTask;
  diff: { pill: string; label: string };
  cardAtBottom: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-160, 160], [-8, 8]);
  const acceptOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const declineOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > SWIPE_THRESHOLD) onAccept();
    else if (info.offset.x < -SWIPE_THRESHOLD) onDecline();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: cardAtBottom ? 24 : -24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: cardAtBottom ? 12 : -12 }}
      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      className="absolute left-4 right-4 z-10"
      style={cardAtBottom ? { bottom: 32 } : { top: 88 }}
    >
      {isTouch ? (
        /* ── Mobile: swipeable card ── */
        <motion.div
          drag="x"
          dragConstraints={{ left: -240, right: 240 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          style={{ x, rotate }}
          className="bg-black/70 backdrop-blur-md rounded-3xl px-5 py-4 space-y-2 border border-white/10 cursor-grab active:cursor-grabbing select-none"
        >
          <motion.div style={{ opacity: acceptOpacity }}
            className="absolute top-4 right-4 border border-emerald-400 text-emerald-400 rounded-lg px-2 py-0.5 font-space-mono text-[9px] rotate-6 pointer-events-none">
            add ✓
          </motion.div>
          <motion.div style={{ opacity: declineOpacity }}
            className="absolute top-4 left-4 border border-rose-400 text-rose-400 rounded-lg px-2 py-0.5 font-space-mono text-[9px] -rotate-6 pointer-events-none">
            skip ✕
          </motion.div>
          <span className={`font-space-mono text-[9px] px-2 py-0.5 rounded-full ${diff.pill}`}>{diff.label}</span>
          <p className="font-pixel text-lg text-white leading-snug">{task.title}</p>
          <p className="font-space-mono text-[11px] text-white/60 leading-relaxed">{task.coach_note}</p>
          <p className="font-space-mono text-[9px] text-white/30 text-center pt-1">swipe right to add · left to skip</p>
        </motion.div>
      ) : (
        /* ── Desktop: stacked button options ── */
        <div className="bg-black/75 backdrop-blur-md rounded-3xl overflow-hidden border border-white/10">
          {/* Task info */}
          <div className="px-5 pt-5 pb-4 space-y-1.5">
            <span className={`font-space-mono text-[9px] px-2 py-0.5 rounded-full ${diff.pill}`}>{diff.label}</span>
            <p className="font-pixel text-lg text-white leading-snug">{task.title}</p>
            <p className="font-space-mono text-[11px] text-white/55 leading-relaxed">{task.coach_note}</p>
          </div>
          {/* Divider */}
          <div className="h-px bg-white/10" />
          {/* Options */}
          <motion.button
            onClick={onAccept}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-5 py-3.5 flex items-center gap-3 text-left transition-colors"
          >
            <span className="w-6 h-6 rounded-full bg-white/15 border border-white/25 flex items-center justify-center font-space-mono text-xs text-white font-bold">1</span>
            <span className="font-space-mono text-sm text-white">Yes, add this task</span>
          </motion.button>
          <div className="h-px bg-white/10" />
          <motion.button
            onClick={onDecline}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-5 py-3.5 flex items-center gap-3 text-left transition-colors"
          >
            <span className="w-6 h-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-space-mono text-xs text-white/60 font-bold">2</span>
            <span className="font-space-mono text-sm text-white/60">Skip this one</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

// Returns the rendered image rect within an object-contain img element
function getContainRect(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const cw = img.clientWidth, ch = img.clientHeight;
  const nat = img.naturalWidth / img.naturalHeight;
  const con = cw / ch;
  let w: number, h: number;
  if (nat > con) { w = cw; h = cw / nat; }
  else            { h = ch; w = ch * nat; }
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

export default function PhotoScanFlow({ imagePreview, tasks, onAccept, onDecline, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('scanning');
  const [current, setCurrent] = useState(0);
  const [accepted, setAccepted] = useState(0);
  const [containRect, setContainRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const scanStartRef = React.useRef(Date.now());

  const updateContainRect = useCallback(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth) {
      setContainRect(getContainRect(imgRef.current));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateContainRect);
    return () => window.removeEventListener('resize', updateContainRect);
  }, [updateContainRect]);

  useEffect(() => {
    if (tasks === null) return;
    if (tasks.length === 0) { onDone(); return; }
    const elapsed = Date.now() - scanStartRef.current;
    const remaining = Math.max(0, MIN_SCAN_MS - elapsed);
    const t = setTimeout(() => setPhase('reviewing'), remaining);
    return () => clearTimeout(t);
  }, [tasks]);

  const handleAccept = () => {
    if (!tasks) return;
    onAccept(tasks[current]);
    setAccepted(a => a + 1);
    advance();
  };

  const handleDecline = () => {
    if (!tasks) return;
    onDecline(tasks[current]);
    advance();
  };

  const advance = () => {
    if (!tasks) return;
    if (current + 1 >= tasks.length) onDone();
    else setCurrent(c => c + 1);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[10010] bg-black flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative w-full h-full" style={{ maxWidth: 480, maxHeight: '100dvh' }}>
        <AnimatePresence mode="wait">

          {/* ── SCAN phase ── */}
          {phase === 'scanning' && (
            <motion.div
              key="scan"
              className="absolute inset-0 overflow-hidden"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-white/60 shadow-[0_0_12px_4px_rgba(255,255,255,0.3)]"
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ duration: 2.2, ease: 'linear', repeat: Infinity }}
              />

              {[['top-6 left-6', 'border-t-2 border-l-2'], ['top-6 right-6', 'border-t-2 border-r-2'],
                ['bottom-24 left-6', 'border-b-2 border-l-2'], ['bottom-24 right-6', 'border-b-2 border-r-2']
              ].map(([pos, border], i) => (
                <motion.div
                  key={i}
                  className={`absolute w-6 h-6 border-white/80 ${pos} ${border}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.6, 1] }}
                  transition={{ duration: 1.2, delay: i * 0.1, repeat: Infinity }}
                />
              ))}

              <div className="absolute bottom-0 left-0 right-0 px-6 pb-12 flex flex-col items-center gap-3">
                <PoppleCharacter expression="waiting" pendingCount={0} onClick={() => {}} size={56} mode="idle" silent />
                <motion.p
                  className="font-space-mono text-white text-xs tracking-widest uppercase"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  scanning…
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* ── REVIEW phase — full photo, overlaid card ── */}
          {phase === 'reviewing' && tasks && (
            <motion.div
              key="review"
              className="absolute inset-0 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              {/* object-contain so AI region percentages align with visible image */}
              <img
                ref={imgRef}
                src={imagePreview}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
                onLoad={updateContainRect}
              />
              <div className="absolute inset-0 bg-black/25" />

              {current < tasks.length ? (() => {
                const task = tasks[current];
                const diff = DIFF[task.difficulty_guess] ?? DIFF.easy;
                const region = task.region;
                const regionCenter = region ? region.y + region.h / 2 : 0.4;
                const cardAtBottom = regionCenter < 0.55;

                // Map region percentages into actual pixel position within the contain rect
                const cr = containRect;
                const regionStyle = (region && cr) ? {
                  left:   cr.x + region.x * cr.w,
                  top:    cr.y + region.y * cr.h,
                  width:  region.w * cr.w,
                  height: region.h * cr.h,
                } : null;

                return (
                  <>
                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 px-4 pt-10 flex items-center justify-between z-10">
                      <div className="flex items-center gap-2">
                        <PoppleCharacter expression="idle" pendingCount={0} onClick={() => {}} size={28} mode="idle" silent />
                        <p className="font-space-mono text-white text-[10px] drop-shadow">{tasks.length - current} left</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {tasks.map((_, i) => (
                            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                              i < current ? 'bg-white/30 w-2' : i === current ? 'bg-white w-4' : 'bg-white/20 w-2'
                            }`} />
                          ))}
                        </div>
                        <button onClick={onDone} className="font-space-mono text-[10px] text-white/70 border border-white/30 rounded-lg px-3 py-1 backdrop-blur-sm">
                          skip all
                        </button>
                      </div>
                    </div>

                    {/* Region highlight — positioned in pixel coords from containRect */}
                    <AnimatePresence mode="wait">
                      {regionStyle && (
                        <motion.div
                          key={`region-${current}`}
                          initial={{ opacity: 0, scale: 1.08 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="absolute pointer-events-none"
                          style={{ position: 'absolute', ...regionStyle }}
                        >
                          <div className="absolute inset-0 rounded-xl border-2 border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25),0_0_16px_6px_rgba(255,255,255,0.2)]" />
                          {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map((pos, i) => (
                            <motion.div
                              key={i}
                              className={`absolute w-2 h-2 rounded-full bg-white ${pos}`}
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 1.4, delay: i * 0.2, repeat: Infinity }}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Swipeable task card */}
                    <AnimatePresence mode="wait">
                      <SwipeCard
                        key={`card-${current}`}
                        task={task}
                        diff={diff}
                        cardAtBottom={cardAtBottom}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                      />
                    </AnimatePresence>
                  </>
                );
              })() : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 bg-gray-950/95">
                  <PoppleCharacter expression="celebrating" pendingCount={0} onClick={() => {}} size={80} mode="idle" silent />
                  <p className="font-pixel text-white text-lg text-center">
                    {accepted === 0 ? "nothing added — that's okay" : `${accepted} task${accepted > 1 ? 's' : ''} added!`}
                  </p>
                  <motion.button onClick={onDone} whileTap={{ scale: 0.95 }}
                    className="font-pixel text-xs text-gray-900 bg-white rounded-2xl px-8 py-3 shadow-lg">
                    back to chat
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
