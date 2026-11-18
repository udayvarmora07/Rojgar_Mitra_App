import en from '../lib/locales/en';
import gu from '../lib/locales/gu';
import hi from '../lib/locales/hi';
import i18n from '../lib/i18n';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
  }, {});
}

// Matches both `{{count}}` and formatted placeholders such as `{{count, number}}`.
const placeholders = (s: string) =>
  Array.from(s.matchAll(/{{\s*([\w.]+)(?:\s*,\s*[\w]+)?\s*}}/g), (m) => m[1]).sort();

describe('translations', () => {
  const base = flatten(en as unknown as Tree);

  it.each([
    ['gu', gu],
    ['hi', hi],
  ])('%s has every key, no blanks, and the same {{placeholders}}', (_lang, dict) => {
    const other = flatten(dict as unknown as Tree);
    expect(Object.keys(other).sort()).toEqual(Object.keys(base).sort());
    for (const [key, value] of Object.entries(other)) {
      expect(value.trim()).not.toBe('');
      expect({ key, p: placeholders(value) }).toEqual({ key, p: placeholders(base[key]) });
    }
  });

  it('Gujarati and Hindi strings are actually in their own scripts', () => {
    expect(gu.welcome).toMatch(/[઀-૿]/);
    expect(hi.welcome).toMatch(/[ऀ-ॿ]/);
  });

  it('pluralises and interpolates', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('daysLeft', { count: 1 })).toBe('1 day left');
    expect(i18n.t('daysLeft', { count: 3 })).toBe('3 days left');
    await i18n.changeLanguage('gu');
    expect(i18n.t('readyCount', { done: 2, total: 9 })).toBe('9 માંથી 2 તૈયાર');
    await i18n.changeLanguage('en');
  });

  it('groups digits with the reader locale in all three languages', async () => {
    for (const language of ['en', 'gu', 'hi'] as const) {
      await i18n.changeLanguage(language);
      expect(i18n.t('jobsCount', { count: 1234 })).toContain('1,234');
    }
    await i18n.changeLanguage('en');
  });

  it('pluralises Gujarati correctly', async () => {
    await i18n.changeLanguage('gu');
    // CLDR: gu and hi use the `one` form for 0 and 1, `other` from 2 onwards.
    expect(i18n.t('jobsCount', { count: 1 })).toBe('1 નોકરી');
    expect(i18n.t('jobsCount', { count: 2 })).toBe('2 નોકરીઓ');
    await i18n.changeLanguage('en');
  });

  it('keeps a regional device tag on the right language', async () => {
    await i18n.changeLanguage('gu-IN');
    expect(i18n.t('tabHome')).toBe('ઘર');
    await i18n.changeLanguage('hi-IN');
    expect(i18n.t('tabHome')).toBe('होम');
    await i18n.changeLanguage('en');
  });
});
