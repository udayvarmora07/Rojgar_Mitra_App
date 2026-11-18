import { Pressable, Text, View } from 'react-native';
import { curve } from '../../constants/theme';

type Chip<T extends string | null> = { value: T; label: string };

type Props<T extends string | null> = {
  chips: Chip<T>[];
  selected: T;
  onSelect: (value: T) => void;
  accessibilityLabel: string;
};

/**
 * A segmented control, not a row of pills. The selected segment is a filled navy
 * cell inside a ruled track, which reads as "this is the current view" rather than
 * as a collection of separate badges.
 */
export function FilterChips<T extends string | null>({
  chips,
  selected,
  onSelect,
  accessibilityLabel,
}: Props<T>) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={curve}
      className="flex-row bg-paper border border-rule rounded-control p-1"
    >
      {chips.map((chip) => {
        const active = chip.value === selected;
        return (
          <Pressable
            key={String(chip.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(chip.value)}
            style={curve}
            className={`flex-1 min-h-[48px] px-2 rounded-[8px] items-center justify-center active:opacity-80 ${
              active ? 'bg-navy' : 'bg-transparent'
            }`}
          >
            <Text
              numberOfLines={2}
              className={`text-[15px] font-bold text-center ${active ? 'text-white' : 'text-ink-soft'}`}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
