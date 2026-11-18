import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { OptionKey } from '../../constants/questionBank';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong';

const STYLES: Record<OptionState, { box: string; badge: string; badgeText: string }> = {
  idle: { box: 'bg-white border-gray-300', badge: 'bg-gray-200', badgeText: 'text-ink' },
  selected: { box: 'bg-blue-50 border-primary', badge: 'bg-primary', badgeText: 'text-white' },
  correct: { box: 'bg-emerald-50 border-accent', badge: 'bg-accent', badgeText: 'text-white' },
  wrong: { box: 'bg-red-50 border-red-700', badge: 'bg-red-700', badgeText: 'text-white' },
};

type Props = { option: OptionKey; text: string; state: OptionState; disabled?: boolean; onPress: () => void };

export function OptionButton({ option, text, state, disabled, onPress }: Props) {
  const s = STYLES[state];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: state === 'selected', disabled: !!disabled }}
      aria-checked={state === 'selected'}
      accessibilityLabel={`${option}. ${text}`}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-[64px] flex-row items-center p-4 mb-3 rounded-xl border-2 active:opacity-80 ${s.box}`}
    >
      <View className={`w-11 h-11 rounded-full items-center justify-center ${s.badge}`}>
        <Text className={`text-xl font-bold ${s.badgeText}`}>{option}</Text>
      </View>
      <Text className="text-lg text-ink ml-4 flex-1">{text}</Text>
      {state === 'correct' ? <Ionicons name="checkmark-circle" size={30} color="#047857" /> : null}
      {state === 'wrong' ? <Ionicons name="close-circle" size={30} color="#DC2626" /> : null}
    </Pressable>
  );
}
