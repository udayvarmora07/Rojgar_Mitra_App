import { readJSON, writeJSON, STORAGE_KEYS } from './storage';
import type { Topic } from '../constants/testCategories';
import type { Language } from '../constants/languages';

export type TestRecord = {
  id: string;
  topic: Topic;
  language: Language;
  score: number;
  total: number;
  timed: boolean;
  takenAt: string;
};

export const MAX_HISTORY = 20;

export function loadHistory(): Promise<TestRecord[]> {
  return readJSON<TestRecord[]>(STORAGE_KEYS.testHistory, []);
}

/** Prepends a result (newest first) and keeps the last MAX_HISTORY entries. */
export async function addResult(record: Omit<TestRecord, 'id' | 'takenAt'>): Promise<TestRecord[]> {
  const entry: TestRecord = {
    ...record,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    takenAt: new Date().toISOString(),
  };
  const history = [entry, ...(await loadHistory())].slice(0, MAX_HISTORY);
  await writeJSON(STORAGE_KEYS.testHistory, history);
  return history;
}
