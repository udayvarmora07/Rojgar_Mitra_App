import { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * The app frame. Phone-first, but on a desktop browser the column stays readable
 * instead of stretching cards across the whole window.
 */
export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View role="main" className={`flex-1 bg-paper ${className}`}>
      <View className="w-full max-w-[600px] self-center flex-1 bg-paper md:border-x md:border-rule">
        {children}
      </View>
    </View>
  );
}
