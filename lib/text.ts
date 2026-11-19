/**
 * Scraped notice text occasionally arrives with HTML character references intact, either
 * because the source double-encoded them (`&amp;rsquo;`) or because a one-off backfill wrote
 * raw cell text. A reader must never see `Bachelor&rsquo;s` where the notice says
 * "Bachelor's".
 *
 * Decoding happens in the data layer so every screen is covered at once, including text that
 * came from an older row. Links are deliberately not passed through this: an `&amp;` inside a
 * query string must stay encoded.
 */
const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  bull: '•',
  middot: '·',
  copy: '©',
  reg: '®',
  trade: '™',
  deg: '°',
  plusmn: '±',
  times: '×',
  divide: '÷',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  uuml: 'ü',
  ouml: 'ö',
};

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]{1,10});/gi, (match, body: string) => {
    if (body.startsWith('#')) {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED[body] ?? NAMED[body.toLowerCase()] ?? match;
  });
}

/** Decode a nullable text column without changing nulls. */
export function plainText(value: string | null): string | null {
  return value == null ? value : decodeHtmlEntities(value);
}
