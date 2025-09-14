import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Lock, Delete, Fingerprint } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useAppState } from '@/providers/AppStateProvider';
import { useSecurity } from '@/providers/SecurityProvider';
import { useLanguage } from '@/providers/LanguageProvider';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LockScreen() {
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const { verifyPin } = useAuth();
  const { unlock } = useAppState();
  const { t } = useLanguage();
  const {
    securitySettings,
    verifyDecoyPin,
    enterDecoyMode,
    handleFailedAttempt,
    resetFailedAttempts,
    trackUserActivity,
  } = useSecurity();

  const handleUnlock = useCallback(() => {
    console.log('Unlocking app and navigating to chats...');
    unlock();
    // Add a small delay to ensure state is updated
    setTimeout(() => {
      console.log('Navigating to chats after unlock...');
      router.replace('/(app)/chats');
    }, 100);
  }, [unlock]);

  const promptBiometric = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock HomeMade',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
      });
      
      if (result.success) {
        handleUnlock();
      }
    } catch (error) {
      console.error('Biometric authentication failed:', error);
    }
  }, [handleUnlock]);

  const initializeBiometrics = useCallback(async () => {
    try {
      // Check if biometric is enabled in settings
      const biometricSetting = await AsyncStorage.getItem('biometricEnabled');
      const isEnabled = biometricSetting === 'true';
      setBiometricEnabled(isEnabled);

      if (isEnabled) {
        // Check hardware and enrollment
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        if (hasHardware && isEnrolled) {
          // Determine biometric type
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('Face ID');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('Touch ID');
          } else {
            setBiometricType('Biometric');
          }
          
          // Auto-prompt for biometric on load
          promptBiometric();
        }
      }
    } catch (error) {
      console.error('Failed to initialize biometrics:', error);
    }
  }, [promptBiometric]);

  useEffect(() => {
    initializeBiometrics();
  }, [initializeBiometrics]);



  const handlePinInput = (digit: string) => {
    if (isLocked) return;
    
    const newPin = pin + digit;
    setPin(newPin);
    
    if (newPin.length >= 4) {
      verifyPinCode(newPin);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const verifyPinCode = async (inputPin: string) => {
    // First check if it's the real PIN
    const isValidRealPin = await verifyPin(inputPin);
    
    if (isValidRealPin) {
      resetFailedAttempts();
      trackUserActivity(() => {});
      handleUnlock();
      return;
    }
    
    // Check if it's the decoy PIN (if enabled)
    if (securitySettings.decoyPinEnabled) {
      const isValidDecoyPin = await verifyDecoyPin(inputPin);
      if (isValidDecoyPin) {
        resetFailedAttempts();
        enterDecoyMode(true, handleUnlock);
        return;
      }
    }
    
    // Invalid PIN - handle failed attempt
    Vibration.vibrate(100);
    setPin('');
    setAttempts(attempts + 1);
    
    // Handle failed attempt (includes wipe-on-fail logic)
    await handleFailedAttempt();
    
    const remainingAttempts = securitySettings.wipeOnFailEnabled 
      ? Math.max(0, 5 - (securitySettings.failedAttempts + 1))
      : null;
    
    if (attempts >= 2) {
      setIsLocked(true);
      const message = securitySettings.wipeOnFailEnabled && remainingAttempts !== null
        ? `Too many attempts. ${remainingAttempts} ${t('security.attemptsRemaining')} before data wipe.`
        : 'Please wait 30 seconds';
      
      Alert.alert('Too Many Attempts', message);
      setTimeout(() => {
        setIsLocked(false);
        setAttempts(0);
      }, 30000);
    } else if (securitySettings.wipeOnFailEnabled && remainingAttempts !== null) {
      Alert.alert(
        'Wrong PIN',
        `${remainingAttempts} ${t('security.attemptsRemaining')} before data wipe.`,
        [{ text: t('alert.ok') }]
      );
    }
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDots}>
        {[...Array(6)].map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.dot,
              i < pin.length && styles.dotFilled
            ]} 
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Lock size={48} color="#2E7EFF" />
        <Text style={styles.title}>Enter PIN</Text>
        {isLocked && (
          <Text style={styles.errorText}>Too many attempts. Try again later.</Text>
        )}
        {securitySettings.wipeOnFailEnabled && securitySettings.failedAttempts > 0 && (
          <Text style={styles.warningText}>
            {5 - securitySettings.failedAttempts} {t('security.attemptsRemaining')}
          </Text>
        )}
      </View>

      {renderPinDots()}

      <View style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <TouchableOpacity
            key={num}
            style={styles.key}
            onPress={() => handlePinInput(num.toString())}
            disabled={isLocked}
          >
            <Text style={styles.keyText}>{num}</Text>
          </TouchableOpacity>
        ))}
        
        <View style={styles.key} />
        
        <TouchableOpacity
          style={styles.key}
          onPress={() => handlePinInput('0')}
          disabled={isLocked}
        >
          <Text style={styles.keyText}>0</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.key}
          onPress={handleDelete}
        >
          <Delete size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {biometricEnabled && biometricType && (
        <TouchableOpacity 
          style={styles.biometricButton}
          onPress={promptBiometric}
        >
          <Fingerprint size={20} color="#2E7EFF" />
          <Text style={styles.biometricText}>Use {biometricType}</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 8,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 60,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
  },
  dotFilled: {
    backgroundColor: '#2E7EFF',
    borderColor: '#2E7EFF',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 40,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  biometricText: {
    fontSize: 16,
    color: '#2E7EFF',
  },
  warningText: {
    fontSize: 14,
    color: '#FF9500',
    marginTop: 8,
    fontWeight: '600',
  },
});