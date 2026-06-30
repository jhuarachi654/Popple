import React from 'react';
import { motion } from 'motion/react';
import { CheckSquare, GamepadIcon, BarChart3, Settings, ClipboardList, Target, Clock, SlidersHorizontal } from 'lucide-react';
import LifeLevelLogo from './LifeLevelLogo';

interface NavigationBarProps {
  activeScreen: 'todos' | 'game' | 'log' | 'settings';
  onScreenChange: (screen: 'todos' | 'game' | 'log' | 'settings') => void;
  completedCount: number;
  onLogout?: () => void;
  isGuestMode?: boolean;
}

export default function NavigationBar({
  activeScreen,
  onScreenChange,
  completedCount,
  onLogout,
  isGuestMode = false,
}: NavigationBarProps) {
  const navItems = [
    {
      id: 'todos' as const,
      label: 'Tasks',
      mobileLabel: 'Tasks',
      icon: CheckSquare,
      mobileIcon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100/80',
    },
    {
      id: 'game' as const,
      label: 'Your Space',
      mobileLabel: 'Space',
      icon: GamepadIcon,
      mobileIcon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100/80',
      badge: completedCount,
    },
    {
      id: 'log' as const,
      label: 'Record',
      mobileLabel: 'Record',
      icon: BarChart3,
      mobileIcon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100/80',
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      mobileLabel: 'Settings',
      icon: Settings,
      mobileIcon: SlidersHorizontal,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100/80',
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/50 px-6 sm:px-8 shadow-xl z-50"
      style={{
        paddingTop: '1rem',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
      }}
    >
      {/* Mobile Layout: icon + short label, equal-width columns */}
      <div className="sm:hidden flex items-center justify-around w-full relative">
        {isGuestMode && (
          <div className="absolute -top-1 right-2 w-2 h-2 bg-orange-400 rounded-full border border-orange-600 opacity-80 z-10" title="Guest Mode" />
        )}

        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          const Icon = item.mobileIcon;

          return (
            <button
              key={item.id}
              onClick={() => onScreenChange(item.id)}
              className={`relative flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200 flex-1 ${
                isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-blue-500 text-white rounded-full flex items-center justify-center"
                    style={{ fontSize: '9px', fontWeight: '600', minWidth: '16px' }}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </motion.div>
                )}
              </div>
              <span className="text-[10px] font-medium font-space-mono leading-none">{item.mobileLabel}</span>
              {isActive && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-400 rounded-full"
                />
              )}
            </button>
          );
        })}

      </div>

      {/* Tablet Layout (sm to lg): Small logo on left, centered nav, logout on right */}
      <div className="hidden sm:block lg:hidden">
        <div className="relative flex items-center justify-center">
          {/* Small logo on the left for tablet - positioned more conservatively */}
          <div className="absolute left-0 flex items-center scale-75 origin-left">
            <LifeLevelLogo size="small" showTagline={false} />
            {isGuestMode && (
              <div className="ml-1 w-2 h-2 bg-orange-400 rounded-full border border-orange-600 opacity-80" title="Guest Mode"></div>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-6">
            {navItems.map((item) => {
              const isActive = activeScreen === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => onScreenChange(item.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 transition-all duration-200 rounded-lg ${
                    isActive 
                      ? 'text-blue-400 bg-blue-600/20' 
                      : 'text-gray-400 hover:bg-gray-700/30'
                  }`}
                >
                  {/* Icon */}
                  <div className="relative flex items-center">
                    <Icon className="w-5 h-5 transition-colors duration-200" />
                    
                    {/* Badge */}
                    {item.badge !== undefined && item.badge >= 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                        style={{
                          minWidth: '20px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </motion.div>
                    )}
                  </div>

                  {/* Label - Visible on tablet */}
                  <span className="text-xs font-medium font-space-mono">
                    {item.label}
                  </span>

                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Logout - Positioned absolutely on the right */}
        </div>
      </div>

      {/* Desktop Layout (lg+): Full logo on left, centered nav, logout on right */}
      <div className="hidden lg:block">
        <div className="relative flex items-center justify-center">
          {/* Full logo on the left for desktop */}
          <div className="absolute left-0 flex items-center">
            <LifeLevelLogo size="small" showTagline={false} />
            {isGuestMode && (
              <div className="ml-2 w-2 h-2 bg-orange-400 rounded-full border border-orange-600 opacity-80" title="Guest Mode"></div>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-8">
            {navItems.map((item) => {
              const isActive = activeScreen === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => onScreenChange(item.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 transition-all duration-200 rounded-lg ${
                    isActive 
                      ? 'text-blue-400 bg-blue-600/20' 
                      : 'text-gray-400 hover:bg-gray-700/30'
                  }`}
                >
                  {/* Icon */}
                  <div className="relative flex items-center">
                    <Icon className="w-5 h-5 transition-colors duration-200" />
                    
                    {/* Badge */}
                    {item.badge !== undefined && item.badge >= 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-medium"
                        style={{
                          minWidth: '20px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </motion.div>
                    )}
                  </div>

                  {/* Label - Visible on desktop */}
                  <span className="text-xs font-medium font-space-mono">
                    {item.label}
                  </span>

                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}