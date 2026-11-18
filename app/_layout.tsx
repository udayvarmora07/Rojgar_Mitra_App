import './global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { restoreSavedLanguage } from '../lib/i18n';
import { LoadingState } from '../components/ui/States';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Apply the saved language before first paint so the UI never flashes in English.
    restoreSavedLanguage().finally(() => setReady(true));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {ready ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F9FAFB' } }} />
      ) : (
        <LoadingState label="" />
      )}
    </SafeAreaProvider>
  );
}
