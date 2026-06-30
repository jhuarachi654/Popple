import React from 'react';
import { motion } from 'motion/react';

interface PreviewParticleEffectProps {
  x: number;
  y: number;
  type: 'explosion' | 'sparkles' | 'plant' | 'confetti' | 'rainbow' | 'stars';
}

export default function PreviewParticleEffect({ x, y, type }: PreviewParticleEffectProps) {
  const renderExplosion = () => {
    const particles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: (i * 45) * (Math.PI / 180),
      distance: 15 + Math.random() * 10,
    }));

    return (
      <>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1.5 h-1.5 bg-orange-400 rounded-sm"
            style={{
              left: x - 3,
              top: y - 3,
            }}
            initial={{ scale: 0, x: 0, y: 0 }}
            animate={{
              scale: [0, 1, 0],
              x: Math.cos(particle.angle) * particle.distance,
              y: Math.sin(particle.angle) * particle.distance,
            }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
            }}
          />
        ))}
        
        {/* Central flash */}
        <motion.div
          className="absolute w-4 h-4 bg-yellow-300 rounded-full"
          style={{
            left: x - 8,
            top: y - 8,
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </>
    );
  };

  const renderConfetti = () => {
    const confetti = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 30,
      y: (Math.random() - 0.5) * 30,
      rotation: Math.random() * 360,
      color: ['bg-red-400', 'bg-blue-400', 'bg-yellow-400', 'bg-green-400', 'bg-pink-400'][Math.floor(Math.random() * 5)],
      delay: Math.random() * 0.2,
    }));

    return (
      <>
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            className={`absolute w-1 h-2 ${piece.color} rounded-sm`}
            style={{
              left: x + piece.x,
              top: y + piece.y,
            }}
            initial={{ scale: 0, rotate: 0, y: 0 }}
            animate={{
              scale: [0, 1, 1, 0],
              rotate: piece.rotation,
              y: [0, -15, 20],
            }}
            transition={{
              duration: 1.5,
              delay: piece.delay,
              ease: "easeOut",
            }}
          />
        ))}
      </>
    );
  };

  const renderRainbow = () => {
    // Only rainbow emojis for preview - scaled for small area
    const rainbowEmojis = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 40,
      y: (Math.random() - 0.5) * 40,
      delay: Math.random() * 0.4,
      rotation: Math.random() * 360 + 180,
    }));

    return (
      <>
        {rainbowEmojis.map((emoji) => (
          <motion.div
            key={emoji.id}
            className="absolute text-sm"
            style={{
              left: x + emoji.x,
              top: y + emoji.y,
            }}
            initial={{ scale: 0, rotate: 0 }}
            animate={{
              scale: [0, 1.2, 1, 0],
              rotate: emoji.rotation,
            }}
            transition={{
              duration: 1.5,
              delay: emoji.delay,
              ease: "easeOut",
            }}
          >
            🌈
          </motion.div>
        ))}
        
        {/* Central rainbow */}
        <motion.div
          className="absolute text-lg"
          style={{
            left: x - 8,
            top: y - 8,
          }}
          initial={{ scale: 0, rotate: 0 }}
          animate={{
            scale: [0, 1.3, 1.1, 0],
            rotate: 360,
          }}
          transition={{ duration: 1.8, ease: "easeOut" }}
        >
          🌈
        </motion.div>
      </>
    );
  };

  const renderStars = () => {
    const stars = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 40,
      y: (Math.random() - 0.5) * 40,
      size: Math.random() * 3 + 2,
      delay: Math.random() * 0.3,
    }));

    return (
      <>
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 rounded-full"
            style={{
              left: x + star.x,
              top: y + star.y,
              width: star.size,
              height: star.size,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 1.2, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.2,
              delay: star.delay,
              ease: "easeOut",
            }}
          />
        ))}
        
        {/* Central star */}
        <motion.div
          className="absolute text-lg"
          style={{
            left: x - 8,
            top: y - 8,
          }}
          initial={{ scale: 0, rotate: 0 }}
          animate={{
            scale: [0, 1.2, 1, 0],
            rotate: 360,
          }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          ⭐
        </motion.div>
      </>
    );
  };

  const renderSparkles = () => {
    const sparkles = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 30,
      y: (Math.random() - 0.5) * 30,
      delay: Math.random() * 0.3,
    }));

    return (
      <>
        {sparkles.map((sparkle) => (
          <motion.div
            key={sparkle.id}
            className="absolute"
            style={{
              left: x + sparkle.x,
              top: y + sparkle.y,
            }}
            initial={{ scale: 0, rotate: 0 }}
            animate={{
              scale: [0, 1, 0],
              rotate: 360,
            }}
            transition={{
              duration: 1.2,
              delay: sparkle.delay,
              ease: "easeOut",
            }}
          >
            <div className="w-1.5 h-1.5 bg-pink-400 transform rotate-45" />
            <div className="w-1.5 h-1.5 bg-cyan-400 transform -rotate-45 absolute inset-0" />
          </motion.div>
        ))}
        
        {/* Central sparkle */}
        <motion.div
          className="absolute text-lg"
          style={{
            left: x - 8,
            top: y - 8,
          }}
          initial={{ scale: 0, rotate: 0 }}
          animate={{ 
            scale: [0, 1.2, 1, 0], 
            rotate: 180,
          }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          ✨
        </motion.div>
      </>
    );
  };

  const renderPlant = () => {
    return (
      <>
        {/* Growing plant animation */}
        <motion.div
          className="absolute text-lg"
          style={{
            left: x - 8,
            top: y - 8,
          }}
          initial={{ scale: 0, y: 10 }}
          animate={{
            scale: [0, 0.5, 1.2, 1],
            y: [10, 0, -5, 0],
          }}
          transition={{
            duration: 1.5,
            ease: "easeOut",
            times: [0, 0.3, 0.7, 1],
          }}
        >
          🌱
        </motion.div>

        {/* Growing leaves */}
        <motion.div
          className="absolute text-sm"
          style={{
            left: x - 12,
            top: y - 2,
          }}
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: [0, 1], rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          🍃
        </motion.div>
        
        <motion.div
          className="absolute text-sm"
          style={{
            left: x + 2,
            top: y - 4,
          }}
          initial={{ scale: 0, rotate: 45 }}
          animate={{ scale: [0, 1], rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          🍃
        </motion.div>

        {/* Mini floating particles */}
        {Array.from({ length: 4 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 bg-green-400 rounded-full"
            style={{
              left: x + (Math.random() - 0.5) * 20,
              top: y + (Math.random() - 0.5) * 20,
            }}
            initial={{ scale: 0, y: 0 }}
            animate={{
              scale: [0, 1, 0],
              y: -15 - Math.random() * 10,
            }}
            transition={{
              duration: 1.2,
              delay: 0.8 + Math.random() * 0.3,
              ease: "easeOut",
            }}
          />
        ))}
      </>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {type === 'explosion' && renderExplosion()}
      {type === 'sparkles' && renderSparkles()}
      {type === 'plant' && renderPlant()}
      {type === 'confetti' && renderConfetti()}
      {type === 'rainbow' && renderRainbow()}
      {type === 'stars' && renderStars()}
    </div>
  );
}