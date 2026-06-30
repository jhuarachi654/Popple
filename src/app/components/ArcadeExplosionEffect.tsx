import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface ArcadeExplosionProps {
  x: number;
  y: number;
  width: number;
  height: number;
  onComplete: () => void;
  duration?: number; // Duration in milliseconds, defaults to 2000ms
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

export default function ArcadeExplosionEffect({ x, y, width, height, onComplete, duration = 2000 }: ArcadeExplosionProps) {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  // Generate pixels from container (white fill and black border)
  const generatePixels = (): Pixel[] => {
    const pixelSize = 2; // Small 8-bit style pixels
    const newPixels: Pixel[] = [];
    
    // Container colors - white fill and black border
    const fillColor = '#ffffff';
    const borderColor = '#000000';
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Generate border pixels (black outline)
    const borderPixelCount = 12 + Math.random() * 8; // 12-20 border pixels
    for (let i = 0; i < borderPixelCount; i++) {
      // Position pixels around the perimeter
      const angle = (i / borderPixelCount) * Math.PI * 2;
      const perimeterX = centerX + Math.cos(angle) * (width / 2 - 2);
      const perimeterY = centerY + Math.sin(angle) * (height / 2 - 2);
      
      // Explosion physics - radial outward with some randomness
      const explosionAngle = angle + (Math.random() - 0.5) * 0.6;
      const speed = 4 + Math.random() * 6; // Higher initial speed
      
      newPixels.push({
        id: `border-${i}`,
        x: perimeterX,
        y: perimeterY,
        vx: Math.cos(explosionAngle) * speed,
        vy: Math.sin(explosionAngle) * speed - 2, // Upward bias for celebration
        size: pixelSize + (Math.random() > 0.7 ? 1 : 0), // Some slightly larger pixels
        color: borderColor,
        opacity: 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20,
      });
    }
    
    // Generate fill pixels (white interior)
    const fillPixelCount = 8 + Math.random() * 8; // 8-16 fill pixels
    for (let i = 0; i < fillPixelCount; i++) {
      // Random position within the container bounds
      const pixelX = centerX + (Math.random() - 0.5) * (width - 8);
      const pixelY = centerY + (Math.random() - 0.5) * (height - 8);
      
      // Explosion direction from center with randomness
      const dx = pixelX - centerX;
      const dy = pixelY - centerY;
      const baseAngle = Math.atan2(dy, dx);
      const explosionAngle = baseAngle + (Math.random() - 0.5) * 1.0;
      const speed = 3 + Math.random() * 5;
      
      newPixels.push({
        id: `fill-${i}`,
        x: pixelX,
        y: pixelY,
        vx: Math.cos(explosionAngle) * speed,
        vy: Math.sin(explosionAngle) * speed - 1.5, // Upward bias
        size: pixelSize,
        color: fillColor,
        opacity: 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
      });
    }
    
    return newPixels;
  };

  // Initialize explosion
  useEffect(() => {
    startTimeRef.current = Date.now();
    setPixels(generatePixels());
    
    // Start physics animation
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - (startTimeRef.current || currentTime);
      
      // Animation duration is configurable
      if (elapsed >= duration) {
        onComplete();
        return;
      }
      
      setPixels(prevPixels => {
        return prevPixels.map(pixel => {
          // Physics constants - adjusted for duration
          const timeScale = duration / 2000; // Scale physics based on duration
          const gravity = 0.25 / timeScale; // Slower gravity for longer durations
          const airResistance = Math.pow(0.99, 1 / timeScale); // Adjusted air resistance
          
          // Update physics
          const newVx = pixel.vx * airResistance;
          const newVy = pixel.vy * airResistance + gravity;
          
          // Update position
          const newX = pixel.x + newVx / timeScale; // Slower movement for longer durations
          const newY = pixel.y + newVy / timeScale;
          
          // Fade out over time (start fading after 25% of duration)
          const fadeStartTime = duration * 0.25;
          let opacity = pixel.opacity;
          if (elapsed > fadeStartTime) {
            const fadeProgress = (elapsed - fadeStartTime) / (duration - fadeStartTime);
            opacity = Math.max(0, 1 - fadeProgress);
          }
          
          return {
            ...pixel,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
            opacity,
            rotation: pixel.rotation + pixel.rotationSpeed / timeScale, // Slower rotation for longer durations
          };
        }).filter(pixel => pixel.opacity > 0.01); // Remove nearly invisible pixels
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        width,
        height,
      }}
    >
      {/* Pixel particles */}
      {pixels.map(pixel => (
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
    </div>
  );
}