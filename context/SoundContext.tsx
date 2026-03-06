import React, { createContext, useContext, useCallback, useRef, useEffect, useState } from 'react';

type SoundType = 'success' | 'error' | 'warning' | 'notification' | 'click' | 'delete' | 'pop' | 'scan';

interface SoundContextType {
  playSound: (type: SoundType) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('isMuted') === 'true';
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const initAudio = () => {
        if (!audioContextRef.current) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                audioContextRef.current = new AudioCtx();
            }
        }
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    const handleInteraction = () => {
        initAudio();
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      localStorage.setItem('isMuted', String(newState));
      return newState;
    });
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (isMuted) return;
    
    // Ensure AudioContext is initialized
    if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
            audioContextRef.current = new AudioCtx();
        }
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'scan':
        // Professional scanner beep (clean sine with slight harmonic)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1600, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);

        // Subtle harmonic for richness
        const oscScan2 = ctx.createOscillator();
        const gainScan2 = ctx.createGain();
        oscScan2.connect(gainScan2);
        gainScan2.connect(ctx.destination);
        oscScan2.type = 'square';
        oscScan2.frequency.setValueAtTime(3200, now);
        gainScan2.gain.setValueAtTime(0.01, now);
        gainScan2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        oscScan2.start(now);
        oscScan2.stop(now + 0.1);
        break;

      case 'success':
        // Modern success chime (Major triad: C5 - E5 - G5)
        // Note 1
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);

        // Note 2
        const oscS2 = ctx.createOscillator();
        const gainS2 = ctx.createGain();
        oscS2.connect(gainS2);
        gainS2.connect(ctx.destination);
        oscS2.type = 'sine';
        oscS2.frequency.setValueAtTime(659.25, now + 0.05);
        gainS2.gain.setValueAtTime(0, now);
        gainS2.gain.linearRampToValueAtTime(0.05, now + 0.05);
        gainS2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        oscS2.start(now);
        oscS2.stop(now + 0.45);

        // Note 3
        const oscS3 = ctx.createOscillator();
        const gainS3 = ctx.createGain();
        oscS3.connect(gainS3);
        gainS3.connect(ctx.destination);
        oscS3.type = 'sine';
        oscS3.frequency.setValueAtTime(783.99, now + 0.1);
        gainS3.gain.setValueAtTime(0, now);
        gainS3.gain.linearRampToValueAtTime(0.05, now + 0.1);
        gainS3.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        oscS3.start(now);
        oscS3.stop(now + 0.5);
        break;

      case 'error':
        // Soft error "bonk"
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;

      case 'warning':
        // Gentle warning
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        
        const oscW2 = ctx.createOscillator();
        const gainW2 = ctx.createGain();
        oscW2.connect(gainW2);
        gainW2.connect(ctx.destination);
        oscW2.type = 'sine';
        oscW2.frequency.setValueAtTime(349.23, now + 0.15); // F4
        gainW2.gain.setValueAtTime(0, now);
        gainW2.gain.linearRampToValueAtTime(0.05, now + 0.15);
        gainW2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        oscW2.start(now);
        oscW2.stop(now + 0.45);
        break;

      case 'notification':
        // Glassy notification
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gainNode.gain.setValueAtTime(0.03, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'click':
        // High-end mechanical click
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.02);
        gainNode.gain.setValueAtTime(0.02, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.start(now);
        osc.stop(now + 0.02);
        break;
        
      case 'delete':
        // Quick "woosh" out
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
        
      case 'pop':
        // Cute pop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
    }
  }, [isMuted]);

  return (
    <SoundContext.Provider value={{ playSound, isMuted, toggleMute }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
};
