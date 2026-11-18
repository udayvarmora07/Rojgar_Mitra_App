import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

type Props = { question: string; value: boolean | undefined; onChange: (value: boolean) => void };

export function YesNoQuestion({ question, value, onChange }: Props) {
  const { t } = useTranslation();

  const option = (answer: boolean) => {
    const selected = value === answer;
    const label = answer ? t('yes') : t('no');
    const selectedBox = answer ? 'bg-accent border-accent' : 'bg-alert border-alert';
    return (
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        aria-checked={selected}
        accessibilityLabel={`${question} ${label}`}
        onPress={() => onChange(answer)}
        className={`flex-1 min-h-[56px] rounded-xl border-2 flex-row items-center justify-center active:opacity-80 ${
          selected ? selectedBox : 'bg-white border-gray-300'
        } ${answer ? 'mr-2' : 'ml-2'}`}
      >
        <Ionicons
          name={answer ? 'checkmark-circle' : 'close-circle'}
          size={26}
          color={selected ? '#FFFFFF' : answer ? '#047857' : '#DC2626'}
        />
        <Text className={`text-xl font-bold ml-2 ${selected ? 'text-white' : 'text-ink'}`}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View className="bg-white rounded-card p-5 mb-4 border border-gray-200">
      <Text className="text-xl font-semibold text-ink mb-4">{question}</Text>
      <View accessibilityRole="radiogroup" className="flex-row">
        {option(true)}
        {option(false)}
      </View>
    </View>
  );
}
