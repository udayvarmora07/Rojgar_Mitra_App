import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSeen, markerFor, newSinceSeen, saveSeen, type SeenMarker } from '../lib/seenJobs';

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

beforeEach(() => store.clear());

/**
 * The "new since your last visit" marker is the answer to the app's most common session: a
 * reader opening it to see what appeared since yesterday. These tests pin the two rules that
 * make it safe: a first visit marks nothing, and a corrupt marker must not break the list.
 */
describe('seen-jobs marker', () => {
  it('marks nothing on a first visit', () => {
    const jobs = [{ id: 'a' }, { id: 'b' }];
    expect(newSinceSeen(jobs, null)).toEqual({ newJobs: [], hasMarker: false });
  });

  it('reports notices that were not in the previous visit', () => {
    const marker: SeenMarker = { ids: ['a', 'b'], at: '2026-11-18T10:00:00.000Z' };
    const jobs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const { newJobs, hasMarker } = newSinceSeen(jobs, marker);
    expect(hasMarker).toBe(true);
    expect(newJobs.map((j) => j.id)).toEqual(['c']);
  });

  it('reports nothing when the list is unchanged', () => {
    const marker: SeenMarker = { ids: ['a', 'b'], at: 'x' };
    expect(newSinceSeen([{ id: 'a' }, { id: 'b' }], marker).newJobs).toHaveLength(0);
  });

  it('does not mark a notice as new just because an old one disappeared', () => {
    // A job expiring removes it from the live list; that must not make the rest look new.
    const marker: SeenMarker = { ids: ['a', 'b'], at: 'x' };
    expect(newSinceSeen([{ id: 'a' }], marker).newJobs).toHaveLength(0);
  });

  it('round-trips through storage', async () => {
    await saveSeen({ ids: ['x', 'y'], at: '2026-11-19T00:00:00.000Z' });
    const loaded = await loadSeen();
    expect(loaded?.ids).toEqual(['x', 'y']);
    expect(loaded?.at).toBe('2026-11-19T00:00:00.000Z');
  });

  it('treats a corrupt marker as a first visit instead of throwing', async () => {
    await AsyncStorage.setItem('jobs:seen:v1', 'not json');
    await expect(loadSeen()).resolves.toBeNull();
  });

  it('treats a marker with no ids array as missing', async () => {
    await AsyncStorage.setItem('jobs:seen:v1', JSON.stringify({ at: 'x' }));
    await expect(loadSeen()).resolves.toBeNull();
  });

  it('caps the stored id list so the marker cannot grow without bound', () => {
    const many = Array.from({ length: 900 }, (_, i) => ({ id: `id-${i}` }));
    expect(markerFor(many).ids.length).toBeLessThanOrEqual(400);
  });

  it('records when the visit ended', () => {
    const at = new Date('2026-11-19T09:30:00.000Z');
    expect(markerFor([{ id: 'a' }], at).at).toBe(at.toISOString());
  });
});
