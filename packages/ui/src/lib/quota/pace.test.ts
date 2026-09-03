import { describe, expect, test } from 'bun:test';

import {
  computePaceDelta,
  formatPaceAriaLabel,
  formatPaceDelta,
  getPaceDisplayMagnitude,
  resolvePaceTone,
} from './pace';
import { formatMessage } from '@/lib/i18n/store';
import { dict as enDict } from '@/lib/i18n/messages/en';
import type { UsageWindow } from '@/types';

const FIVE_HOURS = 5 * 60 * 60;
const SEVEN_DAYS = 7 * 24 * 60 * 60;

/** A 7-day window resetting at `resetAt` (ms). */
const weeklyWindow = (usedPercent: number | null, resetAt: number | null, windowSeconds: number | null = SEVEN_DAYS): UsageWindow => ({
  usedPercent,
  remainingPercent: usedPercent === null ? null : 100 - usedPercent,
  windowSeconds,
  resetAfterSeconds: resetAt === null ? null : (resetAt - resetAt) / 1000,
  resetAt,
  resetAtFormatted: null,
  resetAfterFormatted: null,
});

describe('computePaceDelta', () => {
  const resetAt = 7 * 24 * 60 * 60 * 1000; // end of the 7-day window, in a clean epoch
  const windowStart = resetAt - SEVEN_DAYS * 1000;

  test('is zero exactly at window start', () => {
    expect(Math.abs(computePaceDelta(weeklyWindow(0, resetAt), windowStart)!)).toBeLessThan(1e-9);
  });

  test('is 0 at a second-level intermediate point on exact pace', () => {
    // Two days in: elapsed 28.57%. Usage exactly on pace.
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const now = windowStart + twoDaysMs;
    const delta = computePaceDelta(weeklyWindow((2 / 7) * 100, resetAt), now);
    expect(delta).not.toBeNull();
    expect(Math.abs(delta!)).toBeLessThan(0.001);
  });

  test('is positive when usage is ahead of elapsed time (2 days in, 40% used)', () => {
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const now = windowStart + twoDaysMs;
    const delta = computePaceDelta(weeklyWindow(40, resetAt), now);
    expect(delta).not.toBeNull();
    expect(Math.abs(delta! - (40 - (2 / 7) * 100))).toBeLessThan(1e-6);
  });

  test('is negative when usage is behind elapsed time', () => {
    const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
    const now = windowStart + fiveDaysMs;
    const delta = computePaceDelta(weeklyWindow(30, resetAt), now);
    expect(delta).not.toBeNull();
    expect(Math.abs(delta! - (30 - (5 / 7) * 100))).toBeLessThan(1e-6);
    expect(delta!).toBeLessThan(0);
  });

  test('reaches a small positive delta just before reset', () => {
    // 99.99% of the window elapsed, 100% used: ~0.01 points ahead.
    const almostReset = resetAt - 1000;
    const delta = computePaceDelta(weeklyWindow(100, resetAt), almostReset);
    expect(delta).not.toBeNull();
    expect(delta!).toBeGreaterThan(0);
    expect(delta!).toBeLessThan(0.1);
  });

  test('is null exactly at reset (expired)' , () => {
    expect(computePaceDelta(weeklyWindow(40, resetAt), resetAt)).toBeNull();
  });

  test('is null after reset', () => {
    expect(computePaceDelta(weeklyWindow(40, resetAt), resetAt + 60_000)).toBeNull();
  });

  test('is null before the window start beyond clock-skew tolerance', () => {
    expect(computePaceDelta(weeklyWindow(40, resetAt), windowStart - 60_000)).toBeNull();
  });

  test('is null for a reset farther away than the reported window duration', () => {
    // resetAt - windowStart is 8 days, but the window claims 7.
    const inconsistentReset = windowStart + 8 * 24 * 60 * 60 * 1000;
    expect(computePaceDelta(weeklyWindow(40, inconsistentReset), windowStart + 60_000)).toBeNull();
  });

  test('is null when usedPercent is missing', () => {
    expect(computePaceDelta(weeklyWindow(null, resetAt), windowStart + 1000)).toBeNull();
  });

  test('is null when windowSeconds is zero or negative', () => {
    expect(computePaceDelta(weeklyWindow(40, resetAt, 0), windowStart + 1000)).toBeNull();
    expect(computePaceDelta(weeklyWindow(40, resetAt, -5), windowStart + 1000)).toBeNull();
  });

  test('is null when usedPercent is non-finite', () => {
    expect(computePaceDelta(weeklyWindow(Infinity, resetAt), windowStart + 1000)).toBeNull();
    expect(computePaceDelta(weeklyWindow(NaN, resetAt), windowStart + 1000)).toBeNull();
  });

  test('supports the codex/claude 5-hour window', () => {
    const fiveHourReset = 5 * 60 * 60 * 1000;
    const now = fiveHourReset / 2; // halfway through
    const delta = computePaceDelta(
      weeklyWindow(70, fiveHourReset, FIVE_HOURS),
      now,
    );
    expect(delta).not.toBeNull();
    expect(Math.abs(delta! - 20)).toBeLessThan(1e-6);
  });
});

