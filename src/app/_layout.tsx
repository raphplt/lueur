import '@/i18n';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { db, expoDb } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { useReminderSync } from '@/hooks/use-reminder-sync';
import { configureNotificationHandler, responseUrl } from '@/notifications';
import { useData } from '@/store/data';
import { setDb } from '@/store/db-ref';
import { useSettings } from '@/store/settings';
import { Txt } from '@/ui/text';
import { ThemeProvider } from '@/ui/theme';
import { ToastHost } from '@/ui/toast';
import { colors } from '@/ui/tokens';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 600, fade: true });
configureNotificationHandler();

function useNotificationRouting(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r && responseUrl(r);
      if (!url) return;
      // Handled once: a recreated activity must not replay it.
      Notifications.clearLastNotificationResponse();
      router.push(url as never);
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [ready]);
}

export default function RootLayout() {
  const { success, error } = useMigrations(expoDb, migrations);
  const settingsLoaded = useSettings((s) => s.loaded);
  const dataLoaded = useData((s) => s.loaded);
  const ready = settingsLoaded && dataLoaded;

  useEffect(() => {
    if (!success) return;
    setDb(db);
    useSettings.getState().load();
    useData.getState().load();
  }, [success]);

  useEffect(() => {
    if (ready || error) void SplashScreen.hideAsync();
  }, [ready, error]);

  useNotificationRouting(ready);
  useReminderSync(ready);

  if (error) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.ink.bg }]}>
        <Txt v="body" style={{ color: colors.ink.text }}>
          {error.message}
        </Txt>
      </View>
    );
  }
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
              animation: 'fade',
              animationDuration: 400,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
            <Stack.Screen
              name="entry"
              options={{ presentation: 'modal', animation: 'fade_from_bottom' }}
            />
            <Stack.Screen
              name="insomnia"
              options={{
                presentation: 'fullScreenModal',
                animation: 'fade',
                animationDuration: 900,
              }}
            />
            <Stack.Screen name="tags" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="environment" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="data" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="about" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="demo" options={{ animation: 'none' }} />
          </Stack>
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
});
