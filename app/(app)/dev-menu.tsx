import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  Crown, 
  MessageSquarePlus, 
  RefreshCw,
  Wifi,
  Bug,
  ShoppingBag,
  Shield,
  UserX,
  Trash2,
  Lock,
  Camera,
  RotateCcw,
  CreditCard,
  Package,
  Download
} from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';
import { useChats } from '@/providers/ChatProvider';
import { useWSS } from '@/providers/WSSProvider';
import { useLanguage } from '@/providers/LanguageProvider';
import { useShop } from '@/providers/ShopProvider';
import { useSecurity } from '@/providers/SecurityProvider';
import { useUserRole } from '@/providers/UserRoleProvider';

export default function DevMenuScreen() {
  const { isPremium, setIsPremium } = useAppState();
  const { clearAllChats } = useChats();
  const wss = useWSS();
  const { t } = useLanguage();
  const { testMode, enableTestMode, resetPurchases, restorePurchases, simulatePurchase } = useShop();
  const {
    testDecoyMode,
    testWipeOnFail,
    toggleScreenshotBanSimulation,
    resetScreenshotBanSimulation,
    testScreenshotBan,
    securitySettings,
  } = useSecurity();
  const { userRole, simulateSellerRole, addDummyProducts, clearAllProducts } = useUserRole();

  const handleAddDemoChat = () => {
    Alert.alert('Demo Chats Removed', 'Use QR codes to add real contacts for A↔B messaging over the internet.');
  };

  const handleResetPurchases = () => {
    Alert.alert(
      'Reset All Purchases',
      'This will clear all purchase data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setIsPremium(false);
            resetPurchases();
            Alert.alert(t('alert.success'), t('alert.purchases.reset'));
          }
        }
      ]
    );
  };

  const handleRestorePurchases = async () => {
    const success = await restorePurchases();
    console.log('Restore purchases result:', success);
  };

  const handleSimulatePurchase = () => {
    Alert.alert(
      'Simulate Purchase',
      'Which package would you like to simulate purchasing?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pro Pack', onPress: () => simulatePurchase('pro_pack') },
        { text: 'Stealth Pack', onPress: () => simulatePurchase('stealth_pack') },
        { text: 'Power Pack', onPress: () => simulatePurchase('power_pack') },
        { text: 'Vault Pack', onPress: () => simulatePurchase('vault_pack') },
        { text: 'Media Pack', onPress: () => simulatePurchase('media_pack') },
      ]
    );
  };

  const handleClearChats = () => {
    Alert.alert(
      t('alert.clearAllChats.title'),
      t('alert.clearAllChats.message'),
      [
        { text: t('alert.cancel'), style: 'cancel' },
        { 
          text: t('alert.clear'), 
          style: 'destructive',
          onPress: () => {
            clearAllChats();
            Alert.alert(t('alert.success'), t('alert.chats.cleared'));
          }
        }
      ]
    );
  };

  const handleTestDecoyMode = () => {
    const success = testDecoyMode(isPremium);
    Alert.alert(
      t('alert.success'),
      success ? t('alert.decoyMode.entered') : 'Premium required for decoy mode',
      [{ text: t('alert.ok') }]
    );
  };

  const handleTestWipeOnFail = () => {
    testWipeOnFail();
    Alert.alert(
      t('alert.success'),
      t('alert.wipeTest.simulated'),
      [{ text: t('alert.ok') }]
    );
  };

  const handleTriggerAutoLock = () => {
    // We need to get the lock function from AppStateProvider
    // For now, just show a message that this would trigger auto-lock
    Alert.alert(
      t('alert.success'),
      'Auto-lock would be triggered (requires lock function)',
      [{ text: t('alert.ok') }]
    );
  };

  const devOptions = [
    {
      icon: Crown,
      title: t('dev.simulatePremium'),
      subtitle: t('dev.togglePremiumFeatures'),
      hasSwitch: true,
      value: isPremium,
      onToggle: setIsPremium,
    },
    {
      icon: ShoppingBag,
      title: t('dev.shopTesting'),
      subtitle: t('dev.simulatePurchases'),
      hasSwitch: true,
      value: testMode,
      onToggle: enableTestMode,
    },
    {
      icon: MessageSquarePlus,
      title: 'Real Chat Only',
      subtitle: 'Demo chats removed - scan QR codes for real A↔B messaging',
      onPress: handleAddDemoChat,
    },
    {
      icon: RefreshCw,
      title: t('dev.resetAllPurchases'),
      subtitle: t('dev.clearAllPurchases'),
      onPress: handleResetPurchases,
      isDanger: true,
    },
    {
      icon: Wifi,
      title: t('dev.forceOfflineMode'),
      subtitle: t('dev.simulateConnectionLoss'),
      onPress: () => Alert.alert(t('alert.feature.comingSoon'), t('alert.feature.comingSoon')),
    },
    {
      icon: Bug,
      title: t('dev.clearAllChats'),
      subtitle: t('dev.deleteAllConversations'),
      onPress: handleClearChats,
      isDanger: true,
    },
  ];

  const handleToggleScreenshotBanSimulation = (enabled: boolean) => {
    toggleScreenshotBanSimulation(enabled);
    Alert.alert(
      t('alert.success'),
      enabled ? 'Screenshot-Bann Simulation aktiviert' : 'Screenshot-Bann Simulation deaktiviert',
      [{ text: t('alert.ok') }]
    );
  };

  const handleResetScreenshotBanSimulation = () => {
    resetScreenshotBanSimulation();
    Alert.alert(
      t('alert.success'),
      'Screenshot-Bann Simulation zurückgesetzt',
      [{ text: t('alert.ok') }]
    );
  };

  const handleTestScreenshotBan = () => {
    testScreenshotBan();
  };

  const securityQAOptions = [
    {
      icon: UserX,
      title: t('dev.testDecoyPin'),
      subtitle: t('dev.enterDecoyMode'),
      onPress: handleTestDecoyMode,
    },
    {
      icon: Trash2,
      title: t('dev.testWipeOnFail'),
      subtitle: t('dev.simulateWipe'),
      onPress: handleTestWipeOnFail,
    },
    {
      icon: Lock,
      title: t('dev.triggerAutoLock'),
      subtitle: t('dev.lockAppNow'),
      onPress: handleTriggerAutoLock,
    },
    {
      icon: Camera,
      title: 'Screenshot-Bann Simulation',
      subtitle: 'Aktiviert/deaktiviert die Screenshot-Bann Simulation',
      hasSwitch: true,
      value: securitySettings.screenshotBanSimulation,
      onToggle: handleToggleScreenshotBanSimulation,
    },
    {
      icon: Camera,
      title: 'Screenshot simulieren',
      subtitle: 'Löst einen Screenshot-Event für Tests aus',
      onPress: handleTestScreenshotBan,
    },
    {
      icon: RotateCcw,
      title: 'Screenshot-Bann zurücksetzen',
      subtitle: 'Setzt den Screenshot-Zähler zurück',
      onPress: handleResetScreenshotBanSimulation,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('dev.title')}</Text>
        <Text style={styles.subtitle}>{t('dev.subtitle')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {devOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.option}
            onPress={option.onPress}
            disabled={option.hasSwitch}
          >
            <View style={[
              styles.iconContainer,
              option.isDanger && styles.dangerIcon
            ]}>
              <option.icon size={20} color={
                option.isDanger ? '#FF3B30' : '#FFFFFF'
              } />
            </View>
            
            <View style={styles.optionContent}>
              <Text style={[
                styles.optionTitle,
                option.isDanger && styles.dangerText
              ]}>
                {option.title}
              </Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
            
            {option.hasSwitch && (
              <Switch
                value={option.value}
                onValueChange={option.onToggle}
                trackColor={{ false: '#333', true: '#2E7EFF' }}
                thumbColor="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        ))}

        {/* IAP Testing Section */}
        <View style={styles.sectionHeader}>
          <CreditCard size={16} color="#666" />
          <Text style={styles.sectionTitle}>IAP Testing</Text>
        </View>
        
        <TouchableOpacity
          style={styles.option}
          onPress={handleRestorePurchases}
        >
          <View style={styles.iconContainer}>
            <RefreshCw size={20} color="#FFFFFF" />
          </View>
          
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Restore Purchases</Text>
            <Text style={styles.optionSubtitle}>Test purchase restoration flow</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.option}
          onPress={handleSimulatePurchase}
        >
          <View style={styles.iconContainer}>
            <Package size={20} color="#FFFFFF" />
          </View>
          
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Simulate Purchase</Text>
            <Text style={styles.optionSubtitle}>Test purchase flow without payment</Text>
          </View>
        </TouchableOpacity>

        {/* Seller QA Section */}
        <View style={styles.sectionHeader}>
          <ShoppingBag size={16} color="#666" />
          <Text style={styles.sectionTitle}>{t('dev.sellerQA')}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.option}
          onPress={() => {}}
          disabled
        >
          <View style={styles.iconContainer}>
            <ShoppingBag size={20} color="#FFFFFF" />
          </View>
          
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{t('dev.simulateSeller')}</Text>
            <Text style={styles.optionSubtitle}>Toggle between Buyer/Seller role</Text>
          </View>
          
          <Switch
            value={userRole === 'seller'}
            onValueChange={(enabled) => simulateSellerRole(enabled)}
            trackColor={{ false: '#333', true: '#2E7EFF' }}
            thumbColor="#FFFFFF"
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.option}
          onPress={async () => {
            try {
              await addDummyProducts();
              Alert.alert(t('alert.success'), t('alert.dummyProductsAdded'));
            } catch (error: any) {
              Alert.alert(t('alert.error'), error.message);
            }
          }}
        >
          <View style={styles.iconContainer}>
            <Package size={20} color="#FFFFFF" />
          </View>
          
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{t('dev.addDummyProducts')}</Text>
            <Text style={styles.optionSubtitle}>Add 3 test products to shop</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.option}
          onPress={() => {
            Alert.alert(
              t('dev.clearProducts'),
              'Clear all products from local storage?',
              [
                { text: t('alert.cancel'), style: 'cancel' },
                {
                  text: t('alert.clear'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await clearAllProducts();
                      Alert.alert(t('alert.success'), t('alert.productsCleared'));
                    } catch (error: any) {
                      Alert.alert(t('alert.error'), error.message);
                    }
                  }
                }
              ]
            );
          }}
        >
          <View style={styles.iconContainer}>
            <Trash2 size={20} color="#FFFFFF" />
          </View>
          
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{t('dev.clearProducts')}</Text>
            <Text style={styles.optionSubtitle}>Delete all products locally</Text>
          </View>
        </TouchableOpacity>

        {/* WSS-Only Debug Section (WebRTC REMOVED) */}
        <View style={styles.sectionHeader}>
          <Wifi size={16} color="#666" />
          <Text style={styles.sectionTitle}>WSS Connection Debug</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Verbindungsmethode:</Text>
          <Text style={[styles.statusValue, styles.statusConnected]}>
            WSS
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>WSS Relay:</Text>
          <Text style={[styles.statusValue, 
            wss.state === 'connected' ? styles.statusConnected : 
            wss.state === 'reconnecting' ? styles.statusFallback :
            styles.statusDisconnected]}>
            {wss.state === 'connected' ? 'Verbunden' : 
             wss.state === 'connecting' ? 'Verbinde...' :
             wss.state === 'reconnecting' ? 'Neuaufbau...' : 'Offline'}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Ping:</Text>
          <Text style={styles.statusValue}>
            {wss.pingMs ? `${wss.pingMs}ms` : 'N/A'}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Device ID:</Text>
          <Text style={[styles.statusValue, { fontSize: 12 }]}>
            {wss.deviceId ? wss.deviceId.slice(-8) : 'N/A'}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Nachrichten gesendet:</Text>
          <Text style={styles.statusValue}>
            {wss.stats?.totalSent || 0}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Ack-Quote:</Text>
          <Text style={[styles.statusValue, 
            wss.getAckRate && wss.getAckRate() >= 90 ? styles.statusConnected :
            wss.getAckRate && wss.getAckRate() >= 70 ? styles.statusFallback :
            styles.statusDisconnected]}>
            {wss.getAckRate ? `${wss.getAckRate()}%` : 'N/A'}
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Retry-Versuche:</Text>
          <Text style={styles.statusValue}>
            {wss.stats?.totalRetries || 0}
          </Text>
        </View>

        {/* Security QA Section */}
        <View style={styles.sectionHeader}>
          <Shield size={16} color="#666" />
          <Text style={styles.sectionTitle}>{t('dev.securityQA')}</Text>
        </View>
        
        {securityQAOptions.map((option, index) => (
          <TouchableOpacity
            key={`security-${index}`}
            style={styles.option}
            onPress={option.onPress}
            disabled={option.hasSwitch}
          >
            <View style={styles.iconContainer}>
              <option.icon size={20} color="#FFFFFF" />
            </View>
            
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
            
            {option.hasSwitch && (
              <Switch
                value={option.value}
                onValueChange={option.onToggle}
                trackColor={{ false: '#333', true: '#2E7EFF' }}
                thumbColor="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('dev.warningText')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: '#FF3B3020',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  dangerText: {
    color: '#FF3B30',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusConnected: {
    color: '#00FF00',
  },
  statusDisconnected: {
    color: '#FF3B30',
  },
  statusFallback: {
    color: '#FF9500',
  },
  debugLogContainer: {
    marginTop: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
  },
  debugLogTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  debugLog: {
    maxHeight: 200,
  },
  debugLogText: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});