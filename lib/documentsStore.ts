import { readJSON, writeJSON, STORAGE_KEYS } from './storage';
import type { DocPhase } from '../constants/documents';

export type ReadyMap = Record<string, boolean>;

/** `scope` is a job id, or `general` for the stand-alone checklist. */
export function loadReady(scope: string, phase: DocPhase): Promise<ReadyMap> {
  return readJSON<ReadyMap>(STORAGE_KEYS.documents(scope, phase), {});
}

export function saveReady(scope: string, phase: DocPhase, ready: ReadyMap): Promise<boolean> {
  return writeJSON(STORAGE_KEYS.documents(scope, phase), ready);
}

export function progress(itemIds: string[], ready: ReadyMap) {
  const total = itemIds.length;
  const done = itemIds.filter((id) => ready[id] === true).length;
  return { done, total, pending: total - done, ratio: total === 0 ? 0 : done / total };
}
