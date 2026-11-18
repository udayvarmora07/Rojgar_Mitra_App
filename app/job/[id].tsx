import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from "react-i18next";
import {
  getDocumentsRequired,
  getJobById,
  getJobDetails,
  DocumentRequired,
  Job,
  JobDetail,
} from "../../lib/supabase";
import { formatDate } from "../../lib/deadline";
import { isSafeWebUrl } from "../../lib/url";
import { useLanguage } from "../../hooks/useLanguage";
import { Header } from "../../components/ui/Header";
import { Card, SectionTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState, LoadingState } from "../../components/ui/States";
import { DeadlineBadge } from "../../components/jobs/DeadlineBadge";

type IconName = keyof typeof Ionicons.glyphMap;

function InfoRow({
  icon,
  label,
  value,
  danger,
}: {
  icon: IconName;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className="flex-row items-start mb-4"
    >
      <Ionicons name={icon} size={26} color={danger ? "#DC2626" : "#1E3A8A"} />
      <View className="ml-3 flex-1">
        <Text className="text-lg text-gray-700">{label}</Text>
        <Text
          className={`text-lg font-semibold ${danger ? "text-alert" : "text-ink"}`}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [job, setJob] = useState<Job | null>(null);
  const [details, setDetails] = useState<JobDetail[]>([]);
  const [documents, setDocuments] = useState<DocumentRequired[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [partialFailure, setPartialFailure] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFailed(false);
    setPartialFailure(false);
    try {
      const [jobData, detailResult, docResult] = await Promise.allSettled([
        getJobById(id),
        getJobDetails(id),
        getDocumentsRequired(id),
      ]);
      if (jobData.status === "rejected") throw jobData.reason;
      setJob(jobData.value);
      setDetails(detailResult.status === "fulfilled" ? detailResult.value : []);
      setDocuments(docResult.status === "fulfilled" ? docResult.value : []);
      setPartialFailure(
        detailResult.status === "rejected" || docResult.status === "rejected",
      );
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const openSource = async () => {
    if (!isSafeWebUrl(job?.source_link)) return;
    try {
      await Linking.openURL(job.source_link.trim());
    } catch {
      Alert.alert(t("linkError"));
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface">
        <Header title={t("jobInfo")} onBack={back} />
        <LoadingState label={t("loading")} />
      </View>
    );
  }

  if (!job) {
    return (
      <View className="flex-1 bg-surface">
        <Header title={t("jobInfo")} onBack={back} />
        <View className="p-4">
          <EmptyState
            icon="alert-circle-outline"
            title={failed ? t("error") : t("jobNotFound")}
            action={
              <Button
                label={failed ? t("retry") : t("goBack")}
                onPress={failed ? load : back}
              />
            }
          />
        </View>
      </View>
    );
  }

  const applicationDocs = documents.filter((d) => d.phase === "Application");
  const examDocs = documents.filter((d) => d.phase === "Exam Center");

  return (
    <View className="flex-1 bg-surface">
      <Header title={job.title} subtitle={job.department} onBack={back} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {partialFailure ? (
          <View className="mb-4">
            <EmptyState
              icon="cloud-offline-outline"
              title={t("loadFailed")}
              hint={t("loadFailedHint")}
              action={
                <Button icon="refresh" label={t("retry")} onPress={load} />
              }
            />
          </View>
        ) : null}

        <Card>
          <SectionTitle>{t("jobInfo")}</SectionTitle>
          <InfoRow
            icon="business-outline"
            label={t("department")}
            value={job.department}
          />
          <InfoRow
            icon="calendar-outline"
            label={t("postDate")}
            value={formatDate(job.post_date, language, "long")}
          />
          <InfoRow
            icon="time-outline"
            label={t("deadline")}
            value={formatDate(job.deadline, language, "long")}
            danger
          />
          {job.vacancies != null ? (
            <InfoRow
              icon="people-outline"
              label={t("vacancies")}
              value={t("vacancyCount", { count: job.vacancies })}
            />
          ) : null}
          {job.qualification ? (
            <InfoRow
              icon="school-outline"
              label={t("qualification")}
              value={job.qualification}
            />
          ) : null}
          {job.advertisement_no ? (
            <InfoRow
              icon="document-outline"
              label={t("advertisementNo")}
              value={job.advertisement_no}
            />
          ) : null}
          {job.salary ? (
            <InfoRow
              icon="cash-outline"
              label={t("salary")}
              value={job.salary}
            />
          ) : null}
          <DeadlineBadge deadline={job.deadline} />
        </Card>

        <Card>
          <SectionTitle>{t("eligibility")}</SectionTitle>
          {details.length === 0 && !partialFailure ? (
            <Text className="text-lg text-gray-700">
              {t("noEligibilityInfo")}
            </Text>
          ) : (
            details.map((detail) => (
              <View key={detail.id}>
                <InfoRow
                  icon="person-outline"
                  label={t("ageLimit")}
                  value={detail.age_limit}
                />
                <InfoRow
                  icon="school-outline"
                  label={t("qualification")}
                  value={detail.required_qualifications}
                />
                {detail.application_fees ? (
                  <InfoRow
                    icon="card-outline"
                    label={t("fees")}
                    value={detail.application_fees}
                  />
                ) : null}
              </View>
            ))
          )}
          <Button
            variant="secondary"
            icon="checkmark-done"
            label={t("checkEligibility")}
            onPress={() =>
              router.push({
                pathname: "/eligibility/[jobId]",
                params: { jobId: job.id },
              })
            }
          />
        </Card>

        <Card>
          <SectionTitle>{t("requiredDocuments")}</SectionTitle>
          {documents.length === 0 ? (
            <Text className="text-lg text-gray-700 mb-4">
              {t("noDocumentsInfo")}
            </Text>
          ) : (
            [
              { title: t("documentsToApply"), list: applicationDocs },
              { title: t("documentsForExam"), list: examDocs },
            ]
              .filter((group) => group.list.length > 0)
              .map((group) => (
                <View key={group.title} className="mb-4">
                  <Text className="text-lg font-bold text-primary mb-2">
                    {group.title}
                  </Text>
                  {group.list.map((doc) => (
                    <View key={doc.id} className="flex-row items-center mb-2">
                      <Ionicons
                        name="document-text-outline"
                        size={22}
                        color="#047857"
                      />
                      <Text className="text-lg text-ink ml-2 flex-1">
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
            label={t("viewDocuments")}
            onPress={() =>
              router.push({ pathname: "/documents", params: { jobId: job.id } })
            }
          />
        </Card>

        <View className="gap-3">
          {isSafeWebUrl(job.source_link) ? (
            <Button
              variant="accent"
              icon="open-outline"
              label={t("applyOnline")}
              onPress={openSource}
            />
          ) : null}
          <Button
            icon="school"
            label={t("startPractice")}
            onPress={() => router.push("/practice")}
          />
        </View>
      </ScrollView>
    </View>
  );
}
