import { decodeHtmlEntities, plainText } from '../lib/text';

describe('decodeHtmlEntities', () => {
  it('decodes the references that appear in scraped notices', () => {
    expect(decodeHtmlEntities('Bachelor&rsquo;s degree')).toBe('Bachelor’s degree');
    expect(decodeHtmlEntities('Fire &amp; Safety')).toBe('Fire & Safety');
    expect(decodeHtmlEntities('Employer&#39;s letter')).toBe("Employer's letter");
    expect(decodeHtmlEntities('Rs.1,00,000 &#x2014; revised')).toBe('Rs.1,00,000 — revised');
  });

  it('leaves ordinary ampersands and unknown names alone', () => {
    expect(decodeHtmlEntities('Pay and allowances')).toBe('Pay and allowances');
    expect(decodeHtmlEntities('Unknown &bogus; stays')).toBe('Unknown &bogus; stays');
    expect(decodeHtmlEntities('5 &lt; 10 &gt; 2')).toBe('5 < 10 > 2');
  });

  it('ignores numeric references that are not valid code points', () => {
    expect(decodeHtmlEntities('&#0;')).toBe('&#0;');
    expect(decodeHtmlEntities('&#x110000;')).toBe('&#x110000;');
  });

  it('keeps nulls', () => {
    expect(plainText(null)).toBeNull();
    expect(plainText('&amp;')).toBe('&');
  });
});
