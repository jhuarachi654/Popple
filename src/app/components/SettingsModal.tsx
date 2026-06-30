import React from 'react';
import { motion } from 'motion/react';
import { Settings, Palette, Sparkles, Flower, Star, Rainbow } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { GameSettings, AnimationType } from '../App';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
}

const animationOptions: { type: AnimationType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    type: 'explosion',
    label: 'Explosion',
    icon: '💥',
    description: 'Fiery bursts and sparks'
  },
  {
    type: 'sparkles',
    label: 'Sparkles',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Magical glittery effects'
  },
  {
    type: 'plant',
    label: 'Plant Growth',
    icon: <Flower className="w-4 h-4" />,
    description: 'Blooming flowers and leaves'
  },
  {
    type: 'confetti',
    label: 'Confetti',
    icon: '🎉',
    description: 'Colorful paper celebration'
  },
  {
    type: 'rainbow',
    label: 'Rainbow',
    icon: <Rainbow className="w-4 h-4" />,
    description: 'Vibrant rainbow trails'
  },
  {
    type: 'stars',
    label: 'Stars',
    icon: <Star className="w-4 h-4" />,
    description: 'Cosmic stardust effect'
  }
];

const themeOptions = [
  {
    theme: 'sparkly' as const,
    label: 'Sparkly',
    description: 'Glittery gradient pills',
    preview: 'bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400',
    matches: ['sparkles', 'confetti']
  },
  {
    theme: 'floral' as const,
    label: 'Floral',
    description: 'Nature-inspired designs',
    preview: 'bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400',
    matches: ['plant']
  },
  {
    theme: 'cosmic' as const,
    label: 'Cosmic',
    description: 'Space-themed pills',
    preview: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
    matches: ['stars', 'rainbow']
  },
  {
    theme: 'default' as const,
    label: 'Classic',
    description: 'Simple colorful pills',
    preview: 'bg-gradient-to-r from-blue-400 to-purple-500',
    matches: ['explosion']
  },
  {
    theme: 'rainbow' as const,
    label: 'Rainbow',
    description: 'Vibrant rainbow pills',
    preview: 'bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400',
    matches: ['rainbow', 'confetti']
  },
  {
    theme: 'minimal' as const,
    label: 'Minimal',
    description: 'Clean monochrome design',
    preview: 'bg-gradient-to-r from-gray-300 to-gray-400',
    matches: []
  }
];

export default function SettingsModal({ isOpen, onClose, settings, onUpdateSettings }: SettingsModalProps) {
  const handleAnimationChange = (animationType: AnimationType) => {
    // Auto-suggest matching pill theme
    const matchingTheme = themeOptions.find(theme => 
      theme.matches.includes(animationType)
    );
    
    onUpdateSettings({
      ...settings,
      animationType,
      pillTheme: matchingTheme?.theme || settings.pillTheme
    });
  };

  const handleThemeChange = (pillTheme: GameSettings['pillTheme']) => {
    onUpdateSettings({
      ...settings,
      pillTheme
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Customize Your Experience
          </DialogTitle>
          <DialogDescription>
            Choose your celebration animation and pill design to personalize your task completion experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Animation Type */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="font-medium text-gray-900">Celebration Animation</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {animationOptions.map((option) => (
                <motion.button
                  key={option.type}
                  onClick={() => handleAnimationChange(option.type)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    settings.animationType === option.type
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{option.icon}</span>
                    <span className="font-medium text-sm">{option.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">{option.description}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Pill Theme */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-purple-600" />
              <h3 className="font-medium text-gray-900">Pill Design</h3>
              {themeOptions.find(t => t.matches.includes(settings.animationType)) && (
                <Badge variant="secondary" className="text-xs">
                  Recommended
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              {themeOptions.map((option) => {
                const isRecommended = option.matches.includes(settings.animationType);
                const isSelected = settings.pillTheme === option.theme;
                
                return (
                  <motion.button
                    key={option.theme}
                    onClick={() => handleThemeChange(option.theme)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : isRecommended
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{option.label}</span>
                        {isRecommended && (
                          <Badge variant="outline" className="text-xs">
                            Matches
                          </Badge>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full ${option.preview}`} />
                    </div>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-900 mb-2">Preview</h4>
            <div className="flex items-center justify-center">
              <motion.div
                className={`px-4 py-2 rounded-full shadow-lg text-white text-sm font-medium ${
                  themeOptions.find(t => t.theme === settings.pillTheme)?.preview || 'bg-gradient-to-r from-blue-400 to-purple-500'
                }`}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Sample Task ✨
              </motion.div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}