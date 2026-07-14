import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Building2, Home, Cloud, PawPrint, X } from 'lucide-react';
import TodoListScreen from './components/TodoListScreen';
import GameScreen from './components/GameScreen';
import TaskHistoryScreen from './components/TaskHistoryScreen';
import SettingsScreen from './components/SettingsScreen';
import NavigationBar from './components/NavigationBar';
import LoginFlow from './components/LoginFlow';

import OnboardingFlow from './components/OnboardingFlow';
import LandingPage from './components/LandingPage';
import { getStoredToken, getStoredUser, clearSession, signOut as authSignOut } from './utils/auth';
import { taskApi, progressApi, settingsApi } from './utils/api';

import { Toaster } from './components/ui/sonner';
import cityBackground from 'figma:asset/b06399fe4c9c24f9ce21884751670df3937a40b9.png';
import homeBackground from 'figma:asset/49a1be4de73e79605e84e98473fb6cf4adf4df2e.png';
import skyBackground from 'figma:asset/730a2b5730fb297ff69baf12c868d97ded365bc0.png';
import puppyBackground from 'figma:asset/e554bfa8d6607d253dbd4597c0f90c1a34986892.png';

export interface Todo {
  id: string;
  text: string;
  notes?: string;
  priority?: boolean;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  destroyedAt?: Date;
}

export interface DailyStats {
  date: string;
  added: number;
  completed: number;
}

export type AnimationType = 'explosion' | 'sparkles' | 'plant' | 'confetti' | 'rainbow' | 'stars';

export interface GameSettings {
  animationType: AnimationType;
  pillTheme?: 'sparkly' | 'floral' | 'cosmic' | 'default' | 'rainbow' | 'minimal';
}

export interface PlayerProgress {
  level: number;
  currentXP: number;
  totalXP: number;
  unlockedRewards: string[];
}

export interface BackgroundTheme {
  id: string;
  name: string;
  icon: any;
  image: string;
  description: string;
}

const backgroundThemes: BackgroundTheme[] = [
  {
    id: 'cityscape',
    name: 'City Life',
    icon: Building2,
    image: cityBackground,
    description: 'Navigate adult responsibilities'
  },
  {
    id: 'home',
    name: 'Home Sweet Home',
    icon: Home,
    image: homeBackground,
    description: 'Cozy household management'
  },
  {
    id: 'sky',
    name: 'Sky Dreams',
    icon: Cloud,
    image: skyBackground,
    description: 'Peaceful productivity realm'
  },
  {
    id: 'puppy',
    name: 'Puppy Friends',
    icon: PawPrint,
    image: puppyBackground,
    description: 'Adorable companions cheer you on'
  }
];

