import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Flower, Palette } from 'lucide-react';
import { Button } from './ui/button';
import type { GameSettings } from '../App';

interface PillCustomizationScreenProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
}

interface PillThemeOption {
  id: GameSettings['pillTheme'];
  name: string;
  description: string;
  color: string;
  gradient: string;
  icon: React.ReactNode;
}

const pillThemes: PillThemeOption[] = [
  {
    id: 'sparkly',
    name: 'Sparkly',
    description: 'Rich pastels with shimmer',
    color: 'from-pink-500 to-purple-600',
    gradient: 'bg-gradient-to-br from-pink-500 via-purple-500 to-blue-600',
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    id: 'floral', 
    name: 'Botanical',
    description: 'Rich botanical with plant icons',
    color: 'from-emerald-500 to-teal-600',
    gradient: 'bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600',
    icon: <Flower className="w-4 h-4" />,
  },
  {
    id: 'cosmic',
    name: 'Cosmic',
    description: 'Deep space vibes',
    color: 'from-indigo-600 to-purple-700',
    gradient: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-700',
    icon: <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />,
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    description: 'Full spectrum colors',
    color: 'from-red-500 to-purple-600',
    gradient: 'bg-gradient-to-br from-red-600 via-yellow-500 via-green-500 via-blue-500 to-purple-600',
    icon: <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400" />,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and simple',
    color: 'from-gray-400 to-gray-600',
    gradient: 'bg-gradient-to-br from-gray-500 to-gray-600',
    icon: <div className="w-4 h-4 rounded-full bg-gradient-to-r from-gray-400 to-gray-500" />,
  },
  {
    id: 'default',
    name: 'Classic',
    description: 'Timeless and balanced',
    color: 'from-blue-500 to-purple-600',
    gradient: 'bg-gradient-to-br from-blue-500 to-purple-600',
    icon: <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-500" />,
  },
];

