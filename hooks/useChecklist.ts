import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { DEFAULT_DOCUMENTS, DocPhase, PHASE_TO_DB } from '../constants/documents';
import { getDocumentsRequired, DocumentRequired } from '../lib/supabase';
import { loadReady, progress, ReadyMap, saveReady } from '../lib/documentsStore';

export type ChecklistEntry = { id: string; title: string; description?: string };

/**
 * Document checklist for one phase. Uses the job's own document list from Supabase
 * when it has one, otherwise the standard PRD 5.5 list. Ready-state is saved on the phone.
 */
export function useChecklist(phase: DocPhase, jobId?: string) {
  const { t } = useTranslation();
  const scope = jobId || 'general';
  const [jobDocs, setJobDocs] = useState<DocumentRequired[]>([]);
  const [ready, setReady] = useState<ReadyMap>({});
  const [loading, setLoading] = useState(true);

  // The job's document list rarely changes: fetch once per job/phase.
  useEffect(() => {
    let active = true;
    (async () => {
      const docs = jobId ? await getDocumentsRequired(jobId).catch(() => [] as DocumentRequired[]) : [];
      if (!active) return;
      setJobDocs(docs.filter((d) => d.phase === PHASE_TO_DB[phase]));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [phase, jobId]);

  // Ready-state is re-read on every focus so the overview reflects changes made on the detail screen.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadReady(scope, phase).then((saved) => active && setReady(saved));
      return () => {
        active = false;
      };
    }, [scope, phase])
  );

  const items: ChecklistEntry[] = useMemo(() => {
    if (jobDocs.length > 0) {
      return jobDocs.map((d) => ({ id: `db:${d.id}`, title: d.document_name }));
    }
    return DEFAULT_DOCUMENTS[phase].map((d) => ({
      id: d.key,
      title: t(`docs.${d.key}.name`),
      description: t(`docs.${d.key}.desc`),
    }));
  }, [jobDocs, phase, t]);

  const toggle = useCallback(
    (id: string) => {
      setReady((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        saveReady(scope, phase, next);
        return next;
      });
    },
    [scope, phase]
  );

  const stats = progress(
    items.map((i) => i.id),
    ready
  );

  return { items, ready, toggle, loading, stats };
}
