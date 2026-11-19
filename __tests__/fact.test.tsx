import { fireEvent, render, screen } from '@testing-library/react-native';
import i18n from '../lib/i18n';
import { Fact } from '../components/ui/Card';

const longRequirement =
  'Bachelor degree plus a Divisional Officers Course or Fire Prevention Course from the ' +
  'National Fire Service College, Nagpur, or a direct Fire Engineering degree, with at ' +
  'least eight years of experience in a Fire Brigade field, including five years at ' +
  'Station Officer level, a valid heavy motor vehicle licence and basic computer knowledge.';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('Fact', () => {
  it('leaves a short value alone', () => {
    render(<Fact label="Location" value="Rajkot" />);
    expect(screen.getByText('Rajkot')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('collapses a long official requirement and brings it back on request', () => {
    render(<Fact label="Qualification" value={longRequirement} />);

    const show = screen.getByRole('button', { name: 'Show full text' });
    expect(show.props.accessibilityState).toMatchObject({ expanded: false });

    fireEvent.press(show);

    const hide = screen.getByRole('button', { name: 'Show less' });
    expect(hide.props.accessibilityState).toMatchObject({ expanded: true });
    // The value is never removed from the tree; only its visual line count changes.
    expect(screen.getByText(longRequirement)).toBeTruthy();
  });

  it('is translated', async () => {
    await i18n.changeLanguage('gu');
    render(<Fact label="લાયકાત" value={longRequirement} />);
    expect(screen.getByRole('button', { name: 'આખું લખાણ બતાવો' })).toBeTruthy();
    await i18n.changeLanguage('en');
  });
});
