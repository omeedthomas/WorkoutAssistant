import { describe, expect, it } from 'vitest';
import { formatCountdown } from './format';

describe('formatCountdown', () => {
  const s = 1000;
  const m = 60 * s;
  const h = 60 * m;

  it('shows days and hours far out, hours and minutes on the day, and seconds in the last hour', () => {
    expect(formatCountdown(2 * 24 * h + 5 * h + 30 * m)).toBe('2d 5h');
    expect(formatCountdown(5 * h + 12 * m + 40 * s)).toBe('5h 12m');
    expect(formatCountdown(12 * m + 30 * s)).toBe('12m 30s');
  });

  it('never goes negative', () => {
    expect(formatCountdown(-5000)).toBe('0m 0s');
  });
});
