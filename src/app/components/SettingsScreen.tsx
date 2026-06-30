import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Lock, BookOpen, ChevronRight, Check } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase/client';

interface SettingsScreenProps {
  user: any;
  isGuestMode: boolean;
  onLogout: () => void;
  onRestartOnboarding: () => void;
}

export default function SettingsScreen({ user, isGuestMode, onLogout, onRestartOnboarding }: SettingsScreenProps) {
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const supabase = getSupabaseClient();

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return; }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setChangingPassword(false);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Could not update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 flex flex-col">

        {/* Header — matches Tasks / Record */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-t-2xl shadow-lg border border-white/60 border-b-0 p-6 pixel-notebook">
            <h1 className="text-xl font-pixel text-gray-900">Settings</h1>
          </div>
        </motion.div>

        {/* Body — matches Record */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-b-2xl shadow-lg border border-white/60 border-t-0 pixel-notebook flex-1 overflow-y-auto">
            <div className="p-6 space-y-3 pb-4">

              {/* ── App section label ── */}
              <p className="font-space-mono text-[10px] text-gray-400 uppercase tracking-widest px-1">App</p>

              {/* How Popple Works — tap to launch */}
              <button
                onClick={onRestartOnboarding}
                className="w-full flex items-center gap-3 py-3 px-4 bg-gray-100/90 rounded-lg border border-gray-200/70 hover:bg-gray-800 hover:border-gray-700 active:bg-gray-900 transition-colors group"
              >
                <BookOpen className="w-4 h-4 text-gray-500 group-hover:text-white flex-shrink-0 transition-colors" />
                <div className="text-left">
                  <p className="font-space-mono text-sm text-gray-900 group-hover:text-white transition-colors">How Popple Works</p>
                  <p className="font-space-mono text-xs text-gray-500 group-hover:text-gray-300 mt-0.5 transition-colors">Replay the onboarding guide</p>
                </div>
              </button>

              {/* ── Account section label ── */}
              <p className="font-space-mono text-[10px] text-gray-400 uppercase tracking-widest px-1 pt-2">Account</p>

              {/* Email — static info, same base style as interactive rows but no hover */}
              <div className="flex items-center py-3 px-4 bg-gray-100/90 rounded-lg border border-gray-200/70">
                <div className="flex-1 min-w-0">
                  <p className="font-space-mono text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Signed in as</p>
                  <p className="font-space-mono text-sm text-gray-600 truncate">
                    {isGuestMode ? 'Guest' : user?.email || '—'}
                  </p>
                </div>
              </div>

              {/* Change password — expands inline */}
              {!isGuestMode && (
                <div>
                  <button
                    onClick={() => { setChangingPassword(v => !v); setPasswordError(''); setPasswordSuccess(false); }}
                    className="w-full flex items-center justify-between py-3 px-4 bg-gray-100/90 rounded-lg border border-gray-200/70 hover:bg-gray-800 hover:border-gray-700 active:bg-gray-900 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                      <span className="font-space-mono text-sm text-gray-900 group-hover:text-white transition-colors">Change Password</span>
                    </div>
                    <motion.div animate={{ rotate: changingPassword ? 90 : 0 }} transition={{ duration: 0.15 }}>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {changingPassword && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 py-3 px-4 bg-gray-100/90 rounded-lg border border-gray-200/70 space-y-2.5">
                          <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl font-space-mono text-sm text-gray-800 placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-colors"
                            autoFocus
                          />
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl font-space-mono text-sm text-gray-800 placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-colors"
                          />
                          {passwordError && (
                            <p className="font-space-mono text-xs text-red-600">{passwordError}</p>
                          )}
                          <button
                            onClick={handleChangePassword}
                            disabled={passwordLoading || passwordSuccess || !newPassword || !confirmPassword}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white font-pixel text-xs rounded-xl border-2 border-cyan-800 transition-colors shadow-md"
                          >
                            {passwordSuccess ? (
                              <><Check className="w-3.5 h-3.5" /> Updated</>
                            ) : passwordLoading ? (
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white animate-spin rounded-sm" />
                            ) : 'Update Password'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Sign out — tap to sign out */}
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 py-3 px-4 bg-gray-100/90 rounded-lg border border-gray-200/70 hover:bg-gray-800 hover:border-gray-700 active:bg-gray-900 transition-colors group"
              >
                <LogOut className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                <span className="font-space-mono text-sm text-gray-900 group-hover:text-white transition-colors">Sign Out</span>
              </button>

            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
