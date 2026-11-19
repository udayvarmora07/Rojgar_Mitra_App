import { freshnessOf } from '../lib/freshness';

const NOW = new Date(2026, 10, 19, 10, 0, 0);
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000).toISOString();

describe('freshnessOf', () => {
  it('returns nothing when the list has never been saved', () => {
    expect(freshnessOf(null, NOW)).toBeNull();
    expect(freshnessOf(undefined, NOW)).toBeNull();
    expect(freshnessOf('not-a-date', NOW)).toBeNull();
  });

  it('calls a check within five minutes "just now"', () => {
    expect(freshnessOf(minutesAgo(0), NOW)).toEqual({ kind: 'justNow' });
    expect(freshnessOf(minutesAgo(4), NOW)).toEqual({ kind: 'justNow' });
  });

  it('counts minutes up to an hour', () => {
    expect(freshnessOf(minutesAgo(5), NOW)).toEqual({ kind: 'minutes', minutes: 5 });
    expect(freshnessOf(minutesAgo(59), NOW)).toEqual({ kind: 'minutes', minutes: 59 });
  });

  it('uses calendar days, not 24-hour windows', () => {
    // 9 hours ago is still today; 11 hours ago crossed midnight into yesterday.
    expect(freshnessOf(new Date(2026, 10, 19, 1, 0, 0).toISOString(), NOW)).toEqual({
      kind: 'today',
    });
    expect(freshnessOf(new Date(2026, 10, 18, 23, 0, 0).toISOString(), NOW)).toEqual({
      kind: 'yesterday',
    });
  });

  it('falls back to a date beyond yesterday', () => {
    expect(freshnessOf(new Date(2026, 10, 15, 9, 0, 0).toISOString(), NOW)).toEqual({
      kind: 'date',
      at: new Date(2026, 10, 15, 9, 0, 0).toISOString(),
    });
  });

  it('never reports a negative age when the device clock is ahead', () => {
    expect(freshnessOf(new Date(NOW.getTime() + 60 * 60 * 1000).toISOString(), NOW)).toEqual({
      kind: 'justNow',
    });
  });
});
