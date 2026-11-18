export type Language = 'en' | 'gu' | 'hi';

export const LANGUAGES: { code: Language; label: string; nativeLabel: string; locale: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', locale: 'en-IN' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', locale: 'gu-IN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', locale: 'hi-IN' },
];

export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'gu' || value === 'hi';
}

export function toLanguage(value: string | undefined | null): Language {
  const base = (value ?? '').split('-')[0];
  return isLanguage(base) ? base : DEFAULT_LANGUAGE;
}

export function localeFor(language: Language): string {
  return LANGUAGES.find((l) => l.code === language)?.locale ?? 'en-IN';
}
