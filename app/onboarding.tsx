import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Shield, User, Lock, ShoppingBag, UserCheck } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useAppState } from '@/providers/AppStateProvider';
import { useUserRole, UserRole } from '@/providers/UserRoleProvider';
import { useLanguage } from '@/providers/LanguageProvider';
import { generateKeyPair } from '@/utils/crypto';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setupUser } = useAuth();
  const { unlock } = useAppState();
  const { saveUserRole } = useUserRole();
  const { t } = useLanguage();
  
  console.log('OnboardingScreen render:', { step, selectedRole, displayName: displayName.length > 0 });

  const handleNext = () => {
    if (step === 1) {
      if (displayName.trim().length < 2) {
        Alert.alert(t('alert.error'), t('onboarding.nameRequired'));
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleSetupPin = async () => {
    if (pin.length < 4 || pin.length > 8) {
      Alert.alert(t('alert.error'), t('onboarding.invalidPin'));
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert(t('alert.error'), t('onboarding.pinMismatch'));
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting PIN setup...');
      const keys = await generateKeyPair();
      console.log('Keys generated:', { publicKey: keys.publicKey.substring(0, 10) + '...' });
      
      // First save the user role
      await saveUserRole(selectedRole);
      console.log('User role saved:', selectedRole);
      
      // Then setup the user (this will set isAuthenticated to true)
      await setupUser(displayName, pin, keys);
      console.log('User setup completed successfully');
      
      // Unlock the app
      unlock();
      console.log('App unlocked');
      
      // Navigate based on role with a longer delay to ensure all state updates are complete
      setTimeout(() => {
        console.log('Navigating after setup completion...');
        if (selectedRole === 'seller') {
          Alert.alert(
            t('onboarding.welcomeSeller'),
            t('onboarding.sellerHint'),
            [{ text: t('alert.ok'), onPress: () => {
              console.log('Seller alert dismissed, navigating to chats...');
              router.replace('/(app)/chats');
            }}]
          );
        } else {
          console.log('Buyer setup complete, navigating to chats...');
          router.replace('/(app)/chats');
        }
      }, 500);
    } catch (error) {
      console.error('Setup failed:', error);
      Alert.alert(
        t('alert.error'), 
        t('onboarding.setupFailed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Shield size={60} color="#2E7EFF" />
            <Text style={styles.title}>HomeMade</Text>
            <Text style={styles.subtitle}>Secure Messenger</Text>
          </View>

          {step === 1 ? (
            <View style={styles.form}>
              <View style={styles.stepIndicator}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>

              <View style={styles.inputSection}>
                <User size={24} color="#666" style={styles.inputIcon} />
                <Text style={styles.label}>{t('onboarding.chooseName')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('onboarding.enterName')}
                  placeholderTextColor="#666"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  maxLength={30}
                />
                <Text style={styles.hint}>
                  {t('onboarding.nameHint')}
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.button, !displayName.trim() && styles.buttonDisabled]}
                onPress={handleNext}
                disabled={!displayName.trim()}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          ) : step === 2 ? (
            <View style={styles.form}>
              <View style={styles.stepIndicator}>
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
              </View>

              <View style={styles.inputSection}>
                <ShoppingBag size={24} color="#666" style={styles.inputIcon} />
                <Text style={styles.label}>{t('onboarding.chooseRole')}</Text>
                
                <TouchableOpacity 
                  style={[styles.roleOption, selectedRole === 'buyer' && styles.roleOptionSelected]}
                  onPress={() => setSelectedRole('buyer')}
                >
                  <View style={styles.roleIconContainer}>
                    <UserCheck size={20} color={selectedRole === 'buyer' ? '#2E7EFF' : '#666'} />
                  </View>
                  <View style={styles.roleContent}>
                    <Text style={[styles.roleTitle, selectedRole === 'buyer' && styles.roleTitleSelected]}>
                      {t('onboarding.buyer')}
                    </Text>
                    <Text style={styles.roleDescription}>
                      {t('onboarding.buyerDescription')}
                    </Text>
                  </View>
                  <View style={[styles.radioButton, selectedRole === 'buyer' && styles.radioButtonSelected]} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.roleOption, selectedRole === 'seller' && styles.roleOptionSelected]}
                  onPress={() => setSelectedRole('seller')}
                >
                  <View style={styles.roleIconContainer}>
                    <ShoppingBag size={20} color={selectedRole === 'seller' ? '#2E7EFF' : '#666'} />
                  </View>
                  <View style={styles.roleContent}>
                    <Text style={[styles.roleTitle, selectedRole === 'seller' && styles.roleTitleSelected]}>
                      {t('onboarding.seller')}
                    </Text>
                    <Text style={styles.roleDescription}>
                      {t('onboarding.sellerDescription')}
                    </Text>
                  </View>
                  <View style={[styles.radioButton, selectedRole === 'seller' && styles.radioButtonSelected]} />
                </TouchableOpacity>
                
                <Text style={styles.hint}>
                  {t('onboarding.roleHint')}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.button}
                onPress={handleNext}
              >
                <Text style={styles.buttonText}>{t('alert.continue')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setStep(1)}
              >
                <Text style={styles.backButtonText}>{t('onboarding.back')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.stepIndicator}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={[styles.dot, styles.dotActive]} />
              </View>

              <View style={styles.inputSection}>
                <Lock size={24} color="#666" style={styles.inputIcon} />
                <Text style={styles.label}>{t('onboarding.setPin')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('onboarding.enterPin')}
                  placeholderTextColor="#666"
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={8}
                />
                
                <TextInput
                  style={[styles.input, { marginTop: 16 }]}
                  placeholder={t('onboarding.confirmPin')}
                  placeholderTextColor="#666"
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={8}
                />
                
                <Text style={styles.hint}>
                  {t('onboarding.pinHint')}
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.button, (!pin || !confirmPin || isLoading) && styles.buttonDisabled]}
                onPress={handleSetupPin}
                disabled={!pin || !confirmPin || isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? t('onboarding.settingUp') : t('onboarding.completeSetup')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setStep(2)}
              >
                <Text style={styles.backButtonText}>{t('onboarding.back')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  form: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  dotActive: {
    backgroundColor: '#2E7EFF',
  },
  inputSection: {
    marginBottom: 40,
  },
  inputIcon: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2E7EFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  roleOptionSelected: {
    borderColor: '#2E7EFF',
    backgroundColor: '#2E7EFF10',
  },
  roleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  roleTitleSelected: {
    color: '#2E7EFF',
  },
  roleDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 18,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    backgroundColor: 'transparent',
  },
  radioButtonSelected: {
    borderColor: '#2E7EFF',
    backgroundColor: '#2E7EFF',
  },
});