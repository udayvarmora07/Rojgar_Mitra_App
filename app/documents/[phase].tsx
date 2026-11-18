import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Masthead } from '../../components/ui/Masthead';
import { LanguageToggle } from '../../components/ui/LanguagePicker';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ChecklistItem } from '../../components/ui/ChecklistItem';
import { LoadingState, Footnote } from '../../components/ui/States';
import { Screen } from '../../components/ui/Screen';
import { Mono } from '../../components/ui/Mono';
import { useChecklist } from '../../hooks/useChecklist';
import { isDocPhase } from '../../constants/documents';
import { curve } from '../../constants/theme';

export default function DocumentChecklistScreen() {
  const params = useLocalSearchParams<{ phase: string; jobId?: string }>();
  const phase = isDocPhase(params.phase) ? params.phase : 'application';
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { items, ready, toggle, loading, stats } = useChecklist(phase, params.jobId);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/documents'));
  const title = phase === 'application' ? t('applicationDocs') : t('examDocs');

  return (
    <Screen>
      <Masthead
        title={title}
        subtitle={t('documentsIntro')}
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
        >
          <View className="bg-card rounded-card p-5 mb-4 border border-rule" style={curve}>
            <View className="flex-row items-end justify-between mb-3">
              <View>
                <Text className="text-[11px] font-extrabold uppercase tracking-stamp text-ink-mute">
                  {t('progressLabel')}
                </Text>
                <Mono className="text-[34px] leading-[40px] font-bold text-ink mt-1">
                  {stats.done}/{stats.total}
                </Mono>
              </View>
              <Mono className="text-title font-bold text-ink-mute">
                {Math.round(stats.ratio * 100)}%
              </Mono>
            </View>
            <ProgressBar ratio={stats.ratio} />
            <Text
              accessibilityLiveRegion="polite"
              className={`text-body mt-3 font-semibold ${
                stats.pending === 0 ? 'text-open-text' : 'text-ink-soft'
              }`}
            >
              {stats.pending === 0 ? t('allReady') : t('pendingCount', { count: stats.pending })}
            </Text>
          </View>

          <View className="bg-card border border-rule rounded-card overflow-hidden" style={curve}>
            {items.map((item) => (
              <ChecklistItem
                key={item.id}
                title={item.title}
                description={item.description}
                ready={ready[item.id] === true}
                onToggle={() => toggle(item.id)}
              />
            ))}
          </View>

          <Footnote>{t('officialNote')}</Footnote>
        </ScrollView>
      )}
    </Screen>
  );
}