export default function PillCustomizationScreen({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}: PillCustomizationScreenProps) {
  const [selectedTheme, setSelectedTheme] = useState<GameSettings['pillTheme']>(settings.pillTheme);

  useEffect(() => {
    setSelectedTheme(settings.pillTheme);
  }, [settings.pillTheme, isOpen]);

  const handleApply = () => {
    onUpdateSettings({
      ...settings,
      pillTheme: selectedTheme,
    });
    onClose();
  };

  const handleThemeSelect = (themeId: GameSettings['pillTheme']) => {
    setSelectedTheme(themeId);
  };

  const getSelectedThemeGradient = () => {
    const theme = pillThemes.find(t => t.id === selectedTheme);
    return theme?.gradient || 'bg-gradient-to-r from-purple-400 to-purple-500';
  };

  const getTextureOverlay = (theme: GameSettings['pillTheme']) => {
    switch (theme) {
      case 'sparkly':
        return 'opacity-20 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.6)_2px,transparent_2px),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.4)_1px,transparent_1px),radial-gradient(circle_at_40%_80%,rgba(255,255,255,0.5)_1.5px,transparent_1.5px)] bg-[length:20px_20px,15px_15px,25px_25px]';
      case 'floral':
        return 'opacity-15 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4)_3px,transparent_3px),radial-gradient(circle_at_70%_60%,rgba(255,255,255,0.3)_2px,transparent_2px)] bg-[length:30px_30px,20px_20px]';
      case 'cosmic':
        return 'opacity-25 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.8)_1px,transparent_1px),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.6)_0.5px,transparent_0.5px),radial-gradient(circle_at_40%_70%,rgba(255,255,255,0.7)_0.8px,transparent_0.8px)] bg-[length:40px_40px,25px_25px,35px_35px]';
      case 'rainbow':
        return 'opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.3)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.3)_75%),linear-gradient(-45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.2)_75%)] bg-[length:8px_8px,12px_12px]';
      case 'minimal':
        return 'opacity-10 bg-[linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[length:20px_20px]';
      default:
        return 'opacity-30 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.3)_1px,transparent_1px),linear-gradient(45deg,rgba(0,0,0,0.1)_25%,transparent_25%,transparent_75%,rgba(0,0,0,0.1)_75%),linear-gradient(-45deg,rgba(0,0,0,0.1)_25%,transparent_25%,transparent_75%,rgba(0,0,0,0.1)_75%)] bg-[length:4px_4px,8px_8px,8px_8px]';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl max-h-[90vh] bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-purple-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-medium text-gray-900">🎨 Customize Container Style</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose your preferred retro container theme
              </p>
            </div>
            <Button
              onClick={onClose}
              size="icon"
              variant="ghost"
              className="w-8 h-8 rounded-full hover:bg-purple-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-col h-full">
            {/* Preview Area */}
            <div className="px-4 py-4 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
              <div className="relative h-24 bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 shadow-sm overflow-hidden">
                {/* Preview Container */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="relative inline-block pixelated"
                    style={{ 
                      imageRendering: 'pixelated',
                      width: 140,
                      height: 32
                    }}
                  >
                    {/* Retro pixelated container preview */}
                    <div className="absolute inset-0 pixelated" style={{ imageRendering: 'pixelated' }}>
                      <div 
                        className="absolute bg-white border-2 border-black pixelated"
                        style={{
                          left: '2px',
                          right: '2px', 
                          top: '1px',
                          bottom: '1px',
                          imageRendering: 'pixelated'
                        }}
                      />
                      
                      {/* Pixelated corners */}
                      <div className="absolute w-1 h-1 bg-white border-l border-t border-black pixelated" style={{ left: '1px', top: '0px' }} />
                      <div className="absolute w-1 h-1 bg-white border-r border-t border-black pixelated" style={{ right: '1px', top: '0px' }} />
                      <div className="absolute w-1 h-1 bg-white border-l border-b border-black pixelated" style={{ left: '1px', bottom: '0px' }} />
                      <div className="absolute w-1 h-1 bg-white border-r border-b border-black pixelated" style={{ right: '1px', bottom: '0px' }} />
                      <div className="absolute w-1 h-1 bg-black pixelated" style={{ left: '0px', top: '1px' }} />
                      <div className="absolute w-1 h-1 bg-black pixelated" style={{ right: '0px', top: '1px' }} />
                      <div className="absolute w-1 h-1 bg-black pixelated" style={{ left: '0px', bottom: '1px' }} />
                      <div className="absolute w-1 h-1 bg-black pixelated" style={{ right: '0px', bottom: '1px' }} />
                    </div>
                    
                    {/* Text content */}
                    <div className="absolute inset-2 flex items-center justify-center">
                      <span 
                        className="text-black text-sm pixelated whitespace-nowrap overflow-hidden"
                        style={{ 
                          imageRendering: 'pixelated',
                          fontFamily: 'monospace'
                        }}
                      >
                        Sample task
                      </span>
                    </div>
                    
                    {/* Theme color overlay */}
                    <div className={`absolute inset-1 opacity-5 ${getSelectedThemeGradient()} pixelated`} />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Theme Options */}
            <div className="flex-1 px-4 pb-4">
              <div className="mb-3">
                <h3 className="text-lg font-medium text-gray-900 mb-1">Container Themes</h3>
                <p className="text-sm text-gray-600">Choose your preferred style for task containers</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2.5 h-full content-start">
                {pillThemes.map((theme) => {
                  const isSelected = selectedTheme === theme.id;
                  return (
                    <motion.button
                      key={theme.id}
                      onClick={() => handleThemeSelect(theme.id)}
                      className={`
                        relative p-3 rounded-xl border transition-all text-left h-fit
                        ${isSelected 
                          ? 'border-purple-300 bg-purple-50/80 shadow-sm' 
                          : 'border-gray-200 bg-white/80 hover:border-gray-300 hover:bg-white'
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${theme.gradient} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                          {theme.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm text-gray-900 mb-0.5">{theme.name}</h4>
                          <p className="text-xs text-gray-600 leading-tight">{theme.description}</p>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-3 h-3 bg-purple-500 rounded-full"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-t border-purple-100 flex gap-3 justify-end">
              <Button
                onClick={onClose}
                variant="outline"
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                className="px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Apply Changes
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}