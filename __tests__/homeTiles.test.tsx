import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

jest.mock('../hooks/useJobs', () => ({
  useJobs: () => ({
    jobs: [],
    loading: false,
    refreshing: false,
    offline: false,
    savedAt: null,
    refresh: jest.fn(),
  }),
}));

import i18n from '../lib/i18n';
import HomeScreen from '../app/(tabs)/index';

/** The fixed two-line label slot is the ancestor View that reserves the height. */
function labelSlot(label: string) {
  let node = screen.getByText(label).parent;
  while (node && !String(node.props.className ?? '').includes('h-[54px]')) node = node.parent;
  return node;
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('Home quick tiles', () => {
  it('gives all three tiles equal width and a shared baseline at 390 px', () => {
    render(<HomeScreen />);

    const labels = ['See Jobs', 'Practice Test', 'My Documents'];
    const sizeClasses = labels.map((label) => {
      const tile = screen.getByRole('button', { name: label });
      // Equal-width basis: each tile takes a third of the row and may not be widened by its text.
      expect(tile.props.className).toContain('flex-1');
      expect(tile.props.className).toContain('basis-0');
      expect(tile.props.className).toContain('min-w-0');
      // 2 px inner padding leaves 114 px for the label: "Documents" measures 102.4 px at 18 px bold.
      expect(tile.props.className).toContain('px-0.5');
      return tile.props.className.replace(label, '');
    });
    expect(new Set(sizeClasses).size).toBe(1);

    // A fixed two-line slot keeps the icons on one baseline when a label wraps.
    const long = screen.getByText('Practice Test');
    expect(long.props.numberOfLines).toBe(2);
    expect(long.props.className).toContain('leading-reading');
    expect(labelSlot('Practice Test')?.props.className).toContain('justify-center');
  });

  it('keeps the longer Gujarati labels inside the same two-line slot', async () => {
    await i18n.changeLanguage('gu');
    render(<HomeScreen />);

    for (const label of ['નોકરીઓ જુઓ', 'પ્રેક્ટિસ ટેસ્ટ', 'મારા દસ્તાવેજો']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    const long = screen.getByText('પ્રેક્ટિસ ટેસ્ટ');
    expect(long.props.numberOfLines).toBe(2);
    expect(labelSlot('પ્રેક્ટિસ ટેસ્ટ')).toBeTruthy();
  });
});
