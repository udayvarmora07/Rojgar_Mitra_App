import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

import i18n from '../lib/i18n';
import { CategoryBoard } from '../components/jobs/CategoryBoard';
import {
  countByEducationLevel,
  filterJobs,
  NO_FILTERS,
} from '../lib/jobsFilter';
import { EDUCATION_LEVELS, isEducationLevel } from '../constants/education';
import type { Job } from '../lib/supabase';

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

const NOW = new Date(2026, 10, 18);

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('education taxonomy', () => {
  it('accepts only the six canonical levels', () => {
    expect(EDUCATION_LEVELS).toHaveLength(6);
    for (const level of EDUCATION_LEVELS) expect(isEducationLevel(level.value)).toBe(true);
    expect(isEducationLevel('B.Tech')).toBe(false);
    expect(isEducationLevel(null)).toBe(false);
  });

  it('counts open notices per level and ignores unknown values', () => {
    const jobs = [
      job({ education_level: '10th' }),
      job({ education_level: '10th' }),
      job({ education_level: 'Graduate' }),
      job({ education_level: 'B.Tech/B.E' }),
      job({ education_level: null }),
    ];
    const counts = countByEducationLevel(jobs);
    expect(counts['10th']).toBe(2);
    expect(counts.Graduate).toBe(1);
    expect(counts.PostGraduate).toBe(0);
  });
});

describe('job filtering by education', () => {
  const jobs = [
    job({ id: 'ten', education_level: '10th', location: 'Surat' }),
    job({ id: 'grad', education_level: 'Graduate', location: 'Ahmedabad' }),
    job({ id: 'gone', education_level: '10th', deadline: '2026-11-01' }),
  ];

  it('keeps only the selected level and still hides expired notices', () => {
    expect(
      filterJobs(jobs, { ...NO_FILTERS, education: '10th' }, NOW).map((j) => j.id)
    ).toEqual(['ten']);
  });

  it('searches qualification, education and location, not just title and department', () => {
    expect(filterJobs(jobs, { ...NO_FILTERS, query: 'ahmedabad' }, NOW).map((j) => j.id)).toEqual([
      'grad',
    ]);
    expect(
      filterJobs(
        [job({ id: 'q', qualification: 'Diploma in Civil Engineering' })],
        { ...NO_FILTERS, query: 'civil' },
        NOW
      ).map((j) => j.id)
    ).toEqual(['q']);
  });
});

describe('CategoryBoard', () => {
  it('shows only levels that have open notices, and never an empty row', () => {
    const counts = {
      '10th': 0,
      '12th': 3,
      ITI: 0,
      Diploma: 1,
      Graduate: 8,
      PostGraduate: 0,
    } as const;
    render(
      <CategoryBoard
        counts={{ ...counts }}
        departmentCount={4}
        onSelectEducation={() => {}}
        onSelectDepartments={() => {}}
      />
    );

    expect(screen.getByText('12th Pass')).toBeTruthy();
    expect(screen.getByText('Diploma')).toBeTruthy();
    expect(screen.getByText('Graduate')).toBeTruthy();
    expect(screen.queryByText('10th Pass')).toBeNull();
    expect(screen.queryByText('ITI')).toBeNull();

    // Counts are written, not implied by colour.
    expect(screen.getByText('8 jobs')).toBeTruthy();
    expect(screen.getByText('4 departments')).toBeTruthy();
  });
});
