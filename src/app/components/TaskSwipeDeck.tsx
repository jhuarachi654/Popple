import React from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import PoppleCharacter from './PoppleCharacter';
import type { PoppleExpression } from './PoppleCharacter';

export interface ExtractedTask {
  id: string;
  title: string;
  difficulty_guess: 'easy' | 'medium' | 'hard';
  coach_note: string;
  region?: { x: number; y: number; w: number; h: number };
}

interface Props {
  tasks: ExtractedTask[];
  current: number;
  accepted: number;
  poppleExpression: PoppleExpression;
  poppleReaction?: { text: string; nonce: number };
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

const DIFF: Record<string, { pill: string; label: string }> = {
  easy:   { pill: 'bg-emerald-100 text-emerald-700', label: 'quick win'   },
  medium: { pill: 'bg-amber-100 text-amber-700',     label: 'some effort' },
  hard:   { pill: 'bg-rose-100 text-rose-700',       label: 'big one'     },
};

const SWIPE_THRESHOLD = 90;

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
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const acceptOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const declineOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const diff = DIFF[task.difficulty_guess] ?? DIFF.easy;

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > SWIPE_THRESHOLD) onAccept();
    else if (info.offset.x < -SWIPE_THRESHOLD) onDecline();
  };

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
        className="bg-white rounded-3xl shadow-xl px-6 py-6 mx-1 cursor-grab active:cursor-grabbing select-none border border-gray-100"
      >
        {isTop && (
          <>
            <motion.div
              style={{ opacity: acceptOpacity }}
              className="absolute top-5 right-5 border-2 border-emerald-500 text-emerald-600 rounded-lg px-3 py-1 font-pixel text-xs rotate-12 pointer-events-none"
            >
              add ✓
            </motion.div>
            <motion.div
              style={{ opacity: declineOpacity }}
              className="absolute top-5 left-5 border-2 border-rose-400 text-rose-500 rounded-lg px-3 py-1 font-pixel text-xs -rotate-12 pointer-events-none"
            >
              skip ✕
            </motion.div>
          </>
        )}

        <div className="space-y-3">
          <span className={`inline-block font-space-mono text-[9px] px-2 py-0.5 rounded-full ${diff.pill}`}>
            {diff.label}
          </span>
          <p className="font-pixel text-xl text-gray-900 leading-snug">{task.title}</p>
        </div>

        {isTop && (
          <p className="font-space-mono text-[9px] text-gray-300 text-center mt-6 pointer-events-none">
            swipe right to add · left to skip
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function TaskSwipeDeck({
  tasks,
  current,
  accepted,
  poppleExpression,
  poppleReaction,
  onAccept,
  onDecline,
  onClose,
}: Props) {
  const remaining = tasks.length - current;
  const isDone = current >= tasks.length;

  const handleAddAll = () => {
    const toAdd = tasks.length - current;
    for (let i = 0; i < toAdd; i++) onAccept();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[10002] flex flex-col"
      style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-white/85 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col h-full px-5 pt-6">

        {/* Header */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="font-space-mono text-[10px] text-gray-400 uppercase tracking-widest mb-1">
              {isDone ? 'all done' : `${remaining} left`}
            </p>
            <p className="font-pixel text-lg text-gray-900 leading-snug">
              {isDone
                ? accepted === 0 ? 'nothing added — that\'s okay' : `${accepted} added`
                : 'here\'s what I caught'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isDone && remaining > 1 && (
              <motion.button
                onClick={handleAddAll}
                whileTap={{ scale: 0.92 }}
                className="font-space-mono text-[10px] text-gray-600 border border-gray-200 bg-white rounded-xl px-3 py-1.5"
              >
                add all
              </motion.button>
            )}
            <PoppleCharacter
              expression={isDone ? 'celebrating' : poppleExpression}
              pendingCount={0}
              onClick={() => {}}
              size={60}
              mode="idle"
              externalReaction={poppleReaction}
            />
          </div>
        </div>

        {/* Progress dots */}
        {!isDone && (
          <div className="flex gap-1.5 mb-6">
            {tasks.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i < current ? 'bg-gray-200 w-3' : i === current ? 'bg-gray-900 w-5' : 'bg-gray-100 w-3'
                }`}
              />
            ))}
          </div>
        )}

        {/* Card stack or done state */}
        {isDone ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <motion.button
              onClick={onClose}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-pixel text-xs text-white bg-gray-900 rounded-2xl px-8 py-3 active:scale-95 transition-transform"
            >
              back to tasks
            </motion.button>
          </div>
        ) : (
          <>
            <div className="relative flex-1" style={{ minHeight: 200, maxHeight: 240 }}>
              <AnimatePresence>
                {tasks.slice(current, current + 3).map((task, stackIdx) => (
                  <SwipeCard
                    key={task.id}
                    task={task}
                    isTop={stackIdx === 0}
                    stackIndex={stackIdx}
                    onAccept={onAccept}
                    onDecline={onDecline}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-8 mt-6">
              <motion.button
                onClick={onDecline}
                whileTap={{ scale: 0.88 }}
                className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl text-gray-500"
              >
                ✕
              </motion.button>
              <motion.button
                onClick={onAccept}
                whileTap={{ scale: 0.88 }}
                className="w-14 h-14 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl shadow-lg"
              >
                ✓
              </motion.button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
