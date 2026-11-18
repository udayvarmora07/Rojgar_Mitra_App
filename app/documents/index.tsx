import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Masthead } from '../../components/ui/Masthead';
import { LanguageToggle } from '../../components/ui/LanguagePicker';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Screen } from '../../components/ui/Screen';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Footnote } from '../../components/ui/States';
import { Mono } from '../../components/ui/Mono';
import { useChecklist } from '../../hooks/useChecklist';
import { curve, palette } from '../../constants/theme';
import type { DocPhase } from '../../constants/documents';

type Stats = { done: number; total: number; ratio: number; pending: number };

function PhaseCard({
  phase,
  stats,
  jobId,
}: {
  phase: DocPhase;
  stats: Stats;
  jobId?: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const title = phase === 'application' ? t('applicationDocs') : t('examDocs');
  const summary = t('readyCount', { done: stats.done, total: stats.total });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${summary}`}
      onPress={() =>
        router.push({ pathname: '/documents/[phase]', params: jobId ? { phase, jobId } : { phase } })
      }
      className="bg-card rounded-card p-5 mb-3 border border-rule active:opacity-80"
      style={curve}
    >
      <View className="flex-row items-center mb-4">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="w-11 h-11 rounded-control bg-navy-tint border border-navy-line items-center justify-center"
        >
          <Ionicons
            name={phase === 'application' ? 'document-text-outline' : 'school-outline'}
            size={24}
            color={palette.navy}
          />
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-[20px] leading-[26px] font-bold text-ink">{title}</Text>
          <Mono className="text-label text-ink-mute mt-0.5">
            {stats.done} / {stats.total}
          </Mono>
        </View>
        <Ionicons name="chevron-forward" size={22} color={palette.inkMute} />
      </View>
      <ProgressBar ratio={stats.ratio} label={summary} />
      <Text
        className={`text-label mt-2 font-semibold ${
          stats.pending === 0 ? 'text-open-text' : 'text-ink-soft'
        }`}
      >
        {stats.pending === 0 ? t('allReady') : t('pendingCount', { count: stats.pending })}
      </Text>
    </Pressable>
  );
}

export default function DocumentsHome() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const application = useChecklist('application', jobId);
  const exam = useChecklist('exam', jobId);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const done = application.stats.done + exam.stats.done;
  const total = application.stats.total + exam.stats.total;
  const ratio = total ? done / total : 0;

  return (
    <Screen>
      <Masthead
        title={t('documentsTitle')}
        subtitle={t('documentsIntro')}
        onBack={back}
        right={<LanguageToggle />}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 }}
      >
        <View className="bg-navy-tint border border-navy-line rounded-card p-5 mb-4" style={curve}>
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-[11px] font-extrabold uppercase tracking-stamp text-navy">
                {t('progressLabel')}
              </Text>
              <Mono className="text-[38px] leading-[44px] font-bold text-navy mt-1">
                {done}/{total}
              </Mono>
            </View>
            <Mono className="text-title font-bold text-navy">
              {Math.round(ratio * 100)}%
            </Mono>
          </View>
          <View className="mt-3">
            <ProgressBar ratio={ratio} tone="primary" />
          </View>
        </View>

        <SectionHeading title={t('myChecklists')} className="mt-2" />
        {application.loading || exam.loading ? null : (
          <>
            <PhaseCard phase="application" stats={application.stats} jobId={jobId} />
            <PhaseCard phase="exam" stats={exam.stats} jobId={jobId} />
          </>
        )}

        <Footnote>{t('officialNote')}</Footnote>
      </ScrollView>
    </Screen>
  );
}
