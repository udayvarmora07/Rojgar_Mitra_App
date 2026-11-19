import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

jest.mock('expo-router', () => ({
  // Run the focus effect like a mounted screen would; the panel loads its state there.
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(effect, [effect]);
  },
}));

import i18n from '../lib/i18n';
import {
  disableDeadlineReminder,
  loadDeadlineReminders,
  reminderDateFor,
  scheduleDeadlineReminder,
} from '../lib/deadlineReminders';
import { DeadlineReminderPanel } from '../components/jobs/DeadlineReminderPanel';

const getPermissions = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const cancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

const at = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h, 0, 0);
const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
};

beforeEach(async () => {
  jest.clearAllMocks();
  getPermissions.mockResolvedValue({ granted: true, canAskAgain: true });
  requestPermissions.mockResolvedValue({ granted: true, canAskAgain: true });
  await AsyncStorage.clear();
  await i18n.changeLanguage('en');
});

describe('when the deadline reminder should fire', () => {
  it('prefers 09:00 three days before the last date', () => {
    const result = reminderDateFor('2026-11-20', at(2026, 11, 10, 10));
    expect(result).toEqual({ kind: 'schedule', at: at(2026, 11, 17, 9) });
  });

  it('uses the next morning when the notice is closer than three days', () => {
    expect(reminderDateFor('2026-11-17', at(2026, 11, 15, 10))).toEqual({
      kind: 'schedule',
      at: at(2026, 11, 16, 9),
    });
  });

  it('still uses this morning before 09:00 on the day before the deadline', () => {
    expect(reminderDateFor('2026-11-17', at(2026, 11, 16, 8))).toEqual({
      kind: 'schedule',
      at: at(2026, 11, 16, 9),
    });
  });

  it('says too soon rather than scheduling after the deadline', () => {
    expect(reminderDateFor('2026-11-17', at(2026, 11, 16, 10))).toEqual({ kind: 'tooSoon' });
    expect(reminderDateFor('2026-11-17', at(2026, 11, 17, 10))).toEqual({ kind: 'tooSoon' });
  });

  it('reports an expired or unreadable deadline', () => {
    expect(reminderDateFor('2026-11-17', at(2026, 11, 18, 10))).toEqual({ kind: 'expired' });
    expect(reminderDateFor('not-a-date', at(2026, 11, 18, 10))).toEqual({ kind: 'invalid' });
  });
});

describe('deadline reminder scheduling', () => {
  const input = {
    jobId: 'job-1',
    jobTitle: 'Clerk',
    deadline: '2026-11-20',
    content: { title: 'Last date soon', body: 'Clerk closes on 20 Nov 2026.' },
    channelName: 'Deadline reminder',
    now: at(2026, 11, 10, 10),
  };

  it('schedules one dated notification under a stable identifier and remembers it', async () => {
    await expect(scheduleDeadlineReminder(input)).resolves.toBe('granted');

    expect(cancel).toHaveBeenCalledWith('deadline-job-1');
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'deadline-job-1',
        content: expect.objectContaining({
          title: 'Last date soon',
          body: 'Clerk closes on 20 Nov 2026.',
          data: { url: '/job/job-1' },
        }),
        trigger: expect.objectContaining({ type: 'date', date: at(2026, 11, 17, 9) }),
      })
    );

    const map = await loadDeadlineReminders(at(2026, 11, 10, 11));
    expect(map['job-1']).toMatchObject({
      jobId: 'job-1',
      deadline: '2026-11-20',
      scheduledFor: at(2026, 11, 17, 9).toISOString(),
    });
  });

  it('does not schedule when permission is refused', async () => {
    getPermissions.mockResolvedValue({ granted: false, canAskAgain: true });
    requestPermissions.mockResolvedValue({ granted: false, canAskAgain: false });

    await expect(scheduleDeadlineReminder(input)).resolves.toBe('denied');
    expect(schedule).not.toHaveBeenCalled();
  });

  it('does not schedule when there is no useful morning left', async () => {
    await expect(
      scheduleDeadlineReminder({ ...input, now: at(2026, 11, 19, 10) })
    ).resolves.toBe('tooSoon');
    expect(schedule).not.toHaveBeenCalled();
  });

  it('cancels and forgets the reminder when it is removed', async () => {
    await scheduleDeadlineReminder(input);
    await disableDeadlineReminder('job-1');

    expect(cancel).toHaveBeenCalledWith('deadline-job-1');
    const map = await loadDeadlineReminders(at(2026, 11, 10, 11));
    expect(map['job-1']).toBeUndefined();
  });

  it('drops records whose notice has closed', async () => {
    await scheduleDeadlineReminder(input);
    const map = await loadDeadlineReminders(at(2026, 11, 25, 11));
    expect(map['job-1']).toBeUndefined();
    expect(JSON.parse((await AsyncStorage.getItem('remind:v1:records')) ?? '{}')).toEqual({});
  });
});

describe('DeadlineReminderPanel', () => {
  const job = {
    id: 'job-1',
    title: 'Clerk',
    department: 'Revenue',
    post_date: '2026-01-01',
    deadline: daysFromNow(10),
    salary: null,
    source_link: null,
    vacancies: null,
    qualification: 'Graduate',
    advertisement_no: null,
    education_level: 'Graduate',
    location: 'Gandhinagar',
    created_at: '',
    updated_at: null,
  };

  it('names the date, schedules on tap, and can remove the reminder', async () => {
    render(<DeadlineReminderPanel job={job} />);

    const setButton = await screen.findByRole('button', { name: /Remind me on/ });
    fireEvent.press(setButton);

    await waitFor(() => expect(screen.getByText(/Reminder set for/)).toBeTruthy());
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'deadline-job-1' })
    );

    fireEvent.press(screen.getByRole('button', { name: 'Remove reminder' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Remind me on/ })).toBeTruthy()
    );
    expect(cancel).toHaveBeenCalledWith('deadline-job-1');
  });

  it('shows the blocked state with a way to the OS settings', async () => {
    getPermissions.mockResolvedValue({ granted: false, canAskAgain: false });
    render(<DeadlineReminderPanel job={job} />);

    await waitFor(() =>
      expect(screen.getByText(/Notifications are off for this app/)).toBeTruthy()
    );
    expect(screen.getByRole('button', { name: 'Open phone settings' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Remind me on/ })).toBeNull();
  });

  it('explains when the last date is too close to schedule anything', async () => {
    // "Today" is too late at every time of day; "tomorrow" is not, because before 09:00 a
    // reminder this morning is still before the deadline. The CI runner is UTC, so the test
    // must not depend on the wall clock.
    render(<DeadlineReminderPanel job={{ ...job, deadline: daysFromNow(0) }} />);

    await waitFor(() =>
      expect(screen.getByText(/too close to schedule a reminder/)).toBeTruthy()
    );
    expect(screen.queryByRole('button', { name: /Remind me on/ })).toBeNull();
  });

  it('renders nothing for a notice that has already closed', () => {
    const { toJSON } = render(
      <DeadlineReminderPanel job={{ ...job, deadline: daysFromNow(-1) }} />
    );
    expect(toJSON()).toBeNull();
  });
});
