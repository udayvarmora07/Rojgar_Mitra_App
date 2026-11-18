import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './locales/en';
import gu from './locales/gu';
import hi from './locales/hi';
import { DEFAULT_LANGUAGE, isLanguage, Language, toLanguage } from '../constants/languages';
import { readString, writeString, STORAGE_KEYS } from './storage';

export const resources = {
  en: { translation: en },
  gu: { translation: gu },
  hi: { translation: hi },
} as const;

function getDeviceLanguage(): Language {
  try {
    const locales = Localization.getLocales();
    return toLanguage(locales?.[0]?.languageCode);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: getDeviceLanguage(),
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
