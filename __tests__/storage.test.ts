import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAppData, readJSON, STORAGE_KEYS, writeJSON } from '../lib/storage';
import { addResult, loadHistory, MAX_HISTORY } from '../lib/testHistory';
import { loadReady, saveReady } from '../lib/documentsStore';
import i18n, { restoreSavedLanguage, setLanguage } from '../lib/i18n';

beforeEach(() => AsyncStorage.clear());

describe('storage', () => {
  it('returns the fallback for missing or corrupt values', async () => {
    expect(await readJSON('missing', 42)).toBe(42);
    await AsyncStorage.setItem('bad', '{not json');
    expect(await readJSON('bad', 'fallback')).toBe('fallback');
  });

  it('clears user data but keeps the language choice', async () => {
    await writeJSON(STORAGE_KEYS.jobsCache, { jobs: [] });
    await writeJSON(STORAGE_KEYS.testHistory, []);
    await saveReady('general', 'exam', { pen: true });
    await AsyncStorage.setItem(STORAGE_KEYS.language, 'gu');

    expect(await clearAppData()).toBe(3);
    expect(await AsyncStorage.getAllKeys()).toEqual([STORAGE_KEYS.language]);
  });
});

describe('test history', () => {
  it('stores newest first and caps the list', async () => {
    for (let i = 0; i < MAX_HISTORY + 3; i++) {
      await addResult({ topic: 'math', language: 'en', score: i, total: 10, timed: false });
    }
    const history = await loadHistory();
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0].score).toBe(MAX_HISTORY + 2);
  });
});

describe('document checklist persistence', () => {
  it('keeps ready-state separately per job and phase', async () => {
    await saveReady('job-1', 'application', { aadhaar: true });
    expect(await loadReady('job-1', 'application')).toEqual({ aadhaar: true });
    expect(await loadReady('job-1', 'exam')).toEqual({});
    expect(await loadReady('general', 'application')).toEqual({});
  });
});

describe('language persistence', () => {
  it('saves the chosen language and restores it on next launch', async () => {
    await setLanguage('hi');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.language)).toBe('hi');

    await i18n.changeLanguage('en');
    expect(await restoreSavedLanguage()).toBe('hi');
    expect(i18n.language).toBe('hi');
  });
});
