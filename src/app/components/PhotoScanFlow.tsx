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

export default function PhotoScanFlow({ imagePreview, tasks, onAccept, onDecline, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('scanning');
  const [revealedCount, setRevealedCount] = useState(0);
  const [current, setCurrent] = useState(0);
  const [accepted, setAccepted] = useState(0);

  // Once tasks arrive, move to revealing
  useEffect(() => {
    if (tasks === null) return;
    if (tasks.length === 0) { onDone(); return; }
    setPhase('revealing');
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
      className="fixed inset-0 z-[10010] bg-black flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
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

        {/* ── REVEAL phase ── */}
        {phase === 'revealing' && tasks && (
          <motion.div
            key="reveal"
            className="flex-1 flex flex-col overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Small photo strip at top */}
            <div className="relative flex-shrink-0" style={{ height: 180 }}>
              <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70" />
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <PoppleCharacter expression="idle" pendingCount={0} onClick={() => {}} size={32} mode="idle" silent />
                <p className="font-space-mono text-white text-xs">found {tasks.length} things…</p>
              </div>
            </div>

            {/* Revealed tasks */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-2 bg-white">
              <AnimatePresence>
                {tasks.slice(0, revealedCount).map((task, i) => {
                  const diff = DIFF[task.difficulty_guess] ?? DIFF.easy;
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                      className="pixel-notebook rounded-xl px-4 py-3 flex items-start gap-3"
                    >
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center font-space-mono text-[9px] mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className={`font-space-mono text-[9px] px-1.5 py-0.5 rounded-full ${diff.pill}`}>{diff.label}</span>
                        <p className="font-pixel text-sm text-gray-900 leading-snug">{task.title}</p>
                        <p className="font-space-mono text-[10px] text-gray-400">{task.coach_note}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Scanning indicator for remaining */}
              {revealedCount < tasks.length && (
                <motion.div
                  className="flex items-center gap-2 px-4 py-3"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                >
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 0.5, delay: i * 0.12, repeat: Infinity }}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── REVIEW phase — swipe ── */}
        {phase === 'reviewing' && tasks && (
          <motion.div
            key="review"
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          >
            {/* Photo thumbnail strip */}
            <div className="relative flex-shrink-0" style={{ height: 140 }}>
              <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-0 flex items-center justify-between px-5">
                <div className="flex items-center gap-2">
                  <PoppleCharacter expression="idle" pendingCount={0} onClick={() => {}} size={40} mode="idle" silent />
                  <div>
                    <p className="font-pixel text-white text-xs">ready to review</p>
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
            </div>

            {/* Current task card */}
            {current < tasks.length ? (
              <div className="flex-1 flex flex-col px-5 pt-6 pb-8 bg-white">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current}
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                    className="pixel-notebook rounded-2xl shadow-lg p-5 flex-1 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Progress dots */}
                      <div className="flex gap-1.5 mb-2">
                        {tasks.map((_, i) => (
                          <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                            i < current ? 'bg-gray-200 w-3' : i === current ? 'bg-gray-900 w-5' : 'bg-gray-100 w-3'
                          }`} />
                        ))}
                      </div>
                      {(() => {
                        const task = tasks[current];
                        const diff = DIFF[task.difficulty_guess] ?? DIFF.easy;
                        return (
                          <>
                            <span className={`font-space-mono text-[9px] px-2 py-0.5 rounded-full ${diff.pill}`}>{diff.label}</span>
                            <p className="font-pixel text-xl text-gray-900 leading-snug">{task.title}</p>
                            <p className="font-space-mono text-xs text-gray-400 leading-relaxed">{task.coach_note}</p>
                          </>
                        );
                      })()}
                    </div>

                    <p className="font-space-mono text-[9px] text-gray-300 text-center mt-4">
                      accept or skip?
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Buttons */}
                <div className="flex justify-center gap-8 mt-5">
                  <motion.button
                    onClick={handleDecline}
                    whileTap={{ scale: 0.88 }}
                    className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl text-gray-500"
                  >
                    ✕
                  </motion.button>
                  <motion.button
                    onClick={handleAccept}
                    whileTap={{ scale: 0.88 }}
                    className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl"
                  >
                    ✓
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white px-6">
                <PoppleCharacter expression="celebrating" pendingCount={0} onClick={() => {}} size={80} mode="idle" silent />
                <p className="font-pixel text-gray-900 text-base">{accepted === 0 ? 'nothing added — that\'s okay' : `${accepted} task${accepted > 1 ? 's' : ''} added!`}</p>
                <motion.button
                  onClick={onDone}
                  whileTap={{ scale: 0.95 }}
                  className="font-pixel text-xs text-white bg-gray-900 rounded-2xl px-8 py-3"
                >
                  back to chat
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
