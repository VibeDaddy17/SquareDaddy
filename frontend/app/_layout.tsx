import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle deep link on cold start
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = (url: string) => {
    // Parse the URL to extract the path
    // Format: sportssquares://game/{game_id}
    const { path, queryParams } = Linking.parse(url);
    
    if (path) {
      // Navigate to the appropriate screen
      setTimeout(() => {
        router.push(`/${path}` as any);
      }, 100);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="game/[id]" />
          <Stack.Screen name="game/admin/[id]" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}