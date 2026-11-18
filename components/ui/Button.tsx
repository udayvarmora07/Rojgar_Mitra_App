import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Variant = 'primary' | 'accent' | 'secondary' | 'danger';

const VARIANTS: Record<Variant, { box: string; text: string; icon: string }> = {
  primary: { box: 'bg-primary', text: 'text-white', icon: '#FFFFFF' },
  accent: { box: 'bg-accent', text: 'text-white', icon: '#FFFFFF' },
  secondary: { box: 'bg-white border-2 border-primary', text: 'text-primary', icon: '#1E3A8A' },
  danger: { box: 'bg-white border-2 border-alert', text: 'text-alert', icon: '#DC2626' },
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

/** Large (min 56dp tall) full-width button - PRD 13 asks for >= 48dp targets. */
export function Button({ label, onPress, variant = 'primary', icon, disabled, accessibilityHint, className = '' }: Props) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-[56px] rounded-xl px-5 py-4 flex-row items-center justify-center active:opacity-80 ${v.box} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {icon ? (
        <View className="mr-2">
          <Ionicons name={icon} size={24} color={v.icon} />
        </View>
      ) : null}
      <Text className={`text-lg font-bold text-center ${v.text}`}>{label}</Text>
    </Pressable>
  );
}
