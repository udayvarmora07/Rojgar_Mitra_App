import { Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Heading } from './Heading';
import { palette } from '../../constants/theme';

/**
 * What a reader sees when a screen throws.
 *
 * Deliberately not a stack trace and not a blank page: the message says the saved jobs are
 * still on the phone, then offers the only two useful actions. It avoids the safe-area
 * context because it can be rendered in place of the root layout, before that provider
 * exists.
 */
export function ErrorScreen({ message, onRetry }: { message?: string; onRetry: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View
      className="flex-1 bg-paper"
      style={{ paddingTop: Platform.OS === 'web' ? 24 : 56 }}
    >
      <View className="w-full max-w-[600px] self-center flex-1 px-5 pb-6">
        <View className="bg-navy rounded-card p-5">
          <Text className="text-navy-line text-micro font-bold uppercase tracking-stamp">
            {t('appName')}
          </Text>
          <Heading level={1} className="text-white text-title font-extrabold tracking-tight mt-2">
            {t('errorTitle')}
          </Heading>
        </View>

        <View className="bg-card border border-rule rounded-card p-5 mt-4">
          <View className="flex-row items-start">
            <Ionicons name="alert-circle-outline" size={28} color={palette.stamp} />
            <Text className="flex-1 text-body text-ink leading-reading ml-3">{t('errorBody')}</Text>
          </View>

          {__DEV__ && message ? (
            <Text className="text-label text-ink-mute mt-4 leading-reading">{message}</Text>
          ) : null}

          <View className="mt-5 gap-2">
            <Button icon="refresh" label={t('retry')} onPress={onRetry} />
            <Button
              variant="secondary"
              icon="home-outline"
              label={t('goHome')}
              onPress={() => router.replace('/')}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
