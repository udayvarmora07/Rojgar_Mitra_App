import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import type { Job } from '../../lib/supabase';
import { daysLeft, deadlineStatus, formatDate } from '../../lib/deadline';
import { useLanguage } from '../../hooks/useLanguage';
import { curve, palette } from '../../constants/theme';
import { DateStub } from './DateStub';
import { Stamp } from '../ui/Stamp';

/**
 * One advertisement, one tap target.
 *
 * Reading order is fixed: the date stub answers "can I still apply?", the title
 * answers "what is the post?", the department answers "who is it for?", and the
 * single meta line carries vacancies, qualification and pay without stacking four
 * rows of detail.
 */
export function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const status = deadlineStatus(job.deadline);
  const left = daysLeft(job.deadline);

  const meta = [
    job.vacancies != null ? t('vacancyCount', { count: job.vacancies }) : null,
    job.qualification ?? null,
    job.salary ?? null,
  ].filter(Boolean);

  const countdown =
    status === 'expired'
      ? undefined
      : left === 0
        ? t('lastDayToday')
        : left !== null && status === 'closingSoon'
          ? t('daysLeft', { count: left })
          : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${job.department}, ${t('lastDate')} ${formatDate(
        job.deadline,
        language
      )}`}
      accessibilityHint={t('jobDetails')}
      onPress={onPress}
      style={curve}
      className="bg-card rounded-card mb-4 border border-rule flex-row overflow-hidden active:opacity-80"
    >
      <DateStub deadline={job.deadline} />

      <View className="flex-1 px-4 py-3">
        <Text className="text-[20px] leading-[26px] font-bold text-ink" numberOfLines={2}>
          {job.title}
        </Text>
        <Text className="text-body text-ink-soft mt-1" numberOfLines={1}>
          {job.department}
        </Text>

        {meta.length > 0 ? (
          <Text className="text-label text-ink-mute mt-1" numberOfLines={1}>
            {meta.join(' · ')}
          </Text>
        ) : null}

        <View className="flex-row items-center mt-3 flex-wrap">
          <Text className="text-label text-ink-mute mr-2">{t('lastDate')}</Text>
          <Stamp
            tone={status === 'expired' ? 'closed' : status === 'closingSoon' ? 'closing' : 'open'}
            label={
              status === 'expired'
                ? t('expired')
                : status === 'closingSoon'
                  ? t('filterClosingSoon')
                  : t('filterOpen')
            }
            detail={countdown}
          />
        </View>
      </View>

      <View className="justify-center pr-3">
        <Ionicons name="chevron-forward" size={24} color={palette.inkMute} />
      </View>
    </Pressable>
  );
}
