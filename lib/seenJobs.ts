import { readString, writeString, STORAGE_KEYS } from './storage';
import type { Job } from './supabase';

/**
 * "What is new since I last looked?"
 *
 * The app's own research says a reader opens it most days to see what has appeared and to
 * check deadlines. Without a record of the previous visit the list is undifferentiated every
 * time, and a notice posted this morning looks identical to one from a fortnight ago.
 *
 * The marker is a job id set rather than a timestamp: a notice can be re-published or edited
 * without its `created_at` changing, and comparing ids is what the reader actually means by
 * "new". Nothing is sent anywhere; the set lives on the phone.
 */
export type SeenMarker = {
  /** Ids present at the end of the previous visit. */
  ids: string[];
  /** When that visit ended, for the "last checked" line. */
  at: string;
};

/** The cap keeps the marker small; the newest notices are what a later visit compares against. */
const MAX_IDS = 400;

export function loadSeen(): Promise<SeenMarker | null> {
  return readString(STORAGE_KEYS.seenJobs).then((raw) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<SeenMarker>;
      if (!Array.isArray(parsed.ids)) return null;
      return { ids: parsed.ids.filter((id): id is string => typeof id === 'string'), at: parsed.at ?? '' };
    } catch {
      // A corrupt marker must never break the list; treat it as a first visit.
      return null;
    }
  });
}

export function saveSeen(marker: SeenMarker): Promise<boolean> {
  return writeString(
    STORAGE_KEYS.seenJobs,
    JSON.stringify({ ids: marker.ids.slice(0, MAX_IDS), at: marker.at })
  );
}

/**
 * The notices the reader has not seen yet.
 *
 * A first visit has nothing to compare against, so everything counts as new — but the caller
 * should not badge the whole list on day one, which is why `hasMarker` is returned separately.
 */
export function newSinceSeen(
  jobs: Pick<Job, 'id'>[],
  marker: SeenMarker | null
): { newJobs: Pick<Job, 'id'>[]; hasMarker: boolean } {
  if (!marker) return { newJobs: [], hasMarker: false };
  const seen = new Set(marker.ids);
  return { newJobs: jobs.filter((job) => !seen.has(job.id)), hasMarker: true };
}

/** Builds the marker to store at the end of a visit. */
export function markerFor(jobs: Pick<Job, 'id'>[], now: Date = new Date()): SeenMarker {
  return { ids: jobs.map((job) => job.id).slice(0, MAX_IDS), at: now.toISOString() };
}
