import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppStateProvider } from "@/providers/AppStateProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import ChatProvider from "@/providers/ChatProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ShopProvider } from "@/providers/ShopProvider";
import { SecurityProvider } from "@/providers/SecurityProvider";
import { UserRoleProvider } from "@/providers/UserRoleProvider";
import WSSProvider from "@/providers/WSSProvider";

// Prevent auto hide only once
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore error if already called
});

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ 
      headerBackTitle: "Back",
      headerStyle: {
        backgroundColor: '#0A0A0A',
      },
      headerTintColor: '#FFFFFF',
      contentStyle: {
        backgroundColor: '#0A0A0A'
      }
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
      <Stack.Screen name="lock" options={{ headerShown: false }} />
      <Stack.Screen name="qr-scanner" options={{ 
        presentation: "modal",
        title: "Scan QR Code",
        headerStyle: {
          backgroundColor: '#1A1A1A',
        }
      }} />
      <Stack.Screen name="screenshot-ban" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const isInitialized = useRef(false);
  
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    const hideSplash = async () => {
      try {
        // Small delay to ensure app is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        await SplashScreen.hideAsync();
      } catch (error) {
        // Ignore error if splash was already hidden
        console.log('Splash screen already hidden or error:', error);
      }
    };
    hideSplash();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LanguageProvider>
          <AppStateProvider>
            <ShopProvider>
              <UserRoleProvider>
                <AuthProvider>
                  <SecurityProvider>
                    <WSSProvider>
                      <ChatProvider>
                        <RootLayoutNav />
                      </ChatProvider>
                    </WSSProvider>
                  </SecurityProvider>
                </AuthProvider>
              </UserRoleProvider>
            </ShopProvider>
          </AppStateProvider>
        </LanguageProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}