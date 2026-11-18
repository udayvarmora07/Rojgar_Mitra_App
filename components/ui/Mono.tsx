import { Platform, Text, TextProps } from 'react-native';

const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
});

/**
 * Numerals that carry information: dates, counts, scores, reference numbers.
 * A monospaced face gives them a stable width so the layout does not jump when a
 * value changes, and sets them apart from the reading text without decoration.
 */
export function Mono({ style, ...rest }: TextProps) {
  return <Text {...rest} style={[{ fontFamily: MONO }, style]} />;
}
