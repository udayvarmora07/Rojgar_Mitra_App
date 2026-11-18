import { Pressable, ScrollView, Text } from 'react-native';

type Chip<T extends string | null> = { value: T; label: string };

type Props<T extends string | null> = {
  chips: Chip<T>[];
  selected: T;
  onSelect: (value: T) => void;
  accessibilityLabel: string;
};

/** Horizontally scrollable row of large single-select controls (tap only). */
export function FilterChips<T extends string | null>({ chips, selected, onSelect, accessibilityLabel }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={{ paddingVertical: 4 }}
    >
      {chips.map((chip) => {
        const active = chip.value === selected;
        return (
          <Pressable
            key={String(chip.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(chip.value)}
            className={`min-h-[48px] px-5 mr-3 rounded-control border-2 items-center justify-center active:opacity-80 ${
              active ? 'bg-primary border-primary' : 'bg-white border-gray-300'
            }`}
          >
            <Text className={`text-lg font-semibold ${active ? 'text-white' : 'text-ink'}`}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
