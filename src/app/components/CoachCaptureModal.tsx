import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExtractedTask {
  id: string;
  title: string;
  difficulty_guess: 'easy' | 'medium' | 'hard';
  coach_note: string;
}

interface ActivityEntry {
  title: string;
  outcome: 'accepted' | 'declined';
}

interface Props {
  onAdd: (title: string) => void;
  onClose: () => void;
}

type Phase = 'capture' | 'listening' | 'loading' | 'swipe' | 'done';

// ── Coach memory (localStorage, max 10) ──────────────────────────────────────

const MEMORY_KEY = 'popple-coach-memory';

function loadMemory(): ActivityEntry[] {
  try { return JSON.parse(localStorage.getItem(MEMORY_KEY) ?? '[]'); }
  catch { return []; }
}

function saveMemory(entries: ActivityEntry[]) {
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(entries.slice(-10))); }
  catch {}
}

// ── Difficulty display ────────────────────────────────────────────────────────

const DIFF: Record<string, { pill: string; label: string }> = {
  easy:   { pill: 'bg-emerald-100 text-emerald-700', label: 'quick win'   },
  medium: { pill: 'bg-amber-100 text-amber-700',     label: 'some effort' },
  hard:   { pill: 'bg-rose-100 text-rose-700',       label: 'big one'     },
};

const SWIPE_THRESHOLD = 90;
const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://popple-api.johannahuarachi.workers.dev';

// ── Single swipe card ─────────────────────────────────────────────────────────

