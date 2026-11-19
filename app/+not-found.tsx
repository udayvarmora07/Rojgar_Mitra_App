import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/ui/Screen';
import { Masthead } from '../components/ui/Masthead';
import { LanguageToggle } from '../components/ui/LanguagePicker';
import { EmptyState } from '../components/ui/States';
import { Button } from '../components/ui/Button';

/** A wrong link should still look like this product, and still lead somewhere useful. */
export default function NotFoundScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const goHome = () => router.replace('/');

  return (
    <Screen>
      <Masthead title={t('notFoundTitle')} right={<LanguageToggle />} />
      <View className="p-4 mt-4">
        <EmptyState
          icon="compass-outline"
          title={t('notFoundTitle')}
          hint={t('notFoundHint')}
          action={<Button icon="home-outline" label={t('goHome')} onPress={goHome} />}
        />
      </View>
    </Screen>
  );
}
