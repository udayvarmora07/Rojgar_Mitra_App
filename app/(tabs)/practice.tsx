import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Masthead } from '../../components/ui/Masthead';
import { LanguageToggle } from '../../components/ui/LanguagePicker';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Screen } from '../../components/ui/Screen';
import { QUESTIONS_PER_TEST, TEST_CATEGORIES } from '../../constants/testCategories';
import { palette } from '../../constants/theme';
import { loadHistory, TestRecord } from '../../lib/testHistory';
import { formatDate } from '../../lib/deadline';
import { formatScore } from '../../lib/format';
import { useLanguage } from '../../hooks/useLanguage';
import { Mono } from '../../components/ui/Mono';
import { EmptyState } from '../../components/ui/States';

export default function PracticeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [timed, setTimed] = useState(false);
  const [history, setHistory] = useState<TestRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadHistory().then((h) => active && setHistory(h));
      return () => {
        active = false;
      };
    }, [])
  );

  const labelFor = (topic: string) =>
    t(TEST_CATEGORIES.find((c) => c.topic === topic)?.labelKey ?? 'catGK');

  return (
    <Screen>
      <Masthead
        title={t('practiceTest')}
        subtitle={t('selectTopic')}
        right={<LanguageToggle />}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 }}
      >
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: timed }}
          aria-checked={timed}
          accessibilityLabel={t('timedTest')}
          accessibilityHint={t('timedTestHint')}
          onPress={() => setTimed((v) => !v)}
          className="bg-card rounded-card border border-rule p-4 mb-5 flex-row items-center min-h-[76px] active:opacity-80"
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="w-10 h-10 rounded-control bg-navy-tint border border-navy-line items-center justify-center"
          >
            <Ionicons name="timer-outline" size={22} color={palette.navy} />
          </View>
          <View className="flex-1 ml-3 pr-2">
            <Text className="text-body font-bold text-ink">{t('timedTest')}</Text>
            <Text className="text-label text-ink-soft mt-0.5">{t('timedTestHint')}</Text>
          </View>
          <View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            className={`w-12 h-7 rounded-full p-[2px] justify-center ${timed ? 'bg-success' : 'bg-rule-strong'}`}
          >
            <View className={`w-6 h-6 rounded-full bg-white ${timed ? 'self-end' : 'self-start'}`} />
          </View>
        </Pressable>

        <View className="flex-row flex-wrap justify-between">
          {TEST_CATEGORIES.map((category) => (
            <Pressable
              key={category.topic}
              accessibilityRole="button"
              accessibilityLabel={`${t(category.labelKey)}, ${t('questionCount', { count: QUESTIONS_PER_TEST })}`}
              accessibilityHint={t('startPractice')}
              onPress={() =>
                router.push({
                  pathname: '/practice/test/[category]',
                  params: { category: category.topic, timed: timed ? '1' : '0' },
                })
              }
              className="w-[48.5%] bg-card rounded-card p-4 mb-3 border border-rule min-h-[150px] justify-between active:opacity-80"
            >
              <View className="flex-row items-start justify-between">
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  className="w-10 h-10 rounded-control bg-navy-tint border border-navy-line items-center justify-center"
                >
                  <Ionicons
                    name={category.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={palette.navy}
                  />
                </View>
                <Mono className="text-[11px] font-bold text-ink-mute">
                  {QUESTIONS_PER_TEST} Q
                </Mono>
              </View>
              <View>
                <Text className="text-body leading-reading font-bold text-ink mt-3">
                  {t(category.labelKey)}
                </Text>
                <Text className="text-label text-ink-soft mt-0.5">
                  {t('questionCount', { count: QUESTIONS_PER_TEST })}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('studyMaterial')}. ${t('studyMaterialHint')}`}
          onPress={() => router.push('/resources')}
          className="bg-card border border-rule rounded-card p-4 flex-row items-center mt-1 mb-2 active:opacity-80"
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="w-10 h-10 rounded-control bg-navy-tint border border-navy-line items-center justify-center"
          >
            <Ionicons name="library-outline" size={22} color={palette.navy} />
          </View>
          <View className="flex-1 ml-3 pr-2">
            <Text className="text-body font-bold text-ink">{t('studyMaterial')}</Text>
            <Text className="text-label text-ink-soft mt-0.5">{t('studyMaterialHint')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.inkMute} />
        </Pressable>

        <SectionHeading title={t('history')} count={history.length} />

        {history.length === 0 ? (
          <EmptyState icon="ribbon-outline" title={t('noHistory')} />
        ) : (
          <View className="bg-card border border-rule rounded-card overflow-hidden">
            {history.slice(0, 5).map((record, index) => {
              const percent = record.total ? Math.round((record.score / record.total) * 100) : 0;
              const good = percent >= 60;
              const scoreLabel = formatScore(record.score, record.total, language);
              return (
                <View
                  key={record.id}
                  accessible
                  accessibilityLabel={`${labelFor(record.topic)}: ${scoreLabel}`}
                  className={`px-4 py-3 flex-row items-center ${index > 0 ? 'border-t border-rule' : ''}`}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-body font-bold text-ink">{labelFor(record.topic)}</Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-label text-ink-soft">
                        {formatDate(record.takenAt, language)}
                      </Text>
                      {record.timed ? (
                        <Ionicons name="timer-outline" size={16} color={palette.inkMute} style={{ marginLeft: 6 }} />
                      ) : null}
                    </View>
                  </View>
                  <View className="items-end w-[86px]">
                    <Mono className={`text-title font-bold ${good ? 'text-success' : 'text-stamp'}`}>
                      {scoreLabel}
                    </Mono>
                    <View className="h-1 w-full bg-rule rounded-full mt-1 overflow-hidden">
                      <View
                        className={`h-1 rounded-full ${good ? 'bg-success' : 'bg-stamp'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
