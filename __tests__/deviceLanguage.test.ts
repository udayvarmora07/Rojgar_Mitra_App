const mockGetLocales = jest.fn();

jest.mock('expo-localization', () => ({
  getLocales: () => mockGetLocales(),
}));

import { getDeviceLanguage, languageFromTag } from '../lib/deviceLanguage';

beforeEach(() => {
  mockGetLocales.mockReset();
});

describe('languageFromTag', () => {
  it('accepts the three shipped languages in regional and underscored forms', () => {
    expect(languageFromTag('gu-IN')).toBe('gu');
    expect(languageFromTag('hi_IN')).toBe('hi');
    expect(languageFromTag('en')).toBe('en');
  });

  it('rejects unsupported, empty and null tags', () => {
    expect(languageFromTag('fr-FR')).toBeNull();
    expect(languageFromTag('')).toBeNull();
    expect(languageFromTag(null)).toBeNull();
  });
});

describe('getDeviceLanguage', () => {
  it('walks the ordered device preference list instead of only the first locale', () => {
    mockGetLocales.mockReturnValue([
      { languageTag: 'fr-FR', languageCode: 'fr' },
      { languageTag: 'hi-IN', languageCode: 'hi' },
    ]);
    expect(getDeviceLanguage()).toBe('hi');
  });

  it('uses the first supported locale', () => {
    mockGetLocales.mockReturnValue([
      { languageTag: 'gu-IN', languageCode: 'gu' },
      { languageTag: 'hi-IN', languageCode: 'hi' },
    ]);
    expect(getDeviceLanguage()).toBe('gu');
  });

  it('falls back to English when no device locale is supported', () => {
    mockGetLocales.mockReturnValue([{ languageTag: 'fr-FR', languageCode: 'fr' }]);
    expect(getDeviceLanguage()).toBe('en');
  });

  it('falls back to English when the platform call throws', () => {
    mockGetLocales.mockImplementation(() => {
      throw new Error('no localization');
    });
    expect(getDeviceLanguage()).toBe('en');
  });
});
