import { readJSON, writeJSON, STORAGE_KEYS } from './storage';

/**
 * The record a candidate keeps after applying on OJAS.
 *
 * The documented top reason a Gujarat candidate loses a post is not failing the exam: they
 * complete the One-Time Registration, believe that counts as applying, and miss the deadline.
 * The second is losing the confirmation number before the call letter is released.
 *
 * So the only fields here are the two things OJAS asks for when something goes wrong —
 * the confirmation number and the advertisement number — plus the link to the notice itself.
 */
export type ApplicationRecord = {
  /** The job id from `public.jobs`, so the card can resolve back to the notice. */
  jobId: string;
  /** What the reader typed from the OJAS receipt. Optional: many never write it down. */
  confirmationNo: string | null;
  /** The OJAS advertisement number, copied from the notice, used to recover a lost number. */
  advertisementNo: string | null;
  /** When the reader marked this applied. */
  appliedAt: string;
  /** The deadline at the time of applying, so a passed deadline still reads correctly. */
  deadline: string;
  /**
   * The notice title and its official link, captured at apply time.
   *
   * A job that has dropped out of the cached list (expired, or evicted from the cache) would
   * otherwise be a dead end on the applications screen — and the call letter lives on the
   * official site, so the reader needs that link most after the deadline.
   */
  title: string | null;
  sourceLink: string | null;
  /**
   * The organisation's own portal, when the scraper knew it at apply time. Older records do
   * not have this field; they fall back to `sourceLink` and are labelled as a summary.
   */
  officialLink?: string | null;
};

export type ApplicationMap = Record<string, ApplicationRecord>;

export function loadApplications(): Promise<ApplicationMap> {
  return readJSON<ApplicationMap>(STORAGE_KEYS.applications, {});
}

export function saveApplications(map: ApplicationMap): Promise<boolean> {
  return writeJSON(STORAGE_KEYS.applications, map);
}

/**
 * Marks a job applied. Called with the notice's own facts so the record still makes sense
 * after the job scrolls out of the live list.
 */
export async function markApplied(
  input: Omit<ApplicationRecord, 'appliedAt'>
): Promise<ApplicationMap> {
  const map = await loadApplications();
  const next: ApplicationMap = {
    ...map,
    [input.jobId]: { ...input, appliedAt: new Date().toISOString() },
  };
  await saveApplications(next);
  return next;
}

export async function unmarkApplied(jobId: string): Promise<ApplicationMap> {
  const map = await loadApplications();
  const next = { ...map };
  delete next[jobId];
  await saveApplications(next);
  return next;
}

/** Stores the confirmation number without changing the applied timestamp. */
export async function setConfirmationNo(
  jobId: string,
  confirmationNo: string
): Promise<ApplicationMap> {
  const map = await loadApplications();
  const existing = map[jobId];
  if (!existing) return map;
  const next: ApplicationMap = {
    ...map,
    [jobId]: { ...existing, confirmationNo: confirmationNo.trim() || null },
  };
  await saveApplications(next);
  return next;
}

/**
 * How many days before a deadline to keep warning an unapplied reader.
 *
 * This mirrors the deadline stamp: the app already treats <= 7 days as "closing soon", so a
 * reminder that fires inside that window uses the same boundary the rest of the UI does.
 */
export const APPLY_WARNING_DAYS = 7;

export type ApplyStatus = 'applied' | 'unapplied';

export function applyStatus(map: ApplicationMap, jobId: string): ApplyStatus {
  return map[jobId] ? 'applied' : 'unapplied';
}
