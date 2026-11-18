import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

type Props = { title: string; description?: string; ready: boolean; onToggle: () => void };

/** One document row. A single tap flips Ready / Not Ready (no gestures). */
export function ChecklistItem({ title, description, ready, onToggle }: Props) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: ready }}
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onToggle}
      className={`min-h-[72px] flex-row items-center p-4 mb-3 rounded-xl border-2 active:opacity-80 ${
        ready ? 'bg-emerald-50 border-accent' : 'bg-white border-gray-300'
      }`}
    >
      <Ionicons name={ready ? 'checkbox' : 'square-outline'} size={34} color={ready ? '#047857' : '#4B5563'} />
      <View className="flex-1 ml-3">
        <Text className="text-lg font-bold text-ink">{title}</Text>
        {description ? <Text className="text-lg text-gray-700 mt-1">{description}</Text> : null}
      </View>
      <Text className={`text-lg font-bold ml-2 ${ready ? 'text-accent' : 'text-gray-600'}`}>
        {ready ? t('ready') : t('notReady')}
      </Text>
    </Pressable>
  );
}
