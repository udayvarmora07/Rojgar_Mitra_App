import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useJobs } from '../../hooks/useJobs';
import {
  DeadlineFilter,
  filterJobs,
  listDepartments,
  NO_FILTERS,
  JobFilters,
} from '../../lib/jobsFilter';
import { Masthead } from '../../components/ui/Masthead';
import { LanguageToggle } from '../../components/ui/LanguagePicker';
import { JobCard } from '../../components/jobs/JobCard';
import { FilterChips } from '../../components/jobs/FilterChips';
import { Button } from '../../components/ui/Button';
import { Banner, EmptyState, LoadingState } from '../../components/ui/States';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Mono } from '../../components/ui/Mono';
import { Screen } from '../../components/ui/Screen';
import { palette } from '../../constants/theme';

export default function JobsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { jobs, loading, refreshing, offline, refresh } = useJobs();
  const params = useLocalSearchParams<{ deadline?: string }>();

  const [filters, setFilters] = useState<JobFilters>(() => ({
    ...NO_FILTERS,
    deadline: params.deadline === 'closingSoon' ? 'closingSoon' : 'all',
  }));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [departmentQuery, setDepartmentQuery] = useState('');

  // Home can link here with a deadline already chosen; keep the control in sync.
  useEffect(() => {
    const next = params.deadline;
    if (next === 'closingSoon' || next === 'open' || next === 'all') {
      setFilters((f) => ({ ...f, deadline: next as DeadlineFilter }));
    }
  }, [params.deadline]);

  const live = useMemo(() => filterJobs(jobs, NO_FILTERS), [jobs]);
  const visible = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const departments = useMemo(() => listDepartments(jobs), [jobs]);
  const departmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of live) counts.set(job.department, (counts.get(job.department) ?? 0) + 1);
    return counts;
  }, [live]);

  const shownDepartments = useMemo(() => {
    const query = departmentQuery.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter((d) => d.toLowerCase().includes(query));
  }, [departments, departmentQuery]);

  const hasFilters =
    filters.department !== null || filters.deadline !== 'all' || filters.query.trim() !== '';
  const activeFilterCount = (filters.department ? 1 : 0) + (filters.deadline !== 'all' ? 1 : 0);

  const deadlineChips: { value: DeadlineFilter; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'closingSoon', label: t('filterClosingSoon') },
    { value: 'open', label: t('filterOpen') },
  ];

  const selectDepartment = (department: string | null) => {
    setFilters((f) => ({ ...f, department }));
    setSheetOpen(false);
    setDepartmentQuery('');
  };

  if (loading) {
    return (
      <Screen>
        <Masthead title={t('allJobs')} subtitle={t('loading')} right={<LanguageToggle />}>
          <SearchBox
            value={filters.query}
            onChange={(query) => setFilters((f) => ({ ...f, query }))}
            label={t('searchJobs')}
            clearLabel={t('clearSearch')}
          />
        </Masthead>
        <LoadingState label={t('loading')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Masthead
        title={t('allJobs')}
        subtitle={t('jobsCount', { count: visible.length })}
        right={<LanguageToggle />}
      >
        <SearchBox
          value={filters.query}
          onChange={(query) => setFilters((f) => ({ ...f, query }))}
          label={t('searchJobs')}
          clearLabel={t('clearSearch')}
        />
      </Masthead>

      <View className="bg-card border-b border-rule px-4 pt-3 pb-2">
        <FilterChips
          accessibilityLabel={t('lastDate')}
          chips={deadlineChips}
          selected={filters.deadline}
          onSelect={(deadline) => setFilters((f) => ({ ...f, deadline }))}
        />
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-label text-ink-soft flex-1 pr-2" numberOfLines={1}>
            {filters.department ?? t('allDepartments')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('filters')}
            accessibilityState={{ expanded: sheetOpen }}
            onPress={() => setSheetOpen(true)}
            className="min-h-[48px] px-3 rounded-control border border-rule flex-row items-center active:opacity-70"
          >
            <Ionicons name="options-outline" size={20} color={palette.navy} />
            <Text className="text-label font-bold text-navy ml-1.5">{t('filters')}</Text>
            {activeFilterCount > 0 ? (
              <View className="ml-1.5 min-w-[22px] h-[22px] rounded-[4px] bg-navy items-center justify-center px-1">
                <Mono className="text-[11px] font-bold text-white">{activeFilterCount}</Mono>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(job) => job.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[palette.navy]}
            tintColor={palette.navy}
          />
        }
        ListHeaderComponent={
          <View>
            {offline && jobs.length > 0 ? <Banner text={t('offlineBanner')} /> : null}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-label text-ink-mute">{t('sortedByLastDate')}</Text>
              {hasFilters ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFilters(NO_FILTERS)}
                  className="min-h-[48px] justify-center active:opacity-70"
                >
                  <Text className="text-label font-bold text-navy">{t('clearFilters')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => router.push(`/job/${item.id}`)} />
        )}
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
              action={
                <Button
                  variant="secondary"
                  label={t('clearFilters')}
                  onPress={() => setFilters(NO_FILTERS)}
                />
              }
            />
          ) : (
            <EmptyState icon="briefcase-outline" title={t('noJobsAvailable')} hint={t('checkBackLater')} />
          )
        }
      />

      <BottomSheet
        visible={sheetOpen}
        title={t('department')}
        closeLabel={t('close')}
        onClose={() => setSheetOpen(false)}
        footer={
          <View className="gap-2">
            <Button
              label={t('showResults', { count: visible.length })}
              onPress={() => setSheetOpen(false)}
            />
            {hasFilters ? (
              <Button
                variant="secondary"
                icon="close-circle-outline"
                label={t('clearFilters')}
                onPress={() => {
                  setFilters(NO_FILTERS);
                  setSheetOpen(false);
                }}
              />
            ) : null}
          </View>
        }
      >
        <View className="flex-row items-center bg-paper rounded-control border border-rule px-3 min-h-[52px] mb-3">
          <Ionicons name="search" size={20} color={palette.inkSoft} />
          <TextInput
            accessibilityLabel={t('searchDepartments')}
            placeholder={t('searchDepartments')}
            placeholderTextColor={palette.inkMute}
            value={departmentQuery}
            onChangeText={setDepartmentQuery}
            style={{ color: palette.ink }}
            className="flex-1 text-body ml-2 py-2"
            returnKeyType="search"
          />
        </View>

        <DepartmentRow
          label={t('allDepartments')}
          count={live.length}
          selected={filters.department === null}
          onPress={() => selectDepartment(null)}
        />
        {shownDepartments.map((department) => (
          <DepartmentRow
            key={department}
            label={department}
            count={departmentCounts.get(department) ?? 0}
            selected={filters.department === department}
            onPress={() => selectDepartment(department)}
          />
        ))}
      </BottomSheet>
    </Screen>
  );
}

