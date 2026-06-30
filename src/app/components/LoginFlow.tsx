import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, ChevronRight, ChevronLeft } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase/client';

interface LoginFlowProps {
  onAuthSuccess: (user: any, accessToken: string) => void;
  onGuestMode: () => void;
  backgroundTheme: string;
}

const LoginFlow: React.FC<LoginFlowProps> = ({ onAuthSuccess, onGuestMode, backgroundTheme }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(true);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  const supabase = getSupabaseClient();

  const switchMode = (returning: boolean) => {
    setIsReturningUser(returning);
    setError('');
    setForgotPasswordSent(false);
    setPassword('');
    setConfirmPassword('');
  };

  const handleForgotPassword = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setForgotPasswordSent(true);
    } catch (err: any) {
      setError(err.message || 'Could not send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    setError('');

    if (currentStep === 0) {
      if (!email.trim()) { setError('Please enter your email address'); return; }
      if (!email.includes('@') || !email.includes('.')) { setError('Please enter a valid email address'); return; }
      setCurrentStep(1);
    } else {
      if (!password) { setError('Please enter a password'); return; }
      if (!isReturningUser && password !== confirmPassword) { setError('Passwords do not match'); return; }
      if (!isReturningUser && password.length < 6) { setError('Password must be at least 6 characters'); return; }

      setIsLoading(true);
      try {
        const emailToUse = email.trim();

        if (isReturningUser) {
          const { data, error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
          if (error) {
            setError(error.message.includes('Invalid login credentials')
              ? 'Email or password is incorrect.'
              : error.message);
            return;
          }
          onAuthSuccess(data.user, data.session.access_token);
        } else {
          const { data, error } = await supabase.auth.signUp({
            email: emailToUse,
            password,
            options: { data: { name: emailToUse.split('@')[0] } },
          });
          if (error) {
            if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists')) {
              setError('Account already exists. Sign in instead.');
              switchMode(true);
            } else {
              throw error;
            }
            return;
          }
          if (data.session) {
            onAuthSuccess(data.user, data.session.access_token);
          } else {
            setCurrentStep(0);
            switchMode(true);
            setError('Check your email to confirm your account, then sign in.');
          }
        }
      } catch (error: any) {
        setError(error.message || 'Something went wrong. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const canProceed = currentStep === 0
    ? email.trim().length > 0 && email.includes('@')
    : password.length > 0 && (isReturningUser || confirmPassword.length > 0);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pixelated"
        style={{
          backgroundImage: `url(${backgroundTheme})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/15" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="glass-strong rounded-3xl shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 pixel-notebook opacity-80" />

          <div className="relative z-10 notebook-content-area p-8">

            {/* Wordmark — always visible, anchors the card */}
            <div className="text-center mb-8">
              <h1
                className="font-pixel pixelated tracking-wider text-4xl leading-none mb-2"
                style={{ color: '#314158' }}
              >
                Popple
              </h1>
              <p className="font-space-mono text-xs text-slate-400">
                {currentStep === 0
                  ? isReturningUser ? 'Sign in to continue your adventure.' : 'Create an account to get started.'
                  : isReturningUser ? 'Enter your password.' : 'Create your password.'
                }
              </p>
            </div>

            {/* Steps */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ x: 14, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -14, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {currentStep === 0 ? (
                  <>
                    {/* Step 0 — email + intent switch */}
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && canProceed && handleNext()}
                        placeholder="your@email.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all duration-200 font-space-mono text-sm"
                        autoFocus
                      />
                    </div>

                  </>
                ) : (
                  <>
                    {/* Step 1 — password only */}

                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && canProceed && handleNext()}
                        placeholder="Password"
                        className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all duration-200 font-space-mono text-sm"
                        autoFocus
                      />
                    </div>

                    <AnimatePresence>
                      {!isReturningUser && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm password"
                              className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all duration-200 font-space-mono text-sm"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Password strength */}
                    {!isReturningUser && password.length > 0 && (
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`flex-1 h-1 rounded-full transition-colors duration-200 ${
                              password.length >= level * 2
                                ? password.length >= 8 ? 'bg-green-500' : password.length >= 6 ? 'bg-yellow-400' : 'bg-red-400'
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Forgot password */}
                    {isReturningUser && (
                      <div className="text-right">
                        {forgotPasswordSent ? (
                          <p className="font-space-mono text-xs text-green-700">Check your email for a reset link.</p>
                        ) : (
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={isLoading}
                            className="font-space-mono text-xs text-slate-400 hover:text-slate-600 transition-colors underline disabled:opacity-50"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 p-3 bg-red-50 border border-red-200 text-red-600 text-xs text-center font-space-mono rounded-xl"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-2 mt-5">
              {currentStep > 0 && (
                <button
                  onClick={() => { setCurrentStep(0); setError(''); }}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200 transition-all duration-200 disabled:opacity-50 font-space-mono text-xs rounded-xl"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}

              <button
                onClick={handleNext}
                disabled={!canProceed || isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white border-2 border-cyan-800 transition-all duration-200 font-pixel text-xs shadow-lg pixelated rounded-xl"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" style={{ borderRadius: '3px' }} />
                ) : (
                  <>
                    {currentStep === 0 ? 'Continue' : isReturningUser ? 'Sign In' : 'Create Account'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* New user options — only on step 0 */}
            {currentStep === 0 && (
              <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between px-2">
                <button
                  type="button"
                  onClick={() => switchMode(!isReturningUser)}
                  className="font-space-mono text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {isReturningUser ? 'Create an account' : 'Sign in instead'}
                </button>
                <button
                  onClick={onGuestMode}
                  disabled={isLoading}
                  className="font-space-mono text-xs text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                >
                  Try as Guest
                </button>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginFlow;
