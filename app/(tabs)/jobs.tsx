import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useJobs } from '../../hooks/useJobs';
import {
  DeadlineFilter,
  filterJobs,
  listDepartments,
  NO_FILTERS,
  JobFilters,
  splitDepartments,
} from '../../lib/jobsFilter';
import { Header } from '../../components/ui/Header';
import { JobCard } from '../../components/jobs/JobCard';
import { FilterChips } from '../../components/jobs/FilterChips';
import { Button } from '../../components/ui/Button';
import { Banner, EmptyState, LoadingState } from '../../components/ui/States';

export default function JobsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { jobs, loading, refreshing, offline, refresh } = useJobs();
  const [filters, setFilters] = useState<JobFilters>(NO_FILTERS);
  const [allDepartments, setAllDepartments] = useState(false);

  const departments = useMemo(() => listDepartments(jobs), [jobs]);
  const visible = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const hasFilters = filters.department !== null || filters.deadline !== 'all' || filters.query.trim() !== '';
  const { visible: shownDepartments, hidden: hiddenDepartments } = splitDepartments(
    departments,
    filters.department
  );

  const deadlineChips: { value: DeadlineFilter; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'closingSoon', label: t('filterClosingSoon') },
    { value: 'open', label: t('filterOpen') },
  ];
  // A live scrape yields 50+ departments, mostly one advert each. Showing them all inline
  // buries the job list under a scroller, so they sit behind one control until asked for.
  const departmentChips: { value: string | null; label: string }[] = [
    { value: null, label: t('allDepartments') },
    ...(allDepartments ? departments : shownDepartments).map((d) => ({ value: d, label: d })),
  ];

  if (loading) {
    return (
      <View role="main" className="flex-1 bg-surface">
        <Header title={t('allJobs')} />
        <LoadingState label={t('loading')} />
      </View>
    );
  }

  return (
    <View role="main" className="flex-1 bg-surface">
      <Header title={t('allJobs')} subtitle={t('jobsCount', { count: visible.length })}>
        <View className="flex-row items-center bg-white rounded-xl px-4 mt-4 min-h-[56px]">
          <Ionicons name="search" size={24} color="#374151" />
          <TextInput
            accessibilityLabel={t('searchJobs')}
            placeholder={t('searchJobs')}
            placeholderTextColor="#4B5563"
            value={filters.query}
            onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
            // React Native Web's base input rule sets color:#9ca3af (2.53:1) and outranks the
            // NativeWind class, so the typed text must be set inline to stay readable.
            style={{ color: '#111827' }}
            className="flex-1 text-lg text-ink ml-3 py-3"
            returnKeyType="search"
          />
        </View>
      </Header>

      <FlatList
        data={visible}
        keyExtractor={(job) => job.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#1E3A8A']} />}
        ListHeaderComponent={
          <View className="mb-2">
            {offline && jobs.length > 0 ? <Banner text={t('offlineBanner')} /> : null}
            <FilterChips
              accessibilityLabel={t('lastDate')}
              chips={deadlineChips}
              selected={filters.deadline}
              onSelect={(deadline) => setFilters((f) => ({ ...f, deadline }))}
            />
            {departments.length > 1 ? (
              <View className="mt-2">
                <Text className="text-lg font-semibold text-ink mb-1">{t('department')}</Text>
                <FilterChips
                  accessibilityLabel={t('department')}
                  chips={departmentChips}
                  selected={filters.department}
                  onSelect={(department) => setFilters((f) => ({ ...f, department }))}
                />
                {hiddenDepartments.length > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: allDepartments }}
                    accessibilityLabel={allDepartments ? t('fewerDepartments') : t('showAllDepartments')}
                    onPress={() => setAllDepartments((v) => !v)}
                    className="flex-row items-center self-start mt-2 min-h-[48px] px-2 -mx-2 active:opacity-80"
                  >
                    <Text className="text-lg font-semibold text-primary">
                      {allDepartments
                        ? t('fewerDepartments')
                        : `${t('showAllDepartments')} (${hiddenDepartments.length})`}
                    </Text>
                    <Ionicons
                      name={allDepartments ? 'chevron-up' : 'chevron-down'}
                      size={22}
                      color="#1E3A8A"
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <View className="h-3" />
          </View>
        }
        renderItem={({ item }) => <JobCard job={item} onPress={() => router.push(`/job/${item.id}`)} />}
        ListEmptyComponent={
          offline && jobs.length === 0 ? (
            <EmptyState
              icon="cloud-offline-outline"
              title={t('loadFailed')}
              hint={t('loadFailedHint')}
              action={<Button icon="refresh" label={t('retry')} onPress={refresh} />}
            />
          ) : hasFilters ? (
            <EmptyState
              icon="search-outline"
              title={t('noResults')}
              hint={t('noResultsHint')}
              action={<Button variant="secondary" label={t('clearFilters')} onPress={() => setFilters(NO_FILTERS)} />}
            />
          ) : (
            <EmptyState icon="briefcase-outline" title={t('noJobsAvailable')} hint={t('checkBackLater')} />
          )
        }
      />
    </View>
  );
}
