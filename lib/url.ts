/** Only http(s) links may be opened - job URLs come from scraped, untrusted data. */
export function isSafeWebUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^https?:\/\/[^\s]+$/i.test(url.trim());
}

/**
 * The site a notice came from, for the source line on the detail screen.
 *
 * `www.` is stripped because "freejobalert.com" is the name a reader recognises, and the
 * result is `null` for anything that is not a safe HTTP(S) URL so a malformed scraped link
 * can never be shown as a source.
 */
export function sourceHost(url: string | null | undefined): string | null {
  if (!isSafeWebUrl(url)) return null;
  try {
    const host = new URL(url.trim()).hostname.replace(/^www\./i, '');
    return host || null;
  } catch {
    return null;
  }
}
