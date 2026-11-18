import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: { name: string; titleKey: string; icon: IconName }[] = [
  { name: 'index', titleKey: 'tabHome', icon: 'home' },
  { name: 'jobs', titleKey: 'tabJobs', icon: 'briefcase' },
  { name: 'practice', titleKey: 'tabPractice', icon: 'school' },
  { name: 'settings', titleKey: 'tabSettings', icon: 'settings' },
];

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E3A8A',
        tabBarInactiveTintColor: '#4B5563',
        // Explicit lineHeight: without it descenders (g, j, p) are clipped on web/Android.
        tabBarLabelStyle: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
        // Tall tab bar: 48dp+ touch targets for every tab (PRD 13).
        tabBarStyle: { height: 76 + insets.bottom, paddingTop: 8, paddingBottom: 12 + insets.bottom },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarAccessibilityLabel: t(tab.titleKey),
            tabBarIcon: ({ color }) => <Ionicons name={tab.icon} size={28} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
