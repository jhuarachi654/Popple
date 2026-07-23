import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onAdd: (text: string, priority: boolean) => void;
  onClose: () => void;
}

const detectPriority = (text: string): boolean => {
  return /urgent|asap|critical|deadline|immediately|important/i.test(text);
};

export default function NewTaskSheet({ onAdd, onClose }: Props) {
  const [text, setText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const inferredPriority = detectPriority(text);

  const handleAdd = async () => {
    const raw = text.trim();
    if (!raw) return;

    const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://popple-api.johannahuarachi.workers.dev';
    const token = localStorage.getItem('popple-token');

    if (!token) {
      onAdd(raw, inferredPriority);
      onClose();
      return;
    }

    setIsParsing(true);
    try {
      const res = await fetch(`${API_BASE}/ai/parse-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ input: raw }),
      });
      const data = await res.json() as { title?: string };
      onAdd(data.title ?? raw, inferredPriority);
    } catch {
      onAdd(raw, inferredPriority);
    } finally {
      setIsParsing(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[10001]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        {/* Sheet */}
        <motion.div
          className="absolute inset-x-0 bottom-0 pixel-notebook rounded-t-3xl shadow-2xl overflow-hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 340 }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header row */}
          <div className="flex items-center justify-between px-5 py-3">
            <button
              onClick={onClose}
              className="font-space-mono text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
            <span className="font-pixel text-sm text-gray-900">New task</span>
            <button
              onClick={handleAdd}
              disabled={!text.trim() || isParsing}
              className="font-space-mono text-xs text-gray-900 font-semibold disabled:text-gray-300 transition-colors"
            >
              {isParsing ? '...' : 'Add'}
            </button>
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* Input */}
          <div className="px-5 pt-4 pb-3">
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                if (e.key === 'Escape') onClose();
              }}
              placeholder="What needs to get done?"
              className="w-full font-space-mono text-base text-gray-900 placeholder-gray-300 bg-transparent outline-none leading-relaxed"
            />
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* Inferred pills */}
          <AnimatePresence>
            {text.trim() && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-5 py-3 flex items-center gap-2 flex-wrap overflow-hidden"
              >
                <span className="font-space-mono text-[9px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full leading-none">
                  Today
                </span>
                {inferredPriority && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-space-mono text-[9px] text-amber-700 bg-amber-100 px-2 py-1 rounded-full leading-none"
                  >
                    Focus
                  </motion.span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom actions */}
          <div className="px-5 pt-1 pb-5 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 font-space-mono text-[10px] text-gray-500 hover:bg-gray-200 transition-colors">
              <span>⊞</span> Add tag
            </button>
            <button className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 font-space-mono text-[10px] text-gray-500 hover:bg-gray-200 transition-colors">
              <span>↻</span> Repeat
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