function PasswordRecoveryScreen({ backgroundImage, onComplete }: { backgroundImage: string; onComplete: () => void }) {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setIsLoading(true);
    try {
      const { updatePassword } = await import('./utils/auth');
      const result = await updatePassword(password);
      if (result.error) throw new Error(result.error);
      setSuccess(true);
      setTimeout(onComplete, 2000);
    } catch (err: any) {
      setError(err.message || 'Could not update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/15" />
      </div>
      <div className="w-full max-w-md relative z-10">
        <div className="glass-strong rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 pixel-notebook opacity-80" />
          <div className="relative z-10 notebook-content-area p-6 -m-6 space-y-6">
            <h1 className="font-pixel text-2xl text-center" style={{ color: '#314158' }}>Popple</h1>
            <p className="font-space-mono text-sm text-slate-600 text-center">Set a new password</p>
            {success ? (
              <p className="font-space-mono text-sm text-green-700 text-center">Password updated! Signing you in…</p>
            ) : (
              <>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-4 py-3 bg-slate-200 border-2 border-slate-400 rounded-xl text-slate-800 placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-space-mono"
                  autoFocus
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 bg-slate-200 border-2 border-slate-400 rounded-xl text-slate-800 placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-space-mono"
                />
                {error && <p className="font-space-mono text-xs text-red-700 text-center">{error}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || password.length < 6 || !confirmPassword}
                  className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white border-2 border-cyan-800 font-pixel text-xs rounded-xl"
                >
                  {isLoading ? 'Updating…' : 'Set New Password'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'todos' | 'game' | 'log' | 'settings'>('todos');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [backgroundTheme, setBackgroundTheme] = useState(() => {
    // Initialize from localStorage or default to 'sky'
    try {
      const saved = localStorage.getItem('lifelevel-background-theme');
      return saved || 'sky';
    } catch (error) {
      console.warn('Could not load background theme from localStorage:', error);
      return 'sky';
    }
  });
  const [playerProgress, setPlayerProgress] = useState<PlayerProgress>({
    level: 1,
    currentXP: 0,
    totalXP: 0,
    unlockedRewards: []
  });
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const [gameSettings, setGameSettings] = useState<GameSettings>({
    animationType: 'sparkles',
    pillTheme: 'default',
  });
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('popple-onboarding-complete'); } catch { return false; }
  });
  const [guestBannerDismissed, setGuestBannerDismissed] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  // Level system configuration
  const levelConfig = [
    { level: 1, xpRequired: 0, title: "Bubble Novice", reward: "Something just appeared in your space. Nice.", emoji: "" },
    { level: 2, xpRequired: 500, title: "Junior Popper", reward: "You're getting the hang of this.", emoji: "" },
    { level: 3, xpRequired: 1000, title: "Bubble Wrangler", reward: "Your space is growing. Keep going.", emoji: "" },
    { level: 4, xpRequired: 1500, title: "Pop Artist", reward: "Four levels in. You're not stopping now.", emoji: "" },
    { level: 5, xpRequired: 2000, title: "Burst Maestro", reward: "Halfway to something. The bubbles know.", emoji: "" },
    { level: 6, xpRequired: 2500, title: "Grand Popper", reward: "Your space is getting crowded. That's a good thing.", emoji: "" },
    { level: 7, xpRequired: 3000, title: "The Unstoppable", reward: "Nobody can stop you. Not even you.", emoji: "" },
    { level: 8, xpRequired: 3500, title: "Drift Collector", reward: "Drifting and popping like a pro.", emoji: "" },
    { level: 9, xpRequired: 4000, title: "Pop Connoisseur", reward: "You've developed taste. A pop connoisseur.", emoji: "" },
    { level: 10, xpRequired: 5000, title: "Bubble Hoarder", reward: "Ten levels. Your space has seen things.", emoji: "" },

    { level: 11, xpRequired: 6000, title: "Serial Popper", reward: "You pop with intent now.", emoji: "" },
    { level: 12, xpRequired: 7000, title: "Bubble Baron", reward: "A bubble baron with a growing empire.", emoji: "" },
    { level: 13, xpRequired: 8000, title: "The Pop Machine", reward: "The machine runs itself. Almost.", emoji: "️" },
    { level: 14, xpRequired: 9000, title: "Burst Collector", reward: "Collecting bursts like they mean something.", emoji: "" },
    { level: 15, xpRequired: 10500, title: "Float Commander", reward: "You command the float.", emoji: "" },

    { level: 16, xpRequired: 12000, title: "Popper of Worlds", reward: "Worlds have been popped in your name.", emoji: "" },
    { level: 17, xpRequired: 13500, title: "Bubble Royalty", reward: "The bubbles bow to you.", emoji: "" },
    { level: 18, xpRequired: 15000, title: "The Relentless", reward: "Still here. Still going.", emoji: "" },
    { level: 19, xpRequired: 16500, title: "Pop Legend", reward: "This is legend territory.", emoji: "" },
    { level: 20, xpRequired: 18500, title: "Supreme Floater", reward: "Floating through everything.", emoji: "" },

    { level: 21, xpRequired: 20500, title: "Chaos Popper", reward: "Chaos? You call this Tuesday.", emoji: "️" },
    { level: 22, xpRequired: 22500, title: "Drift Warden", reward: "The drift is yours to keep.", emoji: "" },
    { level: 23, xpRequired: 25000, title: "The Pop Whisperer", reward: "The bubbles trust you with their final moments.", emoji: "" },
    { level: 24, xpRequired: 27500, title: "Bubble Sovereign", reward: "A sovereign of the space.", emoji: "" },
    { level: 25, xpRequired: 30000, title: "Certified Unstoppable", reward: "Certified. No going back.", emoji: "" },

    { level: 26, xpRequired: 33000, title: "The Destroyer", reward: "Everything you touch turns to XP.", emoji: "" },
    { level: 27, xpRequired: 36000, title: "Burst Overlord", reward: "The overlord has arrived.", emoji: "" },
    { level: 28, xpRequired: 39000, title: "Pop Architect", reward: "You built this. All of it.", emoji: "️" },
    { level: 29, xpRequired: 42000, title: "The Obsessed", reward: "Obsession looks good on you.", emoji: "" },
    { level: 30, xpRequired: 45000, title: "Bubble Deity", reward: "The space bends to your will.", emoji: "" },

    { level: 31, xpRequired: 49000, title: "Realm Popper", reward: "Your realm keeps expanding.", emoji: "" },
    { level: 32, xpRequired: 53000, title: "The Infinite Popper", reward: "The pop has no end.", emoji: "️" },
    { level: 33, xpRequired: 57000, title: "Pop Mystic", reward: "A mystic of the burst.", emoji: "" },
    { level: 34, xpRequired: 61000, title: "Burst Mythic", reward: "Mythic status reached.", emoji: "" },
    { level: 35, xpRequired: 65000, title: "The One Who Pops", reward: "The one. The only. The popper.", emoji: "" },

    { level: 36, xpRequired: 70000, title: "Bubble Phantom", reward: "Gone before anyone noticed. Almost.", emoji: "" },
    { level: 37, xpRequired: 75000, title: "Drift Eternal", reward: "Drifting forever. Popping everything.", emoji: "" },
    { level: 38, xpRequired: 80000, title: "Pop Singularity", reward: "A singularity of productivity.", emoji: "" },
    { level: 39, xpRequired: 85000, title: "The Eternal Floater", reward: "Forever in the float.", emoji: "" },
    { level: 40, xpRequired: 90000, title: "Bubble Transcendent", reward: "Beyond normal. Transcendent.", emoji: "" },

    { level: 41, xpRequired: 96000, title: "Pop Saint", reward: "The saints of pop look up to you.", emoji: "" },
    { level: 42, xpRequired: 102000, title: "The Unkillable", reward: "You simply cannot be stopped.", emoji: "" },
    { level: 43, xpRequired: 108000, title: "Bubble Overlord", reward: "The bubble empire is yours.", emoji: "" },
    { level: 44, xpRequired: 114000, title: "The Final Popper", reward: "This is the final pop. Until the next one.", emoji: "" },
    { level: 45, xpRequired: 120000, title: "Burst Supreme", reward: "Supreme. No further questions.", emoji: "" },

    { level: 46, xpRequired: 127000, title: "The Pop Beyond", reward: "You went beyond the pop.", emoji: "" },
    { level: 47, xpRequired: 134000, title: "Infinite Burst", reward: "Infinite bursts. Infinite you.", emoji: "️" },
    { level: 48, xpRequired: 141000, title: "The Last Bubble", reward: "The last bubble was yours.", emoji: "" },
    { level: 49, xpRequired: 148000, title: "Pop Ascendant", reward: "Ascending. Still popping.", emoji: "" },
    { level: 50, xpRequired: 155000, title: "The Bubble Final Boss", reward: "THE BUBBLE FINAL BOSS. Your space is eternal.", emoji: "" }
  ];

  const calculateLevel = (totalXP: number) => {
    let currentLevel = 1;
    let currentXP = totalXP;
    
    for (let i = levelConfig.length - 1; i >= 0; i--) {
      if (totalXP >= levelConfig[i].xpRequired) {
        currentLevel = levelConfig[i].level;
        currentXP = totalXP - levelConfig[i].xpRequired;
        break;
      }
    }
    
    return { level: currentLevel, currentXP };
  };

  const getXPForNextLevel = (currentLevel: number) => {
    const nextLevelConfig = levelConfig.find(config => config.level === currentLevel + 1);
    const currentLevelConfig = levelConfig.find(config => config.level === currentLevel);
    
    if (!nextLevelConfig) {
      // If at max level, return 1000 as a placeholder for the progress bar
      return 1000;
    }
    if (!currentLevelConfig) return 500; // Default fallback
    
    return nextLevelConfig.xpRequired - currentLevelConfig.xpRequired;
  };

  // Save tasks to database (skip if guest mode)
  const saveTasks = async (updatedTodos: Todo[]) => {
    if (isGuestMode) {
      try {
        localStorage.setItem('lifelevel-guest-todos', JSON.stringify(updatedTodos));
      } catch (error) {
        console.warn('Could not save tasks to localStorage:', error);
      }
      return;
    }

    if (!accessToken || !user) return;

    // Always keep a localStorage backup so tasks survive API outages
    try {
      localStorage.setItem(`popple-tasks-${user.id}`, JSON.stringify(updatedTodos));
    } catch {}

    try {
      await taskApi.saveTasks(updatedTodos, accessToken);
    } catch (error) {
      console.error('Error saving tasks to API:', error);
    }
  };

  // Save progress to database (skip if guest mode)
  const saveProgress = async (progress: PlayerProgress) => {
    if (isGuestMode) {
      // In guest mode, save to localStorage instead
      try {
        localStorage.setItem('lifelevel-guest-progress', JSON.stringify(progress));
      } catch (error) {
        console.warn('Could not save progress to localStorage:', error);
      }
      return;
    }
    
    if (!accessToken || !user) {
      console.warn('Cannot save progress: missing access token or user');
      return;
    }
    
    try {
      await progressApi.saveProgress(progress, accessToken);
      console.log('Progress saved successfully');
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  // Save settings to database (skip if guest mode)
  const saveSettings = async (settings: any) => {
    if (isGuestMode) {
      // In guest mode, save to localStorage instead
      try {
        localStorage.setItem('lifelevel-guest-settings', JSON.stringify(settings));
      } catch (error) {
        console.warn('Could not save settings to localStorage:', error);
      }
      return;
    }
    
    if (!accessToken || !user) {
      console.warn('Cannot save settings: missing access token or user');
      return;
    }
    
    try {
      await settingsApi.saveSettings(settings, accessToken);
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Load guest data from localStorage
  const loadGuestData = () => {
    try {
      // Load guest todos
      const savedTodos = localStorage.getItem('lifelevel-guest-todos');
      if (savedTodos) {
        const parsedTodos = JSON.parse(savedTodos).map((todo: any) => ({
          ...todo,
          createdAt: new Date(todo.createdAt),
          completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
          destroyedAt: todo.destroyedAt ? new Date(todo.destroyedAt) : undefined,
        }));
        
        // If saved todos exist but array is empty, create example tasks
        if (parsedTodos.length === 0) {
          const now = new Date();
          const initialTodos: Todo[] = [
            // Active tasks for the todo list
            {
              id: 'example-1',
              text: 'Buy fresh groceries',
              completed: false,
              createdAt: new Date(now.getTime() - 60000), // 1 minute ago
            },
            {
              id: 'example-2', 
              text: 'Call the dentist',
              completed: false,
              createdAt: new Date(now.getTime() - 30000), // 30 seconds ago
            },
            {
              id: 'example-3',
              text: 'Pay monthly bills',
              completed: false,
              createdAt: now,
            },
            // Completed tasks for the game screen - so guests can experience the core mechanic
            {
              id: 'example-completed-1',
              text: 'Do laundry',
              completed: true,
              createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
              completedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
            },
            {
              id: 'example-completed-2',
              text: 'Clean kitchen',
              completed: true,
              createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
              completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            },
            {
              id: 'example-completed-3',
              text: 'Reply to emails',
              completed: true,
              createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
              completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            }
          ];
          setTodos(initialTodos);
          setDailyStats(generateDailyStats(initialTodos));
          // Save the initial example tasks to localStorage
          localStorage.setItem('lifelevel-guest-todos', JSON.stringify(initialTodos));
        } else {
          setTodos(parsedTodos);
          setDailyStats(generateDailyStats(parsedTodos));
        }
      } else {
        // Set example tasks for new guest users
        const now = new Date();
        const initialTodos: Todo[] = [
          // Active tasks for the todo list
          {
            id: 'example-1',
            text: 'Buy fresh groceries',
            completed: false,
            createdAt: new Date(now.getTime() - 60000), // 1 minute ago
          },
          {
            id: 'example-2', 
            text: 'Call the dentist',
            completed: false,
            createdAt: new Date(now.getTime() - 30000), // 30 seconds ago
          },
          {
            id: 'example-3',
            text: 'Pay monthly bills',
            completed: false,
            createdAt: now,
          },
          // Completed tasks for the game screen - so guests can experience the core mechanic
          {
            id: 'example-completed-1',
            text: 'Do laundry',
            completed: true,
            createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            completedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
          },
          {
            id: 'example-completed-2',
            text: 'Clean kitchen',
            completed: true,
            createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          },
          {
            id: 'example-completed-3',
            text: 'Reply to emails',
            completed: true,
            createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
            completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          }
        ];
        setTodos(initialTodos);
        setDailyStats(generateDailyStats(initialTodos));
      }

      // Load guest progress
      const savedProgress = localStorage.getItem('lifelevel-guest-progress');
      if (savedProgress) {
        const parsedProgress = JSON.parse(savedProgress);
        // Recalculate level in case level system was extended
        const { level: recalculatedLevel, currentXP: recalculatedCurrentXP } = calculateLevel(parsedProgress.totalXP);
        const updatedProgress = {
          ...parsedProgress,
          level: recalculatedLevel,
          currentXP: recalculatedCurrentXP
        };
        setPlayerProgress(updatedProgress);
      }

      // Load guest settings
      const savedSettings = localStorage.getItem('lifelevel-guest-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.backgroundTheme && parsedSettings.backgroundTheme !== backgroundTheme) {
          setBackgroundTheme(parsedSettings.backgroundTheme);
        }
        if (parsedSettings.gameSettings) {
          setGameSettings(parsedSettings.gameSettings);
        }
      }
    } catch (error) {
      console.error('Error loading guest data:', error);
      // Fallback to default data if loading fails
      const now = new Date();
      const initialTodos: Todo[] = [
        // Active tasks
        {
          id: 'example-1',
          text: 'Buy fresh groceries',
          completed: false,
          createdAt: new Date(now.getTime() - 60000),
        },
        {
          id: 'example-2', 
          text: 'Call the dentist',
          completed: false,
          createdAt: new Date(now.getTime() - 30000),
        },
        {
          id: 'example-3',
          text: 'Pay monthly bills',
          completed: false,
          createdAt: now,
        },
        // Completed tasks for game screen
        {
          id: 'example-completed-1',
          text: 'Do laundry',
          completed: true,
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
        {
          id: 'example-completed-2',
          text: 'Clean kitchen',
          completed: true,
          createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'example-completed-3',
          text: 'Reply to emails',
          completed: true,
          createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        }
      ];
      setTodos(initialTodos);
      setDailyStats(generateDailyStats(initialTodos));
    }
  };

  // Load user data from database
  const loadUserData = async (userAccessToken: string) => {
    if (!userAccessToken) {
      console.error('No access token provided to loadUserData');
      return;
    }
    
    try {
      console.log('Loading user data from database with token starting with:', userAccessToken.substring(0, 20) + '...');
      
      // First test server connectivity
      try {
        const { healthCheck } = await import('./utils/api');
        const healthResult = await healthCheck();
        if (healthResult.success) {
          console.log('Server health check passed');
        } else {
          console.warn('Server health check failed:', healthResult.error);
        }
      } catch (healthError) {
        console.warn('Could not perform health check:', healthError);
      }
      
      // Load tasks — fall back to localStorage backup if API returns nothing
      const userTasks = await taskApi.getTasks(userAccessToken);

      const parseTasks = (raw: any[]) => raw.map((todo: any) => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
        completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
        destroyedAt: todo.destroyedAt ? new Date(todo.destroyedAt) : undefined,
      }));

      if (userTasks.length > 0) {
        const tasksWithDates = parseTasks(userTasks);
        setTodos(tasksWithDates);
        setDailyStats(generateDailyStats(tasksWithDates));
      } else {
        // API returned nothing — try localStorage backup before clearing tasks
        try {
          const storedUser = getStoredUser();
          const cached = storedUser ? localStorage.getItem(`popple-tasks-${storedUser.id}`) : null;
          if (cached) {
            const tasksWithDates = parseTasks(JSON.parse(cached));
            setTodos(tasksWithDates);
            setDailyStats(generateDailyStats(tasksWithDates));
          }
        } catch {}
      }
      
      // Load progress
      const userProgress = await progressApi.getProgress(userAccessToken);
      console.log('Loaded progress:', userProgress);
      
      // Recalculate level based on current level config (in case level system was extended)
      const { level: recalculatedLevel, currentXP: recalculatedCurrentXP } = calculateLevel(userProgress.totalXP);
      const updatedProgress = {
        ...userProgress,
        level: recalculatedLevel,
        currentXP: recalculatedCurrentXP
      };
      
      console.log('Recalculated progress with new level system:', updatedProgress);
      setPlayerProgress(updatedProgress);
      
      // Save the recalculated progress back to database if level changed
      if (recalculatedLevel !== userProgress.level) {
        console.log(`Level updated from ${userProgress.level} to ${recalculatedLevel} due to extended level system`);
        await progressApi.saveProgress(updatedProgress, userAccessToken);
      }
      
      // Load settings
      const userSettings = await settingsApi.getSettings(userAccessToken);
      console.log('Loaded settings:', userSettings);
      
      // Only update background theme from server if different from localStorage
      if (userSettings.backgroundTheme && userSettings.backgroundTheme !== backgroundTheme) {
        setBackgroundTheme(userSettings.backgroundTheme);
      }
      setGameSettings(userSettings.gameSettings);
      
    } catch (error) {
      console.error('Error loading user data:', error);
      // If there's an error loading data, set some default tasks for new users
      const now = new Date();
      const initialTodos: Todo[] = [
        // Active tasks
        {
          id: 'example-1',
          text: 'Buy fresh groceries',
          completed: false,
          createdAt: new Date(now.getTime() - 60000), // 1 minute ago
        },
        {
          id: 'example-2', 
          text: 'Call the dentist',
          completed: false,
          createdAt: new Date(now.getTime() - 30000), // 30 seconds ago
        },
        {
          id: 'example-3',
          text: 'Pay monthly bills',
          completed: false,
          createdAt: now,
        },
        // Completed tasks for game screen
        {
          id: 'example-completed-1',
          text: 'Do laundry',
          completed: true,
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
        {
          id: 'example-completed-2',
          text: 'Clean kitchen',
          completed: true,
          createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'example-completed-3',
          text: 'Reply to emails',
          completed: true,
          createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        }
      ];
      
      setTodos(initialTodos);
      setDailyStats(generateDailyStats(initialTodos));
    }
  };

  // Check for existing session and load initial data
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = getStoredToken();
        const storedUser = getStoredUser();
        if (token && storedUser) {
          setUser(storedUser);
          setAccessToken(token);
          await loadUserData(token);
        }
      } catch (error) {
        console.error('Session check error:', error);
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Save background theme to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('lifelevel-background-theme', backgroundTheme);
    } catch (error) {
      console.warn('Could not save background theme to localStorage:', error);
    }
  }, [backgroundTheme]);

  // Save settings to server/localStorage when they change (with debouncing)
  useEffect(() => {
    if (user && (accessToken || isGuestMode)) {
      const timeoutId = setTimeout(() => {
        const settings = {
          backgroundTheme,
          gameSettings
        };
        saveSettings(settings);
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [backgroundTheme, gameSettings, user, accessToken, isGuestMode]);

  const generateDailyStats = (todoList: Todo[]): DailyStats[] => {
    const statsMap = new Map<string, { added: number; completed: number }>();
    
    todoList.forEach(todo => {
      // Count task creation
      const addedDate = todo.createdAt.toISOString().split('T')[0];
      if (!statsMap.has(addedDate)) {
        statsMap.set(addedDate, { added: 0, completed: 0 });
      }
      statsMap.get(addedDate)!.added++;
      
      // Count task completion separately (can be different date)
      if (todo.completed && todo.completedAt) {
        const completedDate = todo.completedAt.toISOString().split('T')[0];
        if (!statsMap.has(completedDate)) {
          statsMap.set(completedDate, { added: 0, completed: 0 });
        }
        statsMap.get(completedDate)!.completed++;
      }
    });
    
    return Array.from(statsMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const addXP = (amount: number) => {
    const newTotalXP = playerProgress.totalXP + amount;
    const { level: newLevel } = calculateLevel(newTotalXP);
    const oldLevel = playerProgress.level;
    
    // Check for level up
    if (newLevel > oldLevel) {
      const levelConfigItem = levelConfig.find(config => config.level === newLevel);
      if (levelConfigItem) {
        // Import toast and create a more engaging level up notification
        import('sonner').then(({ toast }) => {
          setTimeout(() => {
            toast.success(
              `${levelConfigItem.emoji} LEVEL UP! You're now a ${levelConfigItem.title}! ${levelConfigItem.emoji}\n\n${levelConfigItem.reward}`, 
              { duration: 4000 } // 4 seconds for level up (slightly longer since it's important)
            );
          }, 800);
        });
      }
    }
    
    const { currentXP } = calculateLevel(newTotalXP);
    
    const updatedProgress = {
      level: newLevel,
      currentXP,
      totalXP: newTotalXP,
      unlockedRewards: playerProgress.unlockedRewards
    };
    
    setPlayerProgress(updatedProgress);
    
    // Save progress to database
    saveProgress(updatedProgress);
  };

  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: new Date(),
    };
    
    const updatedTodos = [newTodo, ...todos];
    setTodos(updatedTodos);
    setDailyStats(generateDailyStats(updatedTodos));
    
    // Save to database
    saveTasks(updatedTodos);
  };

  const toggleTodo = (id: string) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id
        ? {
            ...todo,
            completed: !todo.completed,
            completedAt: !todo.completed ? new Date() : undefined,
          }
        : todo
    );
    
    setTodos(updatedTodos);
    setDailyStats(generateDailyStats(updatedTodos));
    
    // Save to database
    saveTasks(updatedTodos);
    
    // Note: XP is now only awarded when tasks are destroyed in the game screen
  };

  const editTodo = (id: string, newText: string) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id
        ? { ...todo, text: newText.trim() }
        : todo
    );

    setTodos(updatedTodos);
    setDailyStats(generateDailyStats(updatedTodos));
    saveTasks(updatedTodos);
  };

  const toggleTodoPriority = (id: string) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, priority: !todo.priority } : todo
    );
    setTodos(updatedTodos);
    saveTasks(updatedTodos);
  };

  const updateTodoNotes = (id: string, notes: string) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, notes } : todo
    );
    setTodos(updatedTodos);
    saveTasks(updatedTodos);
  };

  const reorderTodos = (dragIndex: number, hoverIndex: number) => {
    const activeTodos = todos.filter(todo => !todo.completed && !todo.destroyedAt);
    const otherTodos = todos.filter(todo => todo.completed || todo.destroyedAt);
    
    const draggedTodo = activeTodos[dragIndex];
    const reorderedActiveTodos = [...activeTodos];
    
    // Remove dragged item and insert at new position
    reorderedActiveTodos.splice(dragIndex, 1);
    reorderedActiveTodos.splice(hoverIndex, 0, draggedTodo);
    
    // Combine reordered active todos with other todos
    const updatedTodos = [...reorderedActiveTodos, ...otherTodos];
    
    setTodos(updatedTodos);
    setDailyStats(generateDailyStats(updatedTodos));
    
    // Save to database
    saveTasks(updatedTodos);
  };

  const deleteTodo = (id: string) => {
    const updatedTodos = todos.filter(todo => todo.id !== id);
    setTodos(updatedTodos);
    setDailyStats(generateDailyStats(updatedTodos));
    
    // Save to database
    saveTasks(updatedTodos);
  };

  const removePillFromGame = (id: string) => {
    // Mark the todo as destroyed but keep it in history
    const updatedTodos = todos.map(todo =>
      todo.id === id
        ? { ...todo, destroyedAt: new Date() }
        : todo
    );
    
    setTodos(updatedTodos);
    setDailyStats(generateDailyStats(updatedTodos));
    
    // Save to database
    saveTasks(updatedTodos);
  };

  const removeMultiplePillsFromGame = (ids: string[]) => {
    // Mark multiple todos as destroyed but keep them in history
    const idsSet = new Set(ids);
    const updatedTodos = todos.map(todo =>
      idsSet.has(todo.id)
        ? { ...todo, destroyedAt: new Date() }
        : todo
    );
    
    setTodos(updatedTodos);
    setDailyStats(generateDailyStats(updatedTodos));
    
    // Save to database
    saveTasks(updatedTodos);
  };


  const restoreTask = (id: string) => {
    // Create the updated todos array
    const updatedTodos = todos.map(todo =>
      todo.id === id
        ? {
            ...todo,
            completed: false,
            completedAt: undefined,
            destroyedAt: undefined,
            createdAt: new Date(), // Update creation date to current time
          }
        : todo
    );
    
    // Update state
    setTodos(updatedTodos);
    setDailyStats(generateDailyStats(updatedTodos));
    
    // Save to database
    saveTasks(updatedTodos);
  };

  const completedTodos = todos.filter(todo => todo.completed && !todo.destroyedAt);
  const currentTheme = backgroundThemes.find(t => t.id === backgroundTheme) || backgroundThemes[2];

  const handleAuthSuccess = async (authUser: any, userAccessToken: string) => {
    setUser(authUser);
    setAccessToken(userAccessToken);
    setIsGuestMode(false);

    const isNewUser = authUser.createdAt &&
      (Date.now() - new Date(authUser.createdAt).getTime()) < 5 * 60 * 1000;
    if (isNewUser) {
      try { localStorage.removeItem('popple-onboarding-complete'); } catch {}
      setShowOnboarding(true);
    }

    await loadUserData(userAccessToken);
  };

  const handleGuestMode = () => {
    // Always start fresh — clear any previous guest session data
    try {
      localStorage.removeItem('lifelevel-guest-todos');
      localStorage.removeItem('lifelevel-guest-progress');
      localStorage.removeItem('lifelevel-guest-settings');
      localStorage.removeItem('popple-onboarding-complete');
    } catch {}
    setShowOnboarding(true);
    setIsGuestMode(true);
    setUser({ id: 'guest', email: 'guest@example.com' });
    setAccessToken(null);
    loadGuestData();
  };

  const handleLogout = async () => {
    if (isGuestMode) {
      // For guest mode, just clear state
      setUser(null);
      setAccessToken(null);
      setIsGuestMode(false);
      setTodos([]);
      setDailyStats([]);
      setPlayerProgress({
        level: 1,
        currentXP: 0,
        totalXP: 0,
        unlockedRewards: []
      });
      setGameSettings({ animationType: 'sparkles' });
      return;
    }

    authSignOut();
    setUser(null);
    setAccessToken(null);
    setTodos([]);
    setDailyStats([]);
    setPlayerProgress({ level: 1, currentXP: 0, totalXP: 0, unlockedRewards: [] });
    setGameSettings({ animationType: 'sparkles' });
  };

  // Show landing page for first-time visitors (session check runs in background)
  if (showLanding && !user) {
    const handleLandingEnter = () => {
      setShowLanding(false);
    };
    const handleLandingGuest = () => {
      setShowLanding(false);
      handleGuestMode();
    };
    return <LandingPage onEnter={handleLandingEnter} onGuestMode={handleLandingGuest} />;
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show login flow if user is not authenticated
  if (!user) {
    return (
      <LoginFlow
        onAuthSuccess={handleAuthSuccess}
        onGuestMode={handleGuestMode}
        backgroundTheme={currentTheme.image}
      />
    );
  }

  // Show onboarding walkthrough once for new users
  if (showOnboarding) {
    return (
      <OnboardingFlow
        backgroundImage={currentTheme.image}
        onComplete={(firstTask) => {
          try { localStorage.setItem('popple-onboarding-complete', '1'); } catch {}
          if (firstTask) addTodo(firstTask);
          setShowOnboarding(false);
        }}
        onBackToLogin={handleLogout}
      />
    );
  }

  // Show password reset form after clicking an email reset link
  if (passwordRecoveryMode) {
    return <PasswordRecoveryScreen backgroundImage={currentTheme.image} onComplete={() => setPasswordRecoveryMode(false)} />;
  }

  return (
    <div
      className="flex flex-col relative"
      style={{
        minHeight: '100dvh',
        height: '100dvh',
        paddingTop: 'max(env(safe-area-inset-top), 50px)',
      }}
    >
      {/* Immersive Game Background */}
      {currentTheme.image && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pixelated"
          style={{ 
            backgroundImage: `url(${currentTheme.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            imageRendering: 'pixelated',
            // Extend background to fill behind safe-area top padding
            top: 'calc(-1 * max(env(safe-area-inset-top), 50px))',
          }}
        >
          {/* Light overlay to ensure content readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/15"></div>
        </div>
      )}
      
      {/* Fallback glass morphism background if no image */}
      {!currentTheme.image && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100"
          style={{ top: 'calc(-1 * max(env(safe-area-inset-top), 50px))' }}
        >
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-10 w-32 h-32 bg-white/20 rounded-full blur-xl"></div>
            <div className="absolute top-40 right-16 w-24 h-24 bg-cyan-200/30 rounded-full blur-lg"></div>
            <div className="absolute bottom-40 left-20 w-40 h-40 bg-blue-200/20 rounded-full blur-2xl"></div>
            <div className="absolute bottom-20 right-10 w-20 h-20 bg-indigo-200/40 rounded-full blur-lg"></div>
          </div>
        </div>
      )}
      
      {/* Fixed Top Navigation */}
      {/* Guest mode banner — shown above nav until dismissed */}
      {isGuestMode && !guestBannerDismissed && activeScreen !== 'game' && (
        <div
          className="fixed left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 px-4 py-2 flex items-center gap-3"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        >
          <p className="font-space-mono text-[10px] text-gray-400 flex-1 leading-snug">
            Guest mode — your progress won't be saved.
          </p>
          <button
            onClick={handleLogout}
            className="font-pixel text-[9px] text-cyan-400 hover:text-cyan-300 transition-colors whitespace-nowrap flex-shrink-0"
          >
            Create account
          </button>
          <button
            onClick={() => setGuestBannerDismissed(true)}
            className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <NavigationBar
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
        completedCount={completedTodos.length}
        isGuestMode={isGuestMode}
      />
      
      <Toaster
        position="top-center"
        expand={true}
        richColors={false}
        closeButton={false}
        offset={`calc(env(safe-area-inset-top) + 12px)`}
        gap={12}
        visibleToasts={5}
        toastOptions={{
          className: `toast-website toast-${backgroundTheme} ${activeScreen === 'todos' ? 'toast-tasks-screen' : activeScreen === 'game' ? 'toast-game-screen' : ''}`,
          duration: 2800,
          classNames: {
            success: '',
            error: '',
            warning: '',
            info: '',
          }
        }}
      />
      
      {/* Screen Content with bottom padding to account for fixed navbar + safe area */}
      <motion.div 
        className="flex-1 relative z-10 min-h-0"
        style={{
          paddingBottom: `calc(5rem + env(safe-area-inset-bottom))`
        }}
        key={activeScreen}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeScreen === 'todos' && (
          <TodoListScreen
            todos={todos}
            onAddTodo={addTodo}
            onToggleTodo={toggleTodo}
            onEditTodo={editTodo}
            onUpdateNotes={updateTodoNotes}
            onTogglePriority={toggleTodoPriority}
            onReorderTodos={reorderTodos}
            onDeleteTodo={deleteTodo}
            user={user}
          />
        )}
        
        {activeScreen === 'game' && (
          <GameScreen
            completedTodos={completedTodos}
            onRemovePill={removePillFromGame}
            onRemoveMultiplePills={removeMultiplePillsFromGame}
            gameSettings={gameSettings}
            playerProgress={playerProgress}
            levelConfig={levelConfig}
            getXPForNextLevel={getXPForNextLevel}
            addXP={addXP}
            backgroundThemes={backgroundThemes}
            backgroundTheme={backgroundTheme}
            onBackgroundThemeChange={setBackgroundTheme}
          />
        )}
        
        {activeScreen === 'log' && (
          <TaskHistoryScreen
            todos={todos}
            onRestoreTask={restoreTask}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsScreen
            user={user}
            isGuestMode={isGuestMode}
            onLogout={handleLogout}
            onRestartOnboarding={() => {
              try { localStorage.removeItem('popple-onboarding-complete'); } catch {}
              setShowOnboarding(true);
            }}
          />
        )}
      </motion.div>
    </div>
  );
}