import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { curve, palette } from '../../constants/theme';
import { Mono } from './Mono';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint: string;
  onPress: () => void;
  /** `primary` is the navy full-width action; `plain` is a peer card in a row. */
  emphasis?: 'primary' | 'plain';
  count?: number | string;
  countLabel?: string;
  className?: string;
};

/**
 * A quick action that states what it does and what the reader will find inside.
 * The primary card is the only filled surface above the fold; its count is the
 * live number of open notices, set in mono so it reads as data rather than a badge.
 */
export function ActionCard({
  icon,
  title,
  hint,
  onPress,
  emphasis = 'plain',
  count,
  countLabel,
  className = '',
}: Props) {
  const primary = emphasis === 'primary';

  if (primary) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          count !== undefined ? `${title}. ${count} ${countLabel}. ${hint}` : `${title}. ${hint}`
        }
        onPress={onPress}
        style={curve}
        className={`rounded-card border bg-navy border-navy px-5 py-4 flex-row items-center active:opacity-80 ${className}`}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={curve}
          className="w-12 h-12 rounded-control border border-navy-line bg-white/10 items-center justify-center mr-4"
        >
          <Ionicons name={icon} size={26} color={palette.card} />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[20px] leading-[26px] font-bold text-white">{title}</Text>
          <Text className="text-label text-navy-line mt-0.5" numberOfLines={2}>
            {hint}
          </Text>
        </View>
        {count !== undefined ? (
          <View className="items-end ml-3">
            <Mono className="text-[34px] leading-[38px] font-bold text-white">{count}</Mono>
            <Text className="text-[11px] font-bold uppercase tracking-stamp text-navy-line">
              {countLabel}
            </Text>
          </View>
        ) : (
          <Ionicons name="arrow-forward" size={22} color={palette.navyLine} />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      onPress={onPress}
      style={curve}
      className={`rounded-card border bg-card border-rule p-4 active:opacity-80 ${className}`}
    >
      <View className="flex-row items-start justify-between mb-3">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={curve}
          className="w-11 h-11 rounded-control border border-navy-line bg-navy-tint items-center justify-center"
        >
          <Ionicons name={icon} size={24} color={palette.navy} />
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.inkMute} />
      </View>
      <Text className="text-body leading-reading font-bold text-ink">{title}</Text>
      <Text className="text-label text-ink-soft mt-1" numberOfLines={2}>
        {hint}
      </Text>
    </Pressable>
  );
}
