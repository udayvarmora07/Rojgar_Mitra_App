import { compareNames, formatNumber, formatPercent, formatScore } from '../lib/format';
import { formatDate, dateParts } from '../lib/deadline';
import i18n from '../lib/i18n';
import { LANGUAGES, localeFor, toLanguage } from '../constants/languages';

describe('locale-aware numbers', () => {
  it('groups digits with Indian grouping in every supported language', () => {
    expect(formatNumber(1234567, 'en')).toBe('12,34,567');
    expect(formatNumber(1234567, 'gu')).toBe('12,34,567');
    expect(formatNumber(1234567, 'hi')).toBe('12,34,567');
  });

  it('formats a score on both sides so one side never loses grouping', () => {
    expect(formatScore(7, 10, 'gu')).toBe('7/10');
    expect(formatScore(1200, 2000, 'hi')).toBe('1,200/2,000');
  });

  it('formats percentages without fractional noise', () => {
    expect(formatPercent(2 / 3, 'en')).toBe('67%');
    expect(formatPercent(1, 'gu')).toBe('100%');
    expect(formatPercent(0, 'hi')).toBe('0%');
  });

  it('falls back to a plain number if Intl throws for the locale', () => {
    const original = Intl.NumberFormat;
    // Simulate a device whose Intl cannot handle the locale at all.
    (Intl as unknown as { NumberFormat: unknown }).NumberFormat = function () {
      throw new RangeError('unsupported locale');
    } as unknown as typeof Intl.NumberFormat;

    try {
      expect(formatNumber(1234, 'gu')).toBe('1234');
      expect(formatScore(3, 4, 'hi')).toBe('3/4');
    } finally {
      (Intl as unknown as { NumberFormat: unknown }).NumberFormat = original;
    }
  });
});

describe('locale-aware collation', () => {
  it('sorts Gujarati and Hindi names in script order, not code-point order', () => {
    const gujarati = ['ગુજરાત', 'અમદાવાદ', 'સુરત'].sort((a, b) => compareNames(a, b, 'gu'));
    expect(gujarati).toEqual(['અમદાવાદ', 'ગુજરાત', 'સુરત']);

    const hindi = ['गुजरात', 'अहमदाबाद', 'सूरत'].sort((a, b) => compareNames(a, b, 'hi'));
    expect(hindi).toEqual(['अहमदाबाद', 'गुजरात', 'सूरत']);
  });
});

describe('locale-aware dates', () => {
  it('renders Gujarati and Hindi month names from Intl', () => {
    expect(formatDate('2026-11-18', 'gu', 'long')).toContain('નવેમ્બર');
    expect(formatDate('2026-11-18', 'hi', 'long')).toContain('नवंबर');
    expect(formatDate('2026-11-18', 'en', 'long')).toContain('November');
  });

  it('keeps the product date order when Intl data is missing', () => {
    const spy = jest.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
      throw new RangeError('no locale data');
    });

    try {
      // Not a raw ISO string: the reader still sees a human date.
      expect(formatDate('2026-11-18', 'gu', 'short')).toBe('18 Nov 2026');
      expect(formatDate('2026-11-18', 'gu', 'long')).toBe('18 November 2026');
      expect(dateParts('2026-11-18', 'gu')).toEqual({
        day: '18',
        month: 'Nov',
        year: '2026',
        weekday: 'Wed',
      });
    } finally {
      spy.mockRestore();
    }
  });
});

describe('Interpolated counts', () => {
  it('formats numbers inside translations and leaves text untouched', async () => {
    await i18n.changeLanguage('gu');
    expect(i18n.t('jobsCount', { count: 1234 })).toBe('1,234 નોકરીઓ');
    // A string placeholder is not a number and must pass through unchanged.
    expect(i18n.t('lastUpdated', { date: '18 Nov 2026' })).toBe('છેલ્લે અપડેટ: 18 Nov 2026');
    await i18n.changeLanguage('en');
  });
});

describe('locale mapping', () => {
  it('maps every supported language to an Indian locale tag', () => {
    for (const entry of LANGUAGES) {
      expect(localeFor(entry.code)).toBe(entry.locale);
      expect(entry.locale).toMatch(/-(IN|GJ)$/);
    }
  });

  it('accepts regional and script device tags', () => {
    expect(toLanguage('gu-IN')).toBe('gu');
    expect(toLanguage('hi-IN')).toBe('hi');
    expect(toLanguage('gu-Gujr-IN')).toBe('gu');
    expect(toLanguage('pa-IN')).toBe('en');
  });
});
