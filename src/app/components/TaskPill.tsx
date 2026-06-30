import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

interface TaskState {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  isDragging: boolean;
}

interface TaskContainerProps {
  pill: TaskState; // Keep pill prop name for compatibility but it represents a task
  onSelect: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onRelease: (id: string, releaseVelocity?: { vx: number, vy: number }) => void;
  onDestroy: (id: string) => void;
}

export default function TaskContainer({ pill, onSelect, onDrag, onRelease, onDestroy }: TaskContainerProps) {
  const [progress, setProgress] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  
  // Drag tracking
  const [dragStart, setDragStart] = useState<{ x: number; y: number; pillX: number; pillY: number } | null>(null);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number; time: number } | null>(null);
  
  const tapTimeoutRef = useRef<NodeJS.Timeout>();
  const progressTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeout(tapTimeoutRef.current);
      clearTimeout(progressTimeoutRef.current);
    };
  }, []);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Dynamic sizing based on content for 3-5 word tasks
  const getTaskDimensions = (text: string) => {
    const words = text.trim().split(/\s+/);
    const wordCount = words.length;
    
    // Only apply dynamic sizing for 3-5 word tasks
    if (wordCount >= 3 && wordCount <= 5) {
      // Calculate approximate width needed based on text length
      const avgCharWidth = 8; // Average character width in pixels for our font
      const padding = 32; // Horizontal padding (12px each side + buffer)
      const minWidth = 80;
      const maxWidth = 140;
      
      const estimatedWidth = Math.max(minWidth, Math.min(maxWidth, text.length * avgCharWidth + padding));
      
      // Height based on word count - more compact for fewer words
      let height;
      if (wordCount <= 3) {
        height = 48; // Compact height for short tasks
      } else if (wordCount === 4) {
        height = 56; // Medium height
      } else {
        height = 64; // Taller for 5-word tasks
      }
      
      return { width: estimatedWidth, height };
    }
    
    // Fallback for tasks outside 3-5 word range
    return { width: 120, height: 48 };
  };

  const { width: taskWidth, height: taskHeight } = getTaskDimensions(pill.text);
  
  // Don't truncate for dynamic sizing - let text wrap naturally
  const displayText = pill.text;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Capture pointer for smooth mobile dragging
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    
    // SINGLE SELECTION: Select this pill (deselects others)
    onSelect(pill.id);
    
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    // Track drag start position
    setDragStart({
      x: clientX,
      y: clientY,
      pillX: pill.x,
      pillY: pill.y,
    });
    
    setLastMousePos({ x: clientX, y: clientY, time: Date.now() });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart || !pill.isSelected) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Immediate drag response - no threshold for ultra-smooth dragging
    if (distance > 0.5) {
      // ULTRA-SMOOTH DRAG: Update pill position immediately
      const newX = dragStart.pillX + deltaX;
      const newY = dragStart.pillY + deltaY;
      onDrag(pill.id, newX, newY);
      
      // High-frequency velocity tracking for smooth release physics
      setLastMousePos({ x: clientX, y: clientY, time: Date.now() });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pill.isSelected) return;
    
    // Release pointer capture
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    
    const wasDragging = pill.isDragging;
    
    if (wasDragging && dragStart && lastMousePos) {
      // Calculate release velocity for smooth physics transition
      const timeDiff = Date.now() - lastMousePos.time;
      if (timeDiff > 0 && timeDiff < 100) {
        const velocityX = (e.clientX - lastMousePos.x) / timeDiff * 16; // Convert to pixels per frame
        const velocityY = (e.clientY - lastMousePos.y) / timeDiff * 16;
        onRelease(pill.id, { vx: velocityX, vy: velocityY });
      } else {
        onRelease(pill.id);
      }
    } else if (!wasDragging && dragStart) {
      // This was a quick tap - consecutive progress accumulation
      const newTapCount = tapCount + 1;
      setTapCount(newTapCount);
      
      // Calculate progress (need 3 taps to complete)
      const tapsNeeded = 3;
      const newProgress = Math.min(100, (newTapCount / tapsNeeded) * 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        onDestroy(pill.id);
      } else {
        // Clear any existing timeout
        clearTimeout(progressTimeoutRef.current);
        
        // Hide progress bar after 2 seconds if no further interaction
        // This preserves the tap count for consecutive tapping
        progressTimeoutRef.current = setTimeout(() => {
          setProgress(0);
          // Don't reset tap count - keep it for consecutive tapping within reasonable time
        }, 2000);
        
        // Only reset tap count after longer period of inactivity (4 seconds)
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = setTimeout(() => {
          setTapCount(0);
          setProgress(0);
        }, 4000);
      }
    } else if (!wasDragging) {
      // Just a selection without interaction - return to normal movement
      setTimeout(() => onRelease(pill.id), 100);
    }
    
    // Reset drag tracking
    setDragStart(null);
    setLastMousePos(null);
  };

  return (
    <motion.div
      className="absolute cursor-pointer select-none touch-none"
      style={{
        left: pill.x,
        top: pill.y,
        width: taskWidth,
        height: taskHeight,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      animate={{
        scale: 
          pill.isDragging ? 1.08 : 
          pill.isSelected ? 1.03 : 
          progress > 0 ? (1 + (progress * 0.002)) : // Subtle inflation during tapping
          1,
        rotate: pill.isDragging ? 0 : 0, // Remove rotation during drag for smoother experience
      }}
      transition={{ 
        duration: pill.isDragging ? 0 : 0.08, // Immediate response during drag, very fast transitions
        type: pill.isDragging ? "tween" : "spring",
        ease: pill.isDragging ? "linear" : "easeOut",
        damping: pill.isDragging ? 0 : 30,
        stiffness: pill.isDragging ? 0 : 400
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp} // Handle mouse leaving element
    >
      {/* 8-bit Pixelated Task Pill */}
      <div 
        className="relative pixelated cursor-grab active:cursor-grabbing inline-block"
        style={{ 
          imageRendering: 'pixelated',
          width: taskWidth,
          height: taskHeight
        }}
      >
        {/* Pixelated container with clean 8-bit design */}
        <div 
          className="absolute inset-0 pixelated"
          style={{ imageRendering: 'pixelated' }}
        >
          {/* Main pixelated body */}
          <div 
            className="absolute bg-white border-2 border-black"
            style={{
              left: '0px',
              right: '0px', 
              top: '0px',
              bottom: '0px',
              borderRadius: '16px',
              imageRendering: 'pixelated'
            }}
          />
          
          {/* Clean rounded corners for 8-bit aesthetic */}
          {/* ... remove this code ... */}
          
          {/* Corner pixels for authentic 8-bit look */}
          {/* ... remove this code ... */}

        </div>
        
        {/* Text content - minimal padding, content-fitted */}
        <div className="absolute flex items-center justify-center" style={{
          left: '12px',
          right: '12px',
          top: '8px',
          bottom: '8px'
        }}>
          {/* Task text - compact, dynamic sizing */}
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
              WebkitLineClamp: taskHeight <= 48 ? 2 : 3, // Fewer lines for compact containers
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {displayText}
          </span>
        </div>
        
        {/* Interaction state overlays with pixelated borders */}
        {pill.isDragging && (
          <div className="absolute inset-1 bg-blue-200/40 pixelated" style={{ imageRendering: 'pixelated' }} />
        )}
        
        {pill.isSelected && !pill.isDragging && (
          <div className="absolute inset-1 bg-green-200/30 pixelated" style={{ imageRendering: 'pixelated' }} />
        )}
        
        {progress > 0 && (
          <div className="absolute inset-1 bg-yellow-200/30 pixelated" style={{ imageRendering: 'pixelated' }} />
        )}
      </div>

      {/* Progress Bar - Show during tap interactions */}
      {progress > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute -top-8 left-0 right-0 px-2"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-lg">
            <div className="h-2 w-full bg-white/50 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gray-600 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}