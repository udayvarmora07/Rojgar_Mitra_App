import type { TranslationShape } from '../lib/locales/en';

export type DocPhase = 'application' | 'exam';
export type DbDocPhase = 'Application' | 'Exam Center';

/** Keys of the `docs` dictionary; a checklist item cannot point at a missing label. */
export type DocKey = keyof TranslationShape['docs'];

export const PHASE_TO_DB: Record<DocPhase, DbDocPhase> = {
  application: 'Application',
  exam: 'Exam Center',
};

export function isDocPhase(value: unknown): value is DocPhase {
  return value === 'application' || value === 'exam';
}

/** `nameKey` / `descKey` resolve through i18n (`docs.<key>.name` / `docs.<key>.desc`). */
export type ChecklistTemplate = { key: DocKey };

export const DEFAULT_DOCUMENTS: Record<DocPhase, ChecklistTemplate[]> = {
  application: [
    { key: 'aadhaar' },
    { key: 'education' },
    { key: 'category' },
    { key: 'domicile' },
    { key: 'photo' },
    { key: 'signature' },
    { key: 'mobile' },
    { key: 'email' },
    { key: 'bank' },
  ],
  exam: [
    { key: 'admitCard' },
    { key: 'aadhaarOriginal' },
    { key: 'photoSame' },
    { key: 'pen' },
    { key: 'water' },
  ],
};
