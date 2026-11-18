import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useJobs } from '../../hooks/useJobs';
import { filterJobs, NO_FILTERS } from '../../lib/jobsFilter';
import { Header } from '../../components/ui/Header';
import { LanguageToggle } from '../../components/ui/LanguagePicker';
import { JobCard } from '../../components/jobs/JobCard';
import { Button } from '../../components/ui/Button';
import { Banner, EmptyState, LoadingState } from '../../components/ui/States';

type IconName = keyof typeof Ionicons.glyphMap;

function QuickTile({ icon, label, onPress, color }: { icon: IconName; label: string; onPress: () => void; color: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-1 basis-0 min-w-0 min-h-[128px] bg-white rounded-card border border-gray-200 items-center justify-center px-0.5 py-3 mx-1 active:opacity-80"
    >
      <Ionicons name={icon} size={40} color={color} />
      {/* Two-line slot: equal content height keeps all three icons on one baseline at 390 px.
          The 2 px inner padding gives the label 114 px, enough for "Documents" (102.4 px). */}
      <View className="h-[54px] justify-center mt-2">
        <Text numberOfLines={2} className="text-lg font-bold text-ink text-center leading-reading">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { jobs, loading, refreshing, offline, refresh } = useJobs();

  // PRD 5.1: first 10 open jobs, sorted by deadline (query already orders by deadline).
  const latest = filterJobs(jobs, NO_FILTERS).slice(0, 10);

  return (
    <View role="main" className="flex-1 bg-surface">
      <Header title={t('appName')} subtitle={t('welcome')} right={<LanguageToggle />} />

      {loading ? (
        <LoadingState label={t('loading')} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#1E3A8A']} />}
        >
          {offline && jobs.length > 0 ? <Banner text={t('offlineBanner')} /> : null}

          <Text accessibilityRole="header" className="text-xl font-bold text-ink mb-3">
            {t('quickActions')}
          </Text>
          <View className="flex-row -mx-1 mb-6">
            <QuickTile icon="briefcase" label={t('quickJobs')} color="#1E3A8A" onPress={() => router.push('/jobs')} />
            <QuickTile icon="school" label={t('quickPractice')} color="#047857" onPress={() => router.push('/practice')} />
            <QuickTile icon="document-text" label={t('quickDocuments')} color="#B45309" onPress={() => router.push('/documents')} />
          </View>

          <Text accessibilityRole="header" className="text-xl font-bold text-ink mb-3">
            {t('latestJobs')}
          </Text>

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
              <Button label={t('viewAllJobs')} icon="list" onPress={() => router.push('/jobs')} />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