function SwipeCard({
  task,
  isTop,
  stackIndex,
  onAccept,
  onDecline,
}: {
  task: ExtractedTask;
  isTop: boolean;
  stackIndex: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const acceptOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const declineOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const diff = DIFF[task.difficulty_guess] ?? DIFF.easy;

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > SWIPE_THRESHOLD) onAccept();
    else if (info.offset.x < -SWIPE_THRESHOLD) onDecline();
  };

  // Stack cards: behind cards scale down and shift up slightly
  const behindScale = 1 - stackIndex * 0.045;
  const behindY = -stackIndex * 10;

  return (
    <motion.div
      className="absolute inset-x-0"
      style={{ zIndex: 10 - stackIndex }}
      animate={isTop ? { scale: 1, y: 0 } : { scale: behindScale, y: behindY }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
    >
      <motion.div
        drag={isTop ? 'x' : false}
        dragConstraints={{ left: -300, right: 300 }}
        dragElastic={0.18}
        onDragEnd={handleDragEnd}
        style={isTop ? { x, rotate } : {}}
        className="pixel-notebook rounded-2xl shadow-xl p-5 mx-1 cursor-grab active:cursor-grabbing select-none"
      >
        {/* Accept / Decline overlays */}
        {isTop && (
          <>
            <motion.div
              style={{ opacity: acceptOpacity }}
              className="absolute top-5 right-5 border-2 border-emerald-500 text-emerald-600 rounded-lg px-3 py-1 font-pixel text-xs rotate-12 pointer-events-none"
            >
              add it ✓
            </motion.div>
            <motion.div
              style={{ opacity: declineOpacity }}
              className="absolute top-5 left-5 border-2 border-rose-400 text-rose-500 rounded-lg px-3 py-1 font-pixel text-xs -rotate-12 pointer-events-none"
            >
              skip ✕
            </motion.div>
          </>
        )}

        {/* Card content */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`font-space-mono text-[9px] px-2 py-0.5 rounded-full ${diff.pill}`}>
              {diff.label}
            </span>
          </div>

          <p className="font-pixel text-base text-gray-900 leading-snug">
            {task.title}
          </p>

          <div className="h-px bg-gray-100" />

          <p className="font-space-mono text-[11px] text-gray-500 leading-relaxed">
            {task.coach_note}
          </p>
        </div>

        {/* Swipe hint — only on top card */}
        {isTop && (
          <p className="font-space-mono text-[9px] text-gray-300 text-center mt-4 pointer-events-none">
            swipe right to add · left to skip
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function CoachCaptureModal({ onAdd, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('capture');
  const [transcript, setTranscript] = useState('');
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [current, setCurrent] = useState(0);
  const [accepted, setAccepted] = useState(0);
  const [memory, setMemory] = useState<ActivityEntry[]>(() => loadMemory());
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const hasSpeechAPI = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // ── Call extract endpoint ─────────────────────────────────────────────────

  const callExtract = useCallback(async (payload: { transcript?: string; image?: string; mimeType?: string }) => {
    setPhase('loading');

    const recentActivity = memory
      .filter(e => e.outcome === 'accepted')
      .slice(-5)
      .map(e => e.title);

    try {
      const res = await fetch(`${API_BASE}/ai/extract-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, recentActivity }),
      });
      const data = await res.json() as { tasks?: ExtractedTask[] };
      const extracted = data.tasks ?? [];
      if (extracted.length === 0) {
        toast("Couldn't spot any tasks in that — try again?");
        setPhase('capture');
        return;
      }
      setTasks(extracted);
      setCurrent(0);
      setAccepted(0);
      setPhase('swipe');
    } catch {
      toast.error('Something went wrong — try again');
      setPhase('capture');
    }
  }, [memory]);

  // ── Voice ─────────────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!hasSpeechAPI) {
      toast.error('Voice not supported in this browser');
      return;
    }
    const SR = (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition) as typeof SpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    recognitionRef.current = rec;

    let interim = '';
    rec.onresult = (e) => {
      interim = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(interim);
    };
    rec.onend = () => {
      if (interim.trim()) {
        callExtract({ transcript: interim.trim() });
      } else {
        setPhase('capture');
        toast("Didn't catch anything — try again");
      }
    };
    rec.onerror = () => {
      setPhase('capture');
      toast.error('Microphone error — check permissions');
    };

    setTranscript('');
    setPhase('listening');
    rec.start();
  }, [hasSpeechAPI, callExtract]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // ── Photo ─────────────────────────────────────────────────────────────────

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
      callExtract({ image: base64, mimeType });
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  }, [callExtract]);

  // ── Swipe handlers ────────────────────────────────────────────────────────

  const recordOutcome = (task: ExtractedTask, outcome: 'accepted' | 'declined') => {
    const newEntry: ActivityEntry = { title: task.title, outcome };
    const updated = [...memory, newEntry].slice(-10);
    setMemory(updated);
    saveMemory(updated);
  };

  const handleAccept = useCallback(() => {
    const task = tasks[current];
    if (!task) return;
    recordOutcome(task, 'accepted');
    onAdd(task.title);
    setAccepted(a => a + 1);
    const next = current + 1;
    if (next >= tasks.length) setPhase('done');
    else setCurrent(next);
  }, [tasks, current, onAdd]);

  const handleDecline = useCallback(() => {
    const task = tasks[current];
    if (!task) return;
    recordOutcome(task, 'declined');
    const next = current + 1;
    if (next >= tasks.length) setPhase('done');
    else setCurrent(next);
  }, [tasks, current]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const remaining = tasks.length - current;
  const recentAccepted = memory.filter(e => e.outcome === 'accepted').length;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[10002]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={phase === 'capture' ? onClose : undefined} />

        {/* Sheet */}
        <motion.div
          className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden"
          style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))', maxHeight: '90vh' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 340 }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="font-pixel text-sm text-gray-900">
              {phase === 'capture' && 'coach capture'}
              {phase === 'listening' && 'listening…'}
              {phase === 'loading' && 'thinking…'}
              {phase === 'swipe' && `${remaining} task${remaining !== 1 ? 's' : ''} found`}
              {phase === 'done' && 'all done!'}
            </span>
            <button
              onClick={onClose}
              className="font-space-mono text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              close
            </button>
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* ── Phase: Capture ── */}
          {phase === 'capture' && (
            <div className="px-5 py-8 space-y-6">
              {recentAccepted > 0 && (
                <p className="font-space-mono text-[11px] text-gray-400 text-center">
                  {recentAccepted} task{recentAccepted !== 1 ? 's' : ''} captured recently — keep going.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {/* Voice button */}
                <button
                  onClick={startListening}
                  disabled={!hasSpeechAPI}
                  className="flex flex-col items-center gap-3 py-8 rounded-2xl bg-gray-900 text-white disabled:opacity-40 active:scale-95 transition-transform"
                >
                  <span className="text-3xl">🎙</span>
                  <div className="text-center">
                    <p className="font-pixel text-xs">voice</p>
                    <p className="font-space-mono text-[9px] text-gray-400 mt-0.5">speak your tasks</p>
                  </div>
                </button>

                {/* Photo button */}
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 py-8 rounded-2xl bg-gray-100 text-gray-900 active:scale-95 transition-transform"
                >
                  <span className="text-3xl">📷</span>
                  <div className="text-center">
                    <p className="font-pixel text-xs">photo</p>
                    <p className="font-space-mono text-[9px] text-gray-500 mt-0.5">list, board, notes</p>
                  </div>
                </button>
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
          )}

          {/* ── Phase: Listening ── */}
          {phase === 'listening' && (
            <div className="px-5 py-10 flex flex-col items-center gap-6">
              {/* Pulsing mic animation */}
              <div className="relative">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full bg-gray-900/10"
                    animate={{ scale: [1, 1.6 + i * 0.4], opacity: [0.5, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
                  />
                ))}
                <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center relative z-10">
                  <span className="text-2xl">🎙</span>
                </div>
              </div>

              {transcript ? (
                <p className="font-space-mono text-sm text-gray-600 text-center max-w-xs leading-relaxed">
                  "{transcript}"
                </p>
              ) : (
                <p className="font-space-mono text-sm text-gray-400 text-center">
                  go ahead — say your tasks out loud
                </p>
              )}

              <button
                onClick={stopListening}
                className="font-pixel text-xs text-gray-900 border-2 border-gray-900 rounded-2xl px-6 py-3 active:scale-95 transition-transform"
              >
                done talking
              </button>
            </div>
          )}

          {/* ── Phase: Loading ── */}
          {phase === 'loading' && (
            <div className="px-5 py-12 flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-gray-900"
              />
              <p className="font-pixel text-xs text-gray-400">spotting your tasks…</p>
            </div>
          )}

          {/* ── Phase: Swipe ── */}
          {phase === 'swipe' && tasks.length > 0 && (
            <div className="px-5 pt-4 pb-8">
              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mb-6">
                {tasks.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i < current ? 'bg-gray-300' : i === current ? 'bg-gray-900' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>

              {/* Card stack */}
              <div className="relative" style={{ height: 220 }}>
                <AnimatePresence>
                  {tasks.slice(current, current + 3).map((task, stackIdx) => (
                    <SwipeCard
                      key={task.id}
                      task={task}
                      isTop={stackIdx === 0}
                      stackIndex={stackIdx}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="flex justify-center gap-6 mt-6">
                <button
                  onClick={handleDecline}
                  className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl active:scale-90 transition-transform"
                  aria-label="Skip"
                >
                  ✕
                </button>
                <button
                  onClick={handleAccept}
                  className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl active:scale-90 transition-transform"
                  aria-label="Add"
                >
                  ✓
                </button>
              </div>
            </div>
          )}

          {/* ── Phase: Done ── */}
          {phase === 'done' && (
            <div className="px-5 py-10 flex flex-col items-center gap-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="text-5xl"
              >
                ✦
              </motion.div>
              <div className="text-center space-y-1">
                <p className="font-pixel text-base text-gray-900">
                  {accepted === 0
                    ? 'nothing added — that\'s okay'
                    : accepted === 1
                    ? '1 task added to your list'
                    : `${accepted} tasks added to your list`}
                </p>
                {accepted > 0 && (
                  <p className="font-space-mono text-xs text-gray-400">
                    head to your tasks to see them
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="font-pixel text-xs text-white bg-gray-900 rounded-2xl px-8 py-3 active:scale-95 transition-transform mt-2"
              >
                got it
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
