import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { LearningResourceWithJob } from '../../lib/supabase';
import { palette } from '../../constants/theme';
import type { TranslationKey } from '../../lib/locales/en';

const ICONS: Record<LearningResourceWithJob['resource_type'], keyof typeof Ionicons.glyphMap> = {
  AI_Test: 'school-outline',
  PDF: 'document-text-outline',
  Video: 'play-circle-outline',
  Link: 'link-outline',
};

const LABEL_KEYS: Record<LearningResourceWithJob['resource_type'], TranslationKey> = {
  AI_Test: 'practiceTest',
  PDF: 'pdfLabel',
  Video: 'videoLabel',
  Link: 'linkLabel',
};

type Props = {
  resource: LearningResourceWithJob;
  onPress: () => void;
  /** Hairline between rows in a grouped list. */
  divided?: boolean;
};

/**
 * One study item. The type is written first as a micro label, then the title and the
 * source; the icon reinforces the type but never carries it alone.
 */
export function ResourceRow({ resource, onPress, divided = false }: Props) {
  const { t } = useTranslation();
  const typeLabel = t(LABEL_KEYS[resource.resource_type]);
  const source = resource.jobs?.title;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${typeLabel}. ${resource.title}`}
      accessibilityHint={
        resource.resource_type === 'AI_Test' ? t('startPractice') : t('openResource')
      }
      onPress={onPress}
      className={`min-h-[76px] px-4 py-3 flex-row items-center active:opacity-70 ${
        divided ? 'border-t border-rule' : ''
      }`}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="w-10 h-10 rounded-control bg-navy-tint border border-navy-line items-center justify-center"
      >
        <Ionicons name={ICONS[resource.resource_type]} size={22} color={palette.navy} />
      </View>
      <View className="flex-1 ml-3 pr-2">
        {source ? (
          <Text className="text-[13px] font-bold text-ink-mute" numberOfLines={1}>
            {source}
          </Text>
        ) : null}
        <Text
          className={`text-body font-bold text-ink ${source ? 'mt-0.5' : ''}`}
          numberOfLines={2}
        >
          {resource.title}
        </Text>
        {resource.description ? (
          <Text className="text-label text-ink-soft mt-0.5" numberOfLines={2}>
            {resource.description}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={resource.resource_type === 'AI_Test' ? 'chevron-forward' : 'open-outline'}
        size={20}
        color={palette.inkMute}
      />
    </Pressable>
  );
}
