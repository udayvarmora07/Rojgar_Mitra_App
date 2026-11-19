import { buildNoticeShareText } from '../lib/share';
import { sourceHost } from '../lib/url';

describe('share text', () => {
  const base = {
    title: 'Clerk',
    department: 'Revenue Department',
    lastDateLabel: 'Last Date',
    lastDate: '18 Nov 2026',
    sourceLabel: 'Source',
    link: 'https://ojas.gujarat.gov.in/advt/123',
    footer: 'Always check the official notice before you apply.',
  };

  it('carries only facts already shown on the notice', () => {
    expect(buildNoticeShareText(base)).toBe(
      [
        'Clerk',
        'Revenue Department',
        'Last Date: 18 Nov 2026',
        'Source: https://ojas.gujarat.gov.in/advt/123',
        '',
        'Always check the official notice before you apply.',
      ].join('\n')
    );
  });

  it('omits the source line when the notice has no safe link', () => {
    const text = buildNoticeShareText({ ...base, link: null });
    expect(text).not.toContain('Source:');
    expect(text).toContain('Clerk');
    expect(text).toContain('Last Date: 18 Nov 2026');
  });

  it('drops a blank department instead of leaving an empty line', () => {
    const text = buildNoticeShareText({ ...base, department: '  ' });
    expect(text.startsWith('Clerk\nLast Date:')).toBe(true);
  });
});

describe('source host', () => {
  it('names the site without the www prefix', () => {
    expect(sourceHost('https://www.freejobalert.com/gujarat-government-jobs/')).toBe(
      'freejobalert.com'
    );
    expect(sourceHost('http://ojas.gujarat.gov.in/')).toBe('ojas.gujarat.gov.in');
  });

  it('refuses anything that is not a safe web link', () => {
    expect(sourceHost(null)).toBeNull();
    expect(sourceHost('javascript:alert(1)')).toBeNull();
    expect(sourceHost('not a url')).toBeNull();
    expect(sourceHost('ftp://example.com/file')).toBeNull();
  });
});
