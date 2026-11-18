import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { curve } from '../../constants/theme';
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

  /**
   * The revealed verdict in words. The review pass used to communicate correct/wrong only
   * through the box colour and a tick, which fails the product rule that every status is
   * written — and it left a screen reader with no answer at all.
   */
  const labelFor = (key: OptionKey): string | undefined => {
    if (!reveal) return undefined;
    if (key === question.correct) return t('correct');
    if (key === selected) return t('yourAnswer');
    return undefined;
  };

  return (
    <View style={curve} className="bg-card rounded-card p-5 mb-4 border border-rule">
      <Text className="text-label font-semibold text-ink-mute mb-2">
        {t('questionOf', { current: index + 1, total })}
      </Text>
      <Text
        accessibilityRole="header"
        className="text-[22px] leading-[30px] font-bold text-ink mb-5"
      >
        {question.question}
      </Text>

      <View accessibilityRole="radiogroup">
        {KEYS.map((key) => (
          <OptionButton
            key={key}
            option={key}
            text={question.options[key]}
            state={stateFor(key)}
            stateLabel={labelFor(key)}
            disabled={reveal || !onSelect}
            onPress={() => onSelect?.(key)}
          />
        ))}
      </View>

      {reveal ? (
        <View style={curve} className="mt-1 p-4 rounded-control bg-open-bg border border-open-border">
          {!selected ? (
            <Text className="text-body font-bold text-stamp mb-1">{t('notAnswered')}</Text>
          ) : null}
          <Text className="text-body font-bold text-open-text">
            {t('correctAnswer')}: {question.correct}. {question.options[question.correct]}
          </Text>
          {question.explanation ? (
            <Text className="text-body text-ink mt-2 leading-reading">
              {t('explanation')}: {question.explanation}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
