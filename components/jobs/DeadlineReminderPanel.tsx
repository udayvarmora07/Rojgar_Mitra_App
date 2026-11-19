import { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { curve, palette } from '../../constants/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDate } from '../../lib/deadline';
import {
  getReminderPermission,
  remindersSupported,
  reminderTimeLabel,
  type ReminderPermission,
} from '../../lib/reminders';
import {
  disableDeadlineReminder,
  loadDeadlineReminders,
  reminderDateFor,
  scheduleDeadlineReminder,
  type DeadlineReminderRecord,
} from '../../lib/deadlineReminders';
import type { Job } from '../../lib/supabase';

/**
 * "Do not let me miss this one."
 *
 * The reader is scanning many notices and cannot apply from the app. One local
 * notification at 09:00, three days before the last date (or the next free morning when
 * the notice is closer), is the smallest reliable safety net. The panel names the exact
 * date before the reader commits and shows what is set afterwards.
 */
export function DeadlineReminderPanel({ job }: { job: Job }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const supported = remindersSupported();
  const decision = reminderDateFor(job.deadline);

  const [record, setRecord] = useState<DeadlineReminderRecord | null>(null);
  const [permission, setPermission] = useState<ReminderPermission>('undetermined');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([loadDeadlineReminders(), getReminderPermission()]).then(([map, status]) => {
        if (!active) return;
        setRecord(map[job.id] ?? null);
        setPermission(status);
      });
      return () => {
        active = false;
      };
    }, [job.id])
  );

  if (decision.kind === 'expired' || decision.kind === 'invalid') return null;

  const add = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    const result = await scheduleDeadlineReminder({
      jobId: job.id,
      jobTitle: job.title,
      deadline: job.deadline,
      content: {
        title: t('deadlineReminderTitle'),
        body: t('deadlineReminderBody', {
          title: job.title,
          date: formatDate(job.deadline, language),
        }),
      },
      channelName: t('deadlineReminder'),
    });

    if (result === 'granted') {
      const map = await loadDeadlineReminders();
      setRecord(map[job.id] ?? null);
      setPermission('granted');
    } else if (result === 'denied') {
      setPermission('denied');
    } else if (result === 'unsupported') {
      setPermission('unsupported');
    } else {
      setError(true);
    }
    setBusy(false);
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    await disableDeadlineReminder(job.id);
    setRecord(null);
    setBusy(false);
  };

  const setFor = record ? new Date(record.scheduledFor) : null;
  const sent = setFor ? setFor.getTime() <= Date.now() : false;

  const hint = !supported
    ? t('deadlineReminderUnsupported')
    : permission === 'denied'
      ? t('reminderBlocked')
      : record
        ? sent
          ? t('reminderSentFor', {
              date: formatDate(record.scheduledFor, language),
              time: reminderTimeLabel(language),
            })
          : t('reminderSetFor', {
              date: formatDate(record.scheduledFor, language),
              time: reminderTimeLabel(language),
            })
        : decision.kind === 'tooSoon'
          ? t('reminderTooSoon')
          : t('deadlineReminderHint');

  return (
    <View
      style={curve}
      className={`border rounded-card p-4 mb-3 ${
        record && permission === 'granted'
          ? 'bg-open-bg border-open-border'
          : 'bg-card border-rule'
      }`}
    >
      <View className="flex-row items-start">
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={curve}
          className={`w-10 h-10 rounded-control border items-center justify-center ${
            record && permission === 'granted'
              ? 'bg-card border-open-border'
              : 'bg-navy-tint border-navy-line'
          }`}
        >
          <Ionicons
            name={
              record && permission === 'granted'
                ? 'notifications'
                : 'notifications-outline'
            }
            size={22}
            color={record && permission === 'granted' ? palette.success : palette.navy}
          />
        </View>
        <View className="flex-1 ml-3 pr-2">
          <Text className="text-body font-bold text-ink">{t('deadlineReminder')}</Text>
          <Text
            accessibilityLiveRegion="polite"
            className={`text-label mt-0.5 leading-reading ${
              permission === 'denied' ? 'text-stamp' : 'text-ink-soft'
            }`}
          >
            {hint}
          </Text>
        </View>
      </View>

      {supported && permission !== 'denied' ? (
        <View className="mt-3">
          {record ? (
            <Button
              variant="secondary"
              icon="close-circle-outline"
              label={t('removeReminder')}
              onPress={remove}
              disabled={busy}
            />
          ) : decision.kind === 'schedule' ? (
            <Button
              variant="secondary"
              icon="notifications-outline"
              label={t('setReminderOn', {
                date: formatDate(decision.at.toISOString(), language),
              })}
              onPress={add}
              disabled={busy}
            />
          ) : null}
        </View>
      ) : null}

      {permission === 'denied' ? (
        <View className="mt-3">
          <Button
            variant="secondary"
            icon="settings-outline"
            label={t('openSettings')}
            onPress={() => void Linking.openSettings()}
          />
        </View>
      ) : null}

      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-label text-stamp font-semibold mt-3">
          {t('reminderFailed')}
        </Text>
      ) : null}
    </View>
  );
}
