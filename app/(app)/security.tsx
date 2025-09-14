import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Lock, 
  Fingerprint,
  Shield,
  Timer,
  ChevronRight,
  Bell,
  UserX,
  Trash2,
  Crown,
  Camera,
} from 'lucide-react-native';
import { useLanguage } from '@/providers/LanguageProvider';
import { useSecurity } from '@/providers/SecurityProvider';
import { useAppState } from '@/providers/AppStateProvider';

export default function SecurityScreen() {
  const { t } = useLanguage();
  const { isPremium } = useAppState();
  const {
    securitySettings,
    updateAutoLockTime,
    toggleNotificationPrivacy,
    setupDecoyPin,
    toggleWipeOnFail,
  } = useSecurity();
  
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasHardware, setHasHardware] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    loadSecuritySettings();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      setHasHardware(compatible);
      setIsEnrolled(enrolled);
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Touch ID');
      } else {
        setBiometricType('Biometric');
      }
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
    }
  };

  const loadSecuritySettings = async () => {
    try {
      const biometric = await AsyncStorage.getItem('biometricEnabled');
      setBiometricEnabled(biometric === 'true');
    } catch (error) {
      console.error('Failed to load security settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    if (value && (!hasHardware || !isEnrolled)) {
      Alert.alert(
        `${biometricType} Not Available`,
        !hasHardware 
          ? 'Your device does not support biometric authentication.'
          : `Please set up ${biometricType} in your device settings first.`,
        [{ text: t('alert.ok') }]
      );
      return;
    }

    if (value) {
      // Verify with biometric before enabling
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${biometricType} for HomeMade`,
          fallbackLabel: 'Use PIN',
          cancelLabel: t('alert.cancel'),
        });

        if (result.success) {
          setBiometricEnabled(true);
          await AsyncStorage.setItem('biometricEnabled', 'true');
          Alert.alert(
            t('alert.success'),
            t('security.faceIdWarning'),
            [{ text: t('alert.ok') }]
          );
        }
      } catch (error) {
        console.error('Biometric authentication failed:', error);
      }
    } else {
      setBiometricEnabled(false);
      await AsyncStorage.setItem('biometricEnabled', 'false');
      Alert.alert(
        t('alert.success'),
        `${biometricType} disabled. You will need to use your PIN to unlock the app.`,
        [{ text: t('alert.ok') }]
      );
    }
  };

  const handleChangePin = () => {
    router.push('/change-pin');
  };

  const handleDecoyPinSetup = () => {
    if (!isPremium) {
      Alert.alert(
        t('security.premiumRequired'),
        'Upgrade to Stealth Pack to use Decoy PIN feature.',
        [{ text: t('alert.ok') }]
      );
      return;
    }

    Alert.prompt(
      t('alert.decoyPin.setup'),
      t('alert.decoyPin.enter'),
      [
        { text: t('alert.cancel'), style: 'cancel' },
        {
          text: t('alert.setup'),
          onPress: async (pin) => {
            if (pin && pin.length >= 4 && pin.length <= 8) {
              const success = await setupDecoyPin(pin, isPremium);
              Alert.alert(
                success ? t('alert.success') : t('alert.error'),
                success ? t('alert.decoyPin.success') : t('alert.decoyPin.failed'),
                [{ text: t('alert.ok') }]
              );
            } else {
              Alert.alert(t('alert.error'), 'PIN must be 4-8 digits', [{ text: t('alert.ok') }]);
            }
          }
        }
      ],
      'secure-text'
    );
  };

  const handleWipeOnFailToggle = (enabled: boolean) => {
    if (!isPremium) {
      return;
    }

    if (enabled) {
      Alert.alert(
        t('alert.wipeOnFail.confirm'),
        t('security.wipeOnFailWarning'),
        [
          { text: t('alert.cancel'), style: 'cancel' },
          {
            text: t('alert.enable'),
            style: 'destructive',
            onPress: () => {
              toggleWipeOnFail(true, isPremium);
              Alert.alert(
                t('alert.success'),
                t('alert.wipeOnFail.enabled'),
                [{ text: t('alert.ok') }]
              );
            }
          }
        ]
      );
    } else {
      toggleWipeOnFail(false, isPremium);
      Alert.alert(
        t('alert.success'),
        t('alert.wipeOnFail.disabled'),
        [{ text: t('alert.ok') }]
      );
    }
  };

  const handleAutoLockChange = (time: string) => {
    updateAutoLockTime(time as any);
  };

  const autoLockOptions = [
    { label: t('security.after10sec'), value: '10' },
    { label: t('security.after30sec'), value: '30' },
    { label: t('security.after1min'), value: '60' },
    { label: t('security.after5min'), value: '300' },
    { label: t('security.never'), value: 'never' },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('security.title')}</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleChangePin}
          >
            <View style={styles.iconContainer}>
              <Lock size={20} color="#FFFFFF" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('settings.changePIN')}</Text>
              <Text style={styles.settingSubtitle}>{t('settings.updateSecurityPIN')}</Text>
            </View>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.settingItem}>
            <View style={styles.iconContainer}>
              <Fingerprint size={20} color="#FFFFFF" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>
                {biometricType || t('security.faceId')}
              </Text>
              <Text style={styles.settingSubtitle}>
                {biometricEnabled 
                  ? t('security.useFaceId')
                  : hasHardware && isEnrolled
                    ? `Enable ${biometricType} for quick access`
                    : !hasHardware
                      ? 'Not available on this device'
                      : `Set up ${biometricType} in device settings`
                }
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: '#3A3A3A', true: '#2E7EFF' }}
              thumbColor="#FFFFFF"
              disabled={!hasHardware || !isEnrolled}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('security.autoLock')}</Text>
          <Text style={styles.sectionDescription}>
            {t('security.lockAfterInactivity')}
          </Text>
          
          {autoLockOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.settingItem}
              onPress={() => handleAutoLockChange(option.value)}
            >
              <View style={styles.iconContainer}>
                <Timer size={20} color="#FFFFFF" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{option.label}</Text>
              </View>
              {securitySettings.autoLockTime === option.value && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Screenshot Protection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('security.screenshotProtection')}</Text>
          <Text style={styles.sectionDescription}>
            Screenshot-Schutz ist permanent aktiviert und kann nicht deaktiviert werden.
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.iconContainer}>
              <Camera size={20} color="#FFFFFF" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('security.screenshotProtection')}</Text>
              <Text style={styles.settingSubtitle}>
                Immer aktiviert - Screenshots werden erkannt und gemeldet
              </Text>
            </View>
            <View style={styles.permanentBadge}>
              <Text style={styles.permanentBadgeText}>AKTIV</Text>
            </View>
          </View>
        </View>

        {/* Notification Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('security.notificationPrivacy')}</Text>
          <Text style={styles.sectionDescription}>
            {t('security.notificationPrivacyDesc')}
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.iconContainer}>
              <Bell size={20} color="#FFFFFF" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{t('security.notificationPrivacy')}</Text>
              <Text style={styles.settingSubtitle}>
                {securitySettings.notificationPrivacy 
                  ? t('security.notificationPrivacyDesc')
                  : 'Show sender name and message preview'
                }
              </Text>
            </View>
            <Switch
              value={securitySettings.notificationPrivacy}
              onValueChange={toggleNotificationPrivacy}
              trackColor={{ false: '#3A3A3A', true: '#2E7EFF' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Premium Security Features */}
        <View style={styles.section}>
          <View style={styles.premiumHeader}>
            <Crown size={16} color={isPremium ? '#FFD700' : '#666'} />
            <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>
              Premium Security
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            {isPremium ? 'Advanced security features' : t('security.premiumRequired')}
          </Text>
          
          {/* Decoy PIN */}
          <TouchableOpacity
            style={[styles.settingItem, !isPremium && styles.disabledItem]}
            onPress={() => handleDecoyPinSetup()}
            disabled={!isPremium}
          >
            <View style={styles.iconContainer}>
              <UserX size={20} color={isPremium ? '#FFFFFF' : '#666'} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, !isPremium && styles.disabledText]}>
                {t('security.decoyPin')}
              </Text>
              <Text style={[styles.settingSubtitle, !isPremium && styles.disabledText]}>
                {securitySettings.decoyPinEnabled 
                  ? t('security.decoyPinEnabled')
                  : t('security.decoyPinDesc')
                }
              </Text>
            </View>
            <ChevronRight size={20} color={isPremium ? '#666' : '#333'} />
          </TouchableOpacity>

          {/* Wipe on Fail */}
          <View style={[styles.settingItem, !isPremium && styles.disabledItem]}>
            <View style={styles.iconContainer}>
              <Trash2 size={20} color={isPremium ? '#FF3B30' : '#666'} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, !isPremium && styles.disabledText]}>
                {t('security.wipeOnFail')}
              </Text>
              <Text style={[styles.settingSubtitle, !isPremium && styles.disabledText]}>
                {t('security.wipeOnFailDesc')}
              </Text>
              {securitySettings.wipeOnFailEnabled && (
                <Text style={styles.failedAttemptsText}>
                  {t('security.failedAttempts')}: {securitySettings.failedAttempts}/5
                </Text>
              )}
            </View>
            <Switch
              value={securitySettings.wipeOnFailEnabled}
              onValueChange={handleWipeOnFailToggle}
              trackColor={{ false: '#3A3A3A', true: '#FF3B30' }}
              thumbColor="#FFFFFF"
              disabled={!isPremium}
            />
          </View>
        </View>

        <View style={styles.infoSection}>
          <Shield size={16} color="#666" />
          <Text style={styles.infoText}>
            {biometricEnabled 
              ? t('security.faceIdWarning')
              : 'Enable biometric authentication for faster and more convenient access to your chats.'
            }
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    marginTop: -8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E7EFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledItem: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#666',
  },
  failedAttemptsText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    fontWeight: '600',
  },
  permanentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#00C851',
    borderRadius: 4,
  },
  permanentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});