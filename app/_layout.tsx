import './global.css';
import { useEffect, useState } from 'react';
import { Stack, useRouter, type ErrorBoundaryProps, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { restoreSavedLanguage } from '../lib/i18n';
import { prepareNotifications, isInternalRoute, remindersSupported } from '../lib/reminders';
import { palette } from '../constants/theme';
import { LoadingState } from '../components/ui/States';
import { ErrorScreen } from '../components/ui/ErrorScreen';

/**
 * Tapping a reminder opens the screen it is about: a notice for a deadline reminder, the
 * checklist for a document reminder. Only internal paths from our own scheduled
 * notifications are followed; anything else in a payload is ignored.
 */
function useNotificationObserver(ready: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!ready || !remindersSupported()) return;

    const redirect = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (isInternalRoute(url)) {
        router.push(url as Href);
        Notifications.clearLastNotificationResponse();
      }
    };

    redirect(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(redirect);
    return () => subscription.remove();
  }, [ready, router]);
}

/**
 * Expo Router renders this in place of the tree that threw. Without it a single render
 * error leaves a blank white screen, which on a shared phone looks like the app is broken
 * and gives the reader no way back.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorScreen message={error.message} onRetry={retry} />;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useNotificationObserver(ready);

  useEffect(() => {
    // Apply the saved language before first paint so the UI never flashes in English.
    restoreSavedLanguage().finally(() => {
      setReady(true);
      // Local notifications only: foreground presentation. The channel is created on opt-in.
      void prepareNotifications();
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {ready ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.paper } }} />
      ) : (
        <LoadingState label="" />
      )}
    </SafeAreaProvider>
  );
}
