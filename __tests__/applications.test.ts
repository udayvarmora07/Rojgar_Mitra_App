import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyStatus,
  loadApplications,
  markApplied,
  setConfirmationNo,
  unmarkApplied,
  APPLY_WARNING_DAYS,
} from '../lib/applications';
import { clearAppData, STORAGE_KEYS } from '../lib/storage';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
      getAllKeys: jest.fn(async () => Array.from(store.keys())),
      multiRemove: jest.fn(async (keys: string[]) => {
        for (const k of keys) store.delete(k);
      }),
      __store: store,
    },
    __store: store,
  };
});

const store = (AsyncStorage as unknown as { __store: Map<string, string> }).__store;

beforeEach(() => {
  store.clear();
});

/**
 * The applied record is the reader's only proof of what they submitted: job lists hide a
 * notice once its deadline passes, and the call letter needs the confirmation number that
 * would otherwise be lost. These tests guard that the record survives a deadline.
 */
describe('application records', () => {
  it('starts empty', async () => {
    await expect(loadApplications()).resolves.toEqual({});
    expect(applyStatus({}, 'job-1')).toBe('unapplied');
  });

  it('marks a job applied and keeps the notice facts with it', async () => {
    const map = await markApplied({
      jobId: 'job-1',
      confirmationNo: null,
      advertisementNo: '03/2026',
      deadline: '2026-11-30',
      title: 'Clerk',
      sourceLink: 'https://ojas.gujarat.gov.in/',
    });

    expect(map['job-1'].advertisementNo).toBe('03/2026');
    // The deadline is copied at apply time so the record still reads correctly afterwards.
    expect(map['job-1'].deadline).toBe('2026-11-30');
    expect(map['job-1'].appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(applyStatus(map, 'job-1')).toBe('applied');
    expect(applyStatus(map, 'job-2')).toBe('unapplied');
  });

  it('persists to storage, so a restart still shows the mark', async () => {
    await markApplied({
      jobId: 'job-1',
      confirmationNo: null,
      advertisementNo: null,
      deadline: '2026-11-30',
      title: 'Clerk',
      sourceLink: 'https://ojas.gujarat.gov.in/',
    });
    expect(store.has(STORAGE_KEYS.applications)).toBe(true);
    const reloaded = await loadApplications();
    expect(reloaded['job-1']).toBeTruthy();
  });

  it('stores a confirmation number without changing the applied timestamp', async () => {
    const first = await markApplied({
      jobId: 'job-1',
      confirmationNo: null,
      advertisementNo: 'A-1',
      deadline: '2026-12-01',
      title: 'Clerk',
      sourceLink: 'https://ojas.gujarat.gov.in/',
    });
    const appliedAt = first['job-1'].appliedAt;

    const updated = await setConfirmationNo('job-1', '  CF-99881  ');
    expect(updated['job-1'].confirmationNo).toBe('CF-99881');
    expect(updated['job-1'].appliedAt).toBe(appliedAt);
  });

  it('treats a blank confirmation number as absent', async () => {
    await markApplied({
      jobId: 'job-1',
      confirmationNo: null,
      advertisementNo: null,
      deadline: '2026-12-01',
      title: 'Clerk',
      sourceLink: 'https://ojas.gujarat.gov.in/',
    });
    const updated = await setConfirmationNo('job-1', '   ');
    expect(updated['job-1'].confirmationNo).toBeNull();
  });

  it('ignores a confirmation number for a job that was never marked', async () => {
    const map = await setConfirmationNo('job-unknown', 'X');
    expect(map['job-unknown']).toBeUndefined();
  });

  it('removes the record, which also removes its confirmation number', async () => {
    await markApplied({
      jobId: 'job-1',
      confirmationNo: 'CF-1',
      advertisementNo: null,
      deadline: '2026-12-01',
      title: 'Clerk',
      sourceLink: 'https://ojas.gujarat.gov.in/',
    });
    const map = await unmarkApplied('job-1');
    expect(map['job-1']).toBeUndefined();
    expect(applyStatus(map, 'job-1')).toBe('unapplied');
  });

  it('is cleared by "Clear saved data", so no orphaned record survives a reset', async () => {
    await markApplied({
      jobId: 'job-1',
      confirmationNo: 'CF-1',
      advertisementNo: null,
      deadline: '2026-12-01',
      title: 'Clerk',
      sourceLink: 'https://ojas.gujarat.gov.in/',
    });
    await clearAppData();
    await expect(loadApplications()).resolves.toEqual({});
  });

  it('keeps the language choice when saved data is cleared', async () => {
    store.set(STORAGE_KEYS.language, 'gu');
    await markApplied({
      jobId: 'job-1',
      confirmationNo: null,
      advertisementNo: null,
      deadline: '2026-12-01',
      title: 'Clerk',
      sourceLink: 'https://ojas.gujarat.gov.in/',
    });
    await clearAppData();
    expect(store.get(STORAGE_KEYS.language)).toBe('gu');
  });

  it('uses the same closing-soon window as the deadline stamp', () => {
    // The stamp treats <= 7 days as urgent, so a warning inside that window agrees with it.
    expect(APPLY_WARNING_DAYS).toBe(7);
  });

  it('captures the notice title and official link at apply time', async () => {
    // Once a notice expires it leaves the live list, and the call letter appears on the
    // official page. Without a captured link the applications screen becomes a dead end.
    const map = await markApplied({
      jobId: 'job-1',
      confirmationNo: null,
      advertisementNo: 'A-1',
      deadline: '2026-11-30',
      title: 'Deputy Town Planner',
      sourceLink: 'https://www.freejobalert.com/articles/smc-3079154',
    });
    expect(map['job-1'].title).toBe('Deputy Town Planner');
    expect(map['job-1'].sourceLink).toBe(
      'https://www.freejobalert.com/articles/smc-3079154'
    );
  });
});
