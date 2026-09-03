import React from 'react';
import type { UsageWindow } from '@/types';
import {
  computePaceDelta,
  formatPaceAriaLabel,
  formatPaceDelta,
  formatQuotaValueLabel,
  formatQuotaResetLabel,
  formatWindowLabel,
  resolvePaceTone,
  useQuotaPaceNow,
} from '@/lib/quota';
import { UsageProgressBar } from './UsageProgressBar';
import { useQuotaStore } from '@/stores/useQuotaStore';
import { Checkbox } from '@/components/ui/checkbox';
import { useUIStore } from '@/stores/useUIStore';
import { useI18n } from '@/lib/i18n';

interface UsageCardProps {
  title: string;
  window: UsageWindow;
  subtitle?: string | null;
  showToggle?: boolean;
  toggleEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
}

export const UsageCard: React.FC<UsageCardProps> = ({
  title,
  window,
  subtitle,
  showToggle = false,
  toggleEnabled = false,
  onToggle,
}) => {
  const { t } = useI18n();
  const displayMode = useQuotaStore((state) => state.displayMode);
  const timeFormatPreference = useUIStore((state) => state.timeFormatPreference);
  // The settings page renders the card only while it is on screen; the shared
  // visibility-gated clock updates every eligible row together.
  const now = useQuotaPaceNow(true);
  const usedPercent = window.usedPercent;
  // Pace rides next to the used percentage itself; value-label rows (credits,
  // spend) keep their tone but never gain a delta whose units would not match.
  // `computePaceDelta` establishes finitude of every field.
  const paceDelta = displayMode === 'usage' && !window.valueLabel
    ? computePaceDelta(window, now)
    : null;
  const displayPercent = displayMode === 'remaining' ? window.remainingPercent : window.usedPercent;
  const barLabel = displayMode === 'remaining' ? 'remaining' : 'used';
  const percentLabel = formatQuotaValueLabel(window.valueLabel, displayPercent);
  const percentText = percentLabel === '-' ? '' : paceDelta !== null
    ? `${percentLabel} (${formatPaceDelta(paceDelta)})`
    : percentLabel;
  const paceAria = paceDelta !== null && usedPercent !== null
    ? formatPaceAriaLabel(t, usedPercent, paceDelta)
    : undefined;
  const resetLabel = formatQuotaResetLabel(window.resetAt, window.resetAfterFormatted ?? window.resetAtFormatted, timeFormatPreference);
  const windowLabel = formatWindowLabel(title);

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 flex items-center gap-2">
          {showToggle && (
            <Checkbox
              checked={toggleEnabled}
              onChange={(checked) => onToggle?.(checked)}
              ariaLabel="Show in dropdown"
            />
          )}
          <div className="min-w-0 flex flex-col">
            <span className="typography-ui-label text-foreground truncate">{windowLabel}</span>
            {subtitle && (
              <span className="typography-meta text-muted-foreground truncate">{subtitle}</span>
            )}
          </div>
        </div>
        <div
          aria-label={paceAria}
          className="typography-ui-label text-foreground tabular-nums flex items-center justify-end"
        >
          {percentText}
        </div>
      </div>

      <div className="mt-2.5">
        <UsageProgressBar
          percent={displayPercent}
          tone={resolvePaceTone(window, now)}
          className="h-1.5"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="typography-micro text-muted-foreground">
            {resetLabel ? `Resets ${resetLabel}` : ''}
          </span>
          <span className="typography-micro text-muted-foreground">
            {barLabel}
          </span>
        </div>
      </div>

    </div>
  );
};