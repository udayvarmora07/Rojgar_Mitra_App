import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { daysLeft, deadlineStatus, formatDate } from '../../lib/deadline';
import { useLanguage } from '../../hooks/useLanguage';
import { palette } from '../../constants/theme';
import { Stamp } from '../ui/Stamp';

/**
 * "Open / Closing soon / Closed" plus the last date and, when it matters, a
 * countdown. The stamp is the only pill-like status shape left in the app, and it
 * is a rectangle that carries text rather than a colour-only dot.
 */
export function DeadlineBadge({ deadline, now }: { deadline: string; now?: Date }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const status = deadlineStatus(deadline, now);
  const left = daysLeft(deadline, now);

  let label = t('filterOpen');
  if (status === 'expired') label = t('expired');
  else if (status === 'closingSoon') label = t('filterClosingSoon');

  let countdown: string | undefined;
  if (status === 'expired') countdown = undefined;
  else if (left === 0) countdown = t('lastDayToday');
  else if (left !== null && status === 'closingSoon') countdown = t('daysLeft', { count: left });

  return (
    <View className="flex-row items-center flex-wrap">
      <Ionicons
        name="calendar-outline"
        size={20}
        color={status === 'closingSoon' ? palette.stamp : palette.inkSoft}
      />
      <Text className={`text-body ml-2 ${status === 'closingSoon' ? 'text-closing-text font-bold' : 'text-ink-soft'}`}>
        {t('lastDate')}: {formatDate(deadline, language)}
      </Text>
      <Stamp
        className="ml-2 mt-1"
        tone={status === 'expired' ? 'closed' : status === 'closingSoon' ? 'closing' : 'open'}
        label={label}
        detail={countdown}
      />
    </View>
  );
}
