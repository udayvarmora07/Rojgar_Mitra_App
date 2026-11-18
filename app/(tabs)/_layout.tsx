import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View } from 'react-native';
import { palette } from '../../constants/theme';
import type { TranslationKey } from '../../lib/locales/en';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; titleKey: TranslationKey; icon: IconName; outline: IconName }[] = [
  { name: 'index', titleKey: 'tabHome', icon: 'home', outline: 'home-outline' },
  { name: 'jobs', titleKey: 'tabJobs', icon: 'briefcase', outline: 'briefcase-outline' },
  { name: 'practice', titleKey: 'tabPractice', icon: 'school', outline: 'school-outline' },
  { name: 'settings', titleKey: 'tabSettings', icon: 'settings', outline: 'settings-outline' },
];

/**
 * The tab bar behaves like the index tabs on a file: a thin vermilion mark above
 * the active tab, a filled icon, and a navy label. Inactive tabs stay quiet grey so
 * the current location is never ambiguous.
 */
export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.navy,
        tabBarInactiveTintColor: palette.inkMute,
        tabBarLabelStyle: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
        tabBarStyle: {
          height: 74 + insets.bottom,
          paddingTop: 4,
          paddingBottom: 6 + insets.bottom,
          backgroundColor: palette.card,
          borderTopColor: palette.rule,
          borderTopWidth: 1,
          ...(Platform.OS === 'web'
            ? { maxWidth: 600, width: '100%', alignSelf: 'center' as const }
            : {}),
        },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarHideOnKeyboard: true,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarAccessibilityLabel: t(tab.titleKey),
            tabBarIcon: ({ color, focused }) => (
              <View className="items-center">
                <View className={`h-[3px] w-6 rounded-full mb-1 ${focused ? 'bg-stamp' : 'bg-transparent'}`} />
                <Ionicons name={focused ? tab.icon : tab.outline} size={24} color={color} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
