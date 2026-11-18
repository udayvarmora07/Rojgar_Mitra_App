import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin, failure-tolerant wrapper around AsyncStorage. Storage problems must never
 * crash the app - the caller always gets the fallback instead.
 */
export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function readString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function writeString(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Prefixes of user data that "Clear saved data" removes. The language choice is kept. */
const CLEARABLE_PREFIXES = ['jobs:', 'practice:', 'docs:', 'resources:'];

export async function clearAppData(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const targets = keys.filter((k) => CLEARABLE_PREFIXES.some((p) => k.startsWith(p)));
    if (targets.length) await AsyncStorage.multiRemove(targets);
    return targets.length;
  } catch {
    return 0;
  }
}

export const STORAGE_KEYS = {
  language: 'settings:language:v1',
  jobsCache: 'jobs:cache:v1',
  testHistory: 'practice:history:v1',
  testCache: (topic: string, language: string) => `practice:test:v1:${topic}:${language}`,
  documents: (scope: string, phase: string) => `docs:v1:${scope}:${phase}`,
  resourcesCache: (scope: string) => `resources:cache:v1:${scope}`,
} as const;
