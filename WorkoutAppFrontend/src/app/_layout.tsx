import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';

import { store, type AppDispatch } from '@/store';
import { useAppSelector } from '@/store/hooks';
import { loadSession } from '@/store/persistence';
import { hydrated } from '@/store/slices/sessionSlice';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* Splash may already be hidden during fast refresh. */
});

/**
 * Restores the persisted identity before the first navigation decision is made,
 * so a returning user never sees the role picker flash.
 */
function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const ready = useAppSelector((s) => s.session.hydrated);

  useEffect(() => {
    let cancelled = false;
    loadSession().then((persisted) => {
      if (cancelled) return;
      dispatch(
        hydrated(
          persisted
            ? {
                role: persisted.role,
                userId: persisted.userId,
                activeClientId: persisted.activeClientId,
                activeDate: store.getState().session.activeDate,
                hydrated: true,
              }
            : null
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
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
