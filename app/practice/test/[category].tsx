import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { loadPracticeTest, scoreTest, OptionKey, TestGenerationResult } from '../../../utils/aiGenerator';
import { isTopic, TEST_CATEGORIES, TIMER_SECONDS } from '../../../constants/testCategories';
import { addResult } from '../../../lib/testHistory';
import { useLanguage } from '../../../hooks/useLanguage';
import { useCountdown } from '../../../hooks/useCountdown';
import { Header } from '../../../components/ui/Header';
import { Button } from '../../../components/ui/Button';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { Banner, LoadingState } from '../../../components/ui/States';
import { QuestionCard } from '../../../components/practice/QuestionCard';
import { Timer } from '../../../components/practice/Timer';

type Phase = 'loading' | 'quiz' | 'results';

export default function PracticeTestScreen() {
  const params = useLocalSearchParams<{ category: string; timed?: string }>();
  const topic = isTopic(params.category) ? params.category : 'gk';
  const timed = params.timed === '1';
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();

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
      <View className="flex-1 bg-surface">
        <Header title={title} onBack={back} />
        <LoadingState label={t('generatingTest')} />
      </View>
    );
  }

  const total = test.questions.length;
  const answeredCount = Object.keys(answers).length;
  const sourceNote = test.source === 'bank' ? t('sourceBank') : test.source === 'cache' ? t('sourceCache') : null;

  if (phase === 'results') {
    const score = scoreTest(test.questions, answers);
    const percent = total ? Math.round((score / total) * 100) : 0;
    const good = percent >= 60;

    return (
      <View className="flex-1 bg-surface">
        <Header title={t('testComplete')} subtitle={title} onBack={back} />
        <ScrollView ref={scrollRef} className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {timeUp ? <Banner text={t('timeUp')} /> : null}

          <View
            accessible
            accessibilityLabel={`${t('yourScore')}: ${score} / ${total}`}
            className="bg-white rounded-card p-6 mb-4 border border-gray-200 items-center"
          >
            <Ionicons name={good ? 'ribbon' : 'refresh-circle'} size={72} color={good ? '#047857' : '#B45309'} />
            <Text className="text-xl text-gray-700 mt-2">{t('yourScore')}</Text>
            <Text className={`text-5xl font-bold mt-1 ${good ? 'text-accent' : 'text-alert'}`}>
              {score}/{total}
            </Text>
            <Text className="text-xl font-semibold text-ink mt-1">{percent}%</Text>
          </View>

          <View className="gap-3 mb-6">
            <Button variant="accent" icon="refresh" label={t('newTest')} onPress={() => setAttempt((a) => a + 1)} />
            <Button variant="secondary" icon="arrow-back" label={t('goBack')} onPress={back} />
          </View>

          <Text accessibilityRole="header" className="text-2xl font-bold text-ink mb-3">
            {t('reviewAnswers')}
          </Text>
          {test.questions.map((q, i) => (
            <QuestionCard key={i} question={q} index={i} total={total} selected={answers[i]} reveal />
          ))}
        </ScrollView>
      </View>
    );
  }

  const question = test.questions[current];
  const isLast = current === total - 1;

  return (
    <View className="flex-1 bg-surface">
      <Header title={title} onBack={back} right={timed ? <Timer seconds={remaining} /> : undefined}>
        <View className="mt-4">
          <ProgressBar ratio={(current + 1) / total} />
        </View>
      </Header>

      <ScrollView ref={scrollRef} className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {sourceNote ? <Banner text={sourceNote} /> : null}
        <QuestionCard
          question={question}
          index={current}
          total={total}
          selected={answers[current]}
          onSelect={(option) => setAnswers((a) => ({ ...a, [current]: option }))}
        />
        <Text className="text-lg text-gray-700 text-center">
          {t('answeredCount', { count: answeredCount, total })}
        </Text>
      </ScrollView>

      <View className="flex-row bg-white border-t border-gray-200 p-4 gap-3">
        <View className="flex-1">
          <Button
            variant="secondary"
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
            <Button variant="accent" label={t('submit')} onPress={() => submit(false)} />
          ) : (
            <Button
              label={t('next')}
              onPress={() => {
                setCurrent((c) => Math.min(total - 1, c + 1));
                scrollRef.current?.scrollTo({ y: 0, animated: false });
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
}
