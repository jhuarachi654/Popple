import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { X, Check, ArrowLeft, ArrowRight, SkipForward } from '@phosphor-icons/react';
import PoppleCharacter from './PoppleCharacter';
import type { ExtractedTask } from './TaskSwipeDeck';

type Phase = 'scanning' | 'reviewing';
type PoppleMood = 'idle' | 'waiting' | 'celebrating';

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

// Spotlight: 4 dark strips surrounding the region, leaving it clear
function Spotlight({ regionStyle }: {
  regionStyle: { left: number; top: number; width: number; height: number };
}) {
  const { left, top, width, height } = regionStyle;
  const right = left + width;
  const bottom = top + height;

  return (
    <AnimatePresence>
      <motion.div
        key="spotlight"
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* top strip */}
        <div className="absolute bg-black/65" style={{ top: 0, left: 0, right: 0, height: top }} />
        {/* bottom strip */}
        <div className="absolute bg-black/65" style={{ top: bottom, left: 0, right: 0, bottom: 0 }} />
        {/* left strip */}
        <div className="absolute bg-black/65" style={{ top, left: 0, width: left, height }} />
        {/* right strip */}
        <div className="absolute bg-black/65" style={{ top, left: right, right: 0, height }} />
        {/* subtle bright rim around clear area */}
        <div
          className="absolute rounded-xl ring-2 ring-white/60 shadow-[0_0_20px_6px_rgba(255,255,255,0.15)]"
          style={{ top, left, width, height }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

function SwipeCard({
  task, cardAtBottom, poppleMood, onAccept, onDecline, onDragX,
}: {
  task: ExtractedTask;
  cardAtBottom: boolean;
  poppleMood: PoppleMood;
  onAccept: () => void;
  onDecline: () => void;
  onDragX: (x: number) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-160, 160], [-8, 8]);
  const acceptOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const declineOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);

  useEffect(() => {
    return x.on('change', v => onDragX(v));
  }, [x, onDragX]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    onDragX(0);
    if (info.offset.x > SWIPE_THRESHOLD) onAccept();
    else if (info.offset.x < -SWIPE_THRESHOLD) onDecline();
  };

  const cardPos = cardAtBottom ? { bottom: 28 } : { top: 96 };

  return (
    <motion.div
      key={task.id}
      initial={{ opacity: 0, y: cardAtBottom ? 20 : -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      className="absolute left-4 right-4 z-20"
      style={cardPos}
    >
      {/* Popple delivering the task */}
      <motion.div
        className="flex items-end gap-2 mb-2 px-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <PoppleCharacter
          expression={poppleMood}
          pendingCount={0}
          onClick={() => {}}
          size={36}
          mode="idle"
          silent
        />
        {/* Speech bubble */}
        <div className="relative bg-black/75 backdrop-blur-md rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%]">
          <p className="font-space-mono text-[11px] text-white/80 leading-relaxed">{task.coach_note}</p>
          {/* bubble tail */}
          <div className="absolute -bottom-1.5 left-3 w-3 h-3 bg-black/75 [clip-path:polygon(0_0,100%_0,0_100%)]" />
        </div>
      </motion.div>

      {isTouch ? (
        /* ── Mobile: swipeable card ── */
        <motion.div
          drag="x"
          dragConstraints={{ left: -260, right: 260 }}
          dragElastic={0.12}
          onDragEnd={handleDragEnd}
          style={{ x, rotate }}
          className="bg-black/80 backdrop-blur-md rounded-3xl px-5 py-4 border border-white/10 cursor-grab active:cursor-grabbing select-none relative overflow-hidden"
        >
          {/* Accept hint — slides in from right as user drags right */}
          <motion.div
            style={{ opacity: acceptOpacity }}
            className="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none"
          >
            <div className="flex items-center gap-1.5 border border-emerald-400 text-emerald-400 rounded-xl px-3 py-1.5 rotate-6">
              <Check size={12} weight="bold" />
              <span className="font-space-mono text-[9px]">add</span>
            </div>
          </motion.div>
          {/* Decline hint — slides in from left as user drags left */}
          <motion.div
            style={{ opacity: declineOpacity }}
            className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none"
          >
            <div className="flex items-center gap-1.5 border border-rose-400 text-rose-400 rounded-xl px-3 py-1.5 -rotate-6">
              <X size={12} weight="bold" />
              <span className="font-space-mono text-[9px]">skip</span>
            </div>
          </motion.div>

          <p className="font-pixel text-lg text-white leading-snug pr-8">{task.title}</p>

          {/* Subtle drag affordance arrows */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
            <ArrowLeft size={14} className="text-white/20" />
            <ArrowRight size={14} className="text-white/20" />
          </div>
        </motion.div>
      ) : (
        /* ── Desktop: click options ── */
        <div className="bg-black/80 backdrop-blur-md rounded-3xl overflow-hidden border border-white/10">
          <div className="px-5 py-4">
            <p className="font-pixel text-lg text-white leading-snug">{task.title}</p>
          </div>
          <div className="h-px bg-white/10" />
          <motion.button
            onClick={onAccept}
            whileHover={{ backgroundColor: 'rgba(52,211,153,0.12)' }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-5 py-3 flex items-center gap-3 text-left"
          >
            <Check size={16} className="text-emerald-400" weight="bold" />
            <span className="font-space-mono text-sm text-white">Add this task</span>
          </motion.button>
          <div className="h-px bg-white/10" />
          <motion.button
            onClick={onDecline}
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-5 py-3 flex items-center gap-3 text-left"
          >
            <X size={16} className="text-white/30" weight="bold" />
            <span className="font-space-mono text-sm text-white/50">Skip</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

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
  const [poppleMood, setPoppleMood] = useState<PoppleMood>('idle');
  const [containRect, setContainRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const scanStartRef = useRef(Date.now());

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

  const handleDragX = useCallback((val: number) => {
    if (val > 30) setPoppleMood('celebrating');
    else if (val < -30) setPoppleMood('waiting');
    else setPoppleMood('idle');
  }, []);

  const handleAccept = () => {
    if (!tasks) return;
    onAccept(tasks[current]);
    setAccepted(a => a + 1);
    setPoppleMood('celebrating');
    setTimeout(() => { setPoppleMood('idle'); advance(); }, 300);
  };

  const handleDecline = () => {
    if (!tasks) return;
    onDecline(tasks[current]);
    setPoppleMood('idle');
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

          {/* ── REVIEW phase ── */}
          {phase === 'reviewing' && tasks && (
            <motion.div
              key="review"
              className="absolute inset-0 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              {/* Full image — object-contain so region coords align */}
              <img
                ref={imgRef}
                src={imagePreview}
                alt=""
                className="absolute inset-0 w-full h-full object-contain"
                onLoad={updateContainRect}
              />
              {/* Base dim */}
              <div className="absolute inset-0 bg-black/30" />

              {current < tasks.length ? (() => {
                const task = tasks[current];
                const region = task.region;
                const regionCenter = region ? region.y + region.h / 2 : 0.4;
                const cardAtBottom = regionCenter < 0.55;

                const cr = containRect;
                const regionStyle = (region && cr) ? {
                  left:   cr.x + region.x * cr.w,
                  top:    cr.y + region.y * cr.h,
                  width:  region.w * cr.w,
                  height: region.h * cr.h,
                } : null;

                return (
                  <>
                    {/* Spotlight overlay */}
                    {regionStyle && (
                      <AnimatePresence mode="wait">
                        <Spotlight key={`spot-${current}`} regionStyle={regionStyle} />
                      </AnimatePresence>
                    )}

                    {/* Top bar */}
                    <div className="absolute top-0 left-0 right-0 px-4 pt-10 flex items-center justify-between z-10">
                      <div className="flex gap-1">
                        {tasks.map((_, i) => (
                          <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                            i < current ? 'bg-white/30 w-2' : i === current ? 'bg-white w-4' : 'bg-white/20 w-2'
                          }`} />
                        ))}
                      </div>
                      <button
                        onClick={onDone}
                        className="flex items-center gap-1.5 font-space-mono text-[10px] text-white/60 border border-white/25 rounded-lg px-3 py-1.5 backdrop-blur-sm"
                      >
                        <SkipForward size={11} />
                        skip all
                      </button>
                    </div>

                    {/* Popple + card */}
                    <AnimatePresence mode="wait">
                      <SwipeCard
                        key={`card-${current}`}
                        task={task}
                        cardAtBottom={cardAtBottom}
                        poppleMood={poppleMood}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                        onDragX={handleDragX}
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
