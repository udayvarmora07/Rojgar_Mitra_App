import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Masthead } from '../components/ui/Masthead';
import { LanguageToggle } from '../components/ui/LanguagePicker';
import { Screen } from '../components/ui/Screen';
import { SectionHeading } from '../components/ui/SectionHeading';
import { EmptyState, Footnote, LoadingState } from '../components/ui/States';
import { Button } from '../components/ui/Button';
import { curve, palette } from '../constants/theme';
import { useLanguage } from '../hooks/useLanguage';
import { formatDate } from '../lib/deadline';
import { reminderTimeLabel } from '../lib/reminders';
import {
  disableDeadlineReminder,
  loadDeadlineReminders,
  type DeadlineReminderRecord,
} from '../lib/deadlineReminders';

/**
 * Everything the reader asked to be reminded about, in one place.
 *
 * A reminder that can only be removed by finding the original notice again is a trap. This
 * screen lists what is scheduled, opens the notice, and removes a reminder in one tap.
 */
export default function RemindersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<DeadlineReminderRecord[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadDeadlineReminders().then((map) => {
        if (!active) return;
        setRecords(
          Object.values(map).sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
        );
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const remove = async (jobId: string) => {
    await disableDeadlineReminder(jobId);
    setRecords((rows) => (rows ?? []).filter((record) => record.jobId !== jobId));
  };

  const time = reminderTimeLabel(language);

  return (
    <Screen>
      <Masthead
        title={t('deadlineRemindersTitle')}
        subtitle={t('deadlineRemindersIntro')}
        onBack={back}
        right={<LanguageToggle />}
      />

      {records === null ? (
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
          {records.length === 0 ? (
            <EmptyState
              icon="notifications-outline"
              title={t('noReminders')}
              hint={t('noRemindersHint')}
              action={
                <Button
                  icon="briefcase"
                  label={t('viewAllJobs')}
                  onPress={() => router.push('/jobs')}
                />
              }
            />
          ) : (
            <>
              <SectionHeading
                title={t('deadlineRemindersTitle')}
                count={records.length}
                className="mt-1"
              />
              {records.map((record) => {
                const deadline = formatDate(record.deadline, language);
                const reminderDate = formatDate(record.scheduledFor, language);
                return (
                  <View
                    key={record.jobId}
                    style={curve}
                    className="bg-card border border-rule rounded-card mb-3 overflow-hidden"
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${record.title}, ${t('lastDate')} ${deadline}`}
                      accessibilityHint={t('jobDetails')}
                      onPress={() => router.push(`/job/${record.jobId}`)}
                      className="p-4 flex-row items-center active:opacity-80"
                    >
                      <View
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                        style={curve}
                        className="w-10 h-10 rounded-control bg-navy-tint border border-navy-line items-center justify-center"
                      >
                        <Ionicons name="notifications-outline" size={22} color={palette.navy} />
                      </View>
                      <View className="flex-1 ml-3 pr-2">
                        <Text className="text-body font-bold text-ink" numberOfLines={2}>
                          {record.title}
                        </Text>
                        <Text className="text-label text-ink-soft mt-1">
                          {t('lastDate')}: {deadline}
                        </Text>
                        <Text className="text-label text-ink-mute mt-0.5">
                          {t('reminderFor', { date: reminderDate, time })}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={palette.inkMute} />
                    </Pressable>

                    {/* A sibling target, never nested inside the notice button. */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${t('removeReminder')}: ${record.title}`}
                      onPress={() => remove(record.jobId)}
                      className="min-h-[52px] border-t border-rule px-4 flex-row items-center active:bg-paper"
                    >
                      <Ionicons name="close-circle-outline" size={20} color={palette.stamp} />
                      <Text className="flex-1 text-label font-bold text-stamp ml-2">
                        {t('removeReminder')}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </>
          )}

          <Footnote>{t('officialNote')}</Footnote>
        </ScrollView>
      )}
    </Screen>
  );
}