describe('getPaceDisplayMagnitude / formatPaceDelta', () => {
  test('formats whole points with a sign', () => {
    expect(formatPaceDelta(7)).toBe('+7%');
    expect(formatPaceDelta(-15)).toBe('-15%');
  });

  test('formats exact zero without a sign', () => {
    expect(formatPaceDelta(0)).toBe('0%');
  });

  test('keeps one decimal near zero instead of a contradictory signed zero', () => {
    expect(formatPaceDelta(0.37)).toBe('+0.4%');
    expect(formatPaceDelta(-0.31)).toBe('-0.3%');
  });

  test('never rounds a real sign into zero', () => {
    expect(formatPaceDelta(0.04)).toBe('+0.1%');
    expect(formatPaceDelta(-0.04)).toBe('-0.1%');
  });

  test('rounds magnitude for mid-size values', () => {
    expect(getPaceDisplayMagnitude(0.96)).toBe(1);
    expect(getPaceDisplayMagnitude(-0.96)).toBe(-1);
  });
});

describe('resolvePaceTone', () => {
  const resetAt = SEVEN_DAYS * 1000;
  const windowStart = resetAt - SEVEN_DAYS * 1000;

  test('ahead of pace is warning', () => {
    // Two days in, 40% used (~11.43 points ahead).
    const now = windowStart + 2 * 24 * 60 * 60 * 1000;
    expect(resolvePaceTone(weeklyWindow(40, resetAt), now)).toBe('warn');
  });

  test('on or behind pace is safe, even at a high percentage near reset', () => {
    const now = resetAt - 60_000; // almost expired, 98% used, on pace
    expect(resolvePaceTone(weeklyWindow(98, resetAt), now)).toBe('safe');
  });

  test('a low percentage near the start ahead of pace is warning', () => {
    const now = windowStart + 60_000; // 1 minute into the week, 5% used
    expect(resolvePaceTone(weeklyWindow(5, resetAt), now)).toBe('warn');
  });

  test('ineligible windows keep the fixed threshold tone', () => {
    const now = windowStart + 2 * 24 * 60 * 60 * 1000;
    // Missing duration -> fixed thresholds apply.
    expect(resolvePaceTone(weeklyWindow(60, resetAt, null), now)).toBe('warn');
    expect(resolvePaceTone(weeklyWindow(90, resetAt, null), now)).toBe('critical');
    expect(resolvePaceTone(weeklyWindow(20, resetAt, null), now)).toBe('safe');
  });

  test('expired windows keep the fixed threshold tone, not a stale pace red', () => {
    expect(resolvePaceTone(weeklyWindow(20, resetAt), resetAt + 1000)).toBe('safe');
  });
});

describe('formatPaceAriaLabel', () => {
  const t: Parameters<typeof formatPaceAriaLabel>[0] = (key, params) => formatMessage(enDict, key, params);

  test('names the meaning rather than the color', () => {
    expect(formatPaceAriaLabel(t, 40, 7)).toBe('40 percent used, 7 percentage points ahead of elapsed time');
    expect(formatPaceAriaLabel(t, 40, -15)).toBe('40 percent used, 15 percentage points behind elapsed time');
  });

  test('uses the singular form for one point', () => {
    expect(formatPaceAriaLabel(t, 40, 1)).toContain('1 percentage point ahead');
    expect(formatPaceAriaLabel(t, 40, -1)).toContain('1 percentage point behind');
  });

  test('on pace has no sign', () => {
    expect(formatPaceAriaLabel(t, 40, 0)).toBe('40 percent used, on pace with elapsed time');
  });

  test('the spoken magnitude matches the visible one', () => {
    expect(formatPaceAriaLabel(t, 40, 0.37)).toBe('40 percent used, 0.4 percentage points ahead of elapsed time');
  });
});