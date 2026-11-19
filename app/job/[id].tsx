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
import { deadlineStatus, formatDate } from '../../lib/deadline';
import { sourceHost } from '../../lib/url';
import { openExternalLink } from '../../lib/externalLink';
import { applyActionCopy, applyDestination, closedNoticeCopy } from '../../lib/officialLink';
import { buildNoticeShareText, shareNoticeText } from '../../lib/share';
import { readNotice, writeNotice } from '../../lib/jobCache';
import { useLanguage } from '../../hooks/useLanguage';
import { curve, palette } from '../../constants/theme';
import { Masthead } from '../../components/ui/Masthead';
import { Heading } from '../../components/ui/Heading';
import { LanguageToggle } from '../../components/ui/LanguagePicker';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Screen } from '../../components/ui/Screen';
import { Fact } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Banner, EmptyState, Footnote, LoadingState } from '../../components/ui/States';
import { FreshnessLine } from '../../components/ui/FreshnessLine';
import { DeadlineBadge } from '../../components/jobs/DeadlineBadge';
import { ApplyTracker } from '../../components/jobs/ApplyTracker';
import { DeadlineReminderPanel } from '../../components/jobs/DeadlineReminderPanel';

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
  const [offline, setOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFailed(false);
    setPartialFailure(false);

    // Offline-first: paint the notice exactly as it was left, then refresh underneath it.
    const cached = await readNotice(id);
    if (cached) {
      setJob(cached.job);
      setDetails(cached.details);
      setDocuments(cached.documents);
      setResources(cached.resources);
      setCachedAt(cached.savedAt);
      setOffline(false);
      setLoading(false);
    }

    try {
      const [jobData, detailResult, docResult, resourceResult] = await Promise.allSettled([
        getJobById(id),
        getJobDetails(id),
        getDocumentsRequired(id),
        getJobLearningResources(id),
      ]);
      if (jobData.status === 'rejected') throw jobData.reason;

      // The row can disappear between the list fetch and this request. Keep a cached copy;
      // otherwise this is a genuine "not found", not a network failure.
      if (!jobData.value) {
        if (!cached) {
          setJob(null);
          setFailed(false);
        }
        return;
      }

      // A failed sub-request keeps the cached copy of that section instead of blanking it.
      const nextDetails =
        detailResult.status === 'fulfilled' ? detailResult.value : (cached?.details ?? []);
      const nextDocuments =
        docResult.status === 'fulfilled' ? docResult.value : (cached?.documents ?? []);
      const nextResources =
        resourceResult.status === 'fulfilled' ? resourceResult.value : (cached?.resources ?? []);
      const stamp = new Date().toISOString();

      setJob(jobData.value);
      setDetails(nextDetails);
      setDocuments(nextDocuments);
      setResources(nextResources);
      setCachedAt(stamp);
      setOffline(false);
      setPartialFailure(detailResult.status === 'rejected' || docResult.status === 'rejected');
      void writeNotice({
        job: jobData.value,
        details: nextDetails,
        documents: nextDocuments,
        resources: nextResources,
        savedAt: stamp,
      });
    } catch {
      if (cached) setOffline(true);
      else setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // The confirmation is a live-region message, so it clears itself rather than sitting on
  // screen as if the copy were still the latest event.
  useEffect(() => {
    if (shareStatus === 'idle') return;
    const timer = setTimeout(() => setShareStatus('idle'), 5000);
    return () => clearTimeout(timer);
  }, [shareStatus]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const openSource = async () => {
    const destination = job ? applyDestination(job) : null;
    if (!(await openExternalLink(destination?.url))) Alert.alert(t('linkError'));
  };

  const share = async () => {
    if (!job) return;
    const destination = applyDestination(job);
    const text = buildNoticeShareText({
      title: job.title,
      department: job.department,
      lastDateLabel: t('lastDate'),
      lastDate: formatDate(job.deadline, language),
      sourceLabel: t('sourceLabel'),
      // Share the destination the reader would act on: the official portal when known.
      link: destination?.url ?? null,
      footer: t('officialNote'),
    });
    const result = await shareNoticeText(text, job.title);
    if (result === 'copied') setShareStatus('copied');
    if (result === 'failed') setShareStatus('failed');
  };

  if (loading && !job) {
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
  const expired = deadlineStatus(job.deadline) === 'expired';
  // The official portal or notification document when the scraper found one; otherwise the
  // third-party summary, which is useful but must never be labelled "official".
  const destination = applyDestination(job);
  const canApply = destination !== null && !expired;
  const applyCopy = destination ? applyActionCopy(destination.kind) : null;
  const closedCopy = destination ? closedNoticeCopy(destination.kind) : null;
  const source = sourceHost(job.source_link);
  const officialSite =
    destination?.kind === 'officialSite' ? sourceHost(destination.url) : null;

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
        {offline ? <Banner text={t('offlineNoticeBanner')} /> : null}
        {cachedAt ? <FreshnessLine savedAt={cachedAt} className="mb-2" /> : null}

        {partialFailure && !offline ? (
          <View className="mb-4">
            <EmptyState
              icon="cloud-offline-outline"
              title={t('partialFailureTitle')}
              hint={t('partialFailureHint')}
              action={<Button icon="refresh" label={t('retry')} onPress={load} />}
            />
          </View>
        ) : null}

        <View style={curve} className="bg-card border border-rule rounded-card p-5 mb-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-extrabold uppercase tracking-stamp text-ink-mute">
              {t('noticeLabel')}
            </Text>
            {/* Sending the notice on is the first thing a reader does after deciding it fits. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('shareNotice')}
              accessibilityHint={t('shareNoticeHint')}
              onPress={share}
              className="min-h-[48px] min-w-[48px] items-center justify-center -mr-3 active:opacity-70"
            >
              <Ionicons name="share-social-outline" size={22} color={palette.navy} />
            </Pressable>
          </View>
          <Heading
            level={2}
            className="text-[26px] leading-[32px] font-extrabold text-ink tracking-tight mt-1"
          >
            {job.title}
          </Heading>
          <View style={curve} className="mt-4 p-3 rounded-control bg-navy-tint border border-navy-line">
            <DeadlineBadge deadline={job.deadline} />
          </View>

          {shareStatus !== 'idle' ? (
            <Text
              accessibilityLiveRegion="polite"
              className={`text-label font-semibold mt-3 ${
                shareStatus === 'copied' ? 'text-success' : 'text-stamp'
              }`}
            >
              {shareStatus === 'copied' ? t('linkCopied') : t('shareFailed')}
            </Text>
          ) : null}

          {/* Where the notice came from. A reader deciding whether to trust a date can
              recognise the site they already use, and the official link stays one tap away. */}
          {source ? (
            <Text className="text-label text-ink-mute mt-3">
              {t('sourceLabel')}: {source}
            </Text>
          ) : null}
          {officialSite ? (
            <Text className="text-label text-ink-mute mt-1">
              {t('officialSiteLabel')}: {officialSite}
            </Text>
          ) : null}
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
                {detail.age_limit ? (
                  <Fact label={t('ageLimit')} value={detail.age_limit} />
                ) : null}
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

        {/* A reader who cannot apply today should not have to remember the date. */}
        <DeadlineReminderPanel job={job} />

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
        {expired ? (
          <View>
            {/* A shared link can still open a notice after its last date. Sending the reader
                to an application form that cannot accept them is worse than doing nothing. */}
            <Text className="text-label text-closing-text font-semibold text-center mb-2 leading-reading">
              {t('noticeClosedHint')}
            </Text>
            {destination ? (
              <Button
                variant="secondary"
                icon="open-outline"
                label={t(closedCopy?.label ?? 'openNotice')}
                onPress={openSource}
              />
            ) : null}
          </View>
        ) : (
          <Button
            icon={canApply ? 'open-outline' : 'school-outline'}
            label={canApply ? t(applyCopy?.label ?? 'readFullNotice') : t('startPractice')}
            onPress={canApply ? openSource : () => router.push('/practice')}
          />
        )}
      </View>
    </Screen>
  );
}
