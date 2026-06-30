import React from 'react';
import { motion } from 'motion/react';

interface PixelCheckboxProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
  'aria-label'?: string;
}

export default function PixelCheckbox({ 
  checked, 
  onChange, 
  className = '', 
  'aria-label': ariaLabel 
}: PixelCheckboxProps) {
  return (
    <button
      onClick={onChange}
      className={`pixel-checkbox relative w-4 h-4 flex-shrink-0 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${className}`}
      aria-label={ariaLabel}
      role="checkbox"
      aria-checked={checked}
    >
      {/* 8-bit pixelated checkbox background */}
      <div 
        className={`w-full h-full pixelated transition-all duration-200 ${
          checked 
            ? 'bg-blue-600 border-2 border-blue-700' 
            : 'bg-white border-2 border-gray-400 hover:border-gray-500'
        }`}
        style={{
          borderRadius: '2px',
          imageRendering: 'pixelated',
          WebkitImageRendering: 'pixelated',
          msImageRendering: 'pixelated'
        }}
      >
        {/* 8-bit checkmark */}
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="w-full h-full flex items-center justify-center"
          >
            {/* Pixelated checkmark using CSS */}
            <div className="relative w-2.5 h-2.5">
              <div 
                className="absolute bg-white pixelated"
                style={{
                  width: '1.5px',
                  height: '5px',
                  left: '3px',
                  top: '1px',
                  transform: 'rotate(45deg)',
                  imageRendering: 'pixelated'
                }}
              />
              <div 
                className="absolute bg-white pixelated"
                style={{
                  width: '1.5px',
                  height: '3px',
                  left: '1.5px',
                  top: '3px',
                  transform: 'rotate(-45deg)',
                  imageRendering: 'pixelated'
                }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </button>
  );
}