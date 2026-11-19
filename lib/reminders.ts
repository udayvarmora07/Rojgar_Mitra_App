import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { readString, writeString } from './storage';

/**
 * One scheduled local notification a day while documents are still missing (PRD 5.5).
 * Everything is local: no push token, no server, no user account.
 *
 * The reminder is deliberately a fixed morning slot rather than a picker. This audience
 * should not have to configure a time to be reminded to prepare an Aadhaar card.
 */
export const DOCUMENT_REMINDER_HOUR = 9;
export const DOCUMENT_REMINDER_MINUTE = 0;

const CHANNEL_ID = 'document-reminders';
const NOTIFICATION_ID = 'documents-reminder';
const ENABLED_KEY = 'settings:documents-reminder:v1';

export type ReminderPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';
export type EnableReminderResult = 'granted' | 'denied' | 'unsupported' | 'error';

/**
 * Only a path this app owns may be opened from a notification payload. Rejects absolute
 * URLs, protocol-relative `//host` paths, backslashes and whitespace, so a crafted payload
 * cannot turn a notification into a redirect.
 */
export function isInternalRoute(value: unknown): value is string {
  return typeof value === 'string' && /^\/(?!\/)[^\s\\]*$/.test(value);
}

type ReminderContent = { title: string; body: string; channelName: string };

/** Local notifications are an Android/iOS feature; the web build never schedules one. */
export function remindersSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function granted(status: Notifications.NotificationPermissionsStatus): boolean {
  return (
    status.granted ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensureChannel(channelId: string, name: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(channelId, {
    name,
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Creates the Android channel and asks for permission if the OS still allows the prompt.
 * Both reminder features need exactly this sequence before scheduling anything, so it is
 * shared rather than duplicated with slightly different ordering.
 */
export async function ensureReminderPermission(
  channelId: string,
  channelName: string
): Promise<EnableReminderResult> {
  if (!remindersSupported()) return 'unsupported';
  try {
    // Android 13 shows the permission prompt only after a channel exists.
    await ensureChannel(channelId, channelName);
    const current = await Notifications.getPermissionsAsync();
    let allowed = granted(current);
    if (!allowed && current.canAskAgain) {
      const asked = await Notifications.requestPermissionsAsync();
      allowed = granted(asked);
    }
    return allowed ? 'granted' : 'denied';
  } catch {
    return 'error';
  }
}

/**
 * Foreground presentation. Called once from the root layout; safe on web because the
 * platform gate returns before touching the module. The Android channel is created at
 * opt-in instead, so the OS permission prompt never appears before the reader asks for
 * reminders.
 */
export async function prepareNotifications(): Promise<void> {
  if (!remindersSupported()) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // A notification setup failure must never stop the app from opening.
  }
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (!remindersSupported()) return 'unsupported';
  try {
    const status = await Notifications.getPermissionsAsync();
    if (granted(status)) return 'granted';
    return status.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export function loadReminderEnabled(): Promise<boolean> {
  return readString(ENABLED_KEY).then((value) => value === '1');
}

export function saveReminderEnabled(enabled: boolean): Promise<boolean> {
  return writeString(ENABLED_KEY, enabled ? '1' : '0');
}

async function schedule(content: ReminderContent): Promise<void> {
  // Replace the previous schedule so a changed count or language is never queued twice.
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: content.title,
      body: content.body,
      // Tapping the reminder lands on the checklist it is about, not the home screen.
      data: { url: '/documents' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: DOCUMENT_REMINDER_HOUR,
      minute: DOCUMENT_REMINDER_MINUTE,
      channelId: CHANNEL_ID,
    },
  });
}

/**
 * Turns the reminder on: asks for permission if the OS still allows the prompt, then
 * schedules the daily trigger. The stored preference is written by the caller only when
 * this resolves `granted`, so a denied permission cannot leave a phantom "on" state.
 */
export async function enableDocumentReminder(
  content: ReminderContent
): Promise<EnableReminderResult> {
  if (!remindersSupported()) return 'unsupported';
  try {
    const permission = await ensureReminderPermission(CHANNEL_ID, content.channelName);
    if (permission !== 'granted') return permission;
    await schedule(content);
    return 'granted';
  } catch {
    return 'error';
  }
}

export async function disableDocumentReminder(): Promise<void> {
  if (remindersSupported()) {
    try {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
    } catch {
      // Nothing scheduled is the same outcome as a successful cancel.
    }
  }
  await saveReminderEnabled(false);
}

/**
 * Keeps the scheduled notification in step with the checklist. Runs when the pending
 * count, the language or the preference changes; cancels while nothing is pending so
 * a finished checklist stops nagging.
 */
export async function syncDocumentReminder(
  content: ReminderContent & { enabled: boolean; pending: number }
): Promise<void> {
  if (!remindersSupported()) return;
  try {
    if (!content.enabled || content.pending === 0) {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
      return;
    }
    const status = await Notifications.getPermissionsAsync();
    if (!granted(status)) return;
    await schedule(content);
  } catch {
    // Keep the stored preference; the next change retries.
  }
}

/** `9:00 AM` in the reader's locale, for the "every day at" line under the toggle. */
export function reminderTimeLabel(language: string): string {
  const at = new Date();
  at.setHours(DOCUMENT_REMINDER_HOUR, DOCUMENT_REMINDER_MINUTE, 0, 0);
  try {
    return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' }).format(at);
  } catch {
    return '9:00 AM';
  }
}
