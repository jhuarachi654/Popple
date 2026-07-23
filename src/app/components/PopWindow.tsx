import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PopTask {
  id: string;
  text: string;
}

interface PopWindowProps {
  tasks: PopTask[];
  onPop: (id: string) => void;
  onClose: () => void;
  addXP: (amount: number) => void;
}

const XP_PER_TASK = 100;

export default function PopWindow({ tasks, onPop, onClose, addXP }: PopWindowProps) {
  const [poppedIds, setPoppedIds] = useState<Set<string>>(new Set());
  const [xpEarned, setXpEarned]   = useState(0);
  const [allDone, setAllDone]     = useState(false);

  const remaining = tasks.filter(t => !poppedIds.has(t.id));

  const handlePop = (id: string) => {
    if (poppedIds.has(id)) return;

    setPoppedIds(prev => new Set([...prev, id]));
    addXP(XP_PER_TASK);
    setXpEarned(prev => prev + XP_PER_TASK);

    // Remove from parent state after pop animation finishes
    setTimeout(() => onPop(id), 550);
  };

  // Auto-close after all tasks are popped
  useEffect(() => {
    if (tasks.length > 0 && remaining.length === 0 && !allDone) {
      setAllDone(true);
      setTimeout(onClose, 1400);
    }
  }, [remaining.length, tasks.length, allDone, onClose]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 z-40 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '72%' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <AnimatePresence mode="wait">
              {allDone ? (
                <motion.p
                  key="done"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-pixel text-xs text-emerald-600"
                >
                  all popped ✦
                </motion.p>
              ) : (
                <motion.p
                  key="count"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-pixel text-xs text-gray-800"
                >
                  {remaining.length} task{remaining.length !== 1 ? 's' : ''} to pop
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {xpEarned > 0 && (
                <motion.p
                  key={xpEarned}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="font-pixel text-[10px] text-emerald-500 mt-0.5"
                >
                  +{xpEarned} XP earned
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={onClose}
            className="font-pixel text-[9px] text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 hover:text-gray-600 transition-colors"
          >
            close
          </button>
        </div>

        {/* Task pills */}
        <div
          className="overflow-y-auto p-4 flex flex-wrap gap-3 content-start"
          style={{ maxHeight: 'calc(72vh - 96px)' }}
        >
          <AnimatePresence>
            {tasks.map(task => {
              const isPopped = poppedIds.has(task.id);
              return (
                <motion.button
                  key={task.id}
                  layout
                  onClick={() => handlePop(task.id)}
                  disabled={isPopped}
                  className="relative border-2 border-black bg-white rounded-2xl px-4 py-3 font-pixel text-[10px] text-black text-left"
                  whileTap={isPopped ? {} : { scale: 0.93 }}
                  animate={
                    isPopped
                      ? { scale: [1, 1.3, 0], opacity: [1, 1, 0] }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={isPopped ? { duration: 0.5, ease: 'easeInOut' } : {}}
                >
                  {task.text}

                  {/* Green flash on pop */}
                  {isPopped && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-emerald-400"
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>

          {tasks.length === 0 && (
            <p className="w-full text-center py-10 font-pixel text-xs text-gray-400">
              No tasks ready to pop yet.
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}
