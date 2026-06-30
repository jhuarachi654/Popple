import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import LifeLevelLogo from './LifeLevelLogo';
import skyBackground from 'figma:asset/730a2b5730fb297ff69baf12c868d97ded365bc0.png';
import logoImage from 'figma:asset/e5c300b29ca373f04585bbeb045dffb74026f2d9.png';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
  backgroundImage?: string;
}

export default function LoadingScreen({ onLoadingComplete, backgroundImage }: LoadingScreenProps) {
  const handleEnter = () => {
    onLoadingComplete();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#232323]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Sky Background */}
      <div 
        className="absolute inset-0 pixelated hidden"
        style={{ 
          backgroundImage: `url(${skyBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
        }}
      >
        {/* Dark gradient overlay from bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70"></div>
      </div>

      {/* Floating sparkles with logo as one of them */}
      <div className="absolute inset-0">
        {/* Logo as a sparkle - positioned in top-right area like other sparkles */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1
          }}
          transition={{ 
            duration: 0.8, 
            ease: "easeOut"
          }}
        >
          <div className="relative">
            <div 
              className="bg-[#232323] rounded-[16px] p-6 w-full h-full flex items-center justify-center -translate-y-8"
            >
              <svg
                viewBox="0 0 200 200"
                className="w-32 h-32 object-contain"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Popple logo"
              >
                {/* Row 0 */}
                <rect x="90" y="0"   width="20" height="20" fill="#ffffff" />
                {/* Row 1 */}
                <rect x="60" y="30"  width="20" height="20" fill="#ffffff" />
                <rect x="120" y="30" width="20" height="20" fill="#ffffff" />
                {/* Row 2 */}
                <rect x="30" y="60"  width="20" height="20" fill="#ffffff" />
                <rect x="90" y="60"  width="20" height="20" fill="#ffffff" />
                <rect x="150" y="60" width="20" height="20" fill="#ffffff" />
                {/* Row 3 */}
                <rect x="0"   y="90" width="20" height="20" fill="#ffffff" />
                <rect x="60"  y="90" width="20" height="20" fill="#ffffff" />
                <rect x="120" y="90" width="20" height="20" fill="#ffffff" />
                <rect x="180" y="90" width="20" height="20" fill="#ffffff" />
                {/* Row 4 */}
                <rect x="30"  y="120" width="20" height="20" fill="#ffffff" />
                <rect x="90"  y="120" width="20" height="20" fill="#ffffff" />
                <rect x="150" y="120" width="20" height="20" fill="#ffffff" />
                {/* Row 5 */}
                <rect x="60"  y="150" width="20" height="20" fill="#ffffff" />
                <rect x="120" y="150" width="20" height="20" fill="#ffffff" />
                {/* Row 6 */}
                <rect x="90"  y="180" width="20" height="20" fill="#ffffff" />
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Sparkle 1 - Top Left */}
        <motion.div
          className="absolute top-[15%] left-[10%]"
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
            opacity: [0.6, 1, 0.6],
            y: [0, -20, 0]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          
        </motion.div>

        {/* Sparkle 2 - Top Right (Star shape) */}
        <motion.div
          className="absolute top-[20%] right-[15%]"
          animate={{ 
            scale: [1, 1.5, 1],
            rotate: [0, 360, 720],
            opacity: [0.5, 1, 0.5],
            x: [0, 15, 0]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1 
          }}
        >
          <div className="relative w-5 h-5">
            
            
          </div>
        </motion.div>

        {/* Sparkle 3 - Bottom Left */}
        <motion.div
          className="absolute bottom-[25%] left-[20%]"
          animate={{ 
            scale: [1, 1.4, 1],
            rotate: [0, 180, 360],
            opacity: [0.6, 1, 0.6],
            x: [0, -10, 0],
            y: [0, 15, 0]
          }}
          transition={{ 
            duration: 7, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 0.5 
          }}
        >
          
        </motion.div>

        {/* Sparkle 4 - Bottom Right (Star shape) */}
        <motion.div
          className="absolute bottom-[30%] right-[12%]"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 360, 720],
            opacity: [0.6, 1, 0.6],
            y: [0, 20, 0]
          }}
          transition={{ 
            duration: 5.5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1.5 
          }}
        >
          <div className="relative w-4 h-4">
            
            
          </div>
        </motion.div>

        {/* Sparkle 5 - Middle Left */}
        <motion.div
          className="absolute top-[45%] left-[8%]"
          animate={{ 
            scale: [1, 1.6, 1],
            rotate: [0, 180, 360],
            opacity: [0.5, 0.9, 0.5],
            x: [0, 10, 0]
          }}
          transition={{ 
            duration: 6.5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2 
          }}
        >
          
        </motion.div>

        {/* Sparkle 6 - Middle Right */}
        <motion.div
          className="absolute top-[40%] right-[18%]"
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -180, -360],
            opacity: [0.6, 1, 0.6],
            y: [0, -15, 0]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2.5 
          }}
        >
          
        </motion.div>

        {/* Sparkle 7 - Top Center (Star shape) */}
        <motion.div
          className="absolute top-[12%] left-[50%] -translate-x-1/2"
          animate={{ 
            scale: [1, 1.4, 1],
            rotate: [0, 360, 720],
            opacity: [0.5, 0.9, 0.5],
            y: [0, 10, 0]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 3 
          }}
        >
          <div className="relative w-3 h-3">
            
            
          </div>
        </motion.div>

        {/* Sparkle 8 - Bottom Center */}
        <motion.div
          className="absolute bottom-[15%] left-[45%]"
          animate={{ 
            scale: [1, 1.5, 1],
            rotate: [0, -180, -360],
            opacity: [0.5, 0.9, 0.5],
            x: [0, 20, 0]
          }}
          transition={{ 
            duration: 7, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 1.2 
          }}
        >
          
        </motion.div>
      </div>

      {/* Enter Button - Bottom Center */}
      <motion.div
        className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
      >
        <motion.button
          onClick={handleEnter}
          className="px-12 py-4 bg-cyan-600 hover:bg-cyan-700 text-white border-2 border-cyan-800 transition-all duration-200 font-pixel text-lg pixelated tracking-wide shadow-lg rounded-xl relative overflow-hidden"
          whileHover={{ 
            scale: 1.05,
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              '0 4px 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1)',
              '0 4px 20px rgba(6, 182, 212, 0.5), 0 0 40px rgba(6, 182, 212, 0.2)',
              '0 4px 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1)'
            ]
          }}
          transition={{
            boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          style={{
            boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3), 0 0 40px rgba(6, 182, 212, 0.1)'
          }}
        >
          <span className="relative z-10">ENTER</span>
        </motion.button>

        {/* Pulsing hint text */}
        <motion.div
          className="text-center mt-4"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <p className="text-white font-pixel pixelated tracking-wide drop-shadow-lg text-[13px]">
            Click to enter your space
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}