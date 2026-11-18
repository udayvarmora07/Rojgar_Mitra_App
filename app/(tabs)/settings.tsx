import { Alert, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/ui/Header';
import { Card, SectionTitle } from '../../components/ui/Card';
import { LanguageOptions } from '../../components/ui/LanguagePicker';
import { Button } from '../../components/ui/Button';
import { clearAppData } from '../../lib/storage';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const confirmClear = () => {
    Alert.alert(t('clearData'), t('clearDataConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await clearAppData();
          Alert.alert(t('dataCleared'));
        },
      },
    ]);
  };

  return (
    <View role="main" className="flex-1 bg-surface">
      <Header title={t('settingsTitle')} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Card>
          <SectionTitle>{t('language')}</SectionTitle>
          <LanguageOptions />
        </Card>

        <Card>
          <SectionTitle>{t('about')}</SectionTitle>
          <Text className="text-lg text-ink leading-7">{t('aboutText')}</Text>
          <Text className="text-lg text-gray-700 mt-3">{t('version', { version })}</Text>
        </Card>

        <Card>
          <Text className="text-lg text-gray-700 mb-3">{t('clearDataHint')}</Text>
          <Button variant="danger" icon="trash-outline" label={t('clearData')} onPress={confirmClear} />
        </Card>
      </ScrollView>
    </View>
  );
}
