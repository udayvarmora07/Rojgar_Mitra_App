import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, Language } from '../../constants/languages';
import { palette, curve } from '../../constants/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { BottomSheet } from './BottomSheet';

/** The full language list, each language written in its own script. */
export function LanguageOptions({ onSelected }: { onSelected?: (lang: Language) => void }) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <View
      accessibilityRole="radiogroup"
      style={curve}
      className="border border-rule rounded-control overflow-hidden"
    >
      {LANGUAGES.map((lang, index) => {
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
            className={`min-h-[68px] px-4 py-3 flex-row items-center justify-between active:opacity-80 ${
              index > 0 ? 'border-t border-rule' : ''
            } ${selected ? 'bg-navy-tint' : 'bg-card'}`}
          >
            <View className="flex-1 pr-3">
              <Text className="text-[20px] leading-[26px] font-bold text-ink">{lang.nativeLabel}</Text>
              <Text className="text-label text-ink-soft">{lang.label}</Text>
            </View>
            {selected ? (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={22} color={palette.success} />
                <Text className="text-label font-bold text-navy ml-1">{t('selected')}</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={palette.inkMute} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compact masthead control: a globe and the language's own short mark. */
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
        className="bg-white/10 min-h-[48px] px-3.5 rounded-control flex-row items-center border border-navy-line active:opacity-80"
      >
        <Ionicons name="globe-outline" size={20} color={palette.card} />
        <Text className="text-white text-label font-bold ml-2">{current.short}</Text>
      </Pressable>

      <BottomSheet
        visible={open}
        title={t('selectLanguage')}
        closeLabel={t('close')}
        onClose={() => setOpen(false)}
      >
        <LanguageOptions onSelected={() => setOpen(false)} />
      </BottomSheet>
    </>
  );
}
