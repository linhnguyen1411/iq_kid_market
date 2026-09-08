import React, { createContext, useContext, useState, useEffect } from 'react';
import { playSynthSound, SoundType } from '../components/game-engines/soundUtils';

interface SoundContextType {
  isSoundEnabled: boolean;
  isBgmEnabled: boolean;
  toggleSound: () => void;
  toggleBgm: () => void;
  playSound: (type: SoundType) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('iqkids_sound_enabled') !== 'false';
  });

  const [isBgmEnabled, setIsBgmEnabled] = useState<boolean>(() => {
    return localStorage.getItem('iqkids_bgm_enabled') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('iqkids_sound_enabled', String(isSoundEnabled));
  }, [isSoundEnabled]);

  useEffect(() => {
    localStorage.setItem('iqkids_bgm_enabled', String(isBgmEnabled));
  }, [isBgmEnabled]);

  const toggleSound = () => {
    setIsSoundEnabled((prev) => {
      const nextVal = !prev;
      if (nextVal) {
        // Play click sound when turned on
        setTimeout(() => playSynthSound('click'), 50);
      }
      return nextVal;
    });
  };

  const toggleBgm = () => {
    setIsBgmEnabled((prev) => !prev);
  };

  const playSound = (type: 'correct' | 'incorrect' | 'click' | 'victory') => {
    if (isSoundEnabled) {
      playSynthSound(type);
    }
  };

  return (
    <SoundContext.Provider
      value={{
        isSoundEnabled,
        isBgmEnabled,
        toggleSound,
        toggleBgm,
        playSound,
      }}
    >
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
