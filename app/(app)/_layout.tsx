import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { useLanguage } from '@/providers/LanguageProvider';
import { useSecurity } from '@/providers/SecurityProvider';

export default function AppLayout() {
  const { t } = useLanguage();
  const { screenshotBanState } = useSecurity();
  
  // Check if user is banned and redirect
  useEffect(() => {
    if (screenshotBanState.isBanned) {
      router.replace('/screenshot-ban');
    }
  }, [screenshotBanState.isBanned]);
  
  return (
    <Stack screenOptions={{
      headerStyle: {
        backgroundColor: '#0A0A0A',
      },
      headerTintColor: '#FFFFFF',
      contentStyle: {
        backgroundColor: '#0A0A0A'
      }
    }}>
      <Stack.Screen name="chats" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="shop" options={{ title: t('shop.title') }} />
      <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
      <Stack.Screen name="language" options={{ title: t('language.title') }} />
      <Stack.Screen name="qr-display" options={{ 
        title: t('settings.myQrCode'),
        presentation: 'modal',
        headerStyle: {
          backgroundColor: '#1A1A1A',
        }
      }} />
      <Stack.Screen name="security" options={{ title: t('security.title') }} />
      <Stack.Screen name="change-pin" options={{ title: t('settings.changePIN') }} />
      <Stack.Screen name="my-shop" options={{ title: t('shop.myShop') }} />
      <Stack.Screen name="dev-menu" options={{ title: t('dev.title') }} />
    </Stack>
  );
}