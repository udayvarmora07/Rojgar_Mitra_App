import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = { ratio: number; label?: string; tone?: 'accent' | 'primary' };

export function ProgressBar({ ratio, label, tone = 'accent' }: Props) {
  const { t } = useTranslation();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  const percent = Math.round(clamped * 100);
  // Every progressbar needs an accessible name (axe: aria-progressbar-name).
  const accessibleName = label ?? t('progressLabel');

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibleName}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
    >
      {label ? <Text className="text-lg font-semibold text-ink mb-2">{label}</Text> : null}
      <View className="h-4 bg-gray-200 rounded-full overflow-hidden">
        <View
          testID="progress-fill"
          className={`h-4 rounded-full ${tone === 'accent' ? 'bg-accent' : 'bg-primary'}`}
          style={{ width: `${percent}%` }}
        />
      </View>
    </View>
  );
}
