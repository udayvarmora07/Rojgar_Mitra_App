import { Language, localeFor } from '../constants/languages';

export type DeadlineStatus = 'expired' | 'closingSoon' | 'open';

/** A deadline within this many days (inclusive) is highlighted red, per PRD 5.2. */
export const CLOSING_SOON_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parses a `YYYY-MM-DD` (or full ISO) string as a *local* calendar date at midnight. */
export function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole calendar days from `now` until the deadline. Negative once the deadline has passed. */
export function daysLeft(deadline: string, now: Date = new Date()): number | null {
  const target = parseDate(deadline);
  if (!target) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

export function deadlineStatus(deadline: string, now: Date = new Date()): DeadlineStatus {
  const left = daysLeft(deadline, now);
  if (left === null) return 'open';
  if (left < 0) return 'expired';
  if (left <= CLOSING_SOON_DAYS) return 'closingSoon';
  return 'open';
}

export function formatDate(
  value: string,
  language: Language,
  style: 'short' | 'long' = 'short'
): string {
  const date = parseDate(value);
  if (!date) return value;
  try {
    return date.toLocaleDateString(localeFor(language), {
      day: 'numeric',
      month: style === 'long' ? 'long' : 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export type DateParts = { day: string; month: string; year: string; weekday: string };

/** The tear-off stub on a job card needs the date split into its parts. */
export function dateParts(value: string, language: Language): DateParts | null {
  const date = parseDate(value);
  if (!date) return null;
  try {
    const locale = localeFor(language);
    return {
      day: String(date.getDate()),
      month: date.toLocaleDateString(locale, { month: 'short' }),
      year: String(date.getFullYear()),
      weekday: date.toLocaleDateString(locale, { weekday: 'short' }),
    };
  } catch {
    return null;
  }
}
