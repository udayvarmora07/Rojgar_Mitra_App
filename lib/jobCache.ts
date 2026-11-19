import type { DocumentRequired, Job, JobDetail, LearningResource } from './supabase';
import { readJSON, writeJSON } from './storage';

/**
 * One notice, kept on the phone after it has been opened.
 *
 * The list is already cached, so a reader can browse offline. Tapping a card used to fetch
 * every fact again and fail without a connection — exactly when the reader is standing at the
 * employment office with the documents. The detail screen now reads this first and refreshes
 * in the background.
 *
 * The storage prefix is `jobs:`, which "Clear saved data" already removes.
 */
export type CachedNotice = {
  job: Job;
  details: JobDetail[];
  documents: DocumentRequired[];
  resources: LearningResource[];
  savedAt: string;
};

function key(jobId: string): string {
  return `jobs:notice:v1:${jobId}`;
}

export async function readNotice(jobId: string): Promise<CachedNotice | null> {
  const cached = await readJSON<CachedNotice | null>(key(jobId), null);
  if (!cached || !cached.job || cached.job.id !== jobId) return null;
  if (!Array.isArray(cached.details) || !Array.isArray(cached.documents)) return null;
  if (!Array.isArray(cached.resources) || typeof cached.savedAt !== 'string') return null;
  return cached;
}

export async function writeNotice(notice: CachedNotice): Promise<boolean> {
  return writeJSON(key(notice.job.id), notice);
}
