import type { TranslationShape } from '../lib/locales/en';

/**
 * The OJAS application steps, in the order the portal actually asks for them.
 *
 * These are ordered facts about the official process, not advice: OJAS's One-Time
 * Registration creates a reusable profile (an OJAS ID) and does NOT submit an
 * application to any post. That distinction is the single most common reason a
 * candidate here believes they applied and then loses the deadline, so it is a
 * discrete numbered step with its own warning rather than a footnote.
 *
 * Source: ojas.gujarat.gov.in (Registration / Apply / Upload Photo / Confirm / Fees /
 * Call Letter) and the published photo and signature limits.
 */
export type GuideStep = {
  key: keyof TranslationShape['guideSteps'];
  /** The step that is most often mistaken for "done". Rendered with the warning stamp. */
  trap?: boolean;
};

export const APPLICATION_STEPS: GuideStep[] = [
  { key: 'otr' },
  { key: 'otrNotApplication', trap: true },
  { key: 'openAdvertisement' },
  { key: 'fillDetails' },
  { key: 'uploadFiles' },
  { key: 'payFee' },
  { key: 'confirm' },
  { key: 'callLetter' },
];

/**
 * The exact upload limits OJAS enforces. A file one kilobyte over the limit is
 * rejected, which is why this is surfaced as measured values and not prose.
 */
export const UPLOAD_SPECS: {
  key: 'photo' | 'signature';
  format: string;
  maxKb: number;
  widthCm: string;
  heightCm: string;
}[] = [
  { key: 'photo', format: 'JPG', maxKb: 15, widthCm: '3.6', heightCm: '5.0' },
  { key: 'signature', format: 'JPG', maxKb: 15, widthCm: '7.5', heightCm: '2.5' },
];

export const UPLOAD_MAX_KB = 15;

/** The official portal and helpline, shown as a last resort rather than a first step. */
export const OJAS_PORTAL = 'https://ojas.gujarat.gov.in';
export const OJAS_HELPLINE = '1800 233 5500';

/** The documents a candidate must have scanned before starting, in prerequisite order. */
export const PREREQUISITE_DOC_KEYS = [
  'aadhaar',
  'education',
  'category',
  'domicile',
  'photo',
  'signature',
  'mobile',
  'email',
  'bank',
] as const;
