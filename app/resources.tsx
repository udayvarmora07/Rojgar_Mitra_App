import { useCallback } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LearningResourceWithJob } from '../lib/supabase';
import { isSafeWebUrl } from '../lib/url';
import { useLearningResources } from '../hooks/useLearningResources';
import { palette } from '../constants/theme';
import { isTopic } from '../constants/testCategories';
import { Masthead } from '../components/ui/Masthead';
import { LanguageToggle } from '../components/ui/LanguagePicker';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Screen } from '../components/ui/Screen';
import { Button } from '../components/ui/Button';
import { Banner, EmptyState, Footnote, LoadingState } from '../components/ui/States';
import { ResourceRow } from '../components/resources/ResourceRow';
import type { TranslationKey } from '../lib/locales/en';

const GROUPS: { type: LearningResourceWithJob['resource_type']; titleKey: TranslationKey }[] = [
  { type: 'AI_Test', titleKey: 'practiceTests' },
  { type: 'PDF', titleKey: 'pdfResources' },
  { type: 'Video', titleKey: 'videoResources' },
  { type: 'Link', titleKey: 'websiteResources' },
];

export default function ResourcesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ jobId?: string; jobTitle?: string }>();
  const jobId = typeof params.jobId === 'string' && params.jobId ? params.jobId : undefined;
  const jobTitle = typeof params.jobTitle === 'string' ? params.jobTitle : undefined;
  const { resources, loading, refreshing, offline, refresh } = useLearningResources(jobId);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const openResource = useCallback(
    async (resource: LearningResourceWithJob) => {
      if (resource.resource_type === 'AI_Test') {
        const topic = isTopic(resource.topic) ? resource.topic : 'gk';
        router.push({
          pathname: '/practice/test/[category]',
          params: { category: topic, timed: '0' },
        });
        return;
      }
      if (!isSafeWebUrl(resource.link_or_content)) return;
      try {
        await Linking.openURL(resource.link_or_content.trim());
      } catch {
        Alert.alert(t('resourceLinkError'));
      }
    },
    [router, t]
  );

  return (
    <Screen>
      <Masthead
        title={t('resourcesTitle')}
        subtitle={
          jobTitle ? t('resourcesForJobTitle', { job: jobTitle }) : t('resourcesIntro')
        }
        onBack={back}
        right={<LanguageToggle />}
      />

      {loading ? (
        <LoadingState label={t('loading')} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[palette.navy]}
              tintColor={palette.navy}
            />
          }
        >
          {offline && resources.length > 0 ? <Banner text={t('offlineBanner')} /> : null}

          {resources.length === 0 ? (
            offline ? (
              <EmptyState
                icon="cloud-offline-outline"
                title={t('loadFailed')}
                hint={t('loadFailedHint')}
                action={<Button icon="refresh" label={t('retry')} onPress={refresh} />}
              />
            ) : (
              <EmptyState
                icon="library-outline"
                title={t('noResources')}
                hint={t('noResourcesHint')}
                action={
                  <Button
                    icon="school-outline"
                    label={t('startPractice')}
                    onPress={() => router.push('/practice')}
                  />
                }
              />
            )
          ) : (
            GROUPS.map((group) => {
              const items = resources.filter((r) => r.resource_type === group.type);
              if (items.length === 0) return null;
              return (
                <View key={group.type}>
                  <SectionHeading title={t(group.titleKey)} count={items.length} />
                  <View className="bg-card border border-rule rounded-card overflow-hidden">
                    {items.map((resource, index) => (
                      <ResourceRow
                        key={resource.id}
                        resource={resource}
                        divided={index > 0}
                        onPress={() => openResource(resource)}
                      />
                    ))}
                  </View>
                </View>
              );
            })
          )}

          <Footnote>{t('officialNote')}</Footnote>
        </ScrollView>
      )}
    </Screen>
  );
}
