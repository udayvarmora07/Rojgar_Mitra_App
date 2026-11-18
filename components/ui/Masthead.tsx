import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { curve, palette } from '../../constants/theme';
import { Mono } from './Mono';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  children?: ReactNode;
  /** Small line above the title. Defaults to the app name. */
  kicker?: string;
  size?: 'display' | 'title';
};

/**
 * The masthead is the one place the brand speaks: a deep ink field, a file-header
 * monogram, and a single vermilion rule along the bottom edge. It behaves like the
 * header of an official notice rather than a website hero.
 */
export function Masthead({
  title,
  subtitle,
  onBack,
  right,
  children,
  kicker,
  size = 'title',
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View className="bg-navy" style={{ paddingTop: insets.top }}>
      <View className="w-full max-w-[600px] self-center px-5 pb-5 pt-3">
        <View className="flex-row items-center justify-between">
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('back')}
              onPress={onBack}
              className="flex-row items-center min-h-[48px] -ml-2 pl-2 pr-3 active:opacity-70"
            >
              <Ionicons name="arrow-back" size={24} color={palette.card} />
              <Text className="text-white text-label font-semibold ml-1">{t('back')}</Text>
            </Pressable>
          ) : (
            <View className="flex-row items-center flex-1 pr-3">
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={curve}
                className="w-10 h-10 rounded-stub border border-navy-line items-center justify-center mr-3"
              >
                <Mono className="text-white text-label font-bold">RM</Mono>
              </View>
              <Text
                numberOfLines={1}
                className="flex-1 text-navy-line text-micro font-bold uppercase tracking-stamp"
              >
                {kicker ?? t('appName')}
              </Text>
            </View>
          )}
          {right}
        </View>

        <Text
          accessibilityRole="header"
          className={`text-white font-extrabold tracking-tight ${
            size === 'display' ? 'text-display mt-4' : 'text-title mt-3'
          }`}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-navy-line text-body mt-1 leading-reading">{subtitle}</Text>
        ) : null}
        {children}
      </View>
      <View className="h-[3px] bg-stamp" />
    </View>
  );
}
