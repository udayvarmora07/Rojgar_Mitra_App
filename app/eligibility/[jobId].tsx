import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ELIGIBILITY_QUESTIONS, EligibilityAnswers, evaluateEligibility } from '../../lib/eligibility';
import { getJobById, getJobDetails, type Job, type JobDetail } from '../../lib/supabase';
import { Masthead } from '../../components/ui/Masthead';
import { LanguageToggle } from '../../components/ui/LanguagePicker';
import { YesNoQuestion } from '../../components/ui/YesNoQuestion';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { Stamp } from '../../components/ui/Stamp';
import { Screen } from '../../components/ui/Screen';
import { curve } from '../../constants/theme';

export default function EligibilityScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [answers, setAnswers] = useState<EligibilityAnswers>({});
  const [job, setJob] = useState<Job | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const result = evaluateEligibility(answers);

  // The four questions used to be identical for every post, so a candidate answered
  // "Do you have the required education?" without seeing which education. Now that the
  // scraper fills `job_details`, the notice's own qualification, age limit and fee are shown
  // beside the question they answer.
  useEffect(() => {
    if (!jobId || jobId === 'general') return;
    let active = true;
    Promise.allSettled([getJobById(jobId), getJobDetails(jobId)]).then(([j, d]) => {
      if (!active) return;
      if (j.status === 'fulfilled') setJob(j.value);
      if (d.status === 'fulfilled') setDetail(d.value[0] ?? null);
    });
    return () => {
      active = false;
    };
  }, [jobId]);

  /**
   * The notice's own value for the question being asked, when it has one. Only real scraped
   * facts are returned; a missing value shows nothing rather than an invented requirement.
   */
  const requirementFor = (q: (typeof ELIGIBILITY_QUESTIONS)[number]): string | null => {
    if (q === 'qualification') {
      return detail?.required_qualifications ?? job?.qualification ?? null;
    }
    if (q === 'age') return detail?.age_limit ?? null;
    return null;
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen>
      <Masthead
        title={t('eligibilityTitle')}
        subtitle={t('eligibilityIntro')}
        onBack={back}
        right={<LanguageToggle />}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 28,
        }}
      >
        <View className="bg-card border border-rule rounded-card p-4 mb-4" style={curve}>
          <ProgressBar
            ratio={result.answered / result.total}
            tone="primary"
            label={t('answeredCount', { count: result.answered, total: result.total })}
          />
        </View>

        <View className="bg-card border border-rule rounded-card px-4 mb-4" style={curve}>
          {ELIGIBILITY_QUESTIONS.map((q, index) => {
            const requirement = requirementFor(q);
            return (
              <View key={q} className={index > 0 ? 'border-t border-rule' : ''}>
                <YesNoQuestion
                  question={t(`elig.${q}.q`)}
                  // The notice's own wording, so the reader answers against this post rather
                  // than a generic "required education" they cannot see.
                  detail={
                    requirement
                      ? t('eligRequirement', {
                          label: q === 'age' ? t('ageLimit') : t('qualification'),
                          value: requirement,
                        })
                      : undefined
                  }
                  value={answers[q]}
                  onChange={(value) => setAnswers((a) => ({ ...a, [q]: value }))}
                />
              </View>
            );
          })}
        </View>

        <View accessibilityLiveRegion="polite">
          {result.status === 'incomplete' ? (
            <Text className="text-body text-ink-soft text-center my-2">{t('answerAll')}</Text>
          ) : null}

          {result.status === 'eligible' ? (
            <View className="bg-open-bg border-2 border-open-border rounded-card p-5 mb-4" style={curve}>
              <Stamp tone="open" label={t('eligibleStamp')} />
              <Text accessibilityRole="header" className="text-title font-extrabold text-ink mt-3">
                {t('eligibleTitle')}
              </Text>
              <Text className="text-body text-ink mt-2 leading-reading">{t('eligibleNext')}</Text>
            </View>
          ) : null}

          {result.status === 'notEligible' ? (
            <View className="bg-closing-bg border-2 border-closing-border rounded-card p-5 mb-4" style={curve}>
              <Stamp tone="closing" label={t('notEligibleStamp')} />
              <Text accessibilityRole="header" className="text-title font-extrabold text-ink mt-3">
                {t('notEligibleTitle')}
              </Text>
              <Text className="text-body font-semibold text-ink mt-2">{t('notEligibleNext')}</Text>
              {result.failed.map((q) => (
                <View key={q} className="flex-row mt-2">
                  <Text className="text-body text-ink mr-2">•</Text>
                  <Text className="text-body text-ink flex-1 leading-reading">{t(`elig.${q}.fix`)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Text className="text-label text-ink-mute text-center mb-4 leading-reading">
          {t('eligibilityDisclaimer')}
        </Text>

        <View className="gap-3">
          {result.status !== 'incomplete' ? (
            <Button
              icon="list"
              label={t('viewDocuments')}
              onPress={() =>
                router.push({
                  pathname: '/documents',
                  params: jobId && jobId !== 'general' ? { jobId } : {},
                })
              }
            />
          ) : null}
          {result.answered > 0 ? (
            <Button
              variant="secondary"
              icon="refresh"
              label={t('resetAnswers')}
              onPress={() => setAnswers({})}
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
