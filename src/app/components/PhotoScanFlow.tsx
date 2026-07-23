import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PoppleCharacter from './PoppleCharacter';
import type { ExtractedTask } from './TaskSwipeDeck';

const DIFF: Record<string, { pill: string; label: string }> = {
  easy:   { pill: 'bg-emerald-100 text-emerald-700', label: 'quick win'   },
  medium: { pill: 'bg-amber-100 text-amber-700',     label: 'some effort' },
  hard:   { pill: 'bg-rose-100 text-rose-700',       label: 'big one'     },
};

type Phase = 'scanning' | 'revealing' | 'reviewing';

interface Props {
  imagePreview: string;
  tasks: ExtractedTask[] | null; // null = still loading
  onAccept: (task: ExtractedTask) => void;
  onDecline: (task: ExtractedTask) => void;
  onDone: () => void;
}

const MIN_SCAN_MS = 2800; // always show the scan animation for at least this long

export default function PhotoScanFlow({ imagePreview, tasks, onAccept, onDecline, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('scanning');
  const [revealedCount, setRevealedCount] = useState(0);
  const [current, setCurrent] = useState(0);
  const [accepted, setAccepted] = useState(0);
  const scanStartRef = React.useRef(Date.now());

  // Once tasks arrive, wait for minimum scan time before revealing
  useEffect(() => {
    if (tasks === null) return;
    if (tasks.length === 0) { onDone(); return; }
    const elapsed = Date.now() - scanStartRef.current;
    const remaining = Math.max(0, MIN_SCAN_MS - elapsed);
    const t = setTimeout(() => setPhase('revealing'), remaining);
    return () => clearTimeout(t);
  }, [tasks]);

  // Stagger task reveal one by one
  useEffect(() => {
    if (phase !== 'revealing' || !tasks) return;
    if (revealedCount >= tasks.length) {
      // All revealed — pause then go to review
      const t = setTimeout(() => setPhase('reviewing'), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealedCount(c => c + 1), 420);
    return () => clearTimeout(t);
  }, [phase, revealedCount, tasks]);

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
      className="fixed inset-0 z-[10010] bg-black/70 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
    <div className="relative w-full h-full flex flex-col" style={{ maxWidth: 480, maxHeight: '100dvh' }}>
      <AnimatePresence mode="wait">

        {/* ── SCAN phase ── */}
        {phase === 'scanning' && (
          <motion.div
            key="scan"
            className="flex-1 relative overflow-hidden"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Full-screen photo */}
            <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />

            {/* Dark vignette */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

            {/* Sweep line */}
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-white/60 shadow-[0_0_12px_4px_rgba(255,255,255,0.3)]"
              initial={{ top: '0%' }}
              animate={{ top: '100%' }}
              transition={{ duration: 2.2, ease: 'linear', repeat: Infinity }}
            />

            {/* Corner scan brackets */}
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

            {/* Status */}
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

        {/* ── REVEAL phase — tasks float up over blurred photo ── */}
        {phase === 'revealing' && tasks && (
          <motion.div
            key="reveal"
            className="flex-1 relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Blurred photo background */}
            <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 px-5 pt-10 flex items-center gap-2">
              <PoppleCharacter expression="waiting" pendingCount={0} onClick={() => {}} size={32} mode="idle" silent />
              <p className="font-space-mono text-white text-xs tracking-wide">found {tasks.length} things…</p>
            </div>

            {/* Tasks floating up */}
            <div className="absolute inset-0 overflow-y-auto px-5 pt-24 pb-8 space-y-3">
              <AnimatePresence>
                {tasks.slice(0, revealedCount).map((task, i) => {
                  const diff = DIFF[task.difficulty_guess] ?? DIFF.easy;
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 24, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                      className="bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 flex items-start gap-3 shadow-lg"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center font-space-mono text-[9px] mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className={`font-space-mono text-[9px] px-1.5 py-0.5 rounded-full ${diff.pill}`}>{diff.label}</span>
                        <p className="font-pixel text-sm text-gray-900 leading-snug">{task.title}</p>
                        <p className="font-space-mono text-[10px] text-gray-500">{task.coach_note}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {revealedCount < tasks.length && (
                <div className="flex gap-1.5 px-2 pt-1">
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── REVIEW phase — photo as full background, card floats over ── */}
        {phase === 'reviewing' && tasks && (
          <motion.div
            key="review"
            className="flex-1 relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            {/* Full blurred photo background */}
            <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

            {current < tasks.length ? (
              <div className="absolute inset-0 flex flex-col justify-between px-5 pt-10 pb-10">

                {/* Top bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PoppleCharacter expression="idle" pendingCount={0} onClick={() => {}} size={36} mode="idle" silent />
                    <div>
                      <p className="font-pixel text-white text-xs">review tasks</p>
                      <p className="font-space-mono text-white/50 text-[9px]">{tasks.length - current} left</p>
                    </div>
                  </div>
                  <button
                    onClick={onDone}
                    className="font-space-mono text-[10px] text-white/50 border border-white/20 rounded-lg px-3 py-1.5"
                  >
                    skip all
                  </button>
                </div>

                {/* Progress dots */}
                <div className="flex gap-1.5 justify-center">
                  {tasks.map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                      i < current ? 'bg-white/30 w-3' : i === current ? 'bg-white w-5' : 'bg-white/15 w-3'
                    }`} />
                  ))}
                </div>

                {/* Floating task card */}
                <AnimatePresence mode="wait">
                  {(() => {
                    const task = tasks[current];
                    const diff = DIFF[task.difficulty_guess] ?? DIFF.easy;
                    return (
                      <motion.div
                        key={current}
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -30, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                        className="bg-white rounded-3xl shadow-2xl p-6 space-y-3"
                      >
                        <span className={`font-space-mono text-[9px] px-2 py-0.5 rounded-full ${diff.pill}`}>{diff.label}</span>
                        <p className="font-pixel text-2xl text-gray-900 leading-snug">{task.title}</p>
                        <p className="font-space-mono text-xs text-gray-400 leading-relaxed">{task.coach_note}</p>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>

                {/* Accept / Decline buttons */}
                <div className="flex justify-center gap-8">
                  <motion.button
                    onClick={handleDecline}
                    whileTap={{ scale: 0.88 }}
                    className="w-16 h-16 rounded-full bg-white/15 border border-white/30 flex items-center justify-center text-2xl text-white backdrop-blur-sm"
                  >
                    ✕
                  </motion.button>
                  <motion.button
                    onClick={handleAccept}
                    whileTap={{ scale: 0.88 }}
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-2xl text-gray-900 shadow-lg"
                  >
                    ✓
                  </motion.button>
                </div>
              </div>
            ) : (
              /* Done state — still photo background */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6">
                <PoppleCharacter expression="celebrating" pendingCount={0} onClick={() => {}} size={80} mode="idle" silent />
                <p className="font-pixel text-white text-lg text-center">
                  {accepted === 0 ? 'nothing added — that\'s okay' : `${accepted} task${accepted > 1 ? 's' : ''} added!`}
                </p>
                <motion.button
                  onClick={onDone}
                  whileTap={{ scale: 0.95 }}
                  className="font-pixel text-xs text-gray-900 bg-white rounded-2xl px-8 py-3 shadow-lg"
                >
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
