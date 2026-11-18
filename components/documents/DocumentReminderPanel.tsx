import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import { Button } from '../ui/Button';
import { SectionHeading } from '../ui/SectionHeading';
import { curve, palette } from '../../constants/theme';
import {
  disableDocumentReminder,
  enableDocumentReminder,
  getReminderPermission,
  loadReminderEnabled,
  reminderTimeLabel,
  remindersSupported,
  saveReminderEnabled,
  syncDocumentReminder,
  type ReminderPermission,
} from '../../lib/reminders';

/**
 * The reminder switch for PRD 5.5. One daily local notification at 09:00 while any
 * checklist item is still missing; it stops itself when everything is ready.
 *
 * Permission, "notifications blocked" and "web build" are three different states, so the
 * panel names which one the reader is in instead of leaving a switch that cannot work.
 */
export function DocumentReminderPanel({ pending }: { pending: number }) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const supported = remindersSupported();

  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<ReminderPermission>('undetermined');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([loadReminderEnabled(), getReminderPermission()]).then(([saved, status]) => {
      if (!active) return;
      setEnabled(saved);
      setPermission(status);
    });
    return () => {
      active = false;
    };
  }, []);

  const title = t('documentReminders');
  const body = t('pendingCount', { count: pending });
  const channelName = t('documentReminders');

  // Keep the scheduled copy in step with the count and the selected language.
  useEffect(() => {
    if (!enabled) return;
    void syncDocumentReminder({ enabled, pending, title, body, channelName });
  }, [enabled, pending, title, body, channelName]);

  const on = enabled && permission === 'granted';
  // When the OS will not ask again, "Open phone settings" is the only useful action.
  const blocked = permission === 'denied';

  const toggle = async () => {
    if (!supported || busy) return;
    setBusy(true);
    setError(false);
    if (enabled) {
      await disableDocumentReminder();
      setEnabled(false);
    } else {
      const result = await enableDocumentReminder({ title, body, channelName });
      if (result === 'granted') {
        await saveReminderEnabled(true);
        setEnabled(true);
        setPermission('granted');
      } else if (result === 'error') {
        setError(true);
      } else {
        setPermission(result);
      }
    }
    setBusy(false);
  };

  return (
    <>
      <SectionHeading title={t('reminders')} />
      <View style={curve} className="bg-card border border-rule rounded-card mb-4">
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={t('documentReminders')}
          accessibilityHint={supported ? t('documentRemindersHint') : t('reminderUnsupported')}
          accessibilityState={{ checked: on, disabled: !supported || busy || blocked }}
          aria-checked={on}
          disabled={!supported || busy || blocked}
          onPress={toggle}
          className="p-4 min-h-[76px] flex-row items-center active:opacity-80"
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
            <Text className="text-body font-bold text-ink">{t('documentReminders')}</Text>
            <Text className="text-label text-ink-soft mt-0.5">
              {!supported
                ? t('reminderUnsupported')
                : enabled && pending === 0
                  ? t('reminderPaused')
                  : t('documentRemindersHint')}
            </Text>
          </View>
          {supported ? <Toggle on={on} /> : null}
        </Pressable>

        {on && pending > 0 ? (
          <View className="border-t border-rule px-4 py-3">
            <Text className="text-label text-ink-soft">
              {t('reminderSchedule', { time: reminderTimeLabel(language) })}
            </Text>
          </View>
        ) : null}

        {permission === 'denied' ? (
          <View className="border-t border-rule p-4">
            <Text className="text-label text-ink-soft leading-reading mb-3">
              {t('reminderBlocked')}
            </Text>
            <Button
              variant="secondary"
              icon="settings-outline"
              label={t('openSettings')}
              onPress={() => void Linking.openSettings()}
            />
          </View>
        ) : null}

        {error ? (
          <View className="border-t border-rule px-4 py-3">
            <Text
              accessibilityLiveRegion="polite"
              className="text-label text-stamp font-semibold"
            >
              {t('reminderFailed')}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`w-12 h-7 rounded-full p-[2px] justify-center ${
        on ? 'bg-success' : 'bg-rule-strong'
      }`}
    >
      <View className={`w-6 h-6 rounded-full bg-white ${on ? 'self-end' : 'self-start'}`} />
    </View>
  );
}
