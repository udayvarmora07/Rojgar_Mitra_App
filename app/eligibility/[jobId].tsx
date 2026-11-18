import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { ELIGIBILITY_QUESTIONS, EligibilityAnswers, evaluateEligibility } from '../../lib/eligibility';
import { Header } from '../../components/ui/Header';
import { YesNoQuestion } from '../../components/ui/YesNoQuestion';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';

export default function EligibilityScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<EligibilityAnswers>({});
  const result = evaluateEligibility(answers);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View className="flex-1 bg-surface">
      <Header title={t('eligibilityTitle')} subtitle={t('eligibilityIntro')} onBack={back} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="mb-4">
          <ProgressBar
            ratio={result.answered / result.total}
            tone="primary"
            label={t('answeredCount', { count: result.answered, total: result.total })}
          />
        </View>

        {ELIGIBILITY_QUESTIONS.map((q) => (
          <YesNoQuestion
            key={q}
            question={t(`elig.${q}.q`)}
            value={answers[q]}
            onChange={(value) => setAnswers((a) => ({ ...a, [q]: value }))}
          />
        ))}

        <View accessibilityLiveRegion="polite">
          {result.status === 'incomplete' ? (
            <Text className="text-lg text-gray-700 text-center my-2">{t('answerAll')}</Text>
          ) : null}

          {result.status === 'eligible' ? (
            <View className="bg-emerald-50 border-2 border-accent rounded-card p-5 mb-4">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={40} color="#047857" />
                <Text accessibilityRole="header" className="text-2xl font-bold text-accent ml-3 flex-1">
                  {t('eligibleTitle')}
                </Text>
              </View>
              <Text className="text-lg text-ink mt-3">{t('eligibleNext')}</Text>
            </View>
          ) : null}

          {result.status === 'notEligible' ? (
            <View className="bg-red-50 border-2 border-red-300 rounded-card p-5 mb-4">
              <View className="flex-row items-center">
                <Ionicons name="alert-circle" size={40} color="#DC2626" />
                <Text accessibilityRole="header" className="text-2xl font-bold text-red-700 ml-3 flex-1">
                  {t('notEligibleTitle')}
                </Text>
              </View>
              <Text className="text-lg font-semibold text-ink mt-3">{t('notEligibleNext')}</Text>
              {result.failed.map((q) => (
                <View key={q} className="flex-row mt-2">
                  <Text className="text-lg text-ink mr-2">•</Text>
                  <Text className="text-lg text-ink flex-1">{t(`elig.${q}.fix`)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Text className="text-lg text-gray-700 text-center mb-4">{t('eligibilityDisclaimer')}</Text>

        <View className="gap-3">
          {result.status !== 'incomplete' ? (
            <Button
              icon="list"
              label={t('viewDocuments')}
              onPress={() =>
                router.push({ pathname: '/documents', params: jobId && jobId !== 'general' ? { jobId } : {} })
              }
            />
          ) : null}
          {result.answered > 0 ? (
            <Button variant="secondary" icon="refresh" label={t('resetAnswers')} onPress={() => setAnswers({})} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
