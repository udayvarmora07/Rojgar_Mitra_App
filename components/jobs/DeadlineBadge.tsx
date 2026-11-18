import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { daysLeft, deadlineStatus, formatDate } from '../../lib/deadline';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * "Last Date: 12 Nov 2026 · 3 days left" - red when <= 7 days (PRD 5.2).
 *
 * The countdown is a status pill, the one place a pill is correct: it is a state, not an
 * action (PRODUCT.md 4). Its surface comes from the UX4G ramp and always carries text, so
 * the colour reinforces the message instead of being the message.
 */
export function DeadlineBadge({ deadline, now }: { deadline: string; now?: Date }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const status = deadlineStatus(deadline, now);
  const left = daysLeft(deadline, now);
  const urgent = status !== 'open';

  let countdown = '';
  if (status === 'expired') countdown = t('expired');
  else if (left === 0) countdown = t('lastDayToday');
  else if (left !== null && status === 'closingSoon') countdown = t('daysLeft', { count: left });

  // alert (#DC2626) on the closing surface is 4.41:1 and fails WCAG AA for body text, so
  // urgent text uses closing-text (#8A1A16 on #FFF8F8 = 8.94:1).
  const color = urgent ? '#8A1A16' : '#404040';
  // The countdown is a status, so the pill shape is deliberate here and nowhere else.
  const pill = 'bg-closing-bg border border-closing-border rounded-full px-3 py-1 ml-2 mt-1'; // unslop-ignore: status pill, not an action (PRODUCT.md 4)

  return (
    <View className="flex-row items-center flex-wrap">
      <Ionicons name="calendar-outline" size={20} color={color} />
      <Text className={`text-lg ml-2 leading-reading ${urgent ? 'text-closing-text font-bold' : 'text-gray-700'}`}>
        {t('lastDate')}: {formatDate(deadline, language)}
      </Text>
      {countdown ? (
        <View className={pill}>
          <Text className="text-lg font-bold text-closing-text">{countdown}</Text>
        </View>
      ) : null}
    </View>
  );
}
