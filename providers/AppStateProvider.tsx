import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  isLocked: boolean;
  isPremium: boolean;
  devMenuEnabled: boolean;
}

export const [AppStateProvider, useAppState] = createContextHook(() => {
  const [isLocked, setIsLocked] = useState(false); // Start unlocked, will be set by auth flow
  const [isPremium, setIsPremium] = useState(false);
  const [devMenuEnabled, setDevMenuEnabled] = useState(false);
  const isInitialized = useRef(false);

  // Load app state only once on mount
  useEffect(() => {
    if (isInitialized.current) {
      console.log('AppState already initialized, skipping');
      return;
    }
    isInitialized.current = true;
    
    const loadAppState = async () => {
      try {
        const state = await AsyncStorage.getItem('appState');
        if (state) {
          const parsed = JSON.parse(state);
          setIsPremium(parsed.isPremium || false);
          setDevMenuEnabled(parsed.devMenuEnabled || false);
        }
      } catch (error) {
        console.error('Failed to load app state:', error);
      }
    };
    
    loadAppState();
  }, []);

  const saveAppState = useCallback(async (state: Partial<AppState>) => {
    try {
      const current = await AsyncStorage.getItem('appState');
      const parsed = current ? JSON.parse(current) : {};
      const updated = { ...parsed, ...state };
      await AsyncStorage.setItem('appState', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save app state:', error);
    }
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const lock = useCallback(() => {
    setIsLocked(true);
  }, []);

  const toggleDevMenu = useCallback(async () => {
    setDevMenuEnabled(prev => {
      const newState = !prev;
      saveAppState({ devMenuEnabled: newState });
      return newState;
    });
  }, [saveAppState]);

  const updatePremium = useCallback(async (value: boolean) => {
    setIsPremium(value);
    await saveAppState({ isPremium: value });
  }, [saveAppState]);

  return useMemo(() => ({
    isLocked,
    isPremium,
    devMenuEnabled,
    unlock,
    lock,
    toggleDevMenu,
    setIsPremium: updatePremium,
  }), [isLocked, isPremium, devMenuEnabled, unlock, lock, toggleDevMenu, updatePremium]);
});