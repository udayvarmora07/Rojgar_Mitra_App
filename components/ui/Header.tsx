import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  children?: ReactNode;
};

export function Header({ title, subtitle, onBack, right, children }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View className="bg-primary px-5 pb-5" style={{ paddingTop: insets.top + 12 }}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          onPress={onBack}
          className="flex-row items-center min-h-[48px] self-start pr-4 mb-1 active:opacity-70"
        >
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
          <Text className="text-white text-lg ml-2">{t('back')}</Text>
        </Pressable>
      ) : null}
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text accessibilityRole="header" className="text-3xl font-bold text-white">
            {title}
          </Text>
          {subtitle ? <Text className="text-lg text-blue-100 mt-1">{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}
