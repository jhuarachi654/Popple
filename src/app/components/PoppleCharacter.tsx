import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';

export type PoppleExpression = 'idle' | 'waiting' | 'celebrating' | 'sleeping' | 'angry' | 'ticking';
export type PoppleMode       = 'idle' | 'walk';
export type PoppleAccessory  = 'beanie' | 'grad-cap' | 'crown' | 'party-hat' | null;

interface Props {
  expression:      PoppleExpression;
  pendingCount:    number;
  onClick:         () => void;
  mode?:           PoppleMode;
  size?:           number;
  accessory?:      PoppleAccessory;
  facingLeft?:     boolean;
  silent?:         boolean;
  // External reaction trigger — changes whenever parent wants to show a specific bubble
  externalReaction?: { text: string; nonce: number };
}

const C = '#2d3748';

// ── Personality sayings per accessory ────────────────────────────────────────
const SAYINGS: Record<string, string[]> = {
  default: [
    'not now.', 'vibing.', 'just thinking', 'hmm.',
    '*stares into space*', 'noted.', 'oh, hello.',
    'today is a good day actually', 'I like it here.',
    'something nice is coming. I can feel it.',
    'did you see that cloud?? perfect shape.',
    'I believe in you by the way.',
    'small steps still count.',
    '*hums quietly*', 'this is nice.',
    'you are doing better than you think.',
  ],
  beanie: [
    'five more minutes', 'so cozy rn',
    'it\'s giving nap energy', 'warm. content. happy.',
    '*yawns contentedly*', 'comfy > everything',
    'blanket weather forever please',
    'resting but make it cute',
    'soft hours only.',
    'everything is better wrapped up.',
  ],
  'grad-cap': [
    'citation needed', 'coffee count: 4', 'technically...',
    'according to my research, today is good',
    'I have strong thoughts about this',
    '*adjusts glasses*', 'well actually—',
    'did you know? you are doing great.',
    'hypothesis: today will be fine.',
    'evidence suggests: you got this.',
  ],
  crown: [
    'as expected.', 'obviously.', 'beneath me, but sure.',
    'bow down.', 'royalty doesn\'t explain itself',
    '*sighs royally*', 'flawless as always.',
    'you may proceed.', 'I have arrived.',
    'excellence is simply the standard here.',
  ],
  'party-hat': [
    'LET\'S GOOO', 'is it someone\'s birthday??', 'MORE CONFETTI!!',
    'everything is a celebration', 'I\'m not tired I\'m ENERGIZED',
    'WOO!!', 'can we do that again?!', '*jazz hands*',
    'every task completed is a tiny party',
    'you finished something!! that counts!!',
    'I am THRIVING and so are you!!',
  ],
};

// ── Click reaction body animations ───────────────────────────────────────────
const CLICK_REACTIONS: Record<string, object> = {
  default:     { y: [0, -18, -4, 0],  scale: [1, 1.1, 0.94, 1],  rotate: [0, 0, 0, 0]       },
  beanie:      { y: [0, -8, 0],        scale: [1, 1.02, 1],         rotate: [0, -10, 10, -5, 0] },
  'grad-cap':  { y: [0, -22, 0],       scale: [1, 1.15, 0.92, 1],  rotate: [0, 0, 0, 0]       },
  crown:       { y: [0, -6, 0],        scale: [1, 1.04, 1],         rotate: [0, -5, 5, -3, 0]  },
  'party-hat': { y: [0, -24, -8, 0],  scale: [1, 1.2, 0.88, 1],   rotate: [0, 14, -14, 0]    },
};

// ── Idle animation personality ────────────────────────────────────────────────
const IDLE_ANIM: Record<string, object> = {
  default:     { y: [0, -8, 0, -2, 0],  scaleY: [1, 1.05, 0.93, 1.01, 1], scaleX: [1, 0.96, 1.07, 0.99, 1] },
  beanie:      { y: [0, -4, 0, -1, 0],  scaleY: [1, 1.02, 0.98, 1,    1], scaleX: [1, 0.99, 1.02, 0.99, 1] },
  'grad-cap':  { y: [0, -10, 0, -3, 0], scaleY: [1, 1.06, 0.94, 1.02, 1], scaleX: [1, 0.98, 1.04, 0.99, 1] },
  crown:       { y: [0, -6, 0, -2, 0],  scaleY: [1, 1.03, 0.97, 1.01, 1], scaleX: [1, 0.97, 1.04, 0.99, 1] },
  'party-hat': { y: [0, -13, 0, -4, 0], scaleY: [1, 1.07, 0.91, 1.03, 1], scaleX: [1, 0.94, 1.09, 0.99, 1] },
};

