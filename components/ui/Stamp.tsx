import { Text, View } from 'react-native';
import { curve } from '../../constants/theme';

export type StampTone = 'open' | 'closing' | 'closed' | 'navy';

const TONES: Record<StampTone, { box: string; text: string }> = {
  open: { box: 'bg-open-bg border-open-border', text: 'text-open-text' },
  closing: { box: 'bg-closing-bg border-closing-border', text: 'text-closing-text' },
  closed: { box: 'bg-closed-bg border-closed-border', text: 'text-closed-text' },
  navy: { box: 'bg-navy-tint border-navy-line', text: 'text-navy' },
};

type Props = {
  label: string;
  detail?: string;
  tone?: StampTone;
  className?: string;
};

/**
 * Status is a stamped rectangle, not a pill. It always carries words, so a reader
 * who cannot separate red from green still knows what the notice says.
 */
export function Stamp({ label, detail, tone = 'navy', className = '' }: Props) {
  const t = TONES[tone];
  return (
    <View style={curve} className={`self-start rounded-[6px] border px-2 py-1 ${t.box} ${className}`}>
      <View className="flex-row items-center flex-wrap">
        <Text className={`text-[13px] font-extrabold uppercase tracking-stamp ${t.text}`}>
          {label}
        </Text>
        {detail ? (
          <Text className={`text-label font-bold ml-1.5 ${t.text}`}>{detail}</Text>
        ) : null}
      </View>
    </View>
  );
}
