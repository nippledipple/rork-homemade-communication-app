import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  QrCode, 
  Lock, 
  Info, 

  Trash2,
  ChevronRight,
  Shield,
  Globe,
  ShoppingBag
} from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useAppState } from '@/providers/AppStateProvider';
import { useLanguage } from '@/providers/LanguageProvider';
import { useShop } from '@/providers/ShopProvider';
import { useUserRole } from '@/providers/UserRoleProvider';

export default function SettingsScreen() {
  const { user, clearData } = useAuth();
  const { toggleDevMenu, devMenuEnabled } = useAppState();
  const { t } = useLanguage();
  const { hasAnyPremium } = useShop();
  const { userRole } = useUserRole();
  const [buildTaps, setBuildTaps] = useState(0);

  const handleBuildTap = () => {
    const newCount = buildTaps + 1;
    setBuildTaps(newCount);
    
    if (newCount >= 5) {
      toggleDevMenu();
      Alert.alert(
        t('dev.title'),
        devMenuEnabled ? t('alert.devMenu.disabled') : t('alert.devMenu.enabled')
      );
      setBuildTaps(0);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      t('alert.clearAllData.title'),
      t('alert.clearAllData.message'),
      [
        { text: t('alert.cancel'), style: 'cancel' },
        { 
          text: t('alert.clearEverything'), 
          style: 'destructive',
          onPress: async () => {
            await clearData();
            router.replace('/onboarding');
          }
        }
      ]
    );
  };

  const settingsItems = [
    {
      icon: QrCode,
      title: t('settings.myQrCode'),
      subtitle: t('settings.shareWithContacts'),
      onPress: () => router.push('/qr-display'),
    },
    {
      icon: Lock,
      title: t('settings.changePIN'),
      subtitle: t('settings.updateSecurityPIN'),
      onPress: () => router.push('/change-pin'),
    },
    // Show My Shop for sellers, regular Shop for buyers
    userRole === 'seller' ? {
      icon: ShoppingBag,
      title: t('shop.myShop'),
      subtitle: t('shop.manageProducts'),
      onPress: () => router.push('/(app)/my-shop'),
      isPremium: false,
    } : {
      icon: ShoppingBag,
      title: t('shop.title'),
      subtitle: hasAnyPremium ? t('settings.allFeaturesUnlocked') : t('settings.unlockAllFeatures'),
      onPress: () => router.push('/shop'),
      isPremium: true,
    },
    {
      icon: Shield,
      title: t('settings.security'),
      subtitle: t('settings.faceIdAutoLock'),
      onPress: () => router.push('/security'),
    },
    {
      icon: Globe,
      title: t('settings.language'),
      subtitle: t('settings.chooseLanguage'),
      onPress: () => router.push('/language'),
    },
    {
      icon: Trash2,
      title: t('settings.clearAllData'),
      subtitle: t('settings.deleteEverythingAndReset'),
      onPress: handleClearData,
      isDanger: true,
    },
  ];

  if (devMenuEnabled) {
    settingsItems.push({
      icon: Shield,
      title: t('settings.devMenu'),
      subtitle: t('settings.testingFeatures'),
      onPress: () => router.push('/dev-menu'),
      isDanger: false,
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
          <Text style={styles.userId}>ID: {user?.publicId?.slice(0, 8) || 'unknown'}</Text>
          {userRole && (
            <Text style={styles.userRole}>
              {userRole === 'seller' ? t('onboarding.seller') : t('onboarding.buyer')}
            </Text>
          )}
        </View>

        <View style={styles.settingsList}>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingItem}
              onPress={item.onPress}
            >
              <View style={[
                styles.iconContainer,
                item.isPremium && styles.premiumIcon,
                item.isDanger && styles.dangerIcon
              ]}>
                <item.icon size={20} color={
                  item.isDanger ? '#FF3B30' : 
                  item.isPremium ? '#FFD700' : 
                  '#FFFFFF'
                } />
              </View>
              
              <View style={styles.settingContent}>
                <Text style={[
                  styles.settingTitle,
                  item.isDanger && styles.dangerText
                ]}>
                  {item.title}
                </Text>
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              </View>
              
              <ChevronRight size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.aboutSection}
          onPress={handleBuildTap}
        >
          <Info size={16} color="#666" />
          <Text style={styles.aboutText}>{t('settings.about')}</Text>
          <Text style={styles.versionText}>
            {t('settings.version')} 1.0.0 ({t('settings.build')} 1)
            {buildTaps > 0 && ` (${5 - buildTaps} ${t('settings.tapsLeft')})`}
          </Text>
          {buildTaps > 0 && (
            <Text style={styles.devHintText}>
              {t('settings.tapMoreTimes')} {5 - buildTaps} {t('settings.moreTimesToEnable')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7EFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: '#666',
  },
  userRole: {
    fontSize: 12,
    color: '#2E7EFF',
    fontWeight: '500',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsList: {
    paddingHorizontal: 20,
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
  premiumIcon: {
    backgroundColor: '#FFD70020',
  },
  dangerIcon: {
    backgroundColor: '#FF3B3020',
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
  dangerText: {
    color: '#FF3B30',
  },
  aboutSection: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
  },
  versionText: {
    fontSize: 12,
    color: '#444',
  },
  devHintText: {
    fontSize: 11,
    color: '#2E7EFF',
    marginTop: 4,
    textAlign: 'center',
  },
});