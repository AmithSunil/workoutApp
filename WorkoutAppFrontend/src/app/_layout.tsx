import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import { useAuthSession } from '@/auth';
import { store } from '@/store';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Splash may already be hidden during fast refresh. */
});

/**
 * Resolves the Supabase session before the first navigation decision is made,
 * so a returning user never sees the front door flash. The Inter stack is
 * held here too, so no screen paints in a fallback face and then reflows.
 */
function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const { ready } = useAuthSession();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // A missing font file must not wedge the app behind the splash screen.
  const fontsSettled = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready && fontsSettled) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready, fontsSettled]);

  if (!ready || !fontsSettled) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <SessionBootstrap>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}>
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
              <Stack.Screen name="plans" />
              <Stack.Screen name="(client)" options={{ animation: 'fade' }} />
              <Stack.Screen name="(trainer)" options={{ animation: 'fade' }} />
              <Stack.Screen name="workout-log/[id]" options={{ presentation: 'modal' }} />
            </Stack>
          </SessionBootstrap>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
