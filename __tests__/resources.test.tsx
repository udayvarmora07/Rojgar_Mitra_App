import { fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('../hooks/useLearningResources', () => ({
  useLearningResources: () => ({
    resources: [
      {
        id: 'r1',
        job_id: null,
        resource_type: 'AI_Test',
        link_or_content: 'practice:gk',
        title: 'General Knowledge practice test',
        description: '10 free questions in your language',
        language: null,
        topic: 'gk',
        sort_order: 10,
        created_at: '',
        jobs: null,
      },
      {
        id: 'r2',
        job_id: null,
        resource_type: 'Link',
        link_or_content: 'https://gpsc.gujarat.gov.in/',
        title: 'GPSC official website',
        description: null,
        language: null,
        topic: null,
        sort_order: 20,
        created_at: '',
        jobs: null,
      },
    ],
    loading: false,
    refreshing: false,
    offline: false,
    savedAt: null,
    refresh: jest.fn(),
  }),
}));

import i18n from '../lib/i18n';
import ResourcesScreen from '../app/resources';

beforeEach(async () => {
  mockPush.mockReset();
  await i18n.changeLanguage('en');
});

describe('Study material screen', () => {
  it('groups resources by type and keeps the type in the accessible name', () => {
    render(<ResourcesScreen />);

    expect(screen.getByText('Practice tests')).toBeTruthy();
    expect(screen.getByText('Official websites')).toBeTruthy();

    // The visible row no longer repeats the group heading, but a screen reader still hears it.
    expect(
      screen.getByRole('button', { name: 'Practice Test. General Knowledge practice test' })
    ).toBeTruthy();
  });

  it('opens a practice topic instead of a browser URL for AI_Test rows', () => {
    render(<ResourcesScreen />);

    fireEvent.press(
      screen.getByRole('button', { name: 'Practice Test. General Knowledge practice test' })
    );

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/practice/test/[category]',
      params: { category: 'gk', timed: '0' },
    });
  });
});
