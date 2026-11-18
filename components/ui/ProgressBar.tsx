import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Mono } from './Mono';

export type ProgressTone = 'accent' | 'primary' | 'onDark';

type Props = { ratio: number; label?: string; tone?: ProgressTone };

const TRACK: Record<ProgressTone, string> = {
  accent: 'bg-rule',
  primary: 'bg-rule',
  onDark: 'bg-white/25',
};

const FILL: Record<ProgressTone, string> = {
  accent: 'bg-success',
  primary: 'bg-navy',
  onDark: 'bg-white',
};

export function ProgressBar({ ratio, label, tone = 'accent' }: Props) {
  const { t } = useTranslation();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  const percent = Math.round(clamped * 100);
  const accessibleName = label ?? t('progressLabel');
  const onDark = tone === 'onDark';

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibleName}
      accessibilityValue={{ min: 0, max: 100, now: percent, text: `${percent}%` }}
    >
      {label ? (
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`text-body font-semibold flex-1 pr-3 ${onDark ? 'text-white' : 'text-ink'}`}>
            {label}
          </Text>
          <Mono className={`text-label font-bold ${onDark ? 'text-white' : 'text-ink-soft'}`}>
            {percent}%
          </Mono>
        </View>
      ) : null}
      <View className={`h-2 rounded-full overflow-hidden ${TRACK[tone]}`}>
        <View
          testID="progress-fill"
          className={`h-2 rounded-full ${FILL[tone]}`}
          style={{ width: `${percent}%` }}
        />
      </View>
    </View>
  );
}
