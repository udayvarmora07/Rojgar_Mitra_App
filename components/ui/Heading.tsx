import { ReactNode } from 'react';
import { Platform, Text, type TextProps } from 'react-native';

type HeadingProps = TextProps & {
  /** 1 for a screen title, 2 for a section inside it. */
  level?: 1 | 2;
  children: ReactNode;
};

/**
 * A real heading for assistive technology.
 *
 * Native screen readers use the header trait; the web needs a level as well, otherwise
 * every heading is an `<h1>` and a screen-reader user cannot jump between sections.
 * `aria-level` is supported by react-native-web but is not part of React Native's own
 * types, so the web-only prop is isolated here instead of leaking into every screen.
 */
export function Heading({ level = 2, children, ...rest }: HeadingProps) {
  return (
    <Text
      accessibilityRole="header"
      {...(Platform.OS === 'web'
        ? ({ 'aria-level': level } as unknown as TextProps)
        : {})}
      {...rest}
    >
      {children}
    </Text>
  );
}
