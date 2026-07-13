import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, Bell, Shirt } from 'lucide-react';
import PoppleCharacter, { type PoppleAccessory } from './PoppleCharacter';
import PopupWorld from './PopupWorld';
import AccessoryDrawer from './AccessoryDrawer';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import type { Todo, GameSettings } from '../App';

interface BackgroundTheme {
  id: string;
  name: string;
  icon: any;
  image: string;
  description: string;
}

interface GameScreenProps {
  completedTodos: Todo[];
  onRemovePill: (id: string) => void;
  onRemoveMultiplePills: (ids: string[]) => void;
  gameSettings: GameSettings;
  playerProgress: {
    level: number;
    currentXP: number;
    totalXP: number;
    unlockedRewards: string[];
  };
  levelConfig: Array<{
    level: number;
    xpRequired: number;
    title: string;
    reward: string;
    emoji: string;
  }>;
  getXPForNextLevel: (currentLevel: number) => number;
  addXP: (amount: number) => void;
  backgroundThemes: BackgroundTheme[];
  backgroundTheme: string;
  onBackgroundThemeChange: (theme: string) => void;
}

interface Creature {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  expression: 'idle' | 'celebrating' | 'sleeping' | 'angry' | 'ticking';
  isDragging?: boolean;
  externalReaction?: { text: string; nonce: number };
}

const CREATURE_SPEED = 0.567; // ~34px/s at 60fps
const CREATURE_W     = 80;   // px footprint
const CREATURE_H     = 88;   // full bounding box height
const CREATURE_FOOT  = 73;   // px from top to visual foot contact (y2=68 + 5px stroke radius)
const GRAVITY        = 1.4;  // px per frame (felt gravity — snappy return to ground)

