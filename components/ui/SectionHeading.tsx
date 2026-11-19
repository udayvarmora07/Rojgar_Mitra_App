import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { palette } from '../../constants/theme';
import { Mono } from './Mono';
import { Heading } from './Heading';

type Props = {
  title: string;
  /** Renders as a tabular figure beside the title, e.g. a result count. */
  count?: number | string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

/**
 * A register heading: title, count, optional single action, then a hairline.
 * Space above is deliberately larger than the space below so the heading groups
 * with the content that follows it.
 */
export function SectionHeading({ title, count, actionLabel, onAction, className = '' }: Props) {
  return (
    <View className={`mt-6 mb-3 ${className}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-baseline flex-1 pr-2">
          <Heading level={2} className="text-title font-extrabold text-ink tracking-tight">
            {title}
          </Heading>
          {count !== undefined ? (
            <Mono className="text-label text-ink-mute ml-2">{count}</Mono>
          ) : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
            className="flex-row items-center min-h-[48px] pl-2 active:opacity-70"
          >
            <Text className="text-label font-bold text-navy">{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={18} color={palette.navy} />
          </Pressable>
        ) : null}
      </View>
      <View className="h-px bg-rule mt-2" />
    </View>
  );
}
