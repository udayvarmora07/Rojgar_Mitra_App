import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Masthead } from '../../components/ui/Masthead';
import { LanguageToggle, LanguageOptions } from '../../components/ui/LanguagePicker';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Mono } from '../../components/ui/Mono';
import { Footnote } from '../../components/ui/States';
import { palette } from '../../constants/theme';
import { clearAppData } from '../../lib/storage';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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
    <Screen>
      <Masthead title={t('settingsTitle')} subtitle={t('appTagline')} right={<LanguageToggle />} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 }}
      >
        <SectionHeading title={t('language')} className="mt-1" />
        <LanguageOptions />

        <SectionHeading title={t('documentsTitle')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('documentsTitle')}. ${t('documentsIntro')}`}
          onPress={() => router.push('/documents')}
          className="bg-card border border-rule rounded-card p-4 flex-row items-center active:opacity-80"
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="w-10 h-10 rounded-control bg-navy-tint border border-navy-line items-center justify-center"
          >
            <Ionicons name="document-text-outline" size={22} color={palette.navy} />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-body font-bold text-ink">{t('quickDocuments')}</Text>
            <Text className="text-label text-ink-soft mt-0.5">{t('documentsIntro')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.inkMute} />
        </Pressable>

        <SectionHeading title={t('about')} />
        <Card>
          <Text className="text-body text-ink leading-reading">{t('aboutText')}</Text>
          <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-rule">
            <Text className="text-label text-ink-mute">{t('appName')}</Text>
            <Mono className="text-label text-ink-soft">{t('version', { version })}</Mono>
          </View>
        </Card>

        <SectionHeading title={t('dataSection')} />
        <Card>
          <Text className="text-body text-ink-soft leading-reading mb-4">{t('clearDataHint')}</Text>
          <Button variant="danger" icon="trash-outline" label={t('clearData')} onPress={confirmClear} />
        </Card>

        <Footnote>{t('officialNote')}</Footnote>
      </ScrollView>
    </Screen>
  );
}
