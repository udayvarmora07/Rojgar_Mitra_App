import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, Language } from '../../constants/languages';
import { useLanguage } from '../../hooks/useLanguage';

/** Big tappable list of the three languages, each shown in its own script. */
export function LanguageOptions({ onSelected }: { onSelected?: (lang: Language) => void }) {
  const { language, setLanguage } = useLanguage();

  return (
    <View accessibilityRole="radiogroup">
      {LANGUAGES.map((lang) => {
        const selected = language === lang.code;
        return (
          <Pressable
            key={lang.code}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            accessibilityLabel={`${lang.nativeLabel} (${lang.label})`}
            onPress={async () => {
              await setLanguage(lang.code);
              onSelected?.(lang.code);
            }}
            className={`min-h-[64px] p-4 rounded-xl mb-3 flex-row items-center justify-between border-2 active:opacity-80 ${
              selected ? 'bg-blue-50 border-primary' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <View>
              <Text className="text-xl font-bold text-ink">{lang.nativeLabel}</Text>
              <Text className="text-lg text-gray-600">{lang.label}</Text>
            </View>
            {selected ? <Ionicons name="checkmark-circle" size={32} color="#047857" /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Header button (PRD 3.2: prominent toggle in header) that opens the language list. */
export function LanguageToggle() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('selectLanguage')}: ${current.nativeLabel}`}
        onPress={() => setOpen(true)}
        className="bg-blue-800 min-h-[48px] px-4 rounded-xl flex-row items-center border border-blue-300 active:opacity-80"
      >
        <Ionicons name="language" size={22} color="#FFFFFF" />
        <Text className="text-white text-lg font-semibold ml-2">{current.nativeLabel}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/60 justify-center px-5" onPress={() => setOpen(false)}>
          <Pressable className="bg-white rounded-card p-6" onPress={(e) => e.stopPropagation()}>
            <Text accessibilityRole="header" className="text-2xl font-bold text-ink mb-4">
              {t('selectLanguage')}
            </Text>
            <LanguageOptions onSelected={() => setOpen(false)} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              className="min-h-[56px] mt-2 rounded-xl bg-gray-200 items-center justify-center active:opacity-80"
            >
              <Text className="text-lg font-semibold text-ink">{t('close')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
