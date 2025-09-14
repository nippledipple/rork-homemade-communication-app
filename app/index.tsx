import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useAppState } from '@/providers/AppStateProvider';

export default function InitialScreen() {
  const { isAuthenticated, isOnboarded, isLoading } = useAuth();
  const { isLocked } = useAppState();

  useEffect(() => {
    if (!isLoading) {
      console.log('Auth loading complete:', { isOnboarded, isAuthenticated, isLocked });
      
      // Add a small delay to ensure all providers are initialized
      const navigate = () => {
        if (!isOnboarded) {
          console.log('Navigating to onboarding...');
          router.replace('/onboarding');
        } else if (!isAuthenticated || isLocked) {
          console.log('Navigating to lock screen...', { isAuthenticated, isLocked });
          router.replace('/lock');
        } else {
          console.log('Navigating to chats...');
          router.replace('/(app)/chats');
        }
      };
      
      // Longer delay to ensure all state updates are complete
      setTimeout(navigate, 100);
    }
  }, [isLoading, isOnboarded, isAuthenticated, isLocked]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2E7EFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});