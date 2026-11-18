import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => mockParams,
    // Screens are always "focused" in tests.
    useFocusEffect: (cb: () => void | (() => void)) => useEffect(cb, [cb]),
  };
});

jest.mock('../lib/supabase', () => ({
  getDocumentsRequired: jest.fn().mockResolvedValue([]),
  // The eligibility screen reads the notice's own qualification and age limit, so both
  // lookups have to resolve for the questions to render without the requirement line.
  getJobById: jest.fn().mockResolvedValue(null),
  getJobDetails: jest.fn().mockResolvedValue([]),
  supabase: { functions: { invoke: jest.fn().mockRejectedValue(new Error('offline')) } },
}));

import i18n from '../lib/i18n';
import EligibilityScreen from '../app/eligibility/[jobId]';
import DocumentChecklistScreen from '../app/documents/[phase]';
import PracticeTestScreen from '../app/practice/test/[category]';
import { loadHistory } from '../lib/testHistory';

beforeEach(async () => {
  mockPush.mockReset();
  await AsyncStorage.clear();
  await i18n.changeLanguage('en');
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('Eligibility screen', () => {
  beforeEach(() => {
    mockParams = { jobId: 'job-1' };
  });

  it('shows "may be eligible" after four yes answers', () => {
    render(<EligibilityScreen />);
    expect(screen.getByText('Answer all questions to see your result')).toBeTruthy();
    for (const q of [
      'Do you have the required education?',
      'Is your age within the age limit?',
      'Is your category (General/SC/ST/OBC/EWS) allowed?',
      'Do you have all the required documents?',
    ]) {
      fireEvent.press(screen.getByRole('radio', { name: `${q} Yes` }));
    }
    expect(screen.getByText('You may be eligible!')).toBeTruthy();
  });

  it('explains the next step for a "No" answer and links to documents', () => {
    render(<EligibilityScreen />);
    fireEvent.press(screen.getByRole('radio', { name: 'Do you have all the required documents? No' }));
    expect(screen.getByText('You may not be eligible')).toBeTruthy();
    expect(screen.getByText(/Make the missing documents first/)).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'View Document Checklist' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/documents', params: { jobId: 'job-1' } });
  });

  it('shows the notice own qualification and age limit beside the questions', async () => {
    const { getJobById, getJobDetails } = jest.requireMock('../lib/supabase') as {
      getJobById: jest.Mock;
      getJobDetails: jest.Mock;
    };
    getJobById.mockResolvedValue({ id: 'job-1', title: 'Clerk', qualification: 'Graduate' });
    getJobDetails.mockResolvedValue([
      { id: 'd1', job_id: 'job-1', age_limit: '18 to 24 Years', required_qualifications: 'Graduate' },
    ]);

    render(<EligibilityScreen />);
    // Without the notice's values the reader could not tell which education was required.
    await waitFor(() =>
      expect(screen.getByText('Age Limit: 18 to 24 Years')).toBeTruthy()
    );
    expect(screen.getByText('Required Qualification: Graduate')).toBeTruthy();
  });
});

describe('Document checklist screen', () => {
  it('uses the standard exam list and tracks progress', async () => {
    mockParams = { phase: 'exam' };
    render(<DocumentChecklistScreen />);
    await waitFor(() => expect(screen.getByText('5 documents still needed')).toBeTruthy());

    await act(async () => {
      fireEvent.press(screen.getByRole('checkbox', { name: 'Ballpoint Pen' }));
    });
    expect(screen.getByText('4 documents still needed')).toBeTruthy();
    expect(JSON.parse((await AsyncStorage.getItem('docs:v1:general:exam')) ?? '{}')).toEqual({ pen: true });
  });
});

describe('Practice test screen', () => {
  it('works fully offline with the question bank and saves the score', async () => {
    mockParams = { category: 'math', timed: '0' };
    render(<PracticeTestScreen />);
    await waitFor(() => expect(screen.getByText('No internet: showing saved practice questions')).toBeTruthy());

    // Answer Q1 correctly (B = 42), skip the rest, submit from the last question.
    fireEvent.press(screen.getByRole('radio', { name: 'B. 42' }));
    for (let i = 0; i < 3; i++) fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Submit' }));
    });

    expect(screen.getByText('1/4')).toBeTruthy();
    const history = await loadHistory();
    expect(history[0]).toMatchObject({ topic: 'math', score: 1, total: 4, timed: false });
  });
});
