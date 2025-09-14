import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lock } from 'lucide-react-native';

export default function ChangePinScreen() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [error, setError] = useState('');

  const handleNumberPress = (num: string) => {
    setError('');
    
    if (step === 'current') {
      if (currentPin.length < 8) {
        setCurrentPin(currentPin + num);
      }
    } else if (step === 'new') {
      if (newPin.length < 8) {
        setNewPin(newPin + num);
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < 8) {
        setConfirmPin(confirmPin + num);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'current') {
      setCurrentPin(currentPin.slice(0, -1));
    } else if (step === 'new') {
      setNewPin(newPin.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const handleNext = async () => {
    if (step === 'current') {
      if (currentPin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      
      // Verify current PIN
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
        
        if (storedPin !== currentPin) {
          setError('Incorrect PIN');
          setCurrentPin('');
          return;
        }
        setStep('new');
      } catch (error) {
        console.error('Failed to verify PIN:', error);
        setError('Failed to verify PIN');
      }
    } else if (step === 'new') {
      if (newPin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }
      if (newPin === currentPin) {
        setError('New PIN must be different from current PIN');
        return;
      }
      setStep('confirm');
    } else if (step === 'confirm') {
      if (confirmPin !== newPin) {
        setError('PINs do not match');
        setConfirmPin('');
        return;
      }
      
      // Save new PIN
      try {
        if (Platform.OS !== 'web') {
          try {
            await SecureStore.setItemAsync('userPin', newPin);
          } catch {
            await AsyncStorage.setItem('userPin', newPin);
          }
        } else {
          await AsyncStorage.setItem('userPin', newPin);
        }
        
        Alert.alert(
          'Success',
          'Your PIN has been changed successfully',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } catch (error) {
        console.error('Failed to save new PIN:', error);
        setError('Failed to save new PIN');
      }
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'current':
        return 'Enter Current PIN';
      case 'new':
        return 'Enter New PIN';
      case 'confirm':
        return 'Confirm New PIN';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'current':
        return 'Enter your current PIN to continue';
      case 'new':
        return 'Choose a new 4-8 digit PIN';
      case 'confirm':
        return 'Re-enter your new PIN to confirm';
    }
  };

  const getCurrentPin = () => {
    switch (step) {
      case 'current':
        return currentPin;
      case 'new':
        return newPin;
      case 'confirm':
        return confirmPin;
    }
  };

  const pin = getCurrentPin();
  const canProceed = pin.length >= 4;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Lock size={32} color="#2E7EFF" />
          </View>
          <Text style={styles.title}>{getTitle()}</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
        </View>

        <View style={styles.pinContainer}>
          <View style={styles.pinDots}>
            {[...Array(8)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  i < pin.length && styles.pinDotFilled,
                ]}
              />
            ))}
          </View>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.pinLength}>{pin.length} digits</Text>
          )}
        </View>

        <View style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.key}
              onPress={() => handleNumberPress(num.toString())}
            >
              <Text style={styles.keyText}>{num}</Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={[styles.key, styles.keyAction]}
            onPress={handleDelete}
            disabled={pin.length === 0}
          >
            <Text style={[styles.keyText, styles.keyActionText]}>⌫</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.key}
            onPress={() => handleNumberPress('0')}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.key, styles.keyAction, !canProceed && styles.keyDisabled]}
            onPress={handleNext}
            disabled={!canProceed}
          >
            <Text style={[styles.keyText, styles.keyActionText]}>
              {step === 'confirm' ? '✓' : '→'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1A1A1A',
  },
  pinDotFilled: {
    backgroundColor: '#2E7EFF',
  },
  pinLength: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyAction: {
    backgroundColor: 'transparent',
  },
  keyDisabled: {
    opacity: 0.3,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  keyActionText: {
    fontSize: 28,
    color: '#2E7EFF',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelText: {
    fontSize: 16,
    color: '#2E7EFF',
  },
});