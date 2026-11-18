import { useTranslation } from 'react-i18next';
import { setLanguage } from '../lib/i18n';
import { toLanguage, Language } from '../constants/languages';

export function useLanguage() {
  const { i18n } = useTranslation();
  const language: Language = toLanguage(i18n.language);
  return { language, setLanguage };
}
