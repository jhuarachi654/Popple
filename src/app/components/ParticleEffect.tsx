import React from 'react';
import { motion } from 'motion/react';

interface ParticleEffectProps {
  x: number;
  y: number;
  type: 'explosion' | 'sparkles' | 'plant' | 'confetti' | 'rainbow' | 'stars';
}

export default function ParticleEffect({ x, y, type }: ParticleEffectProps) {
  const renderExplosion = () => {
    const particles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i * 30) * (Math.PI / 180),
      distance: 50 + Math.random() * 30,
    }));

    return (
      <>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-3 h-3 bg-orange-400 rounded-sm"
            style={{
              left: x - 6,
              top: y - 6,
            }}
            initial={{ scale: 0, x: 0, y: 0 }}
            animate={{
              scale: [0, 1, 0],
              x: Math.cos(particle.angle) * particle.distance,
              y: Math.sin(particle.angle) * particle.distance,
            }}
            transition={{
              duration: 1,
              ease: "easeOut",
            }}
          />
        ))}
        
        {/* Central flash */}
        <motion.div
          className="absolute w-8 h-8 bg-yellow-300 rounded-full"
          style={{
            left: x - 16,
            top: y - 16,
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </>
    );
  };

  const renderConfetti = () => {
    const confetti = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 80,
      rotation: Math.random() * 360,
      color: ['bg-red-400', 'bg-blue-400', 'bg-yellow-400', 'bg-green-400', 'bg-pink-400'][Math.floor(Math.random() * 5)],
      delay: Math.random() * 0.3,
    }));

    return (
      <>
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            className={`absolute w-2 h-4 ${piece.color} rounded-sm`}
            style={{
              left: x + piece.x,
              top: y + piece.y,
            }}
            initial={{ scale: 0, rotate: 0, y: 0 }}
            animate={{
              scale: [0, 1, 1, 0],
              rotate: piece.rotation,
              y: [0, -40, 60],
            }}
            transition={{
              duration: 2,
              delay: piece.delay,
              ease: "easeOut",
            }}
          />
        ))}
      </>
    );
  };

  const renderRainbow = () => {
    // Only rainbow emojis in different sizes and positions
    const rainbowEmojis = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
      size: Math.random() * 1.5 + 1, // 1x to 2.5x size
      delay: Math.random() * 0.6,
      rotation: Math.random() * 720 + 360, // 1-2 full rotations
    }));

    return (
      <>
        {rainbowEmojis.map((emoji) => (
          <motion.div
            key={emoji.id}
            className="absolute"
            style={{
              left: x + emoji.x,
              top: y + emoji.y,
              fontSize: `${emoji.size}em`,
            }}
            initial={{ scale: 0, rotate: 0 }}
            animate={{
              scale: [0, 1.2, 1, 0],
              rotate: emoji.rotation,
            }}
            transition={{
              duration: 2,
              delay: emoji.delay,
              ease: "easeOut",
            }}
          >
            🌈
          </motion.div>
        ))}
        
        {/* Central large rainbow */}
        <motion.div
          className="absolute text-4xl"
          style={{
            left: x - 20,
            top: y - 20,
          }}
          initial={{ scale: 0, rotate: 0 }}
          animate={{
            scale: [0, 1.5, 1.2, 0],
            rotate: 720,
          }}
          transition={{ duration: 2.5, ease: "easeOut" }}
        >
          🌈
        </motion.div>
      </>
    );
  };

  const renderStars = () => {
    const stars = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 100,
      y: (Math.random() - 0.5) * 100,
      size: Math.random() * 8 + 4,
      delay: Math.random() * 0.5,
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
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.8,
              delay: star.delay,
              ease: "easeOut",
            }}
          />
        ))}
        
        {/* Central stardust explosion */}
        <motion.div
          className="absolute text-3xl"
          style={{
            left: x - 15,
            top: y - 15,
          }}
          initial={{ scale: 0, rotate: 0 }}
          animate={{
            scale: [0, 1.2, 1, 0],
            rotate: 360,
          }}
          transition={{ duration: 2, ease: "easeOut" }}
        >
          ⭐
        </motion.div>
      </>
    );
  };

  const renderSparkles = () => {
    const sparkles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 60,
      delay: Math.random() * 0.5,
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
              duration: 1.5,
              delay: sparkle.delay,
              ease: "easeOut",
            }}
          >
            <div className="w-2 h-2 bg-pink-400 transform rotate-45" />
            <div className="w-2 h-2 bg-cyan-400 transform -rotate-45 absolute inset-0" />
          </motion.div>
        ))}
        
        {/* Central star */}
        <motion.div
          className="absolute text-2xl"
          style={{
            left: x - 12,
            top: y - 12,
          }}
          initial={{ scale: 0, rotate: 0 }}
          animate={{ 
            scale: [0, 1.5, 1, 0], 
            rotate: 180,
          }}
          transition={{ duration: 1.5, ease: "easeOut" }}
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
          className="absolute text-3xl"
          style={{
            left: x - 15,
            top: y - 15,
          }}
          initial={{ scale: 0, y: 20 }}
          animate={{
            scale: [0, 0.5, 1.2, 1],
            y: [20, 0, -10, 0],
          }}
          transition={{
            duration: 2,
            ease: "easeOut",
            times: [0, 0.3, 0.7, 1],
          }}
        >
          🌱
        </motion.div>

        {/* Growing leaves */}
        <motion.div
          className="absolute text-xl"
          style={{
            left: x - 25,
            top: y - 5,
          }}
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: [0, 1], rotate: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          🍃
        </motion.div>
        
        <motion.div
          className="absolute text-xl"
          style={{
            left: x + 5,
            top: y - 8,
          }}
          initial={{ scale: 0, rotate: 45 }}
          animate={{ scale: [0, 1], rotate: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
        >
          🍃
        </motion.div>

        {/* Floating particles */}
        {Array.from({ length: 6 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-green-400 rounded-full"
            style={{
              left: x + (Math.random() - 0.5) * 40,
              top: y + (Math.random() - 0.5) * 40,
            }}
            initial={{ scale: 0, y: 0 }}
            animate={{
              scale: [0, 1, 0],
              y: -30 - Math.random() * 20,
            }}
            transition={{
              duration: 1.5,
              delay: 1 + Math.random() * 0.5,
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