import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { curve, palette } from '../../constants/theme';

type Variant = 'primary' | 'accent' | 'secondary' | 'danger';

const VARIANTS: Record<Variant, { box: string; text: string; icon: string }> = {
  primary: { box: 'bg-navy border-navy', text: 'text-white', icon: palette.card },
  accent: { box: 'bg-success border-success', text: 'text-white', icon: palette.card },
  secondary: { box: 'bg-card border-navy', text: 'text-navy', icon: palette.navy },
  danger: { box: 'bg-card border-stamp', text: 'text-stamp', icon: palette.stamp },
};

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  accessibilityHint?: string;
  className?: string;
};

/** 56dp tall, 12px radius, one clear label. No gradients, no floating shadows. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  accessibilityHint,
  className = '',
}: Props) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={curve}
      className={`min-h-[56px] rounded-control border-[1.5px] px-5 py-4 flex-row items-center justify-center active:opacity-80 ${v.box} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
    >
      {icon ? (
        <View className="mr-2">
          <Ionicons name={icon} size={22} color={v.icon} />
        </View>
      ) : null}
      <Text className={`text-label font-bold text-center ${v.text}`}>{label}</Text>
    </Pressable>
  );
}
