import { deadlineStatus } from './deadline';
import type { Job } from './supabase';

export type DeadlineFilter = 'all' | 'closingSoon' | 'open';

export type JobFilters = {
  /** Exact department name, or null for all. */
  department: string | null;
  deadline: DeadlineFilter;
  query: string;
};

export const NO_FILTERS: JobFilters = { department: null, deadline: 'all', query: '' };

export function listDepartments(jobs: Pick<Job, 'department'>[]): string[] {
  return Array.from(new Set(jobs.map((j) => j.department).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

/** How many department chips fit before the row becomes an unusable horizontal scroller. */
export const MAX_VISIBLE_DEPARTMENTS = 8;

/**
 * Splits departments into the chips shown inline and the ones hidden behind "More".
 *
 * A live scrape produced 50+ distinct departments, most with a single advertisement each. A
 * scroller that long is effectively unusable for a low-literacy user, so the row stays short
 * and the full list moves behind one control. A selected department is always kept visible so
 * the current filter is never hidden from the user who chose it.
 */
export function splitDepartments(
  departments: string[],
  selected: string | null,
  max: number = MAX_VISIBLE_DEPARTMENTS
): { visible: string[]; hidden: string[] } {
  if (departments.length <= max) return { visible: departments, hidden: [] };
  const visible = departments.slice(0, max);
  const hidden = departments.slice(max);
  if (selected && hidden.includes(selected)) {
    visible.push(selected);
  }
  return { visible, hidden };
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
    if (filters.deadline === 'closingSoon' && status !== 'closingSoon') return false;
    if (filters.deadline === 'open' && status !== 'open') return false;
    if (query) {
      const haystack = `${job.title} ${job.department}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}
