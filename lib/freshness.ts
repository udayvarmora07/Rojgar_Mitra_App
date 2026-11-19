/**
 * How old is the list on screen?
 *
 * The app shows cached notices when the network is unavailable, so a reader must be able
 * to tell a list checked a minute ago from one checked three days ago. The wording is
 * deliberately coarse (minutes, today, yesterday, a date): a precise timestamp is harder
 * to read than "Checked today", and the exact time is not what the reader is deciding on.
 */
export type FreshnessInfo =
  | { kind: 'justNow' }
  | { kind: 'minutes'; minutes: number }
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'date'; at: string };

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Start of the local calendar day, so "yesterday" means yesterday's date, not 24 hours. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function freshnessOf(
  savedAt: string | null | undefined,
  now: Date = new Date()
): FreshnessInfo | null {
  if (!savedAt) return null;
  const at = new Date(savedAt);
  if (Number.isNaN(at.getTime())) return null;

  const minutes = Math.floor((now.getTime() - at.getTime()) / MS_PER_MINUTE);
  // A clock that is slightly ahead must not produce "checked -2 min ago".
  if (minutes < 5) return { kind: 'justNow' };
  if (minutes < 60) return { kind: 'minutes', minutes };

  const days = Math.round((startOfDay(now) - startOfDay(at)) / MS_PER_DAY);
  if (days <= 0) return { kind: 'today' };
  if (days === 1) return { kind: 'yesterday' };
  return { kind: 'date', at: savedAt };
}
