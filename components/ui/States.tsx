import { ActivityIndicator, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactNode } from 'react';

export function LoadingState({ label }: { label: string }) {
  return (
    <View accessibilityLiveRegion="polite" className="flex-1 items-center justify-center bg-surface p-6">
      <ActivityIndicator size="large" color="#1E3A8A" accessibilityLabel={label} />
      <Text className="text-xl text-gray-700 mt-4 text-center">{label}</Text>
    </View>
  );
}

type EmptyProps = { icon: keyof typeof Ionicons.glyphMap; title: string; hint?: string; action?: ReactNode };

export function EmptyState({ icon, title, hint, action }: EmptyProps) {
  return (
    <View className="bg-white rounded-card p-8 items-center border border-gray-200">
      <Ionicons name={icon} size={64} color="#6B7280" />
      <Text className="text-xl font-semibold text-ink mt-4 text-center">{title}</Text>
      {hint ? <Text className="text-lg text-gray-700 mt-2 text-center">{hint}</Text> : null}
      {action ? <View className="mt-5 self-stretch">{action}</View> : null}
    </View>
  );
}

export function Banner({ text, tone = 'warning' }: { text: string; tone?: 'warning' | 'info' }) {
  // Warning uses the closing/alert surface from PRODUCT.md 4 instead of a warm amber tint.
  const box = tone === 'warning' ? 'bg-closing-bg border-alert' : 'bg-blue-50 border-primary';
  return (
    <View accessibilityLiveRegion="polite" className={`flex-row items-center border-l-4 rounded-lg p-4 mb-4 ${box}`}>
      <Ionicons name={tone === 'warning' ? 'cloud-offline' : 'information-circle'} size={24} color="#111827" />
      <Text className="text-lg text-ink ml-3 flex-1">{text}</Text>
    </View>
  );
}
