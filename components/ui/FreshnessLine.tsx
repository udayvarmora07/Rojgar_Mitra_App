import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { freshnessOf } from '../../lib/freshness';
import { formatDate } from '../../lib/deadline';
import { useLanguage } from '../../hooks/useLanguage';
import { palette } from '../../constants/theme';

/**
 * "Checked today" under a list is the difference between a reader trusting the notice
 * board and a reader wondering whether the date passed while the phone was offline.
 */
export function FreshnessLine({
  savedAt,
  className = '',
}: {
  savedAt: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const info = useMemo(() => freshnessOf(savedAt), [savedAt]);

  if (!info) return null;

  const text =
    info.kind === 'justNow'
      ? t('checkedJustNow')
      : info.kind === 'minutes'
        ? t('checkedMinutesAgo', { minutes: info.minutes })
        : info.kind === 'today'
          ? t('checkedToday')
          : info.kind === 'yesterday'
            ? t('checkedYesterday')
            : t('checkedOn', { date: formatDate(info.at, language) });

  return (
    <View className={`flex-row items-center ${className}`}>
      <Ionicons name="time-outline" size={16} color={palette.inkMute} />
      <Text className="text-label text-ink-mute ml-1.5">{text}</Text>
    </View>
  );
}
