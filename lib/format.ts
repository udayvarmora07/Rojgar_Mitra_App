import { Language, localeFor } from '../constants/languages';

/**
 * Locale-aware formatting for the values this app shows: counts, scores and dates.
 *
 * Hermes ships `Intl` on both platforms for SDK 54, but the app must still render if a
 * device or a test environment lacks a locale's data. Every formatter below therefore
 * falls back to a plain string rather than throwing, and the fallback is asserted in
 * `__tests__/format.test.ts`.
 */

function safe<T>(compute: () => T, fallback: T): T {
  try {
    return compute();
  } catch {
    return fallback;
  }
}

/** `1234567` -> `12,34,567` in en-IN / gu-IN / hi-IN (Indian digit grouping). */
export function formatNumber(value: number, language: Language): string {
  return safe(
    () => new Intl.NumberFormat(localeFor(language)).format(value),
    String(value)
  );
}

/** A percentage for a progress or score label, e.g. `67%`. */
export function formatPercent(ratio: number, language: Language): string {
  const percent = safe(
    () => new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 0 }).format(ratio * 100),
    String(Math.round(ratio * 100))
  );
  return `${percent}%`;
}

/**
 * Sorts departments with the reader's own collation. Gujarati and Hindi script names sort
 * incorrectly under a bare `localeCompare` on some engines, so the locale is passed in.
 */
export function compareNames(a: string, b: string, language: Language): number {
  return safe(
    () => new Intl.Collator(localeFor(language)).compare(a, b),
    a.localeCompare(b)
  );
}

/**
 * Test scores read as `7/10`. Both numbers are formatted so a locale that groups large
 * numbers does not produce `1,200/2,000` inconsistently on one side only.
 */
export function formatScore(score: number, total: number, language: Language): string {
  return `${formatNumber(score, language)}/${formatNumber(total, language)}`;
}
