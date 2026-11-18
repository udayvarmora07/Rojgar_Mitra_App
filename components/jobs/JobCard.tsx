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
 * One advertisement, one notice block.
 *
 * Reading order is fixed: the date stub answers "can I still apply?", the title
 * answers "what is the post?", the department answers "who is it for?", and the
 * single meta line carries vacancies, qualification and pay without stacking four
 * rows of detail.
 *
 * `onApply` adds a second, sibling press target on a ruled strip below the notice.
 * It is deliberately not nested inside the details button: nested touchables are
 * unreachable to screen readers on iOS, and the list needs Apply to be its own
 * control (PRD 5.2).
 */
export function JobCard({
  job,
  onPress,
  onApply,
  applied = false,
}: {
  job: Job;
  onPress: () => void;
  onApply?: () => void;
  /** The reader marked this notice as submitted. Shown as a stamp, never colour alone. */
  applied?: boolean;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const status = deadlineStatus(job.deadline);
  const left = daysLeft(job.deadline);

  const meta = [
    job.vacancies != null ? t('vacancyCount', { count: job.vacancies }) : null,
    job.qualification ?? null,
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
    <View style={curve} className="bg-card rounded-card mb-4 border border-rule overflow-hidden">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${job.title}, ${job.department}, ${t('lastDate')} ${formatDate(
          job.deadline,
          language
        )}${applied ? `, ${t('appliedStamp')}` : ''}`}
        accessibilityHint={t('jobDetails')}
        onPress={onPress}
        className="flex-row active:opacity-80"
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

          {/* Pay gets its own line: it is a decision fact, and the shared meta line
              truncates it to "Rs. 56,..." on a phone, which is worse than not showing it. */}
          {job.salary ? (
            <View className="flex-row items-baseline mt-1">
              <Text className="text-label font-bold text-ink-mute">{t('salary')}: </Text>
              <Text className="text-label text-ink flex-1" numberOfLines={2}>
                {job.salary}
              </Text>
            </View>
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
            {applied ? (
              <View className="ml-2">
                <Stamp tone="navy" label={t('appliedStamp')} />
              </View>
            ) : null}
          </View>
        </View>

        <View className="justify-center pr-3">
          <Ionicons name="chevron-forward" size={24} color={palette.inkMute} />
        </View>
      </Pressable>

      {onApply && status !== 'expired' ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${t('applyOnline')}: ${job.title}`}
          accessibilityHint={t('applyHint')}
          onPress={onApply}
          className="min-h-[52px] border-t border-rule px-4 flex-row items-center active:bg-paper"
        >
          <Ionicons name="open-outline" size={20} color={palette.navy} />
          <Text className="flex-1 text-label font-bold text-navy ml-2" numberOfLines={1}>
            {t('applyOnline')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={palette.navy} />
        </Pressable>
      ) : null}
    </View>
  );
}
