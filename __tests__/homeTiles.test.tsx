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

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('Home quick actions', () => {
  it('leads with the jobs action, then two peer actions of equal width', () => {
    render(<HomeScreen />);

    expect(screen.getByText('What do you want to do?')).toBeTruthy();

    // The primary action states what is inside, not just where it goes.
    const jobs = screen.getByRole('button', { name: /See Jobs/ });
    expect(jobs.props.className).toContain('bg-navy');

    const practice = screen.getByRole('button', { name: /Practice Test/ });
    const documents = screen.getByRole('button', { name: /My Documents/ });

    for (const card of [practice, documents]) {
      expect(card.props.className).toContain('flex-1');
      expect(card.props.className).toContain('basis-0');
      expect(card.props.className).toContain('min-w-0');
    }
    // Same width recipe for both, so translations cannot push one wider.
    expect(practice.props.className.replace(/Practice Test.*/, '')).toBe(
      documents.props.className.replace(/My Documents.*/, '')
    );
  });

  it('keeps the longer Gujarati labels intact', async () => {
    await i18n.changeLanguage('gu');
    render(<HomeScreen />);

    for (const label of ['નોકરીઓ જુઓ', 'પ્રેક્ટિસ ટેસ્ટ', 'મારા દસ્તાવેજો']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
