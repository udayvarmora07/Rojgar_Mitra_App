import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Masthead } from '../components/ui/Masthead';
import { LanguageToggle } from '../components/ui/LanguagePicker';
import { Screen } from '../components/ui/Screen';
import { SectionHeading } from '../components/ui/SectionHeading';
import { EmptyState, Footnote, LoadingState } from '../components/ui/States';
import { JobCard } from '../components/jobs/JobCard';
import { Mono } from '../components/ui/Mono';
import { curve } from '../constants/theme';
import { useJobs } from '../hooks/useJobs';
import { useLanguage } from '../hooks/useLanguage';
import { loadApplications, type ApplicationMap } from '../lib/applications';
import { formatDate } from '../lib/deadline';
import { filterJobs, NO_FILTERS } from '../lib/jobsFilter';

/**
 * The reader's own record of what they submitted.
 *
 * Job lists hide an advertisement once its deadline passes, which is correct for browsing and
 * wrong for a candidate: the post they applied to is still the one whose call letter they are
 * waiting for. This screen reads the local application map and joins it to the live job cache,
 * and it keeps a row even when the job has dropped out of the cached list.
 */
export default function ApplicationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { jobs, loading, refreshing, refresh } = useJobs();
  const [records, setRecords] = useState<ApplicationMap>({});

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadApplications().then((map) => active && setRecords(map));
      return () => {
        active = false;
      };
    }, [])
  );

  const byId = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

  // Live jobs only: `filterJobs` already drops expired ones from the browse list.
  const live = useMemo(() => filterJobs(jobs, NO_FILTERS), [jobs]);
  const applied = useMemo(() => live.filter((job) => records[job.id]), [live, records]);
  // Records whose job is no longer in the live list still matter: they are past deadlines.
  const archived = useMemo(
    () =>
      Object.values(records)
        .filter((r) => !live.some((job) => job.id === r.jobId))
        .sort((a, b) => b.deadline.localeCompare(a.deadline)),
    [records, live]
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const total = Object.keys(records).length;

  return (
    <Screen>
      <Masthead
        title={t('applicationsTitle')}
        subtitle={t('applicationsIntro')}
        onBack={back}
        right={<LanguageToggle />}
      />

      {loading ? (
        <LoadingState label={t('loading')} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: insets.bottom + 28,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
        >
          {total === 0 ? (
            <EmptyState
              icon="checkbox-outline"
              title={t('noApplications')}
              hint={t('noApplicationsHint')}
            />
          ) : (
            <>
              <SectionHeading title={t('appliedFilter')} count={applied.length} />
              {applied.length === 0 ? (
                <Text className="text-body text-ink-soft leading-reading mb-4">
                  {t('noApplicationsHint')}
                </Text>
              ) : (
                applied.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onPress={() => router.push(`/job/${job.id}`)}
                  />
                ))
              )}

              {archived.length > 0 ? (
                <>
                  <SectionHeading title={t('expired')} count={archived.length} />
                  <View style={curve} className="bg-card border border-rule rounded-card px-4 mb-4">
                    {archived.map((record, index) => {
                      const job = byId.get(record.jobId);
                      return (
                        <View
                          key={record.jobId}
                          className={`py-3 ${index > 0 ? 'border-t border-rule' : ''}`}
                        >
                          <Text className="text-body font-semibold text-ink" numberOfLines={2}>
                            {job?.title ?? record.jobId}
                          </Text>
                          <View className="flex-row items-baseline mt-1">
                            <Text className="text-label text-ink-soft">
                              {t('lastDate')}:{' '}
                            </Text>
                            <Mono className="text-label text-ink-soft">
                              {formatDate(record.deadline, language)}
                            </Mono>
                          </View>
                          {record.confirmationNo ? (
                            <View className="flex-row items-baseline mt-0.5">
                              <Text className="text-label text-ink-soft">
                                {t('confirmationNo')}:{' '}
                              </Text>
                              <Mono className="text-label font-bold text-ink">
                                {record.confirmationNo}
                              </Mono>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}
            </>
          )}

          <Footnote>{t('officialNote')}</Footnote>
        </ScrollView>
      )}
    </Screen>
  );
}
