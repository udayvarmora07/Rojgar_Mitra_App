import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import type { Job } from '../../lib/supabase';
import { deadlineStatus } from '../../lib/deadline';
import { DeadlineBadge } from './DeadlineBadge';

/**
 * One advertisement, one tap target.
 *
 * Hierarchy answers the three questions this audience asks in order (PRODUCT.md 1):
 * what is the post, who is it for, and can I still apply. Vacancies and qualification are
 * folded into a single quiet meta line instead of four stacked rows, which cuts the card
 * height without hiding anything - the old layout printed up to eight rows of detail.
 */
export function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const { t } = useTranslation();
  const urgent = deadlineStatus(job.deadline) !== 'open';

  // One line of context: vacancies, qualification and pay, whichever exist. Pay stays on the
  // card because it is a primary reason this audience picks an advertisement at all.
  const meta = [
    job.vacancies != null ? t('vacancyCount', { count: job.vacancies }) : null,
    job.qualification ?? null,
    job.salary ?? null,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${job.title}, ${job.department}`}
      accessibilityHint={t('jobInfo')}
      onPress={onPress}
      className={`bg-white rounded-card px-5 py-4 mb-3 border border-gray-200 border-l-8 active:opacity-80 ${
        urgent ? 'border-l-alert' : 'border-l-primary'
      }`}
    >
      <View className="flex-row items-start">
        <View className="flex-1 pr-2">
          <Text className="text-xl font-bold text-ink leading-tight" numberOfLines={2}>
            {job.title}
          </Text>
          <Text className="text-lg text-primary mt-1 leading-reading" numberOfLines={1}>
            {job.department}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={28} color="#4B5563" />
      </View>

      <View className="mt-3">
        <DeadlineBadge deadline={job.deadline} />
      </View>

      {meta.length > 0 ? (
        <Text className="text-lg text-gray-700 mt-2 leading-reading">{meta.join(' · ')}</Text>
      ) : null}
    </Pressable>
  );
}
