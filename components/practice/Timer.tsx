import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { palette } from '../../constants/theme';
import { formatClock } from '../../hooks/useCountdown';
import { Mono } from '../ui/Mono';

/** Turns vermilion in the last minute, and the accessible name always states the time. */
export function Timer({ seconds }: { seconds: number }) {
  const { t } = useTranslation();
  const low = seconds <= 60;
  return (
    <View
      accessibilityLabel={`${t('timeLeft')} ${formatClock(seconds)}`}
      className={`flex-row items-center rounded-[6px] border px-2.5 min-h-[44px] ${
        low ? 'bg-stamp border-stamp' : 'bg-white/10 border-navy-line'
      }`}
    >
      <Ionicons name="time-outline" size={18} color={palette.card} />
      <Mono className="text-white text-body font-bold ml-1.5">{formatClock(seconds)}</Mono>
    </View>
  );
}
