import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import i18n from '../lib/i18n';
import {
  disableDocumentReminder,
  enableDocumentReminder,
  getReminderPermission,
  isInternalRoute,
  loadReminderEnabled,
  reminderTimeLabel,
  saveReminderEnabled,
  syncDocumentReminder,
} from '../lib/reminders';
import { DocumentReminderPanel } from '../components/documents/DocumentReminderPanel';

const content = {
  title: 'Document reminders',
  body: '3 documents still needed',
  channelName: 'Document reminders',
};

const getPermissions = Notifications.getPermissionsAsync as jest.Mock;
const requestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const cancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  getPermissions.mockResolvedValue({ granted: true, canAskAgain: true });
  requestPermissions.mockResolvedValue({ granted: true, canAskAgain: true });
  await AsyncStorage.clear();
  await i18n.changeLanguage('en');
});

describe('document reminders', () => {
  it('schedules one daily 09:00 notification under a stable identifier', async () => {
    await expect(enableDocumentReminder(content)).resolves.toBe('granted');
    expect(cancel).toHaveBeenCalledWith('documents-reminder');
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'documents-reminder',
        content: expect.objectContaining({
          title: content.title,
          body: content.body,
          data: { url: '/documents' },
        }),
        trigger: expect.objectContaining({ type: 'daily', hour: 9, minute: 0 }),
      })
    );
  });

  it('does not schedule when permission is refused, and reports the refusal', async () => {
    getPermissions.mockResolvedValue({ granted: false, canAskAgain: true });
    requestPermissions.mockResolvedValue({ granted: false, canAskAgain: false });

    await expect(enableDocumentReminder(content)).resolves.toBe('denied');
    expect(schedule).not.toHaveBeenCalled();

    getPermissions.mockResolvedValue({ granted: false, canAskAgain: false });
    await expect(getReminderPermission()).resolves.toBe('denied');
  });

  it('persists the choice and cancels the schedule when turned off', async () => {
    await saveReminderEnabled(true);
    await expect(loadReminderEnabled()).resolves.toBe(true);

    await disableDocumentReminder();
    expect(cancel).toHaveBeenCalledWith('documents-reminder');
    await expect(loadReminderEnabled()).resolves.toBe(false);
  });

  it('cancels while nothing is pending, and re-schedules when something is', async () => {
    await syncDocumentReminder({ ...content, enabled: true, pending: 0 });
    expect(cancel).toHaveBeenCalledWith('documents-reminder');
    expect(schedule).not.toHaveBeenCalled();

    await syncDocumentReminder({ ...content, enabled: true, pending: 4 });
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it('formats the reminder time in the reader locale', () => {
    expect(reminderTimeLabel('en')).toMatch(/9:00/);
  });

  it('only follows internal paths from a notification payload', () => {
    expect(isInternalRoute('/job/abc')).toBe(true);
    expect(isInternalRoute('/documents')).toBe(true);
    expect(isInternalRoute('/jobs?education=Graduate')).toBe(true);
    expect(isInternalRoute('https://evil.example/')).toBe(false);
    expect(isInternalRoute('//evil.example/')).toBe(false);
    expect(isInternalRoute('/\\evil.example')).toBe(false);
    expect(isInternalRoute(' /documents')).toBe(false);
    expect(isInternalRoute(null)).toBe(false);
    expect(isInternalRoute(42)).toBe(false);
  });
});

describe('DocumentReminderPanel', () => {
  it('turns the daily reminder on with one tap and shows the schedule', async () => {
    render(<DocumentReminderPanel pending={3} />);

    fireEvent.press(await screen.findByRole('switch', { name: 'Document reminders' }));

    await waitFor(() => expect(screen.getByText(/Every day at 9:00/)).toBeTruthy());
    expect(await loadReminderEnabled()).toBe(true);
    expect(schedule).toHaveBeenCalled();
  });

  it('shows the paused state when every document is ready', async () => {
    await saveReminderEnabled(true);
    render(<DocumentReminderPanel pending={0} />);

    await waitFor(() => expect(screen.getByText('Paused. All documents are ready.')).toBeTruthy());
    expect(screen.getByRole('switch', { name: 'Document reminders' }).props.accessibilityState)
      .toMatchObject({ checked: true });
    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledWith('documents-reminder');
  });

  it('names the blocked state instead of leaving a dead switch', async () => {
    getPermissions.mockResolvedValue({ granted: false, canAskAgain: false });
    render(<DocumentReminderPanel pending={3} />);

    await waitFor(() =>
      expect(screen.getByText(/Notifications are off for this app/)).toBeTruthy()
    );
    expect(screen.getByRole('button', { name: 'Open phone settings' })).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: 'Document reminders' }).props.accessibilityState
    ).toMatchObject({ checked: false, disabled: true });
  });

  it('disables the switch on a platform without local notifications', async () => {
    const platform = jest.requireActual<typeof import('react-native')>('react-native')
      .Platform as { OS: string };
    const original = platform.OS;
    platform.OS = 'web';
    try {
      render(<DocumentReminderPanel pending={3} />);
      await waitFor(() =>
        expect(screen.getByText('Document reminders work in the mobile app.')).toBeTruthy()
      );
      const control = screen.getByRole('switch', { name: 'Document reminders' });
      expect(control.props.accessibilityState).toMatchObject({ checked: false, disabled: true });
      fireEvent.press(control);
      expect(schedule).not.toHaveBeenCalled();
    } finally {
      platform.OS = original;
    }
  });
});
