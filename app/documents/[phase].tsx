import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Header } from '../../components/ui/Header';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ChecklistItem } from '../../components/ui/ChecklistItem';
import { LoadingState } from '../../components/ui/States';
import { useChecklist } from '../../hooks/useChecklist';
import { isDocPhase } from '../../constants/documents';

export default function DocumentChecklistScreen() {
  const params = useLocalSearchParams<{ phase: string; jobId?: string }>();
  const phase = isDocPhase(params.phase) ? params.phase : 'application';
  const router = useRouter();
  const { t } = useTranslation();
  const { items, ready, toggle, loading, stats } = useChecklist(phase, params.jobId);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/documents'));
  const title = phase === 'application' ? t('applicationDocs') : t('examDocs');

  return (
    <View className="flex-1 bg-surface">
      <Header title={title} subtitle={t('documentsIntro')} onBack={back} />
      {loading ? (
        <LoadingState label={t('loading')} />
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View className="bg-white rounded-card p-5 mb-4 border border-gray-200">
            <ProgressBar ratio={stats.ratio} label={t('readyCount', { done: stats.done, total: stats.total })} />
            <Text
              accessibilityLiveRegion="polite"
              className={`text-lg mt-3 font-semibold ${stats.pending === 0 ? 'text-accent' : 'text-gray-700'}`}
            >
              {stats.pending === 0 ? t('allReady') : t('pendingCount', { count: stats.pending })}
            </Text>
          </View>

          {items.map((item) => (
            <ChecklistItem
              key={item.id}
              title={item.title}
              description={item.description}
              ready={ready[item.id] === true}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
