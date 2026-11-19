import * as Notifications from 'expo-notifications';
import { daysLeft, parseDate } from './deadline';
import { ensureReminderPermission, remindersSupported } from './reminders';
import { readJSON, writeJSON } from './storage';

/**
 * A reminder for the one deadline a candidate cannot afford to miss.
 *
 * It is a single one-off notification at 09:00 three days before the last date. When the
 * notice is already closer than that, the next available morning is used instead; when
 * there is no useful morning left, the app says so rather than scheduling a notification
 * for a deadline that has already arrived.
 *
 * Everything is local. The record exists so the reader can see and remove what is
 * scheduled; nothing is written to the server and there is no push token.
 */
export const DEADLINE_WARNING_DAYS = 3;
export const DEADLINE_REMINDER_HOUR = 9;

const CHANNEL_ID = 'deadline-reminders';
const STORAGE_KEY = 'remind:v1:records';
const ID_PREFIX = 'deadline-';

export type ReminderDecision =
  | { kind: 'schedule'; at: Date }
  | { kind: 'tooSoon' }
  | { kind: 'expired' }
  | { kind: 'invalid' };

export type DeadlineReminderRecord = {
  jobId: string;
  title: string;
  deadline: string;
  /** ISO timestamp of the scheduled notification. */
  scheduledFor: string;
};

export type DeadlineReminderMap = Record<string, DeadlineReminderRecord>;

export type DeadlineReminderResult =
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'error'
  | 'tooSoon'
  | 'expired'
  | 'invalid';

export function deadlineReminderId(jobId: string): string {
  return `${ID_PREFIX}${jobId}`;
}

const atNine = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(DEADLINE_REMINDER_HOUR, 0, 0, 0);
  return copy;
};

/**
 * The date the reminder should fire, or why it cannot be scheduled.
 *
 * `deadline` is a calendar date; `parseDate` returns its local midnight, so a reminder the
 * day before is still before the deadline and a reminder on the deadline morning is not.
 */
export function reminderDateFor(deadline: string, now: Date = new Date()): ReminderDecision {
  const target = parseDate(deadline);
  const left = daysLeft(deadline, now);
  if (!target || left === null) return { kind: 'invalid' };
  if (left < 0) return { kind: 'expired' };

  const preferred = new Date(target);
  preferred.setDate(preferred.getDate() - DEADLINE_WARNING_DAYS);
  const preferredAt = atNine(preferred);
  if (preferredAt.getTime() > now.getTime()) {
    return { kind: 'schedule', at: preferredAt };
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowAt = atNine(tomorrow);
  if (tomorrowAt.getTime() > now.getTime() && tomorrowAt.getTime() < target.getTime()) {
    return { kind: 'schedule', at: tomorrowAt };
  }

  const todayAt = atNine(now);
  if (todayAt.getTime() > now.getTime() && todayAt.getTime() < target.getTime()) {
    return { kind: 'schedule', at: todayAt };
  }

  return { kind: 'tooSoon' };
}

/** Every reminder that still belongs to an open notice. Expired records are dropped. */
export async function loadDeadlineReminders(
  now: Date = new Date()
): Promise<DeadlineReminderMap> {
  const stored = await readJSON<DeadlineReminderMap>(STORAGE_KEY, {});
  const kept: DeadlineReminderMap = {};
  for (const [jobId, record] of Object.entries(stored ?? {})) {
    if (!record || typeof record.deadline !== 'string') continue;
    const left = daysLeft(record.deadline, now);
    if (left !== null && left >= 0) kept[jobId] = record;
  }
  if (Object.keys(kept).length !== Object.keys(stored ?? {}).length) {
    await writeJSON(STORAGE_KEY, kept);
  }
  return kept;
}

export async function scheduleDeadlineReminder(input: {
  jobId: string;
  jobTitle: string;
  deadline: string;
  content: { title: string; body: string };
  channelName: string;
  now?: Date;
}): Promise<DeadlineReminderResult> {
  if (!remindersSupported()) return 'unsupported';

  const decision = reminderDateFor(input.deadline, input.now ?? new Date());
  if (decision.kind !== 'schedule') return decision.kind;

  const permission = await ensureReminderPermission(CHANNEL_ID, input.channelName);
  if (permission !== 'granted') return permission;

  try {
    const identifier = deadlineReminderId(input.jobId);
    // Replacing under a stable identifier means changing the date never queues a second one.
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: input.content.title,
        body: input.content.body,
        data: { url: `/job/${input.jobId}` },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: decision.at,
        channelId: CHANNEL_ID,
      },
    });

    const map = await loadDeadlineReminders(input.now ?? new Date());
    map[input.jobId] = {
      jobId: input.jobId,
      title: input.jobTitle,
      deadline: input.deadline,
      scheduledFor: decision.at.toISOString(),
    };
    await writeJSON(STORAGE_KEY, map);
    return 'granted';
  } catch {
    return 'error';
  }
}

export async function disableDeadlineReminder(jobId: string): Promise<void> {
  if (remindersSupported()) {
    try {
      await Notifications.cancelScheduledNotificationAsync(deadlineReminderId(jobId));
    } catch {
      // Nothing scheduled is the same outcome as a successful cancel.
    }
  }
  const map = await readJSON<DeadlineReminderMap>(STORAGE_KEY, {});
  if (map[jobId]) {
    delete map[jobId];
    await writeJSON(STORAGE_KEY, map);
  }
}
