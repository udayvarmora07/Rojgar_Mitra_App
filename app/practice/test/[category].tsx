import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadPracticeTest, scoreTest, OptionKey, TestGenerationResult } from '../../../utils/aiGenerator';
import { isTopic, TEST_CATEGORIES, TIMER_SECONDS } from '../../../constants/testCategories';
import { addResult } from '../../../lib/testHistory';
import { formatPercent, formatScore } from '../../../lib/format';
import { useLanguage } from '../../../hooks/useLanguage';
import { useCountdown } from '../../../hooks/useCountdown';
import { Masthead } from '../../../components/ui/Masthead';
import { Button } from '../../../components/ui/Button';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Banner, LoadingState } from '../../../components/ui/States';
import { QuestionCard } from '../../../components/practice/QuestionCard';
import { Timer } from '../../../components/practice/Timer';
import { SectionHeading } from '../../../components/ui/SectionHeading';
import { Screen } from '../../../components/ui/Screen';
import { Stamp } from '../../../components/ui/Stamp';
import { Mono } from '../../../components/ui/Mono';
import { curve } from '../../../constants/theme';

type Phase = 'loading' | 'quiz' | 'results';

export default function PracticeTestScreen() {
  const params = useLocalSearchParams<{ category: string; timed?: string }>();
  const topic = isTopic(params.category) ? params.category : 'gk';
  const timed = params.timed === '1';
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>('loading');
  const [test, setTest] = useState<TestGenerationResult | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [timeUp, setTimeUp] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const category = TEST_CATEGORIES.find((c) => c.topic === topic);
  const title = category ? t(category.labelKey) : t('practiceTest');

  // The language is captured when the test starts; switching language mid-test
  // must not throw away the user's answers.
  const languageAtStart = useRef(language);

  useEffect(() => {
    let active = true;
    setPhase('loading');
    setAnswers({});
    setCurrent(0);
    setTimeUp(false);
    loadPracticeTest(topic, languageAtStart.current).then((result) => {
      if (!active) return;
      setTest(result);
      setPhase('quiz');
    });
    return () => {
      active = false;
    };
  }, [topic, attempt]);

  const submit = useCallback(
    async (fromTimer = false) => {
      if (!test) return;
      setTimeUp(fromTimer);
      setPhase('results');
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      await addResult({
        topic,
        language: test.language,
        score: scoreTest(test.questions, answersRef.current),
        total: test.questions.length,
        timed,
      });
    },
    [test, topic, timed]
  );

  const remaining = useCountdown(TIMER_SECONDS, timed && phase === 'quiz', () => submit(true));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/practice'));

  if (phase === 'loading' || !test) {
    return (
      <Screen>
        <Masthead title={title} onBack={back} />
        <LoadingState label={t('generatingTest')} />
      </Screen>
    );
  }

  const total = test.questions.length;
  const answeredCount = Object.keys(answers).length;
  const sourceNote =
    test.source === 'bank' ? t('sourceBank') : test.source === 'cache' ? t('sourceCache') : null;

  if (phase === 'results') {
    const score = scoreTest(test.questions, answers);
    const percent = total ? Math.round((score / total) * 100) : 0;
    const good = percent >= 60;
    const scoreLabel = formatScore(score, total, language);
    const percentLabel = formatPercent(total ? score / total : 0, language);

    return (
      <Screen>
        <Masthead title={t('testComplete')} subtitle={title} onBack={back} />
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: insets.bottom + 28,
          }}
        >
          {timeUp ? <Banner text={t('timeUp')} /> : null}

          <View
            accessible
            accessibilityLabel={`${t('yourScore')}: ${scoreLabel}, ${percentLabel}`}
            className="bg-card rounded-card p-6 mb-4 border border-rule items-center"
            style={curve}
          >
            <Stamp
              tone={good ? 'open' : 'closing'}
              label={good ? t('scoreGood') : t('scoreKeepPractising')}
            />
            <Text className="text-body text-ink-soft mt-4">{t('yourScore')}</Text>
            <Mono className="text-[52px] leading-[58px] font-bold text-ink mt-1">
              {scoreLabel}
            </Mono>
            <Text className="text-title font-bold text-ink-soft mt-1">{percentLabel}</Text>
            <View className="self-stretch mt-4">
              <ProgressBar ratio={percent / 100} tone={good ? 'accent' : 'primary'} />
            </View>
          </View>

          <View className="gap-3 mb-2">
            <Button
              variant="accent"
              icon="refresh"
              label={t('newTest')}
              onPress={() => setAttempt((a) => a + 1)}
            />
            <Button variant="secondary" icon="arrow-back" label={t('goBack')} onPress={back} />
          </View>

          <SectionHeading title={t('reviewAnswers')} />
          {test.questions.map((q, i) => (
            <QuestionCard key={i} question={q} index={i} total={total} selected={answers[i]} reveal />
          ))}
        </ScrollView>
      </Screen>
    );
  }

  const question = test.questions[current];
  const isLast = current === total - 1;

  return (
    <Screen>
      <Masthead
        title={title}
        onBack={back}
        right={timed ? <Timer seconds={remaining} /> : undefined}
      >
        <View className="mt-4">
          <ProgressBar ratio={(current + 1) / total} tone="onDark" />
        </View>
      </Masthead>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 }}
      >
        {sourceNote ? <Banner text={sourceNote} tone="info" /> : null}
        <QuestionCard
          question={question}
          index={current}
          total={total}
          selected={answers[current]}
          onSelect={(option) => setAnswers((a) => ({ ...a, [current]: option }))}
        />
        <Text className="text-label text-ink-mute text-center">
          {t('answeredCount', { count: answeredCount, total })}
        </Text>
      </ScrollView>

      <View
        className="bg-card border-t border-rule px-4 pt-3 flex-row gap-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-1">
          <Button
            variant="secondary"
            icon="arrow-back"
            label={t('previous')}
            disabled={current === 0}
            onPress={() => {
              setCurrent((c) => Math.max(0, c - 1));
              scrollRef.current?.scrollTo({ y: 0, animated: false });
            }}
          />
        </View>
        <View className="flex-1">
          {isLast ? (
            <Button variant="accent" icon="checkmark" label={t('submit')} onPress={() => submit(false)} />
          ) : (
            <Button
              icon="arrow-forward"
              label={t('next')}
              onPress={() => {
                setCurrent((c) => Math.min(total - 1, c + 1));
                scrollRef.current?.scrollTo({ y: 0, animated: false });
              }}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
