import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useSession } from '@/lib/session';
import { TripsProvider } from '@/lib/trips';

SplashScreen.preventAutoHideAsync();

/**
 * Both branches are always mounted; the guards decide which one is reachable.
 * A failed guard sends the user to the first available screen in the stack,
 * so there is no redirect flicker and no `useEffect`-based navigation race.
 */
function RootNavigator() {
  const { profile, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  // Rendering the stack before the stored profile has loaded would flash the
  // sign-in screen at every already-signed-in user.
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!profile}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!profile}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>

      {/* Outside both guards: reachable from the sign-in screen and from Profile. */}
      <Stack.Screen name="terms" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SessionProvider>
          <TripsProvider>
            <RootNavigator />
          </TripsProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
