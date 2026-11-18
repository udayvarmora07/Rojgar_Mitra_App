import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { curve, palette } from '../../constants/theme';
import type { OptionKey } from '../../constants/questionBank';
import { Mono } from '../ui/Mono';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong';

const STYLES: Record<
  OptionState,
  { box: string; badge: string; badgeText: string; text: string }
> = {
  idle: {
    box: 'bg-card border-rule',
    badge: 'bg-paper border-rule',
    badgeText: 'text-ink-soft',
    text: 'text-ink',
  },
  selected: {
    box: 'bg-navy-tint border-navy',
    badge: 'bg-navy border-navy',
    badgeText: 'text-white',
    text: 'text-ink',
  },
  correct: {
    box: 'bg-open-bg border-open-border',
    badge: 'bg-success border-success',
    badgeText: 'text-white',
    text: 'text-ink',
  },
  wrong: {
    box: 'bg-closing-bg border-closing-border',
    badge: 'bg-stamp border-stamp',
    badgeText: 'text-white',
    text: 'text-ink',
  },
};

type Props = {
  option: OptionKey;
  text: string;
  state: OptionState;
  disabled?: boolean;
  onPress: () => void;
  /** Spoken suffix for the revealed state ("Correct" / "Your answer"), words not just tint. */
  stateLabel?: string;
};

export function OptionButton({ option, text, state, disabled, onPress, stateLabel }: Props) {
  const s = STYLES[state];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: state === 'selected' || state === 'correct', disabled: !!disabled }}
      aria-checked={state === 'selected' || state === 'correct'}
      // In the review pass the box colour and the tick carry the verdict; a screen reader and
      // a colour-blind reader need the same answer in words, so the state joins the label.
      accessibilityLabel={
        stateLabel ? `${option}. ${text}. ${stateLabel}` : `${option}. ${text}`
      }
      disabled={disabled}
      onPress={onPress}
      style={curve}
      className={`min-h-[64px] flex-row items-center p-3.5 mb-3 rounded-control border-[1.5px] active:opacity-80 ${s.box}`}
    >
      <View className={`w-9 h-9 rounded-[6px] border items-center justify-center ${s.badge}`}>
        <Mono className={`text-[17px] font-bold ${s.badgeText}`}>{option}</Mono>
      </View>
      <Text className={`text-body ml-3.5 flex-1 leading-reading ${s.text}`}>{text}</Text>
      {stateLabel ? (
        <Text
          className={`text-[11px] font-extrabold uppercase tracking-stamp mr-2 ${
            state === 'correct' ? 'text-open-text' : 'text-closing-text'
          }`}
        >
          {stateLabel}
        </Text>
      ) : null}
      {state === 'correct' ? <Ionicons name="checkmark-circle" size={24} color={palette.success} /> : null}
      {state === 'wrong' ? <Ionicons name="close-circle" size={24} color={palette.stamp} /> : null}
    </Pressable>
  );
}
