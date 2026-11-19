import { fireEvent, render, screen } from '@testing-library/react-native';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn(), push: jest.fn(), canGoBack: () => true }),
}));

import i18n from '../lib/i18n';
import { ErrorScreen } from '../components/ui/ErrorScreen';

beforeEach(async () => {
  mockReplace.mockReset();
  await i18n.changeLanguage('en');
});

describe('crash recovery screen', () => {
  it('explains that saved jobs are safe and offers both ways out', () => {
    render(<ErrorScreen message="Cannot read property 'x' of undefined" onRetry={jest.fn()} />);

    expect(screen.getByText('This page could not open')).toBeTruthy();
    expect(screen.getByText(/saved jobs are still on this phone/i)).toBeTruthy();
    expect(screen.getByText("Cannot read property 'x' of undefined")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go to Home' })).toBeTruthy();
  });

  it('retries where the reader was, and goes home without a history trap', () => {
    const onRetry = jest.fn();
    render(<ErrorScreen onRetry={onRetry} />);

    fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Go to Home' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('is translated, not hard-coded English', async () => {
    await i18n.changeLanguage('gu');
    render(<ErrorScreen onRetry={jest.fn()} />);
    expect(screen.getByText('આ પાનું ખૂલી શક્યું નથી')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ફરી પ્રયત્ન કરો' })).toBeTruthy();
    await i18n.changeLanguage('en');
  });
});
