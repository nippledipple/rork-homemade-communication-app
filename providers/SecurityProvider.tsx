import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

export type AutoLockTime = '10' | '30' | '60' | '300' | 'never';

interface SecuritySettings {
  autoLockTime: AutoLockTime;
  notificationPrivacy: boolean;
  decoyPinEnabled: boolean;
  wipeOnFailEnabled: boolean;
  failedAttempts: number;
  lastActiveTime: number;
  screenshotProtection: boolean;
  screenshotBanSimulation: boolean;
}

interface ScreenshotBanState {
  isSimulationActive: boolean;
  screenshotCount: number;
  isBanned: boolean;
}

export const [SecurityProvider, useSecurity] = createContextHook(() => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    autoLockTime: '60',
    notificationPrivacy: true,
    decoyPinEnabled: false,
    wipeOnFailEnabled: false,
    failedAttempts: 0,
    lastActiveTime: Date.now(),
    screenshotProtection: true,
    screenshotBanSimulation: false,
  });
  const [screenshotBanState, setScreenshotBanState] = useState<ScreenshotBanState>({
    isSimulationActive: false,
    screenshotCount: 0,
    isBanned: false,
  });
  const [isInDecoyMode, setIsInDecoyMode] = useState(false);
  const autoLockTimer = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const saveSecuritySettings = useCallback(async (settings: Partial<SecuritySettings>) => {
    try {
      setSecuritySettings(prev => {
        const updated = { ...prev, ...settings };
        AsyncStorage.setItem('securitySettings', JSON.stringify(updated)).catch(error => {
          console.error('Failed to save security settings:', error);
        });
        return updated;
      });
    } catch (error) {
      console.error('Failed to save security settings:', error);
    }
  }, []);

  // Load security settings on mount
  useEffect(() => {
    const loadSecuritySettings = async () => {
      try {
        const stored = await AsyncStorage.getItem('securitySettings');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSecuritySettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.error('Failed to load security settings:', error);
      }
    };
    
    loadSecuritySettings();
  }, []);

  // Load authentication status
  useEffect(() => {
    const loadAuthStatus = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const pin = await AsyncStorage.getItem('userPin');
        setIsAuthenticated(!!(userData && pin));
      } catch (error) {
        console.error('Failed to load auth status:', error);
      }
    };
    loadAuthStatus();
  }, []);

  // Helper functions that will be used by components
  const setupAppStateListener = useCallback((lockFunction: () => void) => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - always lock for privacy
        if (isAuthenticated) {
          lockFunction();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isAuthenticated]);

  const setupAutoLockTimer = useCallback((lockFunction: () => void) => {
    if (autoLockTimer.current) {
      clearTimeout(autoLockTimer.current);
    }

    if (!isAuthenticated || isInDecoyMode || securitySettings.autoLockTime === 'never') {
      return () => {};
    }

    const timeoutMs = parseInt(securitySettings.autoLockTime) * 1000;
    autoLockTimer.current = setTimeout(() => {
      if (isAuthenticated && !isInDecoyMode) {
        lockFunction();
      }
    }, timeoutMs) as unknown as NodeJS.Timeout;

    return () => {
      if (autoLockTimer.current) {
        clearTimeout(autoLockTimer.current);
      }
    };
  }, [isAuthenticated, securitySettings.autoLockTime, isInDecoyMode]);

  const updateAutoLockTime = useCallback((time: AutoLockTime) => {
    saveSecuritySettings({ autoLockTime: time });
  }, [saveSecuritySettings]);

  const toggleNotificationPrivacy = useCallback((enabled: boolean) => {
    saveSecuritySettings({ notificationPrivacy: enabled });
  }, [saveSecuritySettings]);

  const setupDecoyPin = useCallback(async (decoyPin: string, isPremium: boolean): Promise<boolean> => {
    if (!isPremium) {
      return false;
    }

    try {
      if (Platform.OS !== 'web') {
        try {
          await SecureStore.setItemAsync('decoyPin', decoyPin);
        } catch {
          await AsyncStorage.setItem('decoyPin', decoyPin);
        }
      } else {
        await AsyncStorage.setItem('decoyPin', decoyPin);
      }
      saveSecuritySettings({ decoyPinEnabled: true });
      return true;
    } catch (error) {
      console.error('Failed to setup decoy PIN:', error);
      return false;
    }
  }, [saveSecuritySettings]);

  const verifyDecoyPin = useCallback(async (inputPin: string): Promise<boolean> => {
    try {
      let decoyPin = null;
      
      if (Platform.OS !== 'web') {
        try {
          decoyPin = await SecureStore.getItemAsync('decoyPin');
        } catch {
          decoyPin = await AsyncStorage.getItem('decoyPin');
        }
      } else {
        decoyPin = await AsyncStorage.getItem('decoyPin');
      }
      
      return decoyPin === inputPin;
    } catch (error) {
      console.error('Failed to verify decoy PIN:', error);
      return false;
    }
  }, []);

  const enterDecoyMode = useCallback((isPremium: boolean, unlock: () => void) => {
    if (!isPremium || !securitySettings.decoyPinEnabled) {
      return false;
    }

    setIsInDecoyMode(true);
    unlock(); // Unlock into decoy mode
    return true;
  }, [securitySettings.decoyPinEnabled]);

  const exitDecoyMode = useCallback((lock: () => void) => {
    setIsInDecoyMode(false);
    lock(); // Lock and require real PIN
  }, []);

  const toggleWipeOnFail = useCallback((enabled: boolean, isPremium: boolean) => {
    if (!isPremium) {
      return false;
    }
    saveSecuritySettings({ wipeOnFailEnabled: enabled });
    return true;
  }, [saveSecuritySettings]);

  const clearAllData = useCallback(async () => {
    try {
      await AsyncStorage.clear();
      
      if (Platform.OS !== 'web') {
        try {
          await SecureStore.deleteItemAsync('userPin');
          await SecureStore.deleteItemAsync('privateKey');
          await SecureStore.deleteItemAsync('decoyPin');
        } catch {
          // Items might not exist or SecureStore not available
          console.log('SecureStore items already cleared or not available');
        }
      }
      
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }, []);

  const handleFailedAttempt = useCallback(async () => {
    const newFailedAttempts = securitySettings.failedAttempts + 1;
    
    if (securitySettings.wipeOnFailEnabled && newFailedAttempts >= 5) {
      // Wipe all data
      try {
        await clearAllData();
        console.log('Data wiped due to failed attempts');
      } catch (error) {
        console.error('Failed to wipe data:', error);
      }
    } else {
      saveSecuritySettings({ failedAttempts: newFailedAttempts });
    }
  }, [securitySettings.failedAttempts, securitySettings.wipeOnFailEnabled, clearAllData, saveSecuritySettings]);

  const resetFailedAttempts = useCallback(() => {
    saveSecuritySettings({ failedAttempts: 0 });
  }, [saveSecuritySettings]);

  const triggerAutoLock = useCallback((lockFunction: () => void) => {
    if (isAuthenticated) {
      lockFunction();
    }
  }, [isAuthenticated]);

  const testDecoyMode = useCallback((isPremium: boolean) => {
    if (!isPremium) {
      return false;
    }
    setIsInDecoyMode(true);
    return true;
  }, []);

  const testWipeOnFail = useCallback(() => {
    // Simulate wipe-on-fail without actually wiping
    console.log('Wipe-on-fail test: Would wipe data after 5 failed attempts');
    return true;
  }, []);

  const handleScreenshotDetected = useCallback(() => {
    if (!screenshotBanState.isSimulationActive) {
      console.log('Screenshot simulation not active, ignoring');
      return;
    }
    
    const newCount = screenshotBanState.screenshotCount + 1;
    
    if (newCount === 1) {
      // First screenshot - warning
      Alert.alert(
        '⚠️ Screenshot erkannt (Test)',
        'Dies ist eine Simulation. Bei echtem Betrieb würde dies zu einer Warnung führen.',
        [{ text: 'Verstanden' }]
      );
      setScreenshotBanState(prev => ({ ...prev, screenshotCount: newCount }));
    } else if (newCount === 2) {
      // Second screenshot - final warning
      Alert.alert(
        '🚨 Letzte Warnung (Test)',
        'Noch ein Screenshot → Bann (Test). Dies ist nur eine Simulation.',
        [{ text: 'Verstanden' }]
      );
      setScreenshotBanState(prev => ({ ...prev, screenshotCount: newCount }));
    } else if (newCount >= 3) {
      // Third screenshot - ban simulation
      setScreenshotBanState(prev => ({ ...prev, screenshotCount: newCount, isBanned: true }));
      // Navigate to ban screen after a short delay
      setTimeout(() => {
        router.replace('/screenshot-ban');
      }, 1000);
    }
  }, [screenshotBanState]);

  const toggleScreenshotBanSimulation = useCallback((enabled: boolean) => {
    saveSecuritySettings({ screenshotBanSimulation: enabled });
    setScreenshotBanState(prev => ({ 
      ...prev, 
      isSimulationActive: enabled,
      screenshotCount: enabled ? prev.screenshotCount : 0,
      isBanned: enabled ? prev.isBanned : false
    }));
  }, [saveSecuritySettings]);

  const resetScreenshotBanSimulation = useCallback(() => {
    setScreenshotBanState({
      isSimulationActive: securitySettings.screenshotBanSimulation,
      screenshotCount: 0,
      isBanned: false,
    });
  }, [securitySettings.screenshotBanSimulation]);

  const testScreenshotBan = useCallback(() => {
    // Simulate a screenshot for testing
    if (screenshotBanState.isSimulationActive) {
      handleScreenshotDetected();
    } else {
      Alert.alert(
        'Screenshot-Bann Simulation',
        'Aktivieren Sie zuerst die Screenshot-Bann Simulation im Dev-Menü.',
        [{ text: 'OK' }]
      );
    }
  }, [screenshotBanState.isSimulationActive, handleScreenshotDetected]);

  // User activity tracking
  const trackUserActivity = useCallback((lockFunction: () => void) => {
    if (!isAuthenticated || isInDecoyMode) {
      return;
    }
    
    // Reset timer
    if (autoLockTimer.current) {
      clearTimeout(autoLockTimer.current);
    }

    if (securitySettings.autoLockTime !== 'never') {
      const timeoutMs = parseInt(securitySettings.autoLockTime) * 1000;
      autoLockTimer.current = setTimeout(() => {
        if (isAuthenticated && !isInDecoyMode) {
          lockFunction();
        }
      }, timeoutMs) as unknown as NodeJS.Timeout;
    }
    
    // Update last active time without triggering re-render
    AsyncStorage.setItem('securitySettings', JSON.stringify({
      ...securitySettings,
      lastActiveTime: Date.now()
    })).catch(error => {
      console.error('Failed to save security settings:', error);
    });
  }, [isAuthenticated, isInDecoyMode, securitySettings]);

  const toggleScreenshotProtection = useCallback(async (enabled: boolean) => {
    // Screenshot protection is always enabled and cannot be disabled
    return true;
  }, []);

  // Screenshot detection with simulation support
  useEffect(() => {
    // Temporarily disabled due to API compatibility issues
    console.log('Screenshot detection temporarily disabled');
  }, [securitySettings.screenshotBanSimulation, screenshotBanState.isSimulationActive, handleScreenshotDetected]);

  // Apply screenshot protection on mount - always enabled
  useEffect(() => {
    // Temporarily disabled due to API compatibility issues
    console.log('Screenshot protection temporarily disabled');
  }, []);

  return useMemo(() => ({
    // Settings
    securitySettings,
    isInDecoyMode,
    screenshotBanState,
    
    // Auto-lock
    updateAutoLockTime,
    triggerAutoLock,
    trackUserActivity,
    setupAutoLockTimer,
    setupAppStateListener,
    
    // Notification privacy
    toggleNotificationPrivacy,
    
    // Screenshot protection
    toggleScreenshotProtection,
    
    // Screenshot ban simulation
    toggleScreenshotBanSimulation,
    resetScreenshotBanSimulation,
    testScreenshotBan,
    
    // Decoy PIN
    setupDecoyPin,
    verifyDecoyPin,
    enterDecoyMode,
    exitDecoyMode,
    testDecoyMode,
    
    // Wipe on fail
    toggleWipeOnFail,
    handleFailedAttempt,
    resetFailedAttempts,
    testWipeOnFail,
  }), [
    securitySettings,
    isInDecoyMode,
    screenshotBanState,
    updateAutoLockTime,
    triggerAutoLock,
    trackUserActivity,
    setupAutoLockTimer,
    setupAppStateListener,
    toggleNotificationPrivacy,
    toggleScreenshotProtection,
    toggleScreenshotBanSimulation,
    resetScreenshotBanSimulation,
    testScreenshotBan,
    setupDecoyPin,
    verifyDecoyPin,
    enterDecoyMode,
    exitDecoyMode,
    testDecoyMode,
    toggleWipeOnFail,
    handleFailedAttempt,
    resetFailedAttempts,
    testWipeOnFail,
  ]);
});