import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import gu from './locales/gu';
import hi from './locales/hi';
import { DEFAULT_LANGUAGE, isLanguage, Language, toLanguage } from '../constants/languages';
import { getDeviceLanguage } from './deviceLanguage';
import { readString, writeString, STORAGE_KEYS } from './storage';

export const resources = {
  en: { translation: en },
  gu: { translation: gu },
  hi: { translation: hi },
} as const;

/**
 * Counts and scores are interpolated with i18next's built-in `number` formatter
 * (`{{count, number}}`), which uses `Intl.NumberFormat` for the active language. That keeps
 * Indian digit grouping (`1,234`) in every language without a custom hook.
 */
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: getDeviceLanguage(),
    // i18next resolves `gu-IN` -> `gu` and `hi-IN` -> `hi` on its own; `supportedLngs`
    // keeps an unsupported device locale from selecting a half-translated fallback chain.
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ['en', 'gu', 'hi'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    returnNull: false,
  });
}

/** Applies the language the user picked earlier (PRD 4.5: persists locally). */
export async function restoreSavedLanguage(): Promise<Language> {
  const saved = await readString(STORAGE_KEYS.language);
  if (isLanguage(saved) && saved !== i18n.language) {
    await i18n.changeLanguage(saved);
  }
  return toLanguage(i18n.language);
}

export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  await writeString(STORAGE_KEYS.language, language);
}

export default i18n;
