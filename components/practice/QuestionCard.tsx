import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OptionKey, Question } from '../../constants/questionBank';
import { OptionButton, OptionState } from './OptionButton';

const KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

type Props = {
  question: Question;
  index: number;
  total: number;
  selected?: OptionKey;
  /** After submission: colour answers and show the explanation. */
  reveal?: boolean;
  onSelect?: (option: OptionKey) => void;
};

export function QuestionCard({ question, index, total, selected, reveal = false, onSelect }: Props) {
  const { t } = useTranslation();

  const stateFor = (key: OptionKey): OptionState => {
    if (reveal) {
      if (key === question.correct) return 'correct';
      if (key === selected) return 'wrong';
      return 'idle';
    }
    return key === selected ? 'selected' : 'idle';
  };

  return (
    <View className="bg-white rounded-card p-5 mb-4 border border-gray-200">
      <Text className="text-lg font-semibold text-primary mb-2">
        {t('questionOf', { current: index + 1, total })}
      </Text>
      <Text accessibilityRole="header" className="text-2xl font-bold text-ink mb-5 leading-9">
        {question.question}
      </Text>

      <View accessibilityRole="radiogroup">
        {KEYS.map((key) => (
          <OptionButton
            key={key}
            option={key}
            text={question.options[key]}
            state={stateFor(key)}
            disabled={reveal || !onSelect}
            onPress={() => onSelect?.(key)}
          />
        ))}
      </View>

      {reveal ? (
        <View className="mt-2 p-4 rounded-xl bg-emerald-50 border-l-4 border-accent">
          {!selected ? <Text className="text-lg font-bold text-alert mb-1">{t('notAnswered')}</Text> : null}
          <Text className="text-lg font-bold text-accent">
            {t('correctAnswer')}: {question.correct}. {question.options[question.correct]}
          </Text>
          {question.explanation ? (
            <Text className="text-lg text-ink mt-2">
              {t('explanation')}: {question.explanation}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
