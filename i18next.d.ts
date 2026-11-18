import 'i18next';
import type { TranslationShape } from './lib/locales/en';

/**
 * Makes `t('...')` reject a key that is not in the English source dictionary. Every
 * translation file is already typed as `TranslationShape`, so a key added to English
 * without a Gujarati/Hindi value still fails the i18n test; this catches typos at
 * compile time before that test runs.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: TranslationShape;
    };
  }
}
