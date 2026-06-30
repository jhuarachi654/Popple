import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle } from 'lucide-react';
import TaskContainer from './TaskPill';
import ParticleEffect from './ParticleEffect';
import ArcadeExplosionEffect from './ArcadeExplosionEffect';

import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import type { Todo, GameSettings } from '../App';


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

interface BackgroundTheme {
  id: string;
  name: string;
  icon: any;
  image: string;
  description: string;
}

interface PillState extends Todo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isSelected: boolean;
  isDragging: boolean;
  transformationPhase: 'task' | 'transitioning' | 'pill';
}

interface Celebration {
  id: string;
  x: number;
  y: number;
  type: 'explosion' | 'sparkles' | 'plant' | 'confetti' | 'rainbow' | 'stars';
}



interface ArcadeExplosion {
  id: string;
  pillId: string; // Track which pill this explosion belongs to
  x: number;
  y: number;
  width: number;
  height: number;
  duration?: number; // Optional duration for slow motion effects
}



const PILL_SPEED = 1.2;

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
  const [pills, setPills] = useState<PillState[]>([]);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [arcadeExplosions, setArcadeExplosions] = useState<ArcadeExplosion[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [examplePills, setExamplePills] = useState<PillState[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);

  // Toast queue system for smooth consecutive notifications
  const toastQueueRef = useRef<string[]>([]);
  const isProcessingToastRef = useRef(false);
  const lastToastTimeRef = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastTsRef = useRef<number>(0);

  // Initialize example pills for onboarding
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight - 100;
    
    // Create 3 example pills for onboarding demonstration
    const examples = [
      { text: "Buy fresh groceries", id: "example-1" },
      { text: "Call the dentist", id: "example-2" }, 
      { text: "Pay monthly bills", id: "example-3" }
    ];
    
    const examplePillStates: PillState[] = examples.map((example, index) => {
      const getDynamicDimensions = (text: string) => {
        const words = text.trim().split(/\s+/);
        const wordCount = words.length;
        
        if (wordCount >= 3 && wordCount <= 5) {
          const avgCharWidth = 8;
          const padding = 16;
          const minWidth = 80;
          const maxWidth = 140;
          
          const estimatedWidth = Math.max(minWidth, Math.min(maxWidth, text.length * avgCharWidth + padding));
          
          let height;
          if (wordCount <= 3) {
            height = 48;
          } else if (wordCount === 4) {
            height = 56;
          } else {
            height = 64;
          }
          
          return { width: estimatedWidth, height };
        }
        
        return { width: 120, height: 48 };
      };
      
      const { width, height } = getDynamicDimensions(example.text);
      
      // Position examples in a scattered pattern
      const positions = [
        { x: containerWidth * 0.15, y: containerHeight * 0.3 },
        { x: containerWidth * 0.6, y: containerHeight * 0.15 },
        { x: containerWidth * 0.3, y: containerHeight * 0.6 }
      ];
      
      const pos = positions[index] || { x: containerWidth * 0.5, y: containerHeight * 0.5 };
      
      return {
        id: example.id,
        text: example.text,
        completed: true,
        createdAt: new Date(),
        completedAt: new Date(),
        x: Math.max(0, Math.min(containerWidth - width, pos.x)),
        y: Math.max(0, Math.min(containerHeight - height, pos.y)),
        vx: (Math.random() - 0.5) * 1, // Very slow drift
        vy: (Math.random() - 0.5) * 1,
        width,
        height,
        isSelected: false,
        isDragging: false,
        transformationPhase: 'pill' as const,
      };
    });
    
    setExamplePills(examplePillStates);
  }, [containerRef.current]);

  // Hide onboarding when user has completed tasks
  useEffect(() => {
    if (completedTodos.length > 0) {
      setShowOnboarding(false);
    }
  }, [completedTodos.length]);

  // Handle new completed tasks - directly create floating containers
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight - 100;
    
    // Find new completed tasks that aren't in pills yet
    const existingPillIds = new Set(pills.map(p => p.id));
    const newTodos = completedTodos.filter(todo => !existingPillIds.has(todo.id));
    
    if (newTodos.length > 0) {
      // Create pills directly without transformation animation
      const newPills: PillState[] = newTodos.map((todo, index) => {
        // Calculate dynamic dimensions based on content
        const getDynamicDimensions = (text: string) => {
          const words = text.trim().split(/\s+/);
          const wordCount = words.length;
          
          // Only apply dynamic sizing for 3-5 word tasks
          if (wordCount >= 3 && wordCount <= 5) {
            const avgCharWidth = 8;
            const padding = 16;
            const minWidth = 80;
            const maxWidth = 140;
            
            const estimatedWidth = Math.max(minWidth, Math.min(maxWidth, text.length * avgCharWidth + padding));
            
            let height;
            if (wordCount <= 3) {
              height = 48;
            } else if (wordCount === 4) {
              height = 56;
            } else {
              height = 64;
            }
            
            return { width: estimatedWidth, height };
          }
          
          return { width: 120, height: 48 };
        };
        
        const { width, height } = getDynamicDimensions(todo.text);
        
        // Better initial positioning to avoid overlaps
        let x, y;
        let attempts = 0;
        const maxAttempts = 20;
        
        do {
          x = Math.random() * (containerWidth - width);
          y = Math.random() * (containerHeight - height);
          attempts++;
        } while (attempts < maxAttempts && pills.some(existingPill => {
          const dx = (x + width/2) - (existingPill.x + existingPill.width/2);
          const dy = (y + height/2) - (existingPill.y + existingPill.height/2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = Math.max(width, height, existingPill.width, existingPill.height) / 2 + 30;
          return distance < minDistance;
        }));
        
        const angle = Math.random() * Math.PI * 2;
        return {
          ...todo,
          x,
          y,
          vx: Math.cos(angle) * PILL_SPEED,
          vy: Math.sin(angle) * PILL_SPEED,
          width,
          height,
          isSelected: false,
          isDragging: false,
          transformationPhase: 'pill',
        };
      });
      
      setPills(prevPills => [...prevPills, ...newPills]);
    }
  }, [completedTodos, containerRef.current]);

  // Physics animation loop — DVD-style constant-velocity bouncing
  useEffect(() => {
    const animate = (ts: number) => {
      const dt = lastTsRef.current ? Math.min((ts - lastTsRef.current) / 16.67, 3) : 1;
      lastTsRef.current = ts;

      const container = containerRef.current;
      if (!container) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight - 100;

      setPills(prevPills => {
        if (prevPills.length === 0) return prevPills;

        // Step 1: normalize every pill to PILL_SPEED so speed never drifts
        const normalized = prevPills.map(pill => {
          if (pill.isDragging || pill.isSelected) return pill;
          const speed = Math.sqrt(pill.vx * pill.vx + pill.vy * pill.vy);
          if (speed < 0.01) {
            const angle = Math.random() * Math.PI * 2;
            return { ...pill, vx: Math.cos(angle) * PILL_SPEED, vy: Math.sin(angle) * PILL_SPEED };
          }
          return { ...pill, vx: (pill.vx / speed) * PILL_SPEED, vy: (pill.vy / speed) * PILL_SPEED };
        });

        // Step 2: move and perfect-reflect off walls (no energy loss)
        const moved = normalized.map(pill => {
          if (pill.isDragging || pill.isSelected) return pill;

          let newVx = pill.vx;
          let newVy = pill.vy;
          let newX = pill.x + newVx * dt;
          let newY = pill.y + newVy * dt;

          if (newX <= 0) { newX = 0; newVx = Math.abs(newVx); }
          else if (newX + pill.width >= containerWidth) { newX = containerWidth - pill.width; newVx = -Math.abs(newVx); }

          if (newY <= 0) { newY = 0; newVy = Math.abs(newVy); }
          else if (newY + pill.height >= containerHeight) { newY = containerHeight - pill.height; newVy = -Math.abs(newVy); }

          return { ...pill, x: newX, y: newY, vx: newVx, vy: newVy };
        });

        // Step 3: elastic pill-to-pill collisions (equal-mass velocity exchange along normal)
        const result = [...moved];
        for (let i = 0; i < result.length; i++) {
          if (result[i].isDragging || result[i].isSelected) continue;
          for (let j = i + 1; j < result.length; j++) {
            if (result[j].isDragging || result[j].isSelected) continue;

            const a = result[i];
            const b = result[j];
            const dx = (a.x + a.width / 2) - (b.x + b.width / 2);
            const dy = (a.y + a.height / 2) - (b.y + b.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = (Math.max(a.width, a.height) + Math.max(b.width, b.height)) / 2 + 4;

            if (dist < minDist && dist > 0) {
              const nx = dx / dist;
              const ny = dy / dist;
              // Relative velocity along collision normal
              const dvn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              // Only resolve if pills are approaching each other
              if (dvn < 0) {
                result[i] = { ...a, vx: a.vx - dvn * nx, vy: a.vy - dvn * ny };
                result[j] = { ...b, vx: b.vx + dvn * nx, vy: b.vy + dvn * ny };
              }
              // Separate overlapping pills
              const overlap = (minDist - dist) / 2;
              result[i] = { ...result[i], x: result[i].x + nx * overlap, y: result[i].y + ny * overlap };
              result[j] = { ...result[j], x: result[j].x - nx * overlap, y: result[j].y - ny * overlap };
            }
          }
        }

        // Step 4: re-normalize after collisions to keep speed perfectly constant
        return result.map(pill => {
          if (pill.isDragging || pill.isSelected) return pill;
          const speed = Math.sqrt(pill.vx * pill.vx + pill.vy * pill.vy);
          if (speed < 0.01) return pill;
          return { ...pill, vx: (pill.vx / speed) * PILL_SPEED, vy: (pill.vy / speed) * PILL_SPEED };
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Smart toast queue system for smooth consecutive notifications
  const queueToast = (message: string) => {
    toastQueueRef.current.push(message);
    processToastQueue();
  };

  const processToastQueue = () => {
    if (isProcessingToastRef.current || toastQueueRef.current.length === 0) {
      return;
    }

    isProcessingToastRef.current = true;
    const currentTime = Date.now();
    const timeSinceLastToast = currentTime - lastToastTimeRef.current;
    
    // Stagger toasts intelligently based on timing
    let delay = 0;
    if (timeSinceLastToast < 2000) { // If last toast was less than 2 seconds ago
      delay = Math.max(0, 800 - timeSinceLastToast); // Stagger by 800ms minimum
    }
    
    setTimeout(() => {
      const message = toastQueueRef.current.shift();
      if (message) {
        toast.success(message, {
          duration: 2800, // Slightly shorter duration for better flow
        });
        lastToastTimeRef.current = Date.now();
      }
      
      isProcessingToastRef.current = false;
      
      // Process next toast in queue if any
      if (toastQueueRef.current.length > 0) {
        setTimeout(() => processToastQueue(), 200); // Small gap between consecutive toasts
      }
    }, delay);
  };

  const handleTaskSelect = (id: string) => {
    setPills(prevPills =>
      prevPills.map(pill => ({
        ...pill,
        isSelected: pill.id === id,
        isDragging: false,
      }))
    );
  };

  const handleTaskDrag = (id: string, newX: number, newY: number) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight - 100;
    
    // Use callback to ensure immediate update without state batching delays
    setPills(prevPills => {
      const draggedPillIndex = prevPills.findIndex(p => p.id === id);
      if (draggedPillIndex === -1) return prevPills;
      
      const draggedPill = prevPills[draggedPillIndex];
      const clampedX = Math.max(0, Math.min(containerWidth - draggedPill.width, newX));
      const clampedY = Math.max(0, Math.min(containerHeight - draggedPill.height, newY));
      
      // Create updated pills array with real-time collision detection
      return prevPills.map((pill, index) => {
        if (pill.id === id) {
          // Update the dragged pill position
          return {
            ...pill,
            x: clampedX,
            y: clampedY,
            isDragging: true,
            vx: 0, // Stop any existing momentum during drag
            vy: 0,
          };
        } else if (!pill.isSelected && !pill.isDragging) {
          // Push pills out of the way during drag — positional separation only,
          // velocity direction is preserved and re-normalized by the physics loop
          const dx = (clampedX + draggedPill.width / 2) - (pill.x + pill.width / 2);
          const dy = (clampedY + draggedPill.height / 2) - (pill.y + pill.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = (Math.max(draggedPill.width, draggedPill.height) + Math.max(pill.width, pill.height)) / 2 + 4;

          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;
            return {
              ...pill,
              x: Math.max(0, Math.min(containerWidth - pill.width, pill.x - nx * overlap)),
              y: Math.max(0, Math.min(containerHeight - pill.height, pill.y - ny * overlap)),
              vx: -nx * PILL_SPEED,
              vy: -ny * PILL_SPEED,
            };
          }
        }
        
        return pill;
      });
    });
  };

  const handleTaskRelease = (id: string, releaseVelocity?: { vx: number, vy: number }) => {
    setPills(prevPills =>
      prevPills.map(pill =>
        pill.id === id
          ? {
              ...pill,
              isSelected: false,
              isDragging: false,
              // Direction from throw gesture; magnitude is normalized to PILL_SPEED on next frame
              vx: releaseVelocity?.vx ?? Math.cos(Math.random() * Math.PI * 2) * PILL_SPEED,
              vy: releaseVelocity?.vy ?? Math.sin(Math.random() * Math.PI * 2) * PILL_SPEED,
            }
          : pill
      )
    );
  };



  const handleTaskDestroy = (id: string) => {
    const task = pills.find(p => p.id === id);
    if (!task) return;
    
    // Award XP for destroying a task (100 XP per task)
    addXP(100);
    
    // Remove from main todos array immediately to prevent reappearing
    onRemovePill(id);
    
    // Create arcade explosion
    const arcadeExplosion: ArcadeExplosion = {
      id: Date.now().toString(),
      pillId: id,
      x: task.x,
      y: task.y,
      width: task.width,
      height: task.height,
    };
    
    setArcadeExplosions(prev => [...prev, arcadeExplosion]);
    
    // Remove task immediately to prevent interaction during explosion
    setPills(prev => prev.filter(p => p.id !== id));
    
    const messages = [
      'Gone. You handled it.',
      'Off the list. Feels good.',
      'Progress looks good on you.',
      'Look at you, getting things done.',
      "One down. You're on a roll.",
      'Every task counts. This one too.',
      "You're building a life, one task at a time.",
      'Look at you, figuring it out.',
      'Handled. Moving forward.',
      "Every task finished is proof you're making it.",
    ];
    
    // Queue toast with smart staggering for consecutive task destruction
    queueToast(messages[Math.floor(Math.random() * messages.length)]);
  };

  const handleArcadeExplosionComplete = (explosionId: string) => {
    // Just remove the explosion animation - todo was already removed in handleTaskDestroy
    setArcadeExplosions(prev => prev.filter(e => e.id !== explosionId));
  };

  const handleClearAll = () => {
    // Get all current pill IDs
    const allPillIds = pills.map(pill => pill.id);
    
    if (allPillIds.length === 0) return;

    // Award XP for each pill being cleared (same as individual destruction - 100 XP each)
    const xpGained = allPillIds.length * 100;
    addXP(xpGained);

    // Create arcade explosions for all pills simultaneously with slow motion effect
    const simultaneousExplosions: ArcadeExplosion[] = allPillIds.map(id => {
      const task = pills.find(p => p.id === id);
      if (!task) return null;
      
      return {
        id: `clear-all-${id}-${Date.now()}`,
        pillId: id,
        x: task.x,
        y: task.y,
        width: task.width,
        height: task.height,
        duration: 4000, // 4 seconds for dramatic slow motion effect (2x slower than normal)
      };
    }).filter(Boolean) as ArcadeExplosion[];

    // Add all explosion animations at once
    setArcadeExplosions(prev => [...prev, ...simultaneousExplosions]);

    // Remove all pills from the main todos state in a single operation
    onRemoveMultiplePills(allPillIds);

    // Clear all local pill states after a brief delay to allow animation to start
    setTimeout(() => {
      setPills([]);
    }, 100);

    // Show feedback toast
    toast.success(`Cleared ${allPillIds.length} task${allPillIds.length > 1 ? 's' : ''}! +${xpGained} XP!`, {
      duration: 3000
    });
  };





  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      
      {/* Simplified Header - Mobile Optimized */}
      <div className="relative z-10 px-4 py-3">
        <div className="pixel-notebook overflow-hidden p-3 rounded-lg">
          {/* Top Row - Adult Title Left, Theme Icons & Help Right */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <span className="font-pixel text-xs text-gray-700">
                {levelConfig.find(config => config.level === playerProgress.level)?.title || "Adult in Training"}
              </span>
            </div>
            <div className="flex flex-row gap-1 items-center">
              {/* Help Button */}
              <div className="relative">
                <Button
                  ref={helpButtonRef}
                  size="sm"
                  variant="ghost"
                  className="w-8 h-8 p-0 rounded-full"
                  onClick={() => setShowHelp(!showHelp)}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </Button>
                
                {/* Help Popup */}
                {showHelp && (
                  <>
                    {/* Backdrop for mobile */}
                    <div 
                      className="fixed inset-0 z-[99] sm:hidden" 
                      onClick={() => setShowHelp(false)}
                    />
                    
                    {/* Popup */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute z-[100] w-56 top-8 -right-1 sm:top-6 sm:-right-1"
                    >
                      <div className="bg-white rounded-lg shadow-xl border-2 border-gray-200 overflow-hidden">
                        <div className="p-3">
                          <div className="mb-2">
                            <h4 className="font-pixel text-xs text-black"> How to Play</h4>
                          </div>
                          
                          <div className="space-y-1.5 text-xs text-black leading-relaxed">
                            <p>• Complete tasks to see containers</p>
                            <p>• Drag around with physics</p>
                            <p>• Tap 3 times to pop & earn XP</p>
                            <p>• Level up for new titles!</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Arrow pointing up to help button */}
                      <div className="absolute w-3 h-3 bg-white border-l-2 border-t-2 border-gray-200 transform rotate-45 -top-1.5 right-6"></div>
                    </motion.div>
                  </>
                )}
              </div>
              
              {/* Theme Selection Icons */}
              {backgroundThemes.map((theme) => {
                const Icon = theme.icon;
                return (
                  <Button
                    key={theme.id}
                    onClick={() => onBackgroundThemeChange(theme.id)}
                    size="sm"
                    variant={backgroundTheme === theme.id ? "default" : "ghost"}
                    className="w-8 h-8 p-0 rounded-full"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Level & XP Info */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {levelConfig.find(config => config.level === playerProgress.level)?.emoji || ""}
              </span>
              <span className="font-pixel text-xs text-black">
                LVL {playerProgress.level}
              </span>
            </div>
            <span className="font-pixel text-xs text-black">
              {playerProgress.currentXP}/{getXPForNextLevel(playerProgress.level)} XP
            </span>
          </div>
          
          {/* Simplified Progress Bar */}
          <Progress
            value={Math.min(100, Math.max(0, (playerProgress.currentXP / Math.max(1, getXPForNextLevel(playerProgress.level))) * 100))}
            className="w-full h-3 bg-white border border-black/20"
          />
        </div>

      </div>

      {/* Game Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {showOnboarding ? (
          <>
            {/* Example task containers in background */}
            {examplePills.map((examplePill, index) => (
              <motion.div
                key={examplePill.id}
                className="absolute opacity-70"
                style={{
                  left: examplePill.x,
                  top: examplePill.y,
                  width: examplePill.width,
                  height: examplePill.height,
                }}
                animate={{
                  x: [0, 15 + index * 5, 0],
                  y: [0, -8 - index * 3, 0],
                }}
                transition={{
                  duration: 4 + index * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.8,
                }}
              >
                <div 
                  className="relative pixelated cursor-grab inline-block"
                  style={{ 
                    imageRendering: 'pixelated',
                    width: examplePill.width,
                    height: examplePill.height
                  }}
                >
                  {/* Rounded container */}
                  <div 
                    className="absolute inset-0"
                  >
                    {/* Main rounded body */}
                    <div 
                      className="absolute bg-white border-2 border-black"
                      style={{
                        left: '0px',
                        right: '0px',
                        top: '0px',
                        bottom: '0px',
                        borderRadius: '16px',
                      }}
                    />
                  </div>
                  
                  {/* Text content */}
                  <div className="absolute flex items-center justify-center" style={{
                    left: '6px',
                    right: '6px',
                    top: '4px',
                    bottom: '4px'
                  }}>
                    <span 
                      className="text-black pixelated select-none text-center font-pixel"
                      style={{ 
                        imageRendering: 'pixelated',
                        textShadow: 'none',
                        fontSize: '9px',
                        lineHeight: '11px',
                        wordWrap: 'break-word',
                        hyphens: 'auto',
                        maxWidth: '100%',
                        display: '-webkit-box',
                        WebkitLineClamp: examplePill.height <= 48 ? 2 : 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {examplePill.text}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Onboarding content overlay - positioned closer to status bar */}
            <div className="absolute inset-0 flex flex-col items-center text-gray-500 z-50 pointer-events-none" style={{ paddingTop: 'calc(3rem + 32px)' }}>
              <div className="pointer-events-auto">
              <motion.div 
                className="bg-gray-800 rounded-3xl p-8 flex flex-col items-center max-w-sm mx-4 border-2 border-gray-700"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <h2 className="text-xl font-medium text-white font-pixel mb-3 text-center">Your space is waiting.</h2>
                <p className="text-base text-center text-gray-300 font-pixel leading-relaxed mb-6">
                  Complete a task and watch it appear here as a bubble.
                </p>
                
                {/* Start Button */}
                <motion.button
                  onClick={() => setShowOnboarding(false)}
                  className="bg-white text-black font-pixel text-xs px-6 py-3 rounded-lg border-2 border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Start Playing
                </motion.button>
              </motion.div>
              </div>
            </div>
          </>
        ) : (pills.length === 0 && arcadeExplosions.length === 0) ? (
          <div className="absolute inset-0 flex flex-col items-center text-gray-500 z-50 pointer-events-none" style={{ paddingTop: 'calc(3rem + 32px)' }}>
            <div className="pointer-events-auto">
            <motion.div 
              className="bg-gray-800 rounded-3xl p-8 flex flex-col items-center max-w-sm mx-4 border-2 border-gray-700"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {/* Show different messages based on whether user has ever completed tasks */}
              {playerProgress.totalXP > 0 ? (
                <>
                  <h2 className="text-xl font-medium text-white font-pixel mb-3 text-center">Your space.</h2>
                  <p className="text-base text-center text-gray-300 font-pixel leading-relaxed">
                    Complete more tasks to fill it back up.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-medium text-white font-pixel mb-3 text-center">Nothing here yet.</h2>
                  <p className="text-base text-center text-gray-300 font-pixel leading-relaxed">
                    Add something and watch it land.
                  </p>
                </>
              )}
            </motion.div>
            </div>
          </div>
        ) : (
          <>

            {/* Floating containers */}
            {pills.map(pill => (
              <TaskContainer
                key={`task-${pill.id}`}
                pill={pill}
                onSelect={handleTaskSelect}
                onDrag={handleTaskDrag}
                onRelease={handleTaskRelease}
                onDestroy={handleTaskDestroy}
              />
            ))}
            
            {/* Arcade explosion effects */}
            {arcadeExplosions.map(explosion => (
              <ArcadeExplosionEffect
                key={`explosion-${explosion.id}`}
                x={explosion.x}
                y={explosion.y}
                width={explosion.width}
                height={explosion.height}
                duration={explosion.duration}
                onComplete={() => handleArcadeExplosionComplete(explosion.id)}
              />
            ))}
            
            {/* Legacy celebration effects (if needed) */}
            {celebrations.map(celebration => (
              <ParticleEffect
                key={`celebration-${celebration.id}`}
                x={celebration.x}
                y={celebration.y}
                type={celebration.type}
              />
            ))}
          </>
        )}
      </div>

      {/* Fixed Clear All Button - Bottom Center */}
      {pills.length > 8 && (
        <div className="fixed left-1/2 transform -translate-x-1/2 z-50" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}>
          <Button
            size="sm"
            variant="default"
            className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-pixel text-xs border-2 border-slate-800 shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        </div>
      )}


    </div>
  );
}