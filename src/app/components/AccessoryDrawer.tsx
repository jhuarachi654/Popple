import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock } from 'lucide-react';
import PoppleCharacter, { type PoppleAccessory } from './PoppleCharacter';

interface AccessoryDef {
  id:          PoppleAccessory;
  label:       string;
  emoji:       string;
  flavor:      string;
  tasksNeeded: number;
}

const ACCESSORIES: AccessoryDef[] = [
  { id: null,         label: 'None',      emoji: '🫧', flavor: 'just vibing',       tasksNeeded: 0  },
  { id: 'beanie',     label: 'Beanie',    emoji: '🧢', flavor: 'cozy & unbothered', tasksNeeded: 10 },
  { id: 'grad-cap',   label: 'Grad Cap',  emoji: '🎓', flavor: 'honor roll energy', tasksNeeded: 25 },
  { id: 'crown',      label: 'Crown',     emoji: '👑', flavor: 'royalty. earned.',  tasksNeeded: 50 },
  { id: 'party-hat',  label: 'Party Hat', emoji: '🎉', flavor: 'always a vibe',     tasksNeeded: 15 },
];

interface Props {
  equipped:        PoppleAccessory;
  totalTasksDone:  number;
  onEquip:         (acc: PoppleAccessory) => void;
  onClose:         () => void;
}

export default function AccessoryDrawer({ equipped, totalTasksDone, onEquip, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 z-40 bg-black/20"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 340 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <p className="font-pixel text-xs text-black">accessories</p>
            <p className="font-pixel text-[9px] text-gray-400 mt-0.5">
              {totalTasksDone} task{totalTasksDone !== 1 ? 's' : ''} completed
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Accessory grid */}
        <div className="p-4 grid grid-cols-5 gap-3 pb-safe">
          {ACCESSORIES.map(acc => {
            const unlocked = true;
            const active   = equipped === acc.id;

            return (
              <motion.button
                key={String(acc.id)}
                onClick={() => unlocked && onEquip(acc.id)}
                disabled={!unlocked}
                className={`
                  relative flex flex-col items-center gap-1.5 rounded-2xl p-2 border-2
                  transition-colors
                  ${active   ? 'border-gray-800 bg-gray-800' : ''}
                  ${!active && unlocked  ? 'border-gray-200 bg-white hover:border-gray-400' : ''}
                  ${!unlocked ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' : ''}
                `}
                whileTap={unlocked ? { scale: 0.93 } : {}}
              >
                {/* Mini character preview */}
                <div className="relative">
                  <PoppleCharacter
                    expression="idle"
                    pendingCount={0}
                    onClick={() => {}}
                    mode="idle"
                    size={52}
                    accessory={acc.id}
                  />
                  {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className={`font-pixel leading-none ${active ? 'text-white' : 'text-gray-700'}`}
                  style={{ fontSize: 7 }}>
                  {acc.label}
                </span>

                {/* Unlock tag or equipped check */}
                {active ? (
                  <span className="text-emerald-400 font-pixel" style={{ fontSize: 7 }}>✓ on</span>
                ) : unlocked ? (
                  <span className="text-gray-400 font-pixel" style={{ fontSize: 6 }}>unlocked</span>
                ) : (
                  <span className="text-gray-400 font-pixel" style={{ fontSize: 6 }}>
                    {acc.tasksNeeded} tasks
                  </span>
                )}

                {/* Active glow ring */}
                {active && (
                  <motion.div
                    layoutId="active-ring"
                    className="absolute inset-0 rounded-2xl border-2 border-white/30"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Flavor text for equipped */}
        <AnimatePresence mode="wait">
          {(() => {
            const current = ACCESSORIES.find(a => a.id === equipped);
            return current ? (
              <motion.p
                key={String(equipped)}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="text-center font-pixel text-[9px] text-gray-400 pb-6 px-4"
              >
                "{current.flavor}"
              </motion.p>
            ) : null;
          })()}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
