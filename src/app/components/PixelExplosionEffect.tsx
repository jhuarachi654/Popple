import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PixelExplosionProps {
  x: number;
  y: number;
  width: number;
  height: number;
  colors: {
    background: string;
    border: string;
    pixelColors?: string[]; // Array of hex colors for pixels
  };
  onComplete: () => void;
}

interface Pixel {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

interface Sparkle {
  id: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  rotation: number;
}

export default function PixelExplosionEffect({ x, y, width, height, colors, onComplete }: PixelExplosionProps) {
  const [phase, setPhase] = useState<'inflate' | 'explode' | 'complete'>('inflate');
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [containerScale, setContainerScale] = useState(1);
  const [screenShake, setScreenShake] = useState(0);
  
  const animationRef = useRef<number>();
  const phaseTimeoutRef = useRef<NodeJS.Timeout>();

  // Use provided pixel colors or extract from background
  const getPillColors = (): string[] => {
    if (colors.pixelColors && colors.pixelColors.length > 0) {
      return colors.pixelColors;
    }
    
    // Fallback to extracting from background class
    const background = colors.background;
    const defaultColors = ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981'];
    
    // Try to extract colors from Tailwind gradient classes
    if (background.includes('purple')) return ['#8b5cf6', '#7c3aed', '#6d28d9'];
    if (background.includes('blue')) return ['#3b82f6', '#2563eb', '#1d4ed8'];
    if (background.includes('green')) return ['#10b981', '#059669', '#047857'];
    if (background.includes('pink')) return ['#ec4899', '#db2777', '#be185d'];
    if (background.includes('yellow')) return ['#eab308', '#ca8a04', '#a16207'];
    if (background.includes('red')) return ['#ef4444', '#dc2626', '#b91c1c'];
    if (background.includes('indigo')) return ['#6366f1', '#4f46e5', '#4338ca'];
    if (background.includes('cyan')) return ['#06b6d4', '#0891b2', '#0e7490'];
    if (background.includes('emerald')) return ['#10b981', '#059669', '#047857'];
    if (background.includes('teal')) return ['#14b8a6', '#0d9488', '#0f766e'];
    
    return defaultColors;
  };

  // Generate pixels from container outline and fill
  const generatePixels = (): Pixel[] => {
    const pixelSize = 4; // 8-bit style pixels
    const pixelColors = getPillColors();
    const borderColor = '#ffffff'; // White border pixels
    const newPixels: Pixel[] = [];
    
    // Calculate rounded rectangle path for pills
    const radius = height / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Generate border pixels (outline) - more systematic approach
    const borderPoints: { x: number; y: number }[] = [];
    
    // Pixelated rounded rectangle - sample the perimeter
    const perimeterPoints = [];
    
    // Top edge
    for (let x = radius; x < width - radius; x += pixelSize) {
      perimeterPoints.push({ x, y: 0 });
    }
    
    // Right edge curves and straight
    for (let y = 0; y < height; y += pixelSize / 2) {
      let x;
      if (y < radius) {
        // Top-right corner
        x = width - radius + Math.sqrt(Math.max(0, radius * radius - (radius - y) * (radius - y)));
      } else if (y > height - radius) {
        // Bottom-right corner
        x = width - radius + Math.sqrt(Math.max(0, radius * radius - (y - (height - radius)) * (y - (height - radius))));
      } else {
        // Right straight edge
        x = width - pixelSize;
      }
      if (x >= 0 && x < width) {
        perimeterPoints.push({ x, y });
      }
    }
    
    // Bottom edge
    for (let x = width - radius; x >= radius; x -= pixelSize) {
      perimeterPoints.push({ x, y: height - pixelSize });
    }
    
    // Left edge curves and straight
    for (let y = height; y >= 0; y -= pixelSize / 2) {
      let x;
      if (y > height - radius) {
        // Bottom-left corner
        x = radius - Math.sqrt(Math.max(0, radius * radius - (y - (height - radius)) * (y - (height - radius))));
      } else if (y < radius) {
        // Top-left corner
        x = radius - Math.sqrt(Math.max(0, radius * radius - (radius - y) * (radius - y)));
      } else {
        // Left straight edge
        x = 0;
      }
      if (x >= 0 && x < width) {
        perimeterPoints.push({ x, y });
      }
    }
    
    borderPoints.push(...perimeterPoints);
    
    // Create border pixels with explosion physics
    borderPoints.forEach((point, index) => {
      // Calculate angle from center for radial explosion
      const dx = point.x + pixelSize/2 - centerX;
      const dy = point.y + pixelSize/2 - centerY;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
      const baseAngle = Math.atan2(dy, dx);
      
      // Add some randomness to the explosion angle
      const angle = baseAngle + (Math.random() - 0.5) * 0.8;
      const speed = 3 + Math.random() * 5; // More energetic explosion
      
      newPixels.push({
        id: `border-${index}`,
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // Stronger upward bias for celebration feel
        size: pixelSize,
        color: borderColor,
        opacity: 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
      });
    });
    
    // Generate fill pixels (interior)
    const fillPixelCount = 8 + Math.random() * 8; // 8-16 pixels as specified
    for (let i = 0; i < fillPixelCount; i++) {
      // Generate pixels within the rounded rectangle bounds
      let pixelX, pixelY;
      let attempts = 0;
      
      do {
        pixelX = Math.random() * (width - pixelSize);
        pixelY = Math.random() * (height - pixelSize);
        attempts++;
      } while (attempts < 20 && !isInsideRoundedRect(pixelX + pixelSize/2, pixelY + pixelSize/2, width, height, radius));
      
      // Calculate explosion direction from center
      const dx = pixelX + pixelSize/2 - centerX;
      const dy = pixelY + pixelSize/2 - centerY;
      const baseAngle = Math.atan2(dy, dx);
      const angle = baseAngle + (Math.random() - 0.5) * 1.2; // More spread
      const speed = 2 + Math.random() * 4;
      const color = pixelColors[Math.floor(Math.random() * pixelColors.length)];
      
      newPixels.push({
        id: `fill-${i}`,
        x: pixelX,
        y: pixelY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // Upward bias for celebration
        size: pixelSize,
        color,
        opacity: 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
      });
    }
    
    return newPixels;
  };

  // Check if point is inside rounded rectangle
  const isInsideRoundedRect = (px: number, py: number, w: number, h: number, r: number): boolean => {
    const centerX = w / 2;
    const centerY = h / 2;
    
    // Check if in main rectangular area
    if (px >= r && px <= w - r && py >= 0 && py <= h) return true;
    if (px >= 0 && px <= w && py >= r && py <= h - r) return true;
    
    // Check rounded corners
    const corners = [
      { cx: r, cy: r }, // Top-left
      { cx: w - r, cy: r }, // Top-right
      { cx: r, cy: h - r }, // Bottom-left
      { cx: w - r, cy: h - r }, // Bottom-right
    ];
    
    for (const corner of corners) {
      const dx = px - corner.cx;
      const dy = py - corner.cy;
      if (dx * dx + dy * dy <= r * r) return true;
    }
    
    return false;
  };

  // Generate sparkle particles
  const generateSparkles = (): Sparkle[] => {
    const sparkleCount = 6 + Math.random() * 6;
    const newSparkles: Sparkle[] = [];
    
    for (let i = 0; i < sparkleCount; i++) {
      newSparkles.push({
        id: `sparkle-${i}`,
        x: Math.random() * width,
        y: Math.random() * height,
        scale: 0.5 + Math.random() * 1,
        opacity: 0.8 + Math.random() * 0.2,
        rotation: Math.random() * 360,
      });
    }
    
    return newSparkles;
  };

  // Initialize animation phases
  useEffect(() => {
    // Phase 1: Inflate container (0.1 seconds)
    setContainerScale(1.2);
    
    phaseTimeoutRef.current = setTimeout(() => {
      // Phase 2: Explode
      setPhase('explode');
      setPixels(generatePixels());
      setSparkles(generateSparkles());
      
      // Optional screen shake effect
      setScreenShake(3);
      setTimeout(() => setScreenShake(1), 50);
      setTimeout(() => setScreenShake(0), 150);
      
      // Start physics animation
      startPhysicsAnimation();
      
      // Complete after 2 seconds total
      setTimeout(() => {
        setPhase('complete');
        onComplete();
      }, 1900);
    }, 100);

    return () => {
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Physics animation loop
  const startPhysicsAnimation = () => {
    const gravity = 0.15;
    const drag = 0.98;
    
    const animate = () => {
      setPixels(prevPixels => {
        return prevPixels.map(pixel => ({
          ...pixel,
          x: pixel.x + pixel.vx,
          y: pixel.y + pixel.vy,
          vx: pixel.vx * drag,
          vy: pixel.vy * drag + gravity, // Apply gravity
          opacity: Math.max(0, pixel.opacity - 0.008), // Fade out over ~1.5 seconds
          rotation: pixel.rotation + pixel.rotationSpeed,
        })).filter(pixel => pixel.opacity > 0.05); // Remove nearly invisible pixels
      });
      
      setSparkles(prevSparkles => {
        return prevSparkles.map(sparkle => ({
          ...sparkle,
          opacity: Math.max(0, sparkle.opacity - 0.01),
          scale: sparkle.scale * 0.995,
          rotation: sparkle.rotation + 2,
        })).filter(sparkle => sparkle.opacity > 0.1);
      });
      
      if (phase === 'explode') {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <div 
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width,
        height,
        transform: `translate(${(Math.random() - 0.5) * screenShake}px, ${(Math.random() - 0.5) * screenShake}px)`,
      }}
    >
      <AnimatePresence>
        {/* Inflating container */}
        {phase === 'inflate' && (
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{
              background: colors.background,
              border: `2px solid ${colors.border}`,
              borderRadius: `${height / 2}px`,
            }}
            initial={{ scale: 1 }}
            animate={{ scale: containerScale }}
            transition={{ duration: 0.1, ease: "easeOut" }}
          />
        )}
        
        {/* Pixel particles */}
        {phase === 'explode' && pixels.map(pixel => (
          <motion.div
            key={pixel.id}
            className="absolute pixelated"
            style={{
              left: pixel.x,
              top: pixel.y,
              width: pixel.size,
              height: pixel.size,
              backgroundColor: pixel.color,
              opacity: pixel.opacity,
              transform: `rotate(${pixel.rotation}deg)`,
              imageRendering: 'pixelated',
            }}
          />
        ))}
        
        {/* Sparkle particles */}
        {phase === 'explode' && sparkles.map(sparkle => (
          <motion.div
            key={sparkle.id}
            className="absolute pointer-events-none"
            style={{
              left: sparkle.x,
              top: sparkle.y,
              opacity: sparkle.opacity,
              transform: `scale(${sparkle.scale}) rotate(${sparkle.rotation}deg)`,
            }}
          >
            {/* Star sparkle shape */}
            <svg width="8" height="8" viewBox="0 0 8 8" className="pixelated">
              <path
                d="M4 0L5 3L8 4L5 5L4 8L3 5L0 4L3 3Z"
                fill="white"
                className="drop-shadow-sm"
              />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}