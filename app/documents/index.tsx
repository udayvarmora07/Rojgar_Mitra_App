import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/ui/Header';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useChecklist } from '../../hooks/useChecklist';
import type { DocPhase } from '../../constants/documents';

function PhaseCard({ phase, jobId }: { phase: DocPhase; jobId?: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { stats, loading } = useChecklist(phase, jobId);
  const title = phase === 'application' ? t('applicationDocs') : t('examDocs');
  const summary = t('readyCount', { done: stats.done, total: stats.total });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${summary}`}
      onPress={() =>
        router.push({ pathname: '/documents/[phase]', params: jobId ? { phase, jobId } : { phase } })
      }
      className="bg-white rounded-card p-5 mb-4 border border-gray-200 active:opacity-80"
    >
      <View className="flex-row items-center mb-4">
        <Ionicons name={phase === 'application' ? 'document-text' : 'school'} size={36} color="#1E3A8A" />
        <Text className="text-2xl font-bold text-ink ml-3 flex-1">{title}</Text>
        <Ionicons name="chevron-forward" size={28} color="#4B5563" />
      </View>
      {loading ? null : (
        <>
          <ProgressBar ratio={stats.ratio} label={summary} />
          <Text className={`text-lg mt-3 font-semibold ${stats.pending === 0 ? 'text-accent' : 'text-gray-700'}`}>
            {stats.pending === 0 ? t('allReady') : t('pendingCount', { count: stats.pending })}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export default function DocumentsHome() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View className="flex-1 bg-surface">
      <Header title={t('documentsTitle')} subtitle={t('documentsIntro')} onBack={back} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <PhaseCard phase="application" jobId={jobId} />
        <PhaseCard phase="exam" jobId={jobId} />
      </ScrollView>
    </View>
  );
}
