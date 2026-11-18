import { Text, View } from 'react-native';
import { ReactNode } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { curve, palette } from '../../constants/theme';

/**
 * Loading uses a still skeleton of the thing that is coming, not a spinner in the
 * middle of an empty screen. No shimmer: motion on a mid-range phone is delay.
 */
export function LoadingState({ label }: { label: string }) {
  return (
    <View accessibilityLiveRegion="polite" className="flex-1 bg-paper px-4 pt-5">
      <Text className="text-label text-ink-mute mb-4">{label}</Text>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} className="bg-card border border-rule rounded-card mb-3 p-4 flex-row">
          <View className="w-[68px] self-stretch rounded-[8px] bg-paper mr-4" />
          <View className="flex-1">
            <View className="h-4 bg-paper rounded-[4px] w-4/5 mb-2" />
            <View className="h-3 bg-paper rounded-[4px] w-3/5 mb-3" />
            <View className="h-3 bg-paper rounded-[4px] w-2/5" />
          </View>
        </View>
      ))}
    </View>
  );
}

type EmptyProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, hint, action }: EmptyProps) {
  return (
    <View className="bg-card rounded-card p-6 items-center border border-rule" style={curve}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="w-14 h-14 rounded-control bg-paper border border-rule items-center justify-center"
      >
        <Ionicons name={icon} size={30} color={palette.inkSoft} />
      </View>
      <Text className="text-[20px] leading-[26px] font-bold text-ink mt-4 text-center">{title}</Text>
      {hint ? <Text className="text-body text-ink-soft mt-2 text-center">{hint}</Text> : null}
      {action ? <View className="mt-5 self-stretch">{action}</View> : null}
    </View>
  );
}

export function Banner({
  text,
  tone = 'warning',
}: {
  text: string;
  tone?: 'warning' | 'info';
}) {
  const { t } = useTranslation();
  const label = tone === 'warning' ? t('offlineLabel') : t('noticeLabel');
  const stamp = tone === 'warning' ? 'bg-closing-bg border-closing-border text-closing-text' : 'bg-navy-tint border-navy-line text-navy';
  return (
    <View
      accessibilityLiveRegion="polite"
      className="bg-card border border-rule rounded-control p-3 mb-4 flex-row items-center"
    >
      <Ionicons
        name={tone === 'warning' ? 'cloud-offline-outline' : 'information-circle-outline'}
        size={22}
        color={tone === 'warning' ? palette.stamp : palette.navy}
      />
      <View className="ml-3 flex-1">
        <Text className={`text-[11px] font-extrabold uppercase tracking-stamp border rounded-[4px] self-start px-1.5 py-0.5 mb-1 ${stamp}`}>
          {label}
        </Text>
        <Text className="text-body text-ink leading-reading">{text}</Text>
      </View>
    </View>
  );
}

/** A small tabular caption for the bottom of a list. */
export function Footnote({ children }: { children: ReactNode }) {
  return (
    <Text className="text-label text-ink-mute text-center mt-2 mb-6 leading-reading">{children}</Text>
  );
}
