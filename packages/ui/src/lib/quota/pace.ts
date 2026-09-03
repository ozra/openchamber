import { useDurationTickerNow } from '@/hooks/useDurationTicker';
import type { I18nContextValue } from '@/lib/i18n/react-context';
import type { UsageWindow } from '@/types';
import { isFiniteNumber, resolveUsageTone, type QuotaTone } from './utils';

/**
 * Quota usage pace against a fixed reset window.
 *
 * Codex's 5-hour/weekly limits and Claude's 5-hour/7-day limits are the primary
 * examples, but the shared semantics apply to any `UsageWindow` with a
 * trustworthy percentage, duration, and reset time. The calculation is pure and
 * accepts `now` as an input so boundary behavior is deterministic in tests; the
 * one shared visibility-gated clock (`useQuotaPaceNow`) is the only live time
 * source, so mounted quota surfaces never create per-row timers.
 */

/** How far local time may sit before the inferred window start and still count
 * as "the window just began". Absorbs provider-vs-local clock skew of a few
 * seconds without turning malformed data into a confident pace judgment. */
const WINDOW_START_SKEW_MS = 5_000;

/** Close enough to the second for a live pace readout. */
const PACE_TICK_MS = 1_000;

/**
 * Percentage-point difference between usage and elapsed time, or null when the
 * window cannot carry a trustworthy pace judgment.
 *
 * Positive: usage is ahead of elapsed time. Negative: usage is behind. Zero:
 * exactly on an even pace. The window is inferred as `[resetAt - windowSeconds,
 * resetAt]` and elapsed time is measured to the second against the live `now`,
 * never against the fetch-time `resetAfterSeconds` snapshot.
 *
 * Null when any field is missing/non-finite, the duration is not positive, the
 * reset lies farther away than the reported duration (inconsistent timing), or
 * the window has expired — an expired window's delta would only grow more
 * negative from stale data, so it is suppressed until refreshed provider data
 * establishes the next window.
 */
export const computePaceDelta = (window: UsageWindow, now: number): number | null => {
  const { usedPercent, windowSeconds, resetAt } = window;
  if (!isFiniteNumber(usedPercent)) return null;
  if (!isFiniteNumber(windowSeconds) || windowSeconds <= 0) return null;
  if (!isFiniteNumber(resetAt)) return null;

  const windowStartMs = resetAt - windowSeconds * 1000;
  if (now < windowStartMs - WINDOW_START_SKEW_MS) return null;
  if (now >= resetAt) return null;

  const elapsedSeconds = Math.min(Math.max((now - windowStartMs) / 1000, 0), windowSeconds);
  const elapsedPercent = (100 * elapsedSeconds) / windowSeconds;
  return usedPercent - elapsedPercent;
};

/**
 * The magnitude the compact formatter will show for a delta, shared with the
 * accessible label so the spoken number always matches the visible one.
 *
 * Whole points are the normal display; near zero, one decimal is retained when
 * rounding to a whole number would hide or reverse the real sign, and a value
 * smaller than half a tenth still reads as the smallest nonzero step in the
 * right direction — a real positive/negative value is never rounded into a
 * contradictory signed zero.
 */
export const getPaceDisplayMagnitude = (delta: number): number => {
  if (!Number.isFinite(delta)) return 0;
  const whole = Math.round(delta);
  if (whole !== 0) return whole;
  if (delta === 0) return 0;
  const tenth = Math.round(delta * 10) / 10;
  if (tenth !== 0) return tenth;
  return delta > 0 ? 0.1 : -0.1;
};

/**
 * Compact signed suffix: "+7%", "-15%", "+0.4%", or plain "0%" exactly on pace.
 */
export const formatPaceDelta = (delta: number): string => {
  const magnitude = getPaceDisplayMagnitude(delta);
  if (magnitude === 0) return '0%';
  return `${magnitude > 0 ? '+' : '-'}${Math.abs(magnitude)}%`;
};

/**
 * One window tone across every quota surface.
 *
 * For an eligible window the pace judgment replaces the fixed 50%/80% usage
 * thresholds: ahead is warning (orange) to flag consumption outpacing time,
 * on or behind pace is safe. Ineligible or expired windows keep the existing
 * threshold tone.
 */
export const resolvePaceTone = (window: UsageWindow, now: number): QuotaTone => {
  const paceDelta = computePaceDelta(window, now);
  if (paceDelta === null) return resolveUsageTone(window.usedPercent);
  return paceDelta > 0 ? 'warn' : 'safe';
};

/**
 * Accessible label naming the pace meaning instead of leaving a bare "+7%" to
 * speak for itself. Example: "40 percent used, 7 percentage points ahead of
 * elapsed time."
 */
export const formatPaceAriaLabel = (
  t: I18nContextValue['t'],
  usedPercent: number,
  delta: number,
): string => {
  const magnitude = Math.abs(getPaceDisplayMagnitude(delta));
  const used = Math.round(usedPercent);
  if (magnitude === 0) {
    return t('quota.pace.aria.onPace', { used });
  }
  if (delta > 0) {
    return magnitude === 1
      ? t('quota.pace.aria.aheadOne', { used })
      : t('quota.pace.aria.aheadMany', { used, delta: magnitude });
  }
  return magnitude === 1
    ? t('quota.pace.aria.behindOne', { used })
    : t('quota.pace.aria.behindMany', { used, delta: magnitude });
};

/**
 * One shared, visibility-gated wall clock for mounted quota surfaces.
 *
 * All quota consumers share a single one-second ticker keyed by interval, so N
 * mounted rows cost one timer, and the timer stops entirely once no consumer is
 * enabled. Subscribing delivers the current time immediately, so a mount,
 * visibility return, or provider refresh restores the current value without
 * waiting for the next tick.
 */
export const useQuotaPaceNow = (enabled: boolean): number => {
  return useDurationTickerNow(enabled, PACE_TICK_MS);
};