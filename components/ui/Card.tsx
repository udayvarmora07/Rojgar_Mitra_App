import { ReactNode, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { curve } from '../../constants/theme';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View style={curve} className={`bg-card rounded-card p-5 mb-4 border border-rule ${className}`}>
      {children}
    </View>
  );
}

/** Above this, the value is a paragraph, not a field. */
const LONG_VALUE = 240;
const COLLAPSED_LINES = 5;

/**
 * A labelled field from the notice, set as a register entry rather than a form.
 *
 * Scraped requirements can run to several hundred characters. Collapsing them keeps the
 * next section reachable, but the full official wording is never removed: the control says
 * "Show full text", the expanded state is announced, and the value's accessible label always
 * carries the complete text.
 */
export function Fact({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const long = value.length > LONG_VALUE;

  return (
    <View className="py-3 border-b border-rule">
      <Text className="text-[11px] font-extrabold uppercase tracking-stamp text-ink-mute">{label}</Text>
      <Text
        accessibilityLabel={value}
        numberOfLines={long && !expanded ? COLLAPSED_LINES : undefined}
        className="text-body font-semibold text-ink mt-1 leading-reading"
      >
        {value}
      </Text>
      {long ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? t('showLess') : t('showFullText')}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((current) => !current)}
          className="min-h-[48px] justify-center self-start pr-4 active:opacity-70"
        >
          <Text className="text-label font-bold text-navy">
            {expanded ? t('showLess') : t('showFullText')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
