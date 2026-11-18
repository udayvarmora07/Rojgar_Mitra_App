import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useJobs } from '../../hooks/useJobs';
import {
  countByEducationLevel,
  filterJobs,
  listDepartments,
  NO_FILTERS,
} from '../../lib/jobsFilter';
import { deadlineStatus } from '../../lib/deadline';
import { curve, palette } from '../../constants/theme';
import { loadSeen, markerFor, newSinceSeen, saveSeen, type SeenMarker } from '../../lib/seenJobs';
import { Masthead } from '../../components/ui/Masthead';
import { LanguageToggle } from '../../components/ui/LanguagePicker';
import { JobCard } from '../../components/jobs/JobCard';
import { CategoryBoard } from '../../components/jobs/CategoryBoard';
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
  const educationCounts = countByEducationLevel(live);
  const departments = listDepartments(live);

  // "New since your last visit": the marker from the previous session is read once, compared
  // against the current list, then advanced only when the screen loses focus, so a notice
  // posted while the reader is looking at the list is not lost from the next visit.
  const [seen, setSeen] = useState<SeenMarker | null>(null);
  const [seenLoaded, setSeenLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    loadSeen().then((marker) => {
      if (!active) return;
      setSeen(marker);
      setSeenLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const newCount = useMemo(() => {
    if (!seenLoaded || live.length === 0) return 0;
    return newSinceSeen(live, seen).newJobs.length;
  }, [live, seen, seenLoaded]);

  useFocusEffect(
    useCallback(() => {
      // On leaving, record what has been shown. Nothing is written while the list is loading.
      return () => {
        if (live.length > 0) void saveSeen(markerFor(live));
      };
    }, [live])
  );

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

          {/* The first question a daily reader has is "what appeared since yesterday?". */}
          {newCount > 0 ? (
            <View
              accessibilityLiveRegion="polite"
              style={curve}
              className="flex-row items-center bg-open-bg border border-open-border rounded-control px-3 py-2 mb-3"
            >
              <Ionicons name="sparkles-outline" size={20} color={palette.success} />
              <Text className="text-label font-bold text-open-text ml-2 flex-1">
                {t('newSinceVisit', { count: newCount })}
              </Text>
            </View>
          ) : null}

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

          {/* The OTR trap is the top reason a candidate loses a post; keep it one tap away. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('applyGuide')}. ${t('applyGuideHint')}`}
            onPress={() => router.push('/guide')}
            style={curve}
            className="bg-card border border-rule rounded-card p-4 flex-row items-center mt-3 active:opacity-80"
          >
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={curve}
              className="w-10 h-10 rounded-control border border-navy-line bg-navy-tint items-center justify-center"
            >
              <Ionicons name="reader-outline" size={22} color={palette.navy} />
            </View>
            <View className="flex-1 ml-3 pr-2">
              <Text className="text-body font-bold text-ink">{t('applyGuide')}</Text>
              <Text className="text-label text-ink-soft mt-0.5">{t('applyGuideHint')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.inkMute} />
          </Pressable>

          {live.length > 0 ? (
            <>
              <SectionHeading title={t('browseByCategory')} />
              <Text className="text-label text-ink-soft -mt-1 mb-3">
                {t('browseByCategoryHint')}
              </Text>
              <CategoryBoard
                counts={educationCounts}
                departmentCount={departments.length}
                onSelectEducation={(education) =>
                  router.push({ pathname: '/jobs', params: { education } })
                }
                onSelectDepartments={() => router.push('/jobs?filters=1')}
              />
            </>
          ) : null}

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
