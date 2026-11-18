import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useJobs } from '../../hooks/useJobs';
import { filterJobs, NO_FILTERS } from '../../lib/jobsFilter';
import { deadlineStatus } from '../../lib/deadline';
import { palette } from '../../constants/theme';
import { Masthead } from '../../components/ui/Masthead';
import { LanguageToggle } from '../../components/ui/LanguagePicker';
import { JobCard } from '../../components/jobs/JobCard';
import { Button } from '../../components/ui/Button';
import { Banner, EmptyState, Footnote, LoadingState } from '../../components/ui/States';
import { ActionCard } from '../../components/ui/ActionCard';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Screen } from '../../components/ui/Screen';

/**
 * Home answers one question: what do I need to do next? The live count of open
 * notices sits inside the primary action, so the first thing the reader sees is
 * both the way in and how much is behind it.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { jobs, loading, refreshing, offline, refresh } = useJobs();

  const live = filterJobs(jobs, NO_FILTERS);
  const latest = live.slice(0, 8);
  const closing = live.filter((job) => deadlineStatus(job.deadline) === 'closingSoon').length;

  return (
    <Screen>
      <Masthead
        size="display"
        kicker={t('appKicker')}
        title={t('appName')}
        subtitle={t('welcome')}
        right={<LanguageToggle />}
      />

      {loading ? (
        <LoadingState label={t('loading')} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[palette.navy]}
              tintColor={palette.navy}
            />
          }
        >
          {offline && jobs.length > 0 ? <Banner text={t('offlineBanner')} /> : null}

          <SectionHeading title={t('quickActions')} className="mt-1" />

          <ActionCard
            emphasis="primary"
            icon="briefcase"
            title={t('quickJobs')}
            hint={closing > 0 ? t('closingThisWeekCount', { count: closing }) : t('quickJobsHint')}
            count={live.length}
            countLabel={t('openNotices')}
            onPress={() => router.push('/jobs')}
          />

          <View className="flex-row items-stretch gap-3 mt-3">
            <ActionCard
              className="flex-1 basis-0 min-w-0"
              icon="school"
              title={t('quickPractice')}
              hint={t('quickPracticeHint')}
              onPress={() => router.push('/practice')}
            />
            <ActionCard
              className="flex-1 basis-0 min-w-0"
              icon="document-text"
              title={t('quickDocuments')}
              hint={t('quickDocumentsHint')}
              onPress={() => router.push('/documents')}
            />
          </View>

          <SectionHeading
            title={t('latestJobs')}
            actionLabel={t('viewAllJobs')}
            onAction={() => router.push('/jobs')}
          />

          {offline && jobs.length === 0 ? (
            <EmptyState
              icon="cloud-offline-outline"
              title={t('loadFailed')}
              hint={t('loadFailedHint')}
              action={<Button icon="refresh" label={t('retry')} onPress={refresh} />}
            />
          ) : latest.length === 0 ? (
            <EmptyState icon="briefcase-outline" title={t('noJobsAvailable')} hint={t('checkBackLater')} />
          ) : (
            <>
              {latest.map((job) => (
                <JobCard key={job.id} job={job} onPress={() => router.push(`/job/${job.id}`)} />
              ))}
              <View className="mt-1">
                <Button variant="secondary" icon="list" label={t('viewAllJobs')} onPress={() => router.push('/jobs')} />
              </View>
            </>
          )}

          <Footnote>{t('officialNote')}</Footnote>
        </ScrollView>
      )}
    </Screen>
  );
}