export default function GameScreen({
  completedTodos,
  onRemovePill,
  onRemoveMultiplePills,
  gameSettings,
  playerProgress,
  levelConfig,
  getXPForNextLevel,
  addXP,
  backgroundThemes,
  backgroundTheme,
  onBackgroundThemeChange,
}: GameScreenProps) {
  // Start with 1 starter Popple — new ones are milestone-unlocked, not per-task
  const [creatures,  setCreatures]  = useState<Creature[]>([{
    id: 'starter',
    x: 40, y: 0,
    vx: CREATURE_SPEED, vy: 0,
    expression: 'idle',
  }]);
  const [showPopup,       setShowPopup]       = useState(false);
  const [showHelp,        setShowHelp]        = useState(false);
  const [showWardrobe,    setShowWardrobe]    = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showAccPicker,   setShowAccPicker]   = useState(false);

  // Accessory — persisted to localStorage
  const [equippedAcc, setEquippedAcc] = useState<PoppleAccessory>(() => {
    try { return (localStorage.getItem('popple-accessory') as PoppleAccessory) ?? null; }
    catch { return null; }
  });

  const handleEquip = (acc: PoppleAccessory) => {
    setEquippedAcc(acc);
    try { localStorage.setItem('popple-accessory', acc ?? ''); } catch {}
  };

  // Derive total tasks done from totalXP (each task = 100 XP)
  const totalTasksDone = Math.floor(playerProgress.totalXP / 100);

  const containerRef      = useRef<HTMLDivElement>(null);
  const animRef           = useRef<number>();
  const lastTsRef         = useRef<number>(0);
  const helpBtnRef        = useRef<HTMLButtonElement>(null);
  const dragRef           = useRef<{ id: string; downTime: number; moved: boolean } | null>(null);
  const pointerHistoryRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const tapCountRef       = useRef<{ id: string; count: number; lastTime: number }>({ id: '', count: 0, lastTime: 0 });
  const reactionNonce     = useRef(0);
  const idleTimerRef      = useRef<ReturnType<typeof setTimeout>>();
  const sleepTimerRef     = useRef<ReturnType<typeof setTimeout>>();

  // ── Creature physics (horizontal walk only) ────────────────────────────────
  useEffect(() => {
    const animate = (ts: number) => {
      const dt = lastTsRef.current ? Math.min((ts - lastTsRef.current) / 16.67, 3) : 1;
      lastTsRef.current = ts;

      const cw = containerRef.current?.clientWidth  ?? 400;
      const ch = containerRef.current?.clientHeight ?? 600;

      setCreatures(prev => prev.map(c => {
        if (c.isDragging) return c;
        let { x, y, vx, vy } = c;

        // Horizontal walk
        x += vx * dt;
        if (x <= 0)            { x = 0;            vx =  Math.abs(vx); }
        else if (x >= cw - CREATURE_W) { x = cw - CREATURE_W; vx = -Math.abs(vx); }

        // Gravity — always pulls to ground, no floating
        if (y > 0 || vy < 0) {
          vy -= GRAVITY * dt;
          y  += vy * dt;
          if (y <= 0) {
            y  = 0;
            const bounce = Math.abs(vy) * 0.28;
            vy = bounce > 1.2 ? bounce : 0; // small recoil, dies out quickly
            vx = vx > 0 ? CREATURE_SPEED : -CREATURE_SPEED;
          }
        }

        return { ...c, x, y, vx, vy };
      }));

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // ── Context reaction helper ────────────────────────────────────────────────
  const triggerReaction = (id: string, text: string) => {
    reactionNonce.current += 1;
    const nonce = reactionNonce.current;
    setCreatures(prev => prev.map(c => c.id === id ? { ...c, externalReaction: { text, nonce } } : c));
  };

  // Wake a sleeping Popple
  const wakeUp = (id: string) => {
    setCreatures(prev => prev.map(c =>
      c.id === id && c.expression === 'sleeping' ? { ...c, expression: 'idle' } : c
    ));
  };

  // Reset idle + sleep timers on any interaction
  const resetIdleTimer = (id: string) => {
    wakeUp(id);
    clearTimeout(idleTimerRef.current);
    clearTimeout(sleepTimerRef.current);

    // Bored blurb after 20–35s
    idleTimerRef.current = setTimeout(() => {
      const phrases = ["hello??", "anyone there?", "bored.", "am I being watched", "*stares at wall*", "..."];
      triggerReaction(id, phrases[Math.floor(Math.random() * phrases.length)]);
      resetIdleTimer(id);
    }, 20000 + Math.random() * 15000);

    // Fall asleep after 45s
    sleepTimerRef.current = setTimeout(() => {
      setCreatures(prev => prev.map(c => c.id === id ? { ...c, expression: 'sleeping' as const, vx: 0 } : c));
    }, 45000);
  };

  // ── Drag / hold / throw handlers ──────────────────────────────────────────
  const handleCreaturePointerDown = (e: React.PointerEvent, id: string) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id, downTime: Date.now(), moved: false };
    pointerHistoryRef.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    resetIdleTimer(id);

    // Immediately held — creature lifts to cursor
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const navBottom = rect.bottom; // container bottom = nav bar top
    const newX = Math.max(0, Math.min(rect.width - CREATURE_W, e.clientX - rect.left - CREATURE_W / 2));
    const newY = Math.max(0, navBottom - e.clientY - CREATURE_H / 2);
    setCreatures(prev => prev.map(c => c.id === id ? { ...c, isDragging: true, vx: 0, vy: 0, x: newX, y: newY } : c));

    // Held reaction after 400ms
    setTimeout(() => {
      if (!dragRef.current || dragRef.current.id !== id) return;
      const phrases = ["hey!!", "excuse me??", "put me down", "this is fine.", "I'm fine.", "...okay then"];
      triggerReaction(id, phrases[Math.floor(Math.random() * phrases.length)]);
    }, 400);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    dragRef.current.moved = true;
    const now = Date.now();
    pointerHistoryRef.current.push({ x: e.clientX, y: e.clientY, t: now });
    pointerHistoryRef.current = pointerHistoryRef.current.filter(p => now - p.t < 120).slice(-6);

    const { id } = dragRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    const navBottom = rect.bottom;
    const newX = Math.max(0, Math.min(rect.width - CREATURE_W, e.clientX - rect.left - CREATURE_W / 2));
    const newY = Math.max(0, navBottom - e.clientY - CREATURE_H / 2);
    setCreatures(prev => prev.map(c => c.id === id ? { ...c, x: newX, y: newY } : c));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { id, downTime, moved } = dragRef.current;
    dragRef.current = null;

    const holdMs = Date.now() - downTime;
    const history = pointerHistoryRef.current;

    // Calculate throw velocity from pointer history
    let throwVx = (Math.random() > 0.5 ? 1 : -1) * CREATURE_SPEED;
    let throwVy = 0;
    let isThrow = false;

    if (history.length >= 2) {
      const newest = history[history.length - 1];
      const oldest = history[0];
      const dt = Math.max(1, newest.t - oldest.t);
      const rawVx =  (newest.x - oldest.x) / dt * 16;
      const rawVy = -(newest.y - oldest.y) / dt * 16; // invert: up = positive
      const speed = Math.sqrt(rawVx * rawVx + rawVy * rawVy);
      if (speed > 4) {
        isThrow = true;
        throwVx = rawVx * 0.4;
        throwVy = Math.max(0, rawVy * 0.4); // only upward component
      }
    }

    // Was it a tap? (quick, barely moved)
    const isTap = holdMs < 200 && !moved;

    if (isTap) {
      // Track rapid taps
      const tap = tapCountRef.current;
      const now = Date.now();
      if (tap.id === id && now - tap.lastTime < 1800) {
        tap.count++;
      } else {
        tap.count = 1;
        tap.id = id;
      }
      tap.lastTime = now;

      if (tap.count === 3) {
        const phrases = ["okay okay CHILL", "i have feelings", "stop it.", "why are you like this", "excuse me??"];
        triggerReaction(id, phrases[Math.floor(Math.random() * phrases.length)]);
        setCreatures(prev => prev.map(c => c.id === id ? { ...c, expression: 'angry' as const } : c));
        setTimeout(() => setCreatures(prev => prev.map(c => c.id === id ? { ...c, expression: 'idle' as const } : c)), 2000);
      } else if (tap.count === 5) {
        const phrases = ["I SAID STOP", "...you asked for this", "do NOT", "I am WARNING you", "last chance."];
        triggerReaction(id, phrases[Math.floor(Math.random() * phrases.length)]);
        setCreatures(prev => prev.map(c => c.id === id ? { ...c, expression: 'ticking' as const } : c));
        setTimeout(() => setCreatures(prev => prev.map(c => c.id === id ? { ...c, expression: 'idle' as const } : c)), 2500);
      } else if (tap.count >= 7) {
        const secrets = [
          "i once hid under the sofa for 3 hours and nobody noticed",
          "i think about cheese more than is probably normal",
          "i have a favorite cloud shape. it is the lumpy one.",
          "sometimes i pretend i am asleep to avoid conversations",
          "i counted all the ceiling tiles in here. it is 0. no ceiling.",
          "my biggest fear is someone moving my stuff slightly to the left",
          "i do not know what time it is but i feel like it is always 2pm",
          "i made up a fake language once. i only know three words.",
          "i have strong opinions about the correct way to stack things",
          "i told a rock a secret once. i think it understood.",
        ];
        triggerReaction(id, secrets[Math.floor(Math.random() * secrets.length)]);
        setCreatures(prev => prev.map(c => c.id === id ? { ...c, expression: 'idle' as const } : c));
        tap.count = 0;
      }

      // Release creature back to ground on tap
      setCreatures(prev => prev.map(c => c.id === id ? { ...c, isDragging: false, vx: throwVx, vy: 0 } : c));
    } else {
      // Release with throw velocity
      if (isThrow) {
        const phrases = ["WHEEEEE", "wait WHAT", "...did you just throw me", "bold move.", "I did not consent to this", "surprisingly fun??", "again??"];
        triggerReaction(id, phrases[Math.floor(Math.random() * phrases.length)]);

        // Landing reaction after estimated flight time
        setTimeout(() => {
          const landing = ["ow.", "I'm okay!!", "10 out of 10.", "...wild.", "cool. cool cool cool.", "stick the landing.", "I meant to do that.", "nobody saw that right"];
          triggerReaction(id, landing[Math.floor(Math.random() * landing.length)]);
        }, 900);
      }
      setCreatures(prev => prev.map(c =>
        c.id === id ? { ...c, isDragging: false, vx: throwVx, vy: throwVy } : c
      ));
    }
  };

  // ── When a pill is popped, existing Popples celebrate briefly ────────────
  const handlePillPopped = () => {
    setCreatures(prev => prev.map(c => ({ ...c, expression: 'celebrating' as const })));
    setTimeout(() => {
      setCreatures(prev => prev.map(c => ({ ...c, expression: 'idle' as const })));
    }, 3000);
  };

  const currentTheme = backgroundThemes.find(t => t.id === backgroundTheme);

  return (
    <div className="absolute inset-0" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>

      {/* ── Header ── */}
      <div className="relative px-4 py-3">
        <div className="pixel-notebook p-3 rounded-lg">

          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <span className="font-pixel text-xs text-gray-700">
                {levelConfig.find(c => c.level === playerProgress.level)?.title ?? 'Adult in Training'}
              </span>
            </div>

            <div className="flex flex-row gap-1 items-center">
              {/* Notification bell — opens popup */}
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-8 h-8 p-0 rounded-full relative"
                  onClick={() => setShowPopup(true)}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <AnimatePresence>
                    {completedTodos.length > 0 && (
                      <motion.span
                        key="badge"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center"
                        style={{ fontSize: 8 }}
                      >
                        {completedTodos.length > 9 ? '9+' : completedTodos.length}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>

              {/* Help */}
              <div className="relative">
                <Button
                  ref={helpBtnRef}
                  size="sm"
                  variant="ghost"
                  className="w-8 h-8 p-0 rounded-full"
                  onClick={() => setShowHelp(v => !v)}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </Button>
                {showHelp && (
                  <>
                    <div className="fixed inset-0 z-[99]" onClick={() => setShowHelp(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      className="absolute z-[100] top-9 -right-1 bg-white rounded-xl shadow-xl border border-gray-200 p-2 flex flex-col gap-1 min-w-[160px]"
                    >
                      {[
                        'complete tasks to earn pills',
                        'tap bell to open pop space',
                        'tap a pill 3x to pop it',
                        'popple lands in your space',
                      ].map(tip => (
                        <p key={tip} className="font-pixel text-[9px] text-gray-700 px-1">{tip}</p>
                      ))}
                    </motion.div>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-4 bg-gray-200 mx-0.5" />

              {/* Theme picker — single button opens dropdown */}
              <div className="relative">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-8 h-8 p-0 rounded-full"
                  onClick={() => setShowThemePicker(v => !v)}
                >
                  {currentTheme ? <currentTheme.icon className="w-3.5 h-3.5" /> : <span className="text-xs">🖼</span>}
                </Button>
                {showThemePicker && (
                  <>
                    <div className="fixed inset-0 z-[99]" onClick={() => setShowThemePicker(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      className="absolute z-[100] top-9 right-0 bg-white rounded-xl shadow-xl border border-gray-200 p-1.5 flex flex-row gap-0.5"
                    >
                      {backgroundThemes.map(theme => {
                        const Icon = theme.icon;
                        const active = backgroundTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => { onBackgroundThemeChange(theme.id); setShowThemePicker(false); }}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${active ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Level & XP */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {levelConfig.find(c => c.level === playerProgress.level)?.emoji ?? ''}
              </span>
              <span className="font-pixel text-xs text-black">LVL {playerProgress.level}</span>
            </div>
            <span className="font-pixel text-xs text-black">
              {playerProgress.currentXP}/{getXPForNextLevel(playerProgress.level)} XP
            </span>
          </div>

          <Progress
            value={Math.min(100, (playerProgress.currentXP / Math.max(1, getXPForNextLevel(playerProgress.level))) * 100)}
            className="w-full h-3 bg-white border border-black/20"
          />
        </div>

        {/* Accessories picker */}
        <div className="flex justify-end mt-2 relative">
          <button
            className="pixel-notebook w-8 h-8 rounded-lg flex items-center justify-center hover:brightness-95 transition-all"
            onClick={() => setShowAccPicker(v => !v)}
          >
            <Shirt className="w-3.5 h-3.5 text-gray-600" />
          </button>
          {showAccPicker && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={() => setShowAccPicker(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                className="absolute z-[100] top-9 right-0 bg-white rounded-xl shadow-xl border border-gray-200 p-1.5 flex flex-row gap-0.5"
              >
                {([
                  { id: null as PoppleAccessory,        icon: (
                    <svg viewBox="0 0 20 20" width="18" height="18"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/><line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  )},
                  { id: 'beanie' as PoppleAccessory,    icon: (
                    <svg viewBox="22 4 36 18" width="22" height="14"><ellipse cx="40" cy="13" rx="14" ry="7" fill="#e55a2b"/><rect x="27" y="12" width="26" height="6" rx="3" fill="#e55a2b"/><line x1="33" y1="12" x2="33" y2="18" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" strokeLinecap="round"/><line x1="40" y1="12" x2="40" y2="18" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" strokeLinecap="round"/><line x1="47" y1="12" x2="47" y2="18" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="40" cy="6" r="4" fill="white" stroke="#e55a2b" strokeWidth="0.5"/></svg>
                  )},
                  { id: 'grad-cap' as PoppleAccessory,  icon: (
                    <svg viewBox="18 6 44 16" width="22" height="14"><rect x="20" y="9" width="40" height="4" rx="1.5" fill="#1a202c"/><ellipse cx="40" cy="17" rx="10" ry="4" fill="#1a202c"/><line x1="56" y1="9" x2="61" y2="19" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/><circle cx="61" cy="20" r="2" fill="#f59e0b"/></svg>
                  )},
                  { id: 'crown' as PoppleAccessory,     icon: (
                    <svg viewBox="23 2 34 16" width="22" height="14"><polygon points="26,15 30,5 34,15" fill="#f59e0b"/><polygon points="35,15 40,2 45,15" fill="#f59e0b"/><polygon points="46,15 50,5 54,15" fill="#f59e0b"/><rect x="24" y="13" width="32" height="6" rx="2" fill="#f59e0b"/><circle cx="30" cy="16" r="1.5" fill="#ef4444"/><circle cx="40" cy="15" r="2" fill="#ef4444"/><circle cx="50" cy="16" r="1.5" fill="#ef4444"/></svg>
                  )},
                  { id: 'party-hat' as PoppleAccessory, icon: (
                    <svg viewBox="22 0 36 22" width="18" height="18"><polygon points="40,1 24,20 56,20" fill="#a78bfa"/><polygon points="40,1 33,13 40,15 47,13" fill="#7c3aed" opacity="0.4"/><circle cx="40" cy="1" r="2.5" fill="#fbbf24"/><line x1="24" y1="20" x2="56" y2="20" stroke="#7c3aed" strokeWidth="1.5"/></svg>
                  )},
                ] as { id: PoppleAccessory; icon: React.ReactNode }[]).map(acc => {
                  const unlocked = true;
                  const active = equippedAcc === acc.id;
                  return (
                    <button
                      key={String(acc.id)}
                      disabled={!unlocked}
                      onClick={() => { if (unlocked) { handleEquip(acc.id); setShowAccPicker(false); } }}
                      className={`w-9 h-8 flex items-center justify-center rounded-lg transition-colors ${active ? 'bg-gray-900 text-white' : unlocked ? 'hover:bg-gray-100 text-gray-700' : 'opacity-30 cursor-not-allowed text-gray-400'}`}
                    >
                      {acc.icon}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* ── Creature space (for physics bounds) ── */}
      <div ref={containerRef} className="absolute inset-x-0 pointer-events-none" style={{ top: 0, bottom: 'calc(5rem + env(safe-area-inset-bottom))' }} />

      {/* ── Creatures — anchored to nav bar top via bottom CSS ── */}
      <AnimatePresence>
        {creatures.map(creature => (
          <div
            key={creature.id}
            className="absolute"
            style={{
              left: creature.x,
              bottom: `calc(5rem + env(safe-area-inset-bottom) + ${Math.round(creature.y)}px - ${CREATURE_H - CREATURE_FOOT}px)`,
              cursor: creature.isDragging ? 'grabbing' : 'grab',
              zIndex: 9999,
            }}
            onPointerDown={e => handleCreaturePointerDown(e, creature.id)}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            >
              <PoppleCharacter
                expression={creature.expression === 'sleeping' ? 'sleeping' : (creature.expression === 'angry' || creature.expression === 'ticking') ? creature.expression : creature.y > 10 && !creature.isDragging ? 'waiting' : creature.expression}
                mode={creature.isDragging || creature.y > 10 || creature.expression === 'sleeping' || creature.expression === 'angry' || creature.expression === 'ticking' ? 'idle' : 'walk'}
                pendingCount={0}
                accessory={equippedAcc}
                facingLeft={creature.vx < 0}
                onClick={() => {}}
                externalReaction={creature.externalReaction}
                size={80}
              />
            </motion.div>
          </div>
        ))}
      </AnimatePresence>


      {/* ── Accessory drawer ── */}
      <AnimatePresence>
        {showWardrobe && (
          <AccessoryDrawer
            equipped={equippedAcc}
            totalTasksDone={totalTasksDone}
            onEquip={handleEquip}
            onClose={() => setShowWardrobe(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Popup overlay ── */}
      <AnimatePresence>
        {showPopup && (
          <PopupWorld
            completedTodos={completedTodos}
            onRemovePill={onRemovePill}
            onRemoveMultiplePills={onRemoveMultiplePills}
            gameSettings={gameSettings}
            addXP={addXP}
            backgroundImage={currentTheme?.image ?? ''}
            onPillPopped={() => handlePillPopped()}
            onClose={() => setShowPopup(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
