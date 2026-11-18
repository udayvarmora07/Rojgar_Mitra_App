import * as Localization from 'expo-localization';
import { DEFAULT_LANGUAGE, Language } from '../constants/languages';

/** Maps a BCP 47 tag (`gu-IN`, `hi_IN`, `en`) to one of the dictionaries we ship. */
export function languageFromTag(tag: string | null | undefined): Language | null {
  const code = (tag ?? '').trim().toLowerCase().split(/[-_]/)[0];
  if (code === 'en' || code === 'gu' || code === 'hi') return code;
  return null;
}

/**
 * The device language list is ordered by preference. Walking it means a phone set to
 * French then Hindi still opens in Hindi instead of falling straight through to English.
 */
export function getDeviceLanguage(): Language {
  try {
    for (const locale of Localization.getLocales() ?? []) {
      const language = languageFromTag(locale.languageTag ?? locale.languageCode);
      if (language) return language;
    }
  } catch {
    // A platform without localization support falls through to the default language.
  }
  return DEFAULT_LANGUAGE;
}
