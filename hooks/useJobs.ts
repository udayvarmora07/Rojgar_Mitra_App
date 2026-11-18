import { useCallback, useEffect, useRef, useState } from 'react';
import { getJobs, Job } from '../lib/supabase';
import { readJSON, writeJSON, STORAGE_KEYS } from '../lib/storage';

type JobsCache = { jobs: Job[]; savedAt: string };

export type UseJobsResult = {
  jobs: Job[];
  loading: boolean;
  refreshing: boolean;
  /** True when the list on screen came from the device cache because the network failed. */
  offline: boolean;
  savedAt: string | null;
  refresh: () => Promise<void>;
};

/**
 * Stale-while-revalidate job list (PRD 10.3): shows the cached list instantly,
 * then replaces it with fresh data. Falls back to the cache when offline.
 */
export function useJobs(fetcher: () => Promise<Job[]> = getJobs): UseJobsResult {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    try {
      const fresh = await fetcherRef.current();
      const stamp = new Date().toISOString();
      await writeJSON(STORAGE_KEYS.jobsCache, { jobs: fresh, savedAt: stamp } satisfies JobsCache);
      if (!mounted.current) return;
      setJobs(fresh);
      setSavedAt(stamp);
      setOffline(false);
    } catch {
      const cache = await readJSON<JobsCache | null>(STORAGE_KEYS.jobsCache, null);
      if (!mounted.current) return;
      if (cache) {
        setJobs(cache.jobs);
        setSavedAt(cache.savedAt);
      }
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const cache = await readJSON<JobsCache | null>(STORAGE_KEYS.jobsCache, null);
      if (cache && mounted.current) {
        setJobs(cache.jobs);
        setSavedAt(cache.savedAt);
        setLoading(false);
      }
      await load();
      if (mounted.current) setLoading(false);
    })();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (mounted.current) setRefreshing(false);
  }, [load]);

  return { jobs, loading, refreshing, offline, savedAt, refresh };
}