function SearchBox({
  value,
  onChange,
  label,
  clearLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  clearLabel: string;
}) {
  return (
    <View className="flex-row items-center bg-card rounded-control px-3.5 mt-4 min-h-[56px] border border-rule">
      <Ionicons name="search" size={22} color={palette.inkSoft} />
      <TextInput
        accessibilityLabel={label}
        placeholder={label}
        placeholderTextColor={palette.inkMute}
        value={value}
        onChangeText={onChange}
        style={{ color: palette.ink }}
        className="flex-1 text-body ml-2.5 py-3"
        returnKeyType="search"
        autoCorrect={false}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={() => onChange('')}
          className="min-h-[48px] min-w-[48px] items-center justify-center -mr-2 active:opacity-70"
        >
          <Ionicons name="close-circle" size={22} color={palette.inkMute} />
        </Pressable>
      ) : null}
    </View>
  );
}

function DepartmentRow({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-[56px] px-3 rounded-control border flex-row items-center mb-2 active:opacity-80 ${
        selected ? 'bg-navy-tint border-navy' : 'bg-card border-rule'
      }`}
    >
      <Text className="flex-1 text-body font-semibold text-ink pr-3" numberOfLines={2}>
        {label}
      </Text>
      <Mono className="text-label text-ink-mute mr-2">{count}</Mono>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={palette.success} /> : null}
    </Pressable>
  );
}
