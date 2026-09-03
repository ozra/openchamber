import React from 'react';
import { ProviderLogo } from '@/components/ui/ProviderLogo';
import { useI18n } from '@/lib/i18n';
import {
  computePaceDelta,
  formatPaceAriaLabel,
  formatPaceDelta,
  formatQuotaResetLabel,
  formatQuotaValueLabel,
  resolvePaceTone,
  useQuotaPaceNow,
} from '@/lib/quota';
import type { QuotaTone } from '@/lib/quota';
import { cn } from '@/lib/utils';
import type { TimeFormatPreference } from '@/stores/useUIStore';
import type { UsageWindow } from '@/types';
import type { UsageProviderGroup } from './usageGroups';

const toneToValueClass = (tone: QuotaTone): string => (
  tone === 'critical'
    ? 'text-[var(--status-error)]'
    : tone === 'warn'
      ? 'text-[var(--status-warning)]'
      : 'text-foreground'
);

/**
 * One elevated card per provider, each holding a run of quota windows.
 *
 * Built for narrow columns: labels truncate, values stay pinned right, and
 * nothing relies on horizontal room the container may not have. Used in the
 * mobile session-metadata popover, where mounting is gated by the popover
 * being open — the shared pace clock runs only while a card is actually shown.
 */
export const UsageProviderCards: React.FC<{
  groups: UsageProviderGroup[];
  displayMode: 'usage' | 'remaining';
  timeFormatPreference: TimeFormatPreference;
  className?: string;
}> = ({ groups, displayMode, timeFormatPreference, className }) => {
  const { t } = useI18n();
  const now = useQuotaPaceNow(groups.length > 0);

  return (
    <div className={cn('space-y-1.5', className)}>
      {groups.map((group) => (
        <div key={group.providerId} className="min-w-0 rounded-xl bg-[var(--surface-muted)] p-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <ProviderLogo providerId={group.providerId} className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate typography-ui-label font-medium text-foreground">
              {group.providerName}
            </span>
            {group.planLabel ? (
              <span className="shrink-0 typography-micro capitalize text-muted-foreground">
                {group.planLabel}
              </span>
            ) : null}
            {group.status && group.rows.length === 0 ? (
              <span className="shrink-0 truncate typography-micro text-muted-foreground">{group.status}</span>
            ) : null}
          </div>

          {group.rows.length > 0 ? (
            <div className="mt-1.5 space-y-1">
              {group.rows.map((row) => {
                const usedPercent = row.window.usedPercent;
                // The delta only reads correctly next to the used percentage
                // itself; value-label rows keep tone but no suffix.
                // `computePaceDelta` establishes finitude of every field.
                const paceDelta = displayMode === 'usage' && !row.window.valueLabel
                  ? computePaceDelta(row.window, now)
                  : null;
                const displayPercent = displayMode === 'remaining'
                  ? row.window.remainingPercent
                  : row.window.usedPercent;
                const metricLabel = formatQuotaValueLabel(row.window.valueLabel, displayPercent);
                const metricText = metricLabel === '-' ? '' : paceDelta !== null
                  ? `${metricLabel} (${formatPaceDelta(paceDelta)})`
                  : metricLabel;
                const paceAria = paceDelta !== null && usedPercent !== null
                  ? formatPaceAriaLabel(t, usedPercent, paceDelta)
                  : undefined;
                const resetLabel = formatQuotaResetLabel(
                  row.window.resetAt,
                  row.window.resetAfterFormatted ?? row.window.resetAtFormatted,
                  timeFormatPreference,
                );
                return (
                  <div key={row.key} className="flex min-w-0 items-baseline justify-between gap-3">
                    <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                      <span className="shrink-0 truncate typography-ui-label text-muted-foreground">
                        {row.subtitle ? `${row.subtitle} · ${row.label}` : row.label}
                      </span>
                      {resetLabel ? (
                        <span className="min-w-0 truncate typography-micro text-muted-foreground/70">
                          {resetLabel}
                        </span>
                      ) : null}
                    </span>
                    <span
                      aria-label={paceAria}
                      className={cn(
                        'shrink-0 typography-ui-label font-semibold tabular-nums',
                        toneToValueClass(resolvePaceTone(row.window, now)),
                      )}
                    >
                      {metricText}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {group.status && group.rows.length > 0 ? (
            <div className="mt-1.5 typography-micro text-muted-foreground">{group.status}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
};