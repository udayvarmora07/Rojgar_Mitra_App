import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { curve, palette } from '../../constants/theme';

type Props = {
  question: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  /** The notice's own requirement for this question, e.g. "Age Limit: 18 to 24 Years". */
  detail?: string;
};

export function YesNoQuestion({ question, value, onChange, detail }: Props) {
  const { t } = useTranslation();

  const option = (answer: boolean) => {
    const selected = value === answer;
    const label = answer ? t('yes') : t('no');
    const selectedBox = answer ? 'bg-success border-success' : 'bg-stamp border-stamp';
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        aria-checked={selected}
        accessibilityLabel={`${question} ${label}`}
        onPress={() => onChange(answer)}
        style={curve}
        className={`flex-1 min-h-[56px] rounded-control border-[1.5px] flex-row items-center justify-center active:opacity-80 ${
          selected ? selectedBox : 'bg-card border-rule'
        }`}
      >
        <Ionicons
          name={answer ? 'checkmark-circle-outline' : 'close-circle-outline'}
          size={22}
          color={selected ? palette.card : answer ? palette.success : palette.stamp}
        />
        <Text className={`text-body font-bold ml-2 ${selected ? 'text-white' : 'text-ink'}`}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="py-4">
      <Text className="text-body font-semibold text-ink mb-1 leading-reading">{question}</Text>
      {detail ? (
        <View style={curve} className="bg-navy-tint border border-navy-line rounded-control px-3 py-2 mb-3">
          <Text className="text-label text-navy leading-reading">{detail}</Text>
        </View>
      ) : (
        <View className="mb-2" />
      )}
      <View accessibilityRole="radiogroup" className="flex-row gap-3">
        {option(true)}
        {option(false)}
      </View>
    </View>
  );
}
