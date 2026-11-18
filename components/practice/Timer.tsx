import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { formatClock } from '../../hooks/useCountdown';

/** Turns red in the last minute. */
export function Timer({ seconds }: { seconds: number }) {
  const { t } = useTranslation();
  const low = seconds <= 60;
  return (
    <View
      accessibilityLabel={`${t('timeLeft')} ${formatClock(seconds)}`}
      className={`flex-row items-center rounded-xl px-3 min-h-[44px] ${low ? 'bg-alert' : 'bg-blue-800'}`}
    >
      <Ionicons name="time-outline" size={22} color="#FFFFFF" />
      <Text className="text-white text-xl font-bold ml-2">{formatClock(seconds)}</Text>
    </View>
  );
}
