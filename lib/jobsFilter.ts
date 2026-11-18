import { deadlineStatus } from './deadline';
import { compareNames } from './format';
import type { Job } from './supabase';
import { EducationLevel, EDUCATION_LEVELS, isEducationLevel } from '../constants/education';
import type { Language } from '../constants/languages';

export type DeadlineFilter = 'all' | 'closingSoon' | 'open';

export type JobFilters = {
  /** Exact department name, or null for all. */
  department: string | null;
  /** Canonical minimum education level, or null for all. */
  education: EducationLevel | null;
  deadline: DeadlineFilter;
  query: string;
};

export const NO_FILTERS: JobFilters = {
  department: null,
  education: null,
  deadline: 'all',
  query: '',
};

/** Departments sorted with the reader's own collation (Gujarati/Hindi sort correctly). */
export function listDepartments(
  jobs: Pick<Job, 'department'>[],
  language: Language = 'en'
): string[] {
  return Array.from(new Set(jobs.map((j) => j.department).filter(Boolean))).sort((a, b) =>
    compareNames(a, b, language)
  );
}

/** How many open notices fall under each canonical level. Unknown levels are not counted. */
export function countByEducationLevel(
  jobs: Pick<Job, 'education_level'>[]
): Record<EducationLevel, number> {
  const counts = Object.fromEntries(
    EDUCATION_LEVELS.map((level) => [level.value, 0])
  ) as Record<EducationLevel, number>;

  for (const job of jobs) {
    if (isEducationLevel(job.education_level)) counts[job.education_level] += 1;
  }
  return counts;
}

/**
 * Expired jobs are always hidden from the browse list - a farmer should not tap
 * a job they can no longer apply for.
 */
export function filterJobs(jobs: Job[], filters: JobFilters, now: Date = new Date()): Job[] {
  const query = filters.query.trim().toLowerCase();

  return jobs.filter((job) => {
    const status = deadlineStatus(job.deadline, now);
    if (status === 'expired') return false;
    if (filters.department && job.department !== filters.department) return false;
    if (filters.education && job.education_level !== filters.education) return false;
    if (filters.deadline === 'closingSoon' && status !== 'closingSoon') return false;
    if (filters.deadline === 'open' && status !== 'open') return false;
    if (query) {
      const haystack = `${job.title} ${job.department} ${job.qualification ?? ''} ${
        job.education_level ?? ''
      } ${job.location ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}
