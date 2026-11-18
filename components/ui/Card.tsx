import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { curve } from '../../constants/theme';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View style={curve} className={`bg-card rounded-card p-5 mb-4 border border-rule ${className}`}>
      {children}
    </View>
  );
}

/** A labelled field from the notice, set as a register entry rather than a form. */
export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="py-3 border-b border-rule">
      <Text className="text-[11px] font-extrabold uppercase tracking-stamp text-ink-mute">{label}</Text>
      <Text className="text-body font-semibold text-ink mt-1 leading-reading">{value}</Text>
    </View>
  );
}
