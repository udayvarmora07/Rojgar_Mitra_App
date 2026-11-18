import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { curve, palette } from '../../constants/theme';

type Props = { title: string; description?: string; ready: boolean; onToggle: () => void };

/**
 * One document row. A single tap flips Ready / Not Ready (no gestures). The state
 * is written as a word as well as shown by the checkbox and tint.
 */
export function ChecklistItem({ title, description, ready, onToggle }: Props) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: ready }}
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onToggle}
      style={curve}
      className={`min-h-[76px] flex-row items-start px-4 py-3 border-b border-rule active:opacity-80 ${
        ready ? 'bg-open-bg' : 'bg-card'
      }`}
    >
      <View
        className={`w-7 h-7 rounded-[6px] border-2 items-center justify-center mt-0.5 ${
          ready ? 'bg-success border-success' : 'bg-card border-rule-strong'
        }`}
      >
        {ready ? <Ionicons name="checkmark" size={18} color={palette.card} /> : null}
      </View>
      <View className="flex-1 ml-3">
        <Text className="text-body font-bold text-ink leading-reading">{title}</Text>
        {description ? (
          <Text className="text-label text-ink-soft mt-1 leading-reading">{description}</Text>
        ) : null}
        <Text
          className={`text-[11px] font-extrabold uppercase tracking-stamp mt-2 ${
            ready ? 'text-open-text' : 'text-ink-mute'
          }`}
        >
          {ready ? t('ready') : t('notReady')}
        </Text>
      </View>
    </Pressable>
  );
}
