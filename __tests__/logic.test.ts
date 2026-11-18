import { daysLeft, deadlineStatus, formatDate, parseDate } from '../lib/deadline';
import { evaluateEligibility } from '../lib/eligibility';
import { filterJobs, listDepartments, NO_FILTERS, splitByApplied } from '../lib/jobsFilter';
import { progress } from '../lib/documentsStore';
import { isSafeWebUrl } from '../lib/url';
import { toLanguage } from '../constants/languages';
import type { Job } from '../lib/supabase';

const NOW = new Date(2026, 10, 5, 15, 30); // 5 Nov 2026, afternoon (local)

function job(partial: Partial<Job>): Job {
  return {
    id: partial.id ?? Math.random().toString(),
    title: 'Talati cum Mantri',
    department: 'Panchayat',
    post_date: '2026-10-01',
    deadline: '2026-12-31',
    salary: null,
    source_link: null,
    vacancies: null,
    qualification: null,
    advertisement_no: null,
    education_level: null,
    location: null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: null,
    ...partial,
  };
}

describe('deadline', () => {
  it('parses YYYY-MM-DD as a local date', () => {
    const d = parseDate('2026-11-12');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(10);
    expect(d?.getDate()).toBe(12);
    expect(parseDate('not a date')).toBeNull();
  });

  it('counts whole calendar days regardless of time of day', () => {
    expect(daysLeft('2026-11-05', NOW)).toBe(0);
    expect(daysLeft('2026-11-06', NOW)).toBe(1);
    expect(daysLeft('2026-11-04', NOW)).toBe(-1);
  });

  it('classifies expired / closing soon (<= 7 days) / open', () => {
    expect(deadlineStatus('2026-11-04', NOW)).toBe('expired');
    expect(deadlineStatus('2026-11-05', NOW)).toBe('closingSoon');
    expect(deadlineStatus('2026-11-12', NOW)).toBe('closingSoon');
    expect(deadlineStatus('2026-11-13', NOW)).toBe('open');
  });

  it('formats dates without throwing and falls back to the raw value', () => {
    expect(formatDate('2026-11-12', 'en')).toMatch(/2026/);
    expect(formatDate('garbage', 'gu')).toBe('garbage');
  });
});

describe('eligibility', () => {
  it('is incomplete until all four questions are answered', () => {
    expect(evaluateEligibility({}).status).toBe('incomplete');
    expect(evaluateEligibility({ qualification: true, age: true }).status).toBe('incomplete');
  });

  it('is eligible only when every answer is yes', () => {
    const r = evaluateEligibility({ qualification: true, age: true, category: true, documents: true });
    expect(r).toEqual({ status: 'eligible', failed: [], answered: 4, total: 4 });
  });

  it('reports not eligible as soon as one answer is no, listing what failed', () => {
    const r = evaluateEligibility({ age: false });
    expect(r.status).toBe('notEligible');
    expect(r.failed).toEqual(['age']);
  });
});

describe('jobs filter', () => {
  const jobs = [
    job({ id: 'soon', department: 'Police', deadline: '2026-11-08' }),
    job({ id: 'open', department: 'Panchayat', deadline: '2026-12-31', title: 'Gram Sevak' }),
    job({ id: 'gone', department: 'Police', deadline: '2026-11-01' }),
  ];

  it('always hides expired jobs', () => {
    expect(filterJobs(jobs, NO_FILTERS, NOW).map((j) => j.id)).toEqual(['soon', 'open']);
  });

  it('filters by deadline bucket, department and free text', () => {
    expect(filterJobs(jobs, { ...NO_FILTERS, deadline: 'closingSoon' }, NOW).map((j) => j.id)).toEqual(['soon']);
    expect(filterJobs(jobs, { ...NO_FILTERS, deadline: 'open' }, NOW).map((j) => j.id)).toEqual(['open']);
    expect(filterJobs(jobs, { ...NO_FILTERS, department: 'Panchayat' }, NOW).map((j) => j.id)).toEqual(['open']);
    expect(filterJobs(jobs, { ...NO_FILTERS, query: '  gram ' }, NOW).map((j) => j.id)).toEqual(['open']);
  });

  it('lists unique departments alphabetically', () => {
    expect(listDepartments(jobs)).toEqual(['Panchayat', 'Police']);
  });
});

describe('document progress', () => {
  it('counts ready items and ignores stale ids', () => {
    expect(progress(['a', 'b', 'c'], { a: true, b: false, zzz: true })).toEqual({
      done: 1,
      total: 3,
      pending: 2,
      ratio: 1 / 3,
    });
    expect(progress([], {}).ratio).toBe(0);
  });
});

describe('url safety', () => {
  it('only allows http(s) links', () => {
    expect(isSafeWebUrl('https://ojas.gujarat.gov.in/x')).toBe(true);
    expect(isSafeWebUrl('http://gpsc.gujarat.gov.in')).toBe(true);
    expect(isSafeWebUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeWebUrl('intent://evil')).toBe(false);
    expect(isSafeWebUrl(null)).toBe(false);
  });
});

describe('language codes', () => {
  it('maps device locales to supported languages', () => {
    expect(toLanguage('gu-IN')).toBe('gu');
    expect(toLanguage('hi')).toBe('hi');
    expect(toLanguage('fr-FR')).toBe('en');
    expect(toLanguage(undefined)).toBe('en');
  });
});

describe('splitByApplied', () => {
  it('splits the live list into applied and not applied, keeping order', () => {
    const a = job({ id: 'a', deadline: '2026-12-31' });
    const b = job({ id: 'b', deadline: '2026-12-31' });
    const c = job({ id: 'c', deadline: '2026-12-31' });

    const { applied, notApplied } = splitByApplied([a, b, c], new Set(['b']));
    expect(applied.map((j) => j.id)).toEqual(['b']);
    expect(notApplied.map((j) => j.id)).toEqual(['a', 'c']);
  });

  it('treats everything as not applied when nothing is tracked', () => {
    const jobs = [job({ id: 'a' }), job({ id: 'b' })];
    const { applied, notApplied } = splitByApplied(jobs, new Set());
    expect(applied).toHaveLength(0);
    expect(notApplied).toHaveLength(2);
  });
});
