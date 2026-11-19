import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useJobs } from '../../hooks/useJobs';
import {
  countByEducationLevel,
  DeadlineFilter,
  filterJobs,
  listDepartments,
  NO_FILTERS,
  JobFilters,
  splitByApplied,
} from '../../lib/jobsFilter';
import {
  EDUCATION_LEVELS,
  educationLabelKey,
  isEducationLevel,
} from '../../constants/education';
import { Masthead } from '../../components/ui/Masthead';
import { LanguageToggle } from '../../components/ui/LanguagePicker';
import { JobCard } from '../../components/jobs/JobCard';
import { FilterChips } from '../../components/jobs/FilterChips';
import { Button } from '../../components/ui/Button';
import { Banner, EmptyState, LoadingState } from '../../components/ui/States';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Mono } from '../../components/ui/Mono';
import { FreshnessLine } from '../../components/ui/FreshnessLine';
import { Screen } from '../../components/ui/Screen';
import { useLanguage } from '../../hooks/useLanguage';
import { openExternalLink } from '../../lib/externalLink';
import { isSafeWebUrl } from '../../lib/url';
import { loadApplications, type ApplicationMap } from '../../lib/applications';
import { curve, palette } from '../../constants/theme';

export default function JobsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { jobs, loading, refreshing, offline, savedAt, refresh } = useJobs();
  const params = useLocalSearchParams<{
    deadline?: string;
    education?: string;
    filters?: string;
  }>();

  const [filters, setFilters] = useState<JobFilters>(() => ({
    ...NO_FILTERS,
    deadline: params.deadline === 'closingSoon' ? 'closingSoon' : 'all',
    education: isEducationLevel(params.education) ? params.education : null,
  }));
  const [sheetOpen, setSheetOpen] = useState(params.filters === '1');
  const [departmentQuery, setDepartmentQuery] = useState('');
  const [applications, setApplications] = useState<ApplicationMap>({});
  const { language } = useLanguage();

  // Which notices the reader has marked applied. Re-read on focus because the mark is made
  // on the detail screen and this is a tab that stays mounted.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadApplications().then((map) => active && setApplications(map));
      return () => {
        active = false;
      };
    }, [])
  );
  const appliedIds = useMemo(() => new Set(Object.keys(applications)), [applications]);

  // PRD 5.2: Apply is available straight from the list, not only on the detail screen.
  const applyToJob = useCallback(
    async (link: string | null) => {
      if (!(await openExternalLink(link))) Alert.alert(t('linkError'));
    },
    [t]
  );

  // Home can link here with a deadline or education level already chosen; keep the
  // controls in sync if the route changes while the screen is mounted.
  useEffect(() => {
    const next = params.deadline;
    if (next === 'closingSoon' || next === 'open' || next === 'all') {
      setFilters((f) => ({ ...f, deadline: next as DeadlineFilter }));
    }
  }, [params.deadline]);

  useEffect(() => {
    const next = params.education;
    if (isEducationLevel(next)) {
      setFilters((f) => (f.education === next ? f : { ...f, education: next }));
    }
  }, [params.education]);

  const live = useMemo(() => filterJobs(jobs, NO_FILTERS), [jobs]);
  const visible = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  // A dedicated applied list: a notice the reader submitted is theirs to watch even if it has
  // scrolled far down the deadline order.
  const appliedJobs = useMemo(
    () => splitByApplied(visible, appliedIds).applied,
    [visible, appliedIds]
  );
  const departments = useMemo(() => listDepartments(jobs, language), [jobs, language]);
  const educationCounts = useMemo(() => countByEducationLevel(live), [live]);
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
    filters.department !== null ||
    filters.education !== null ||
    filters.deadline !== 'all' ||
    filters.query.trim() !== '';
  const activeFilterCount =
    (filters.department ? 1 : 0) +
    (filters.education ? 1 : 0) +
    (filters.deadline !== 'all' ? 1 : 0);

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
          accessibilityLabel={t('deadlineFilter')}
          chips={deadlineChips}
          selected={filters.deadline}
          onSelect={(deadline) => setFilters((f) => ({ ...f, deadline }))}
        />
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-label text-ink-soft flex-1 pr-2" numberOfLines={1}>
            {filters.education
              ? `${t(educationLabelKey(filters.education))} · ${
                  filters.department ?? t('allDepartments')
                }`
              : (filters.department ?? t('allDepartments'))}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('filters')}
            accessibilityState={{ expanded: sheetOpen }}
            onPress={() => setSheetOpen(true)}
            style={curve}
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
            <FreshnessLine savedAt={savedAt} className="mb-2" />
            {appliedJobs.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('applicationsTitle')}. ${t(
                  'appliedFilter'
                )}: ${appliedJobs.length}`}
                onPress={() => router.push('/applications')}
                style={curve}
                className="bg-open-bg border border-open-border rounded-card p-4 mb-3 flex-row items-center active:opacity-80"
              >
                <Ionicons name="checkmark-circle" size={22} color={palette.success} />
                <View className="flex-1 ml-2.5">
                  <Text className="text-body font-bold text-ink">{t('applicationsTitle')}</Text>
                  <Text className="text-label text-ink-soft mt-0.5">
                    {t('jobsCount', { count: appliedJobs.length })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.inkMute} />
              </Pressable>
            ) : null}
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
          <JobCard
            job={item}
            applied={appliedIds.has(item.id)}
            onPress={() => router.push(`/job/${item.id}`)}
            onApply={
              isSafeWebUrl(item.source_link) ? () => applyToJob(item.source_link) : undefined
            }
          />
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
        title={t('filters')}
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
        <Text className="text-[11px] font-extrabold uppercase tracking-stamp text-ink-mute mb-2">
          {t('educationLevel')}
        </Text>
        <View role="radiogroup" accessibilityLabel={t('educationLevel')}>
          <FilterRow
            label={t('allEducationLevels')}
            count={live.length}
            selected={filters.education === null}
            onPress={() => setFilters((f) => ({ ...f, education: null }))}
          />
          {EDUCATION_LEVELS.map((level) => (
            <FilterRow
              key={level.value}
              label={t(level.labelKey)}
              count={educationCounts[level.value]}
              selected={filters.education === level.value}
              onPress={() => setFilters((f) => ({ ...f, education: level.value }))}
            />
          ))}
        </View>

        <View className="h-px bg-rule my-3" />

        <Text className="text-[11px] font-extrabold uppercase tracking-stamp text-ink-mute mb-2">
          {t('department')}
        </Text>
        <View style={curve} className="flex-row items-center bg-paper rounded-control border border-rule px-3 min-h-[52px] mb-3">
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

        <View role="radiogroup" accessibilityLabel={t('department')}>
          <FilterRow
            label={t('allDepartments')}
            count={live.length}
            selected={filters.department === null}
            onPress={() => selectDepartment(null)}
          />
          {shownDepartments.map((department) => (
            <FilterRow
              key={department}
              label={department}
              count={departmentCounts.get(department) ?? 0}
              selected={filters.department === department}
              onPress={() => selectDepartment(department)}
            />
          ))}
        </View>
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
    <View style={curve} className="flex-row items-center bg-card rounded-control px-3.5 mt-4 min-h-[56px] border border-rule">
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

function FilterRow({
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
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={`${label}, ${t('jobsCount', { count })}`}
      onPress={onPress}
      style={curve}
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
