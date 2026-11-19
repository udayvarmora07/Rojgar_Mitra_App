import AsyncStorage from '@react-native-async-storage/async-storage';
import { readNotice, writeNotice, type CachedNotice } from '../lib/jobCache';

const job = {
  id: 'job-1',
  title: 'Clerk',
  department: 'Revenue',
  post_date: '2026-01-01',
  deadline: '2099-01-01',
  salary: null,
  source_link: null,
  vacancies: 2,
  qualification: 'Graduate',
  advertisement_no: null,
  education_level: 'Graduate',
  location: 'Gandhinagar',
  created_at: '',
  updated_at: null,
};

const notice: CachedNotice = {
  job,
  details: [
    {
      id: 'detail-1',
      job_id: 'job-1',
      age_limit: '18 to 33 years',
      required_qualifications: 'Graduate',
      application_fees: null,
      created_at: '',
    },
  ],
  documents: [
    {
      id: 'doc-1',
      job_id: 'job-1',
      document_name: 'Aadhaar card',
      phase: 'Application',
      created_at: '',
    },
  ],
  resources: [],
  savedAt: '2026-11-19T09:00:00.000Z',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('cached notice', () => {
  it('round-trips the notice under the job id', async () => {
    await expect(writeNotice(notice)).resolves.toBe(true);
    await expect(readNotice('job-1')).resolves.toEqual(notice);
  });

  it('does not serve a notice stored for another id', async () => {
    await writeNotice(notice);
    await expect(readNotice('job-2')).resolves.toBeNull();
  });

  it('ignores corrupt or partial data instead of crashing the screen', async () => {
    await AsyncStorage.setItem('jobs:notice:v1:job-1', 'not json');
    await expect(readNotice('job-1')).resolves.toBeNull();

    await AsyncStorage.setItem(
      'jobs:notice:v1:job-1',
      JSON.stringify({ job: { id: 'job-1' }, details: [], documents: [] })
    );
    await expect(readNotice('job-1')).resolves.toBeNull();

    await AsyncStorage.setItem(
      'jobs:notice:v1:job-1',
      JSON.stringify({ ...notice, job: { ...job, id: 'other' } })
    );
    await expect(readNotice('job-1')).resolves.toBeNull();
  });
});
