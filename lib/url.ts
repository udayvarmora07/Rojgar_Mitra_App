/** Only http(s) links may be opened - job URLs come from scraped, untrusted data. */
export function isSafeWebUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^https?:\/\/[^\s]+$/i.test(url.trim());
}