const IDLE_DUR: Record<string, number> = {
  default: 2.6, beanie: 3.6, 'grad-cap': 2.1, crown: 3.0, 'party-hat': 1.7,
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function PoppleCharacter({
  expression,
  pendingCount,
  onClick,
  mode             = 'idle',
  size             = 100,
  accessory        = null,
  facingLeft       = false,
  silent           = false,
  externalReaction,
}: Props) {
  const controls               = useAnimation();
  const [bubble, setBubble]    = useState<string | null>(null);
  const [reacting, setReacting]= useState(false);
  const bubbleTimer            = useRef<ReturnType<typeof setTimeout>>();
  const periodicTimer          = useRef<ReturnType<typeof setTimeout>>();
  const lastNonce              = useRef<number>(-1);

  const isWalking     = mode === 'walk' && expression !== 'sleeping' && expression !== 'angry' && expression !== 'ticking';
  const isCelebrating = expression === 'celebrating';
  const isWaiting     = expression === 'waiting';
  const isSleeping    = expression === 'sleeping';
  const isAngry       = expression === 'angry';
  const isTicking     = expression === 'ticking';
  const acc           = accessory ?? 'default';
  const sayings       = SAYINGS[acc] ?? SAYINGS.default;

  // ── External reaction (thrown, tapped repeatedly, etc.) ───────────────────
  useEffect(() => {
    if (!externalReaction || externalReaction.nonce === lastNonce.current) return;
    lastNonce.current = externalReaction.nonce;
    showBubble(externalReaction.text);
    setReacting(true);
    const anim = CLICK_REACTIONS[acc] ?? CLICK_REACTIONS.default;
    controls.start({ ...anim, transition: { duration: 0.5, ease: 'easeOut' } })
      .then(() => setReacting(false));
  }, [externalReaction]);

  // ── Periodic personality blurb ─────────────────────────────────────────────
  useEffect(() => {
    if (silent) return;
    const schedule = () => {
      const delay = 12000 + Math.random() * 20000; // 12–32s
      periodicTimer.current = setTimeout(() => {
        if (!reacting) showBubble(pickRandom(sayings));
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(periodicTimer.current);
  }, [acc, reacting, silent]);

  const showBubble = (text: string) => {
    setBubble(text);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 3200);
  };

  // ── Click reaction ─────────────────────────────────────────────────────────
  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (reacting) return;
    if (silent) { onClick(); return; }
    setReacting(true);
    showBubble(pickRandom(sayings));
    const anim = CLICK_REACTIONS[acc] ?? CLICK_REACTIONS.default;
    controls.start({ ...anim, transition: { duration: 0.55, ease: 'easeOut' } }).then(() => {
      setReacting(false);
    });
    onClick();
  };

  // ── Body animation ─────────────────────────────────────────────────────────
  const bodyAnim = isWalking
    ? { rotate: [-2, 0, 2, 0, -2], y: [0, -2, 0, -2, 0] }
    : isCelebrating
    ? { y: [0, -14, 0, -2, 0], scaleY: [1, 1.05, 0.93, 1.01, 1], scaleX: [1, 0.96, 1.07, 0.99, 1] }
    : isWaiting
    ? { y: [0, -10, 0, -2, 0], scaleY: [1, 1.04, 0.96, 1.01, 1], scaleX: [1, 0.97, 1.05, 0.99, 1] }
    : isSleeping
    ? { y: [0, -3, 0], scaleY: [1, 0.96, 1], scaleX: [1, 1.03, 1] }
    : isAngry
    ? { rotate: [-3, 3, -3], scaleX: [1, 1.04, 1] }
    : isTicking
    ? { rotate: [-6, 6, -6, 6, -6], x: [-2, 2, -2, 2, 0], scaleX: [1, 1.06, 1, 1.06, 1] }
    : IDLE_ANIM[acc] ?? IDLE_ANIM.default;

  const bodyDur = isWalking ? 1.0 : isCelebrating ? 1.1 : isWaiting ? 1.8 : isSleeping ? 3.5 : isAngry ? 0.3 : isTicking ? 0.15 : (IDLE_DUR[acc] ?? 2.6);
  const footT   = { duration: 1.0, repeat: Infinity as const, ease: 'easeInOut' as const };
  const scale   = size / 100;

  return (
    // Outer div: NEVER flipped — holds bubbles, particles, badge
    <div className="relative flex flex-col items-center select-none" style={{ width: size }}>

      {/* ── Speech bubble — centering wrapper is a plain div so Framer Motion
           transforms (y, scale) don't conflict with translateX(-50%) ── */}
      <AnimatePresence>
        {bubble && (
          <div
            className="absolute z-30 pointer-events-none"
            style={{ bottom: size * 1.1 + 8, left: '50%', transform: 'translateX(-50%)' }}
          >
            <motion.div
              key={bubble}
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{    opacity: 0, y: -6, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="bg-gray-800 text-white rounded-lg px-2.5 py-1.5 shadow-lg relative"
              style={{ fontSize: 9 * scale, maxWidth: 325, whiteSpace: 'normal', textAlign: 'left' }}
            >
              <span className="font-pixel leading-snug">{bubble}</span>
              <div className="absolute left-1/2 -bottom-[5px] -translate-x-1/2 w-0 h-0"
                   style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #2d3748' }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Ambient personality particles (above SVG, not flipped) ── */}
      {isSleeping && (
        <div className="absolute pointer-events-none overflow-visible"
             style={{ bottom: size * 1.0, left: '50%', transform: 'translateX(-50%)', width: 40 * scale, height: 36 * scale }}>
          {[
            { left: 4,  top: 20, delay: 0.0, fontSize: 10 },
            { left: 14, top: 10, delay: 0.9, fontSize: 13 },
            { left: 26, top: 2,  delay: 1.8, fontSize: 16 },
          ].map((z, i) => (
            <motion.span key={i} className="absolute font-pixel font-bold text-slate-300/80"
              style={{ left: z.left * scale, top: z.top * scale, fontSize: z.fontSize * scale }}
              animate={{ opacity: [0, 1, 0.7, 0], y: [0, -30 * scale] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: z.delay, ease: 'easeOut' }}>
              z
            </motion.span>
          ))}
        </div>
      )}

      {accessory === 'beanie' && !reacting && (
        <div className="absolute pointer-events-none overflow-visible"
             style={{ bottom: size * 1.1, left: '50%', transform: 'translateX(-50%)', width: 48 * scale, height: 36 * scale }}>
          {[
            { left: 0,  top: 18, delay: 0.0, size: 11 },
            { left: 16, top: 8,  delay: 0.7, size: 13 },
            { left: 32, top: 2,  delay: 1.4, size: 15 },
          ].map((z, i) => (
            <motion.span key={i} className="absolute font-mono font-bold text-slate-400"
              style={{ left: z.left * scale, top: z.top * scale, fontSize: z.size * scale }}
              animate={{ opacity: [0, 1, 0.6, 0], y: [0, -28 * scale] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: z.delay, ease: 'easeOut' }}>
              z
            </motion.span>
          ))}
        </div>
      )}

      {accessory === 'crown' && (
        <div className="absolute pointer-events-none flex gap-2"
             style={{ bottom: size * 1.1 + 4, left: '50%', transform: 'translateX(-50%)' }}>
          {[0, 1.3, 2.6].map((delay, i) => (
            <motion.span key={i} style={{ fontSize: 11 * scale }}
              animate={{ opacity: [0, 1, 0], scale: [0.4, 1.1, 0.4], rotate: [0, 20, 40] }}
              transition={{ duration: 4.0, repeat: Infinity, delay }}>✦</motion.span>
          ))}
        </div>
      )}

      {accessory === 'grad-cap' && (
        <motion.div className="absolute pointer-events-none"
          style={{ bottom: size * 1.1 + 4, left: '50%', transform: 'translateX(-50%)' }}
          animate={{ opacity: [0, 1, 1, 0], y: [4 * scale, 0, 0, -6 * scale] }}
          transition={{ duration: 5.0, repeat: Infinity, ease: 'easeInOut' }}>
          <svg width={28 * scale} height={20 * scale} viewBox="0 0 28 20">
            <rect x="1" y="2" width="26" height="16" rx="2" fill="#3b82f6"/>
            <rect x="13" y="2" width="2" height="16" fill="#1d4ed8"/>
            <line x1="4" y1="7"  x2="11" y2="7"  stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
            <line x1="4" y1="11" x2="11" y2="11" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
            <line x1="17" y1="7"  x2="24" y2="7"  stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
            <line x1="17" y1="11" x2="24" y2="11" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
          </svg>
        </motion.div>
      )}

      {accessory === 'party-hat' && (
        <div className="absolute pointer-events-none overflow-visible"
             style={{ bottom: size * 1.1, left: '50%', transform: 'translateX(-50%)' }}>
          {[
            { color: '#0ea5e9', left: -16, delay: 0.0 },
            { color: '#a78bfa', left: -4,  delay: 0.4 },
            { color: '#34d399', left:  8,  delay: 0.2 },
            { color: '#fb923c', left:  20, delay: 0.6 },
          ].map((c, i) => (
            <motion.div key={i} className="absolute rounded-sm"
              style={{ width: 5 * scale, height: 5 * scale, background: c.color, left: c.left * scale }}
              animate={{ y: [0, -24 * scale], opacity: [1, 0], rotate: [0, 180] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: c.delay, ease: 'easeIn' }}/>
          ))}
        </div>
      )}

      {/* ── Celebrating confetti ── */}
      <AnimatePresence>
        {isCelebrating && (
          <div className="absolute pointer-events-none overflow-visible" style={{ bottom: size * 0.9, left: '50%' }}>
            {[
              { color: '#0ea5e9', tx: -22, delay: 0.0 },
              { color: '#a78bfa', tx:  22, delay: 0.1 },
              { color: '#34d399', tx: -10, delay: 0.2 },
              { color: '#fb923c', tx:  14, delay: 0.3 },
              { color: '#f472b6', tx: -28, delay: 0.4 },
              { color: '#facc15', tx:  28, delay: 0.5 },
            ].map((p, i) => (
              <motion.div key={i} className="absolute rounded-sm"
                style={{ width: 6 * scale, height: 6 * scale, background: p.color }}
                animate={{ x: p.tx * scale, y: [-8 * scale, -44 * scale], opacity: [1, 0], rotate: [0, 200] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: p.delay, ease: 'easeOut' }}/>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* ── Pending badge ── */}
      <AnimatePresence>
        {pendingCount > 0 && (
          <motion.div
            initial={{ scale: 0, y: 6 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute z-10 bg-white border-2 border-gray-800 rounded-full px-2.5 py-0.5 shadow-md whitespace-nowrap"
            style={{ bottom: size * 1.1 + 2 }}>
            <span className="font-pixel text-gray-800" style={{ fontSize: 9 * scale }}>
              ✦ {pendingCount} ready
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SVG wrapper — only this gets flipped for direction ── */}
      <motion.div
        animate={controls}
        onClick={handleClick}
        className="cursor-pointer"
        style={{ transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)', filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.55))' }}
      >
        <svg width={size} height={size * 1.1} viewBox="0 0 80 88" overflow="visible">
          <motion.g
            style={{ transformOrigin: '40px 76px' }}
            animate={reacting ? {} : bodyAnim}
            transition={{ duration: bodyDur, repeat: reacting ? 0 : Infinity, ease: 'easeInOut' }}
          >
            {/* Legs */}
            {isSleeping ? (
              <>
                <line x1="29" y1="60" x2="22" y2="70" stroke={C} strokeWidth="10" strokeLinecap="round"/>
                <line x1="51" y1="60" x2="58" y2="70" stroke={C} strokeWidth="10" strokeLinecap="round"/>
              </>
            ) : (
              <>
                <motion.line x1="29" y1="60" x2="29" y2="68" stroke={C} strokeWidth="10" strokeLinecap="round"
                  style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' } as React.CSSProperties}
                  animate={isWalking ? { rotate: [-10, 10, -10] } : { rotate: 0 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}/>
                <motion.line x1="51" y1="60" x2="51" y2="68" stroke={C} strokeWidth="10" strokeLinecap="round"
                  style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' } as React.CSSProperties}
                  animate={isWalking ? { rotate: [10, -10, 10] } : { rotate: 0 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}/>
              </>
            )}

            {/* Body */}
            <circle cx="40" cy="40" r="21" fill={C}/>
            <circle cx="40" cy="20" r="9"  fill={C}/>
            <circle cx="51" cy="22" r="8"  fill={C}/>
            <circle cx="59" cy="31" r="8"  fill={C}/>
            <circle cx="61" cy="42" r="8"  fill={C}/>
            <circle cx="56" cy="53" r="7"  fill={C}/>
            <circle cx="50" cy="57" r="7"  fill={C}/>
            <circle cx="40" cy="59" r="7"  fill={C}/>
            <circle cx="30" cy="57" r="7"  fill={C}/>
            <circle cx="24" cy="53" r="7"  fill={C}/>
            <circle cx="19" cy="42" r="8"  fill={C}/>
            <circle cx="21" cy="31" r="8"  fill={C}/>
            <circle cx="29" cy="22" r="8"  fill={C}/>

            {/* ── Hats ── */}
            {accessory === 'beanie' && (
              <g>
                <ellipse cx="40" cy="17" rx="16" ry="9" fill="#e55a2b"/>
                <rect x="25" y="16" width="30" height="7" rx="3.5" fill="#e55a2b"/>
                <line x1="32" y1="16" x2="32" y2="23" stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="40" y1="16" x2="40" y2="23" stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinecap="round"/>
                <line x1="48" y1="16" x2="48" y2="23" stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="40" cy="7" r="5" fill="white"/>
              </g>
            )}
            {accessory === 'grad-cap' && (
              <g>
                <ellipse cx="40" cy="18" rx="11" ry="5" fill="#1a202c"/>
                <rect x="29" y="14" width="22" height="5" fill="#1a202c"/>
                <rect x="20" y="11" width="40" height="5" rx="1.5" fill="#1a202c"/>
                <rect x="22" y="8"  width="36" height="5" rx="2"   fill="#1a202c"/>
                <line x1="56" y1="10" x2="63" y2="26" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="63" cy="27" r="3" fill="#f59e0b"/>
              </g>
            )}
            {accessory === 'crown' && (
              <g>
                <polygon points="26,17 30,6  34,17" fill="#f59e0b"/>
                <polygon points="37,17 40,3  43,17" fill="#f59e0b"/>
                <polygon points="46,17 50,6  54,17" fill="#f59e0b"/>
                <rect x="24" y="15" width="32" height="8" rx="3" fill="#f59e0b"/>
                <circle cx="30" cy="18" r="2"   fill="#ef4444"/>
                <circle cx="40" cy="17" r="2.5" fill="#ef4444"/>
                <circle cx="50" cy="18" r="2"   fill="#ef4444"/>
              </g>
            )}
            {accessory === 'party-hat' && (
              <g>
                <polygon points="40,1 24,20 56,20" fill="#a78bfa"/>
                <polygon points="40,1 32,14 40,16 48,14" fill="#7c3aed" opacity="0.4"/>
                <circle cx="40" cy="1" r="3" fill="#fbbf24"/>
                <line x1="24" y1="20" x2="56" y2="20" stroke="#7c3aed" strokeWidth="2"/>
              </g>
            )}

            {/* Eyes */}
            {isSleeping && (
              <>
                <path d="M 28.5 38 Q 32 34.5 35.5 38" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <path d="M 44.5 38 Q 48 34.5 51.5 38" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              </>
            )}
            {(isAngry || isTicking) && (
              <>
                <path d="M 28.5 37 A 3.5 3.5 0 0 0 35.5 37 Z" fill="white" transform="rotate(20, 32, 37)"/>
                <path d="M 44.5 37 A 3.5 3.5 0 0 0 51.5 37 Z" fill="white" transform="rotate(-20, 48, 37)"/>
              </>
            )}
            {!isSleeping && !isAngry && !isTicking && (expression === 'idle' || isWalking) && (
              <>
                <motion.circle cx="32" cy="37" r="3.5" fill="white"
                  style={{ transformOrigin: '32px 37px' }}
                  animate={reacting ? { scaleY: [1, 0.08, 1.4, 1] } : { scaleY: [1, 1, 0.08, 1, 1] }}
                  transition={reacting
                    ? { duration: 0.35 }
                    : { duration: 3.8, repeat: Infinity, times: [0, 0.88, 0.93, 0.96, 1] }}/>
                <motion.circle cx="48" cy="37" r="3.5" fill="white"
                  style={{ transformOrigin: '48px 37px' }}
                  animate={reacting ? { scaleY: [1, 0.08, 1.4, 1] } : { scaleY: [1, 1, 0.08, 1, 1] }}
                  transition={reacting
                    ? { duration: 0.35, delay: 0.05 }
                    : { duration: 3.8, repeat: Infinity, times: [0, 0.88, 0.93, 0.96, 1], delay: 0.1 }}/>
              </>
            )}
            {!isSleeping && !isAngry && !isTicking && (expression === 'waiting' || expression === 'celebrating') && (
              <>
                <circle cx="32" cy="37" r="5" fill="white"/>
                <circle cx="48" cy="37" r="5" fill="white"/>
              </>
            )}
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
}
