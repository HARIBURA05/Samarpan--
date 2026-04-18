'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import {
  Loader2,
  HandHeart,
  ShieldCheck,
  User,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { SplashScreen } from '@/components/splash-screen';
import dynamic from 'next/dynamic';

const Splash3DScene = dynamic(
  () => import('@/components/splash-3d-scene').then((mod) => mod.Splash3DScene),
  { ssr: false }
);

type UserType = 'admin' | 'volunteer' | null;
type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { user, loginAsGuest, loading } = useAuth();

  const [showSplash, setShowSplash] = useState(true);
  const [selectedType, setSelectedType] = useState<UserType>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') router.push('/dashboard');
      else router.push('/volunteer');
    }
  }, [user, router]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleSelectType = (type: UserType) => {
    setSelectedType(type);
    setAuthMode('login');
    resetForm();
  };

  const handleBack = () => {
    setSelectedType(null);
    resetForm();
  };

  const handleGuestLogin = (role: 'admin' | 'volunteer') => {
    loginAsGuest(role);
    toast.success(`Logged in as Guest ${role === 'admin' ? 'Admin' : 'Volunteer'}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    if (authMode === 'signup' && !name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name.trim() });
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          name: name.trim(),
          email: cred.user.email,
          role: selectedType!, // 'admin' or 'volunteer' based on selection
          mandal_id: 'demo-mandal',
          status: 'active',
          created_at: serverTimestamp(),
        });
        toast.success(`Account created! Welcome, ${name.trim()} 🙏`);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Login successful!');
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast.error('Invalid email or password.');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password must be at least 6 characters.');
      } else {
        toast.error(error.message || 'Authentication failed. Try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>

      <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1a0a00 0%, #2d1400 30%, #3d1c00 60%, #1a0a00 100%)',
          }}
        />
        <Suspense fallback={null}>
          <Splash3DScene />
        </Suspense>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showSplash ? 0 : 1, y: showSplash ? 20 : 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-10 w-full max-w-md px-4"
        >
          <div className="glass-card rounded-3xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.5 }}
                className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center mb-4 shadow-lg animate-pulse-glow"
              >
                <HandHeart className="h-10 w-10 text-primary-foreground" />
              </motion.div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Welcome to Samarpan</h1>
              <p className="text-muted-foreground text-sm">Digital Receipt Generator</p>
            </div>

            <AnimatePresence mode="wait">
              {/* STEP 1: Choose user type */}
              {selectedType === null ? (
                <motion.div
                  key="type-select"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <p className="text-center text-sm text-muted-foreground mb-4">Login or sign up as</p>

                  {/* Admin option */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectType('admin')}
                    className="w-full p-4 rounded-2xl glass-primary flex items-center gap-4 text-left transition-all hover:shadow-lg group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-md">
                      <ShieldCheck className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        Admin <Sparkles className="w-4 h-4 text-primary" />
                      </h3>
                      <p className="text-xs text-muted-foreground">Manage dashboard, reports & settings</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </motion.button>

                  {/* Volunteer option */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectType('volunteer')}
                    className="w-full p-4 rounded-2xl glass-primary flex items-center gap-4 text-left transition-all hover:shadow-lg group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
                      <User className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Volunteer</h3>
                      <p className="text-xs text-muted-foreground">Create receipts & view collections</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </motion.button>

                  {/* Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or try demo</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-border/50 bg-transparent text-xs"
                      onClick={() => handleGuestLogin('admin')}
                    >
                      <ShieldCheck className="w-3 h-3 mr-1" /> Guest Admin
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-border/50 bg-transparent text-xs"
                      onClick={() => handleGuestLogin('volunteer')}
                    >
                      <User className="w-3 h-3 mr-1" /> Guest Volunteer
                    </Button>
                  </div>
                </motion.div>
              ) : (
                /* STEP 2: Login/Signup form for chosen role */
                <motion.div
                  key={`form-${selectedType}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {/* Role badge */}
                  <div className="flex items-center justify-between mb-5">
                    <button
                      onClick={handleBack}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        selectedType === 'admin'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-orange-500/20 text-orange-400'
                      }`}
                    >
                      {selectedType === 'admin' ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      ) : (
                        <User className="w-3.5 h-3.5" />
                      )}
                      {selectedType === 'admin' ? 'Admin' : 'Volunteer'}
                    </div>
                  </div>

                  {/* Login / Signup Toggle */}
                  <div className="flex rounded-xl bg-muted/40 p-1 mb-5">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); resetForm(); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        authMode === 'login'
                          ? 'bg-primary text-primary-foreground shadow'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <LogIn className="w-3.5 h-3.5" /> Login
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('signup'); resetForm(); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        authMode === 'signup'
                          ? 'bg-primary text-primary-foreground shadow'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Sign Up
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {authMode === 'signup' && (
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-foreground/80">Full Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-12 rounded-xl bg-muted/50 border-border/50"
                          disabled={isSubmitting}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground/80">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-xl bg-muted/50 border-border/50"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-foreground/80">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder={authMode === 'signup' ? 'Min. 6 characters' : 'Enter your password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl bg-muted/50 border-border/50"
                        disabled={isSubmitting}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-orange-600 hover:opacity-90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {authMode === 'signup' ? 'Creating Account...' : 'Signing in...'}</>
                      ) : authMode === 'signup' ? (
                        <><UserPlus className="mr-2 h-4 w-4" />Create {selectedType === 'admin' ? 'Admin' : 'Volunteer'} Account</>
                      ) : (
                        <><LogIn className="mr-2 h-4 w-4" />Login as {selectedType === 'admin' ? 'Admin' : 'Volunteer'}</>
                      )}
                    </Button>
                  </form>

                  <p className="text-xs text-center text-muted-foreground mt-4">
                    {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium"
                      onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); resetForm(); }}
                    >
                      {authMode === 'login' ? 'Sign Up' : 'Login'}
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center text-xs text-primary-foreground/50 mt-6"
          >
            Made with devotion for Indian festival mandals
          </motion.p>
        </motion.div>
      </main>
    </>
  );
}
