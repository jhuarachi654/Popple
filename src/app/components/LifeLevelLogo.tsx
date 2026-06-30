import React from 'react';
import { motion } from 'motion/react';
import { Plus, Star } from 'lucide-react';

interface LifeLevelLogoProps {
  size?: 'small' | 'large';
  className?: string;
  showTagline?: boolean;
}

export default function LifeLevelLogo({ size = 'large', className = '', showTagline = true }: LifeLevelLogoProps) {
  const isLarge = size === 'large';
  
  // Animation variants for sparkles/plus signs
  const sparkleVariants = {
    animate: {
      scale: [1, 1.2, 1],
      rotate: [0, 180, 360],
      opacity: [0.6, 1, 0.6],
    }
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Animated decorative elements */}
      
      {/* Top-left sparkle */}
      <motion.div
        className={`absolute ${isLarge ? '-top-3 -left-4' : '-top-2 -left-3'}`}
        variants={sparkleVariants}
        animate="animate"
        transition={{ duration: 3, repeat: Infinity, delay: 0 }}
      >
        <Star className={`${isLarge ? 'w-4 h-4' : 'w-3 h-3'} text-white drop-shadow-lg pixelated`} fill="white" />
      </motion.div>

      {/* Top-right plus */}
      <motion.div
        className={`absolute ${isLarge ? '-top-2 -right-4' : '-top-1 -right-3'}`}
        variants={sparkleVariants}
        animate="animate"
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      >
        <Plus className={`${isLarge ? 'w-5 h-5' : 'w-4 h-4'} text-white drop-shadow-lg pixelated`} strokeWidth={3} />
      </motion.div>

      {/* Bottom-left plus */}
      <motion.div
        className={`absolute ${isLarge ? '-bottom-2 -left-3' : '-bottom-1 -left-2'}`}
        variants={sparkleVariants}
        animate="animate"
        transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
      >
        <Plus className={`${isLarge ? 'w-4 h-4' : 'w-3 h-3'} text-white drop-shadow-lg pixelated`} strokeWidth={2.5} />
      </motion.div>

      {/* Bottom-right sparkle */}
      <motion.div
        className={`absolute ${isLarge ? '-bottom-3 -right-3' : '-bottom-2 -right-2'}`}
        variants={sparkleVariants}
        animate="animate"
        transition={{ duration: 2.8, repeat: Infinity, delay: 1.5 }}
      >
        <Star className={`${isLarge ? 'w-3 h-3' : 'w-2 h-2'} text-white drop-shadow-lg pixelated`} fill="white" />
      </motion.div>

      {/* Additional floating elements for large version */}
      {isLarge && (
        <>
          <motion.div
            className="absolute -top-6 left-1/2 transform -translate-x-1/2"
            variants={sparkleVariants}
            animate="animate"
            transition={{ duration: 4, repeat: Infinity, delay: 2 }}
          >
            <Plus className="w-3 h-3 text-white drop-shadow-lg pixelated" strokeWidth={2} />
          </motion.div>
          
          <motion.div
            className="absolute -bottom-5 left-1/4"
            variants={sparkleVariants}
            animate="animate"
            transition={{ duration: 3.2, repeat: Infinity, delay: 2.5 }}
          >
            <Star className="w-2 h-2 text-white drop-shadow-lg pixelated" fill="white" />
          </motion.div>
        </>
      )}

      {/* Main Logo Text */}
      <div className="flex flex-col items-center">
        <motion.h1
          className={`font-pixel text-white pixelated tracking-wider text-center leading-none ${
            isLarge 
              ? 'text-4xl sm:text-5xl lg:text-6xl' 
              : 'text-lg sm:text-xl'
          }`}
          style={{
            textShadow: `
              -1px -1px 0 #374151,
              1px -1px 0 #374151,
              -1px 1px 0 #374151,
              1px 1px 0 #374151,
              -2px -2px 0 #374151,
              2px -2px 0 #374151,
              -2px 2px 0 #374151,
              2px 2px 0 #374151,
              0 0 6px rgba(0,0,0,0.3)
            `,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Popple
        </motion.h1>
        
        {/* Tagline - Only show if showTagline is true */}
        {showTagline && (
          null
        )}
      </div>
    </div>
  );
}