import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/ui/Header';
import { Card, SectionTitle } from '../../components/ui/Card';
import { QUESTIONS_PER_TEST, TEST_CATEGORIES } from '../../constants/testCategories';
import { loadHistory, TestRecord } from '../../lib/testHistory';
import { formatDate } from '../../lib/deadline';
import { useLanguage } from '../../hooks/useLanguage';

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

  const labelFor = (topic: string) => t(TEST_CATEGORIES.find((c) => c.topic === topic)?.labelKey ?? 'catGK');

  return (
    <View role="main" className="flex-1 bg-surface">
      <Header title={t('practiceTest')} subtitle={t('selectTopic')} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Optional timer (PRD 5.6) */}
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: timed }}
          aria-checked={timed}
          accessibilityLabel={t('timedTest')}
          accessibilityHint={t('timedTestHint')}
          onPress={() => setTimed((v) => !v)}
          className="bg-white rounded-card border border-gray-200 p-4 mb-4 flex-row items-center min-h-[72px]"
        >
          <Ionicons name="timer-outline" size={32} color="#1E3A8A" />
          <View className="flex-1 ml-3">
            <Text className="text-lg font-bold text-ink">{t('timedTest')}</Text>
            <Text className="text-lg text-gray-700">{t('timedTestHint')}</Text>
          </View>
          <View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            className={`w-14 h-8 rounded-full p-1 justify-center ${timed ? 'bg-accent' : 'bg-gray-400'}`}
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
              className="w-[48%] bg-white rounded-card p-5 mb-4 border border-gray-200 active:opacity-80"
            >
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: `${category.color}1A` }}
              >
                <Ionicons name={category.icon as keyof typeof Ionicons.glyphMap} size={34} color={category.color} />
              </View>
              <Text className="text-xl font-bold text-ink">{t(category.labelKey)}</Text>
              <Text className="text-lg text-gray-700 mt-1">{t('questionCount', { count: QUESTIONS_PER_TEST })}</Text>
              <View className="flex-row items-center mt-3">
                <Ionicons name="play-circle" size={24} color={category.color} />
                <Text className="ml-2 text-lg font-bold" style={{ color: category.color }}>
                  {t('start')}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Card>
          <SectionTitle>{t('history')}</SectionTitle>
          {history.length === 0 ? (
            <Text className="text-lg text-gray-700">{t('noHistory')}</Text>
          ) : (
            history.slice(0, 5).map((record) => {
              const percent = record.total ? Math.round((record.score / record.total) * 100) : 0;
              const good = percent >= 60;
              return (
                <View
                  key={record.id}
                  accessible
                  accessibilityLabel={`${labelFor(record.topic)}: ${record.score} / ${record.total}`}
                  className="flex-row items-center justify-between py-3 border-b border-gray-100"
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-lg font-semibold text-ink">{labelFor(record.topic)}</Text>
                    <View className="flex-row items-center">
                      <Text className="text-lg text-gray-700">{formatDate(record.takenAt, language)}</Text>
                      {record.timed ? <Ionicons name="timer-outline" size={18} color="#4B5563" style={{ marginLeft: 6 }} /> : null}
                    </View>
                  </View>
                  <Text className={`text-xl font-bold ${good ? 'text-accent' : 'text-alert'}`}>
                    {record.score}/{record.total}
                  </Text>
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </View>
  );
}
