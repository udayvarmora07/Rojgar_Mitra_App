import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { curve, palette } from '../../constants/theme';
import { EducationLevel, EDUCATION_LEVELS, educationLabelKey } from '../../constants/education';
import { Mono } from '../ui/Mono';

type Props = {
  counts: Record<EducationLevel, number>;
  departmentCount: number;
  onSelectEducation: (level: EducationLevel) => void;
  onSelectDepartments: () => void;
};

/**
 * The home catalogue: two columns of ruled index entries, one per education level that
 * currently has an open notice. A single card, not six floating cards, so the shortcuts
 * read as a register rather than a dashboard.
 */
export function CategoryBoard({
  counts,
  departmentCount,
  onSelectEducation,
  onSelectDepartments,
}: Props) {
  const { t } = useTranslation();
  const levels = EDUCATION_LEVELS.filter((level) => counts[level.value] > 0);

  if (levels.length === 0) return null;

  return (
    <View style={curve} className="bg-card border border-rule rounded-card overflow-hidden">
      <View className="flex-row flex-wrap">
        {levels.map((level, index) => {
          const lastOdd = levels.length % 2 === 1 && index === levels.length - 1;
          const rightColumn = index % 2 === 1;
          return (
            <Pressable
              key={level.value}
              accessibilityRole="button"
              accessibilityLabel={`${t(educationLabelKey(level.value))}. ${t('jobsCount', {
                count: counts[level.value],
              })}`}
              onPress={() => onSelectEducation(level.value)}
              className={`${lastOdd ? 'w-full' : 'w-1/2'} min-h-[76px] px-4 py-3 border-b border-rule active:opacity-70 ${
                !lastOdd && !rightColumn ? 'border-r' : ''
              }`}
            >
              <Text className="text-body font-bold text-ink" numberOfLines={1}>
                {t(educationLabelKey(level.value))}
              </Text>
              <View className="flex-row items-center justify-between mt-1">
                <Text className="text-label text-ink-mute">
                  {t('jobsCount', { count: counts[level.value] })}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={palette.inkMute} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('allDepartments')}. ${t('departmentsCount', {
          count: departmentCount,
        })}`}
        accessibilityHint={t('departmentFilterHint')}
        onPress={onSelectDepartments}
        className="min-h-[68px] px-4 py-3 flex-row items-center active:opacity-70"
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="w-10 h-10 rounded-control bg-navy-tint border border-navy-line items-center justify-center"
        >
          <Ionicons name="business-outline" size={22} color={palette.navy} />
        </View>
        <View className="flex-1 ml-3 pr-2">
          <Text className="text-body font-bold text-ink">{t('allDepartments')}</Text>
          <Text className="text-label text-ink-mute">
            {t('departmentsCount', { count: departmentCount })}
          </Text>
        </View>
        <Mono className="text-label text-ink-mute mr-2">{departmentCount}</Mono>
        <Ionicons name="chevron-forward" size={18} color={palette.inkMute} />
      </Pressable>
    </View>
  );
}
