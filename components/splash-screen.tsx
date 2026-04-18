'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HandHeart } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a0a00 0%, #2d1400 50%, #1a0a00 100%)',
          }}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 opacity-30">
            <div
              className="absolute inset-0 animate-gradient"
              style={{
                background: 'linear-gradient(45deg, #ff6b00, #ff8c32, #ffb366, #ff6b00)',
                backgroundSize: '400% 400%',
              }}
            />
          </div>

          {/* Floating particles effect */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/30"
                initial={{
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                  y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 50,
                  scale: Math.random() * 0.5 + 0.5,
                }}
                animate={{
                  y: -50,
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'linear',
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
            {/* Logo animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
              className="relative mb-8"
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute -inset-4 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,107,0,0.4) 0%, transparent 70%)',
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* Logo container */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-2xl animate-pulse-glow">
                <HandHeart className="w-12 h-12 text-primary-foreground" />
              </div>
            </motion.div>

            {/* Title animation */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <h1
                className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #ff6b00 0%, #ffb366 50%, #ff6b00 100%)',
                }}
              >
                Samarpan
              </h1>
            </motion.div>

            {/* Subtitle animation */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="text-primary-foreground/70 text-lg tracking-wider"
            >
              Digital Receipt Generator
            </motion.p>

            {/* Decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.8, ease: 'easeOut' }}
              className="w-32 h-0.5 mt-6 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, #ff6b00, transparent)',
              }}
            />

            {/* Loading indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-8 flex items-center gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Bottom decorative wave */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-24 opacity-20"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <svg
              viewBox="0 0 1440 120"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <path
                fill="#ff6b00"
                d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
              />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
