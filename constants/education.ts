import type { TranslationKey } from '../lib/locales/en';

export type EducationLevel = '10th' | '12th' | 'ITI' | 'Diploma' | 'Graduate' | 'PostGraduate';

/** Lowest study level first: the database stores the minimum level an advertisement accepts. */
export const EDUCATION_LEVELS: { value: EducationLevel; labelKey: TranslationKey }[] = [
  { value: '10th', labelKey: 'edu10' },
  { value: '12th', labelKey: 'edu12' },
  { value: 'ITI', labelKey: 'eduIti' },
  { value: 'Diploma', labelKey: 'eduDiploma' },
  { value: 'Graduate', labelKey: 'eduGraduate' },
  { value: 'PostGraduate', labelKey: 'eduPostGraduate' },
];

export function isEducationLevel(value: unknown): value is EducationLevel {
  return typeof value === 'string' && EDUCATION_LEVELS.some((level) => level.value === value);
}

export function educationLabelKey(level: EducationLevel): TranslationKey {
  return EDUCATION_LEVELS.find((item) => item.value === level)?.labelKey ?? 'eduGraduate';
}
