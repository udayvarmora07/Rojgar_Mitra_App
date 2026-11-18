import { useCallback, useEffect, useRef, useState } from 'react';
import { getLearningResources, LearningResourceWithJob } from '../lib/supabase';
import { readJSON, writeJSON, STORAGE_KEYS } from '../lib/storage';

type ResourcesCache = { resources: LearningResourceWithJob[]; savedAt: string };

export type UseLearningResourcesResult = {
  resources: LearningResourceWithJob[];
  loading: boolean;
  refreshing: boolean;
  offline: boolean;
  savedAt: string | null;
  refresh: () => Promise<void>;
};

/**
 * Study material follows the same offline-first rule as the job list: show the cached
 * shelf immediately, replace it with fresh rows, and keep the cache when the network fails.
 */
export function useLearningResources(
  jobId?: string,
  fetcher: (jobId?: string) => Promise<LearningResourceWithJob[]> = getLearningResources
): UseLearningResourcesResult {
  const [resources, setResources] = useState<LearningResourceWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const scope = jobId ?? 'all';

  const load = useCallback(async () => {
    try {
      const fresh = await fetcherRef.current(jobId);
      const stamp = new Date().toISOString();
      await writeJSON(STORAGE_KEYS.resourcesCache(scope), {
        resources: fresh,
        savedAt: stamp,
      } satisfies ResourcesCache);
      if (!mounted.current) return;
      setResources(fresh);
      setSavedAt(stamp);
      setOffline(false);
    } catch {
      const cache = await readJSON<ResourcesCache | null>(
        STORAGE_KEYS.resourcesCache(scope),
        null
      );
      if (!mounted.current) return;
      if (cache) {
        setResources(cache.resources);
        setSavedAt(cache.savedAt);
      }
      setOffline(true);
    }
  }, [jobId, scope]);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    (async () => {
      const cache = await readJSON<ResourcesCache | null>(
        STORAGE_KEYS.resourcesCache(scope),
        null
      );
      if (cache && active && mounted.current) {
        setResources(cache.resources);
        setSavedAt(cache.savedAt);
        setLoading(false);
      }
      await load();
      if (active && mounted.current) setLoading(false);
    })();
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [load, scope]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (mounted.current) setRefreshing(false);
  }, [load]);

  return { resources, loading, refreshing, offline, savedAt, refresh };
}
