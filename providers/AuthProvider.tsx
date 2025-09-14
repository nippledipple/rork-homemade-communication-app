import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface User {
  displayName: string;
  publicId: string;
  publicKey: string;
}

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      console.log('Checking auth status...');
      setIsLoading(true);
      
      const userData = await AsyncStorage.getItem('user');
      let pin = null;
      
      if (Platform.OS !== 'web') {
        try {
          pin = await SecureStore.getItemAsync('userPin');
        } catch {
          console.log('SecureStore not available, using AsyncStorage fallback');
          pin = await AsyncStorage.getItem('userPin');
        }
      } else {
        // Web fallback - use AsyncStorage
        pin = await AsyncStorage.getItem('userPin');
      }
      
      console.log('Auth check results:', { 
        hasUser: !!userData, 
        hasPin: !!pin 
      });
      
      if (userData && pin) {
        const parsedUser = JSON.parse(userData);
        console.log('User found:', parsedUser.displayName);
        // Use setTimeout to ensure state updates happen after component is mounted
        setTimeout(() => {
          setUser(parsedUser);
          setIsOnboarded(true);
          // Don't auto-authenticate, require PIN entry
          setIsAuthenticated(false);
        }, 0);
      } else {
        console.log('No user data found, needs onboarding');
        setTimeout(() => {
          setIsOnboarded(false);
        }, 0);
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setIsOnboarded(false);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 0);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const setupUser = useCallback(async (displayName: string, pin: string, keys: KeyPair) => {
    try {
      console.log('Setting up user with name:', displayName);
      const publicId = generateUserId();
      const userData: User = {
        displayName,
        publicId,
        publicKey: keys.publicKey,
      };

      console.log('Saving user data...');
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      if (Platform.OS !== 'web') {
        try {
          await SecureStore.setItemAsync('userPin', pin);
          await SecureStore.setItemAsync('privateKey', keys.privateKey);
        } catch {
          // Fallback to AsyncStorage on web or if SecureStore fails
          await AsyncStorage.setItem('userPin', pin);
          await AsyncStorage.setItem('privateKey', keys.privateKey);
        }
      } else {
        // Web fallback
        await AsyncStorage.setItem('userPin', pin);
        await AsyncStorage.setItem('privateKey', keys.privateKey);
      }

      console.log('Updating state...');
      setUser(userData);
      setIsOnboarded(true);
      setIsAuthenticated(true);
      console.log('User setup complete');
    } catch (error) {
      console.error('Failed to setup user:', error);
      throw error;
    }
  }, []);

  const verifyPin = useCallback(async (inputPin: string): Promise<boolean> => {
    try {
      let storedPin = null;
      
      if (Platform.OS !== 'web') {
        try {
          storedPin = await SecureStore.getItemAsync('userPin');
        } catch {
          storedPin = await AsyncStorage.getItem('userPin');
        }
      } else {
        storedPin = await AsyncStorage.getItem('userPin');
      }
      
      const isValid = storedPin === inputPin;
      
      if (isValid) {
        setIsAuthenticated(true);
      }
      
      return isValid;
    } catch (error) {
      console.error('Failed to verify PIN:', error);
      return false;
    }
  }, []);

  const clearData = useCallback(async () => {
    try {
      await AsyncStorage.clear();
      
      if (Platform.OS !== 'web') {
        try {
          await SecureStore.deleteItemAsync('userPin');
          await SecureStore.deleteItemAsync('privateKey');
          await SecureStore.deleteItemAsync('userRole');
          await SecureStore.deleteItemAsync('userProducts');
        } catch {
          // Items might not exist or SecureStore not available
          console.log('SecureStore items already cleared or not available');
        }
      }
      
      setUser(null);
      setIsAuthenticated(false);
      setIsOnboarded(false);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }, []);

  const generateUserId = (): string => {
    return 'HM' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  };

  return useMemo(() => ({
    user,
    isAuthenticated,
    isOnboarded,
    isLoading,
    checkAuthStatus,
    setupUser,
    verifyPin,
    clearData,
  }), [user, isAuthenticated, isOnboarded, isLoading, checkAuthStatus, setupUser, verifyPin, clearData]);
});