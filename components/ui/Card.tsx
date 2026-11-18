import { ReactNode } from 'react';
import { Text, View } from 'react-native';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`bg-white rounded-card p-5 mb-4 border border-gray-200 ${className}`}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" className="text-xl font-bold text-ink mb-4">
      {children}
    </Text>
  );
}
