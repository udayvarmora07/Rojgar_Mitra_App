import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getDocumentsRequired,
  getJobById,
  getJobDetails,
  getJobLearningResources,
  DocumentRequired,
  Job,
  JobDetail,
  LearningResource,
} from '../../lib/supabase';
import { formatDate } from '../../lib/deadline';
import { isSafeWebUrl } from '../../lib/url';
import { openExternalLink } from '../../lib/externalLink';
import { useLanguage } from '../../hooks/useLanguage';
import { curve, palette } from '../../constants/theme';
import { Masthead } from '../../components/ui/Masthead';
import { LanguageToggle } from '../../components/ui/LanguagePicker';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Screen } from '../../components/ui/Screen';
import { Fact } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState, Footnote, LoadingState } from '../../components/ui/States';
import { DeadlineBadge } from '../../components/jobs/DeadlineBadge';
import { ApplyTracker } from '../../components/jobs/ApplyTracker';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<Job | null>(null);
  const [details, setDetails] = useState<JobDetail[]>([]);
  const [documents, setDocuments] = useState<DocumentRequired[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [partialFailure, setPartialFailure] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFailed(false);
    setPartialFailure(false);
    try {
      const [jobData, detailResult, docResult, resourceResult] = await Promise.allSettled([
        getJobById(id),
        getJobDetails(id),
        getDocumentsRequired(id),
        getJobLearningResources(id),
      ]);
      if (jobData.status === 'rejected') throw jobData.reason;
      setJob(jobData.value);
      setDetails(detailResult.status === 'fulfilled' ? detailResult.value : []);
      setDocuments(docResult.status === 'fulfilled' ? docResult.value : []);
      setResources(resourceResult.status === 'fulfilled' ? resourceResult.value : []);
      setPartialFailure(detailResult.status === 'rejected' || docResult.status === 'rejected');
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const openSource = async () => {
    if (!(await openExternalLink(job?.source_link))) Alert.alert(t('linkError'));
  };

  if (loading) {
    return (
      <Screen>
        <Masthead title={t('jobDetails')} onBack={back} right={<LanguageToggle />} />
        <LoadingState label={t('loading')} />
      </Screen>
    );
  }

  if (!job) {
    return (
      <Screen>
        <Masthead title={t('jobDetails')} onBack={back} right={<LanguageToggle />} />
        <View className="p-4">
          <EmptyState
            icon="alert-circle-outline"
            title={failed ? t('error') : t('jobNotFound')}
            action={
              <Button label={failed ? t('retry') : t('goBack')} onPress={failed ? load : back} />
            }
          />
        </View>
      </Screen>
    );
  }

  const applicationDocs = documents.filter((d) => d.phase === 'Application');
  const examDocs = documents.filter((d) => d.phase === 'Exam Center');
  const canApply = isSafeWebUrl(job.source_link);

  return (
    <Screen>
      <Masthead
        title={t('jobDetails')}
        subtitle={job.department}
        onBack={back}
        right={<LanguageToggle />}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
      >
        {partialFailure ? (
          <View className="mb-4">
            <EmptyState
              icon="cloud-offline-outline"
              title={t('loadFailed')}
              hint={t('loadFailedHint')}
              action={<Button icon="refresh" label={t('retry')} onPress={load} />}
            />
          </View>
        ) : null}

        <View style={curve} className="bg-card border border-rule rounded-card p-5 mb-1">
          <Text className="text-[11px] font-extrabold uppercase tracking-stamp text-ink-mute">
            {t('noticeLabel')}
          </Text>
          <Text className="text-[26px] leading-[32px] font-extrabold text-ink tracking-tight mt-2">
            {job.title}
          </Text>
          <View style={curve} className="mt-4 p-3 rounded-control bg-navy-tint border border-navy-line">
            <DeadlineBadge deadline={job.deadline} />
          </View>
        </View>

        <SectionHeading title={t('jobInfo')} />
        <View style={curve} className="bg-card border border-rule rounded-card px-5">
          {job.vacancies != null ? (
            <Fact label={t('vacancies')} value={t('vacancyCount', { count: job.vacancies })} />
          ) : null}
          {job.location ? <Fact label={t('location')} value={job.location} /> : null}
          {job.qualification ? <Fact label={t('qualification')} value={job.qualification} /> : null}
          {job.salary ? <Fact label={t('salary')} value={job.salary} /> : null}
          <Fact label={t('postDate')} value={formatDate(job.post_date, language, 'long')} />
          {job.advertisement_no ? (
            <Fact label={t('advertisementNo')} value={job.advertisement_no} />
          ) : null}
        </View>

        <SectionHeading title={t('eligibility')} />
        <View style={curve} className="bg-card border border-rule rounded-card px-5">
          {details.length === 0 && !partialFailure ? (
            <Text className="text-body text-ink-soft leading-reading py-4">
              {t('noEligibilityInfo')}
            </Text>
          ) : (
            details.map((detail) => (
              <View key={detail.id}>
                <Fact label={t('ageLimit')} value={detail.age_limit} />
                <Fact label={t('qualification')} value={detail.required_qualifications} />
                {detail.application_fees ? (
                  <Fact label={t('fees')} value={detail.application_fees} />
                ) : null}
              </View>
            ))
          )}
          <View className="py-4">
            <Button
              variant="secondary"
              icon="checkmark-done"
              label={t('checkEligibility')}
              onPress={() =>
                router.push({ pathname: '/eligibility/[jobId]', params: { jobId: job.id } })
              }
            />
          </View>
        </View>

        <SectionHeading title={t('requiredDocuments')} />
        <View style={curve} className="bg-card border border-rule rounded-card p-5">
          {documents.length === 0 ? (
            <Text className="text-body text-ink-soft leading-reading mb-4">
              {t('noDocumentsInfo')}
            </Text>
          ) : (
            [
              { title: t('documentsToApply'), list: applicationDocs },
              { title: t('documentsForExam'), list: examDocs },
            ]
              .filter((group) => group.list.length > 0)
              .map((group) => (
                <View key={group.title} className="mb-4">
                  <Text className="text-[11px] font-extrabold uppercase tracking-stamp text-ink-mute mb-2">
                    {group.title}
                  </Text>
                  {group.list.map((doc) => (
                    <View key={doc.id} className="flex-row items-center py-1.5">
                      <Ionicons name="document-text-outline" size={20} color={palette.success} />
                      <Text className="text-body text-ink ml-2.5 flex-1 leading-reading">
                        {doc.document_name}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
          )}
          <Button
            variant="secondary"
            icon="list"
            label={t('viewDocuments')}
            onPress={() => router.push({ pathname: '/documents', params: { jobId: job.id } })}
          />
        </View>

        {/* The most common way a candidate loses a post is believing OTR = applied. */}
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

        <SectionHeading title={t('studyMaterial')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('studyMaterial')}. ${
            resources.length > 0
              ? t('resourceCount', { count: resources.length })
              : t('studyMaterialHint')
          }`}
          onPress={() =>
            router.push({
              pathname: '/resources',
              params: { jobId: job.id, jobTitle: job.title },
            })
          }
          style={curve}
          className="bg-card border border-rule rounded-card p-4 flex-row items-center active:opacity-80"
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={curve}
            className="w-10 h-10 rounded-control border border-navy-line bg-navy-tint items-center justify-center"
          >
            <Ionicons name="library-outline" size={22} color={palette.navy} />
          </View>
          <View className="flex-1 ml-3 pr-2">
            <Text className="text-body font-bold text-ink">{t('studyMaterial')}</Text>
            <Text className="text-label text-ink-soft mt-0.5">
              {resources.length > 0
                ? t('resourceCount', { count: resources.length })
                : t('studyMaterialHint')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.inkMute} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('startPractice')}. ${t('quickPracticeHint')}`}
          onPress={() => router.push('/practice')}
          style={curve}
          className="bg-navy-tint border border-navy-line rounded-card p-4 flex-row items-center mt-3 active:opacity-80"
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={curve}
            className="w-10 h-10 rounded-control border border-navy-line bg-card items-center justify-center"
          >
            <Ionicons name="school-outline" size={22} color={palette.navy} />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-body font-bold text-ink">{t('startPractice')}</Text>
            <Text className="text-label text-ink-soft mt-0.5">{t('quickPracticeHint')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.navy} />
        </Pressable>

        <Footnote>{t('officialNote')}</Footnote>

        {/* Placed last in reading order, immediately above the sticky Apply bar, because it is
            the step the reader takes right after returning from the official website. */}
        <ApplyTracker job={job} />
      </ScrollView>

      <View
        className="bg-card border-t border-rule px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          icon={canApply ? 'open-outline' : 'school-outline'}
          label={canApply ? t('applyOnline') : t('startPractice')}
          onPress={canApply ? openSource : () => router.push('/practice')}
        />
      </View>
    </Screen>
  );
}
