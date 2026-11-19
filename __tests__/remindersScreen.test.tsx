import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  }),
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(effect, [effect]);
  },
}));

const mockLoad = jest.fn();
const mockDisable = jest.fn(async (_jobId: string) => {});

jest.mock('../lib/deadlineReminders', () => ({
  loadDeadlineReminders: () => mockLoad(),
  disableDeadlineReminder: (jobId: string) => mockDisable(jobId),
}));

import i18n from '../lib/i18n';
import RemindersScreen from '../app/reminders';

const record = {
  jobId: 'job-1',
  title: 'Clerk',
  deadline: '2099-01-01',
  scheduledFor: '2098-12-29T09:00:00.000Z',
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockDisable.mockResolvedValue(undefined);
  await i18n.changeLanguage('en');
});

describe('deadline reminders screen', () => {
  it('explains the empty state and offers the job list', async () => {
    mockLoad.mockResolvedValue({});
    render(<RemindersScreen />);

    await waitFor(() => expect(screen.getByText('No deadline reminders yet')).toBeTruthy());
    expect(screen.getByText(/Open a notice and set a reminder/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View All Jobs' })).toBeTruthy();
  });

  it('shows what is scheduled and removes it in one tap', async () => {
    mockLoad.mockResolvedValue({ 'job-1': record });
    render(<RemindersScreen />);

    await waitFor(() => expect(screen.getByText('Clerk')).toBeTruthy());
    expect(screen.getByText(/Last Date: 1 Jan 2099/)).toBeTruthy();
    expect(screen.getByText(/Reminder:/)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Remove reminder: Clerk' }));

    await waitFor(() => expect(screen.getByText('No deadline reminders yet')).toBeTruthy());
    expect(mockDisable).toHaveBeenCalledWith('job-1');
  });

  it('opens the notice the reminder belongs to', async () => {
    mockLoad.mockResolvedValue({ 'job-1': record });
    render(<RemindersScreen />);

    const row = await screen.findByRole('button', { name: /^Clerk, Last Date/ });
    fireEvent.press(row);
    expect(mockPush).toHaveBeenCalledWith('/job/job-1');
  });
});
