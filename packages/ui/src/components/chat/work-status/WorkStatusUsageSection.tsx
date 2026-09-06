import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { ProviderLogo } from '@/components/ui/ProviderLogo';
import { preloadProviderLogos } from '@/hooks/useProviderLogo';
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
import { useQuotaAutoRefresh, useQuotaStore } from '@/stores/useQuotaStore';
import { useUIStore } from '@/stores/useUIStore';
import { useUsageProviderGroups } from '@/components/usage/usageGroups';
import { useConfigStore } from '@/stores/useConfigStore';
import { pickUsageHeadline } from './usageHeadline';
import { runBackgroundNetworkTask } from '@/lib/background-network';
import { WorkStatusRow, WorkStatusCollapsibleSection, WorkStatusValue } from './WorkStatusPrimitives';
import { useReportWorkStatusPresence } from './presenceContext';

/**
 * Provider rate limits.
 *
 * The mobile popover renders these as filled cards; that language does not
 * survive here — the fills and their padding fight the panel's flat rows and
 * cost roughly twice the height. Only the data is shared
 * (`useUsageProviderGroups`); the presentation is the panel's own row
 * vocabulary, with each provider as a quiet sub-heading.
 *
 * Sits above Subagents and MCP: a spent quota stops the work outright, so it
 * belongs with the readouts that hold for the whole session rather than with
 * whatever happens to be running.
 */

/** Work-status vocabulary for the shared quota tone (PRD-020 paces eligible windows). */
const quotaToneToUsageTone = (tone: QuotaTone): 'default' | 'warning' | 'error' =>
  tone === 'critical' ? 'error' : tone === 'warn' ? 'warning' : 'default';

export const WorkStatusUsageSection: React.FC = () => {
  const { t } = useI18n();
  const groups = useUsageProviderGroups();
  const now = useQuotaPaceNow(groups.length > 0);
  const displayMode = useQuotaStore((state) => state.displayMode);
  const isLoading = useQuotaStore((state) => state.isLoading);
  const dropdownProviderIds = useQuotaStore((state) => state.dropdownProviderIds);
  const fetchQuotas = useQuotaStore((state) => state.fetchQuotas);
  const ensureQuotasLoadedForRuntime = useQuotaStore((state) => state.ensureLoadedForRuntime);
  const isInitialized = useConfigStore((state) => state.isInitialized);
  const timeFormatPreference = useUIStore((state) => state.timeFormatPreference);
  const currentProviderId = useConfigStore((state) => state.currentProviderId);

  // Keeps the periodic refresh running while the panel is mounted.
  useQuotaAutoRefresh();

  // `useQuotaAutoRefresh` only schedules an interval — it never performs the
  // first fetch. That was owned by the header dropdown's open handler, so the
  // panel stayed empty until the user opened it. `ensureLoadedForRuntime` owns
  // the once-per-instance load and its readiness rule; asking again is a no-op,
  // so this is safe to run on every connection change.
  React.useEffect(() => {
    if (!isInitialized) return;
    void runBackgroundNetworkTask(() => ensureQuotasLoadedForRuntime());
  }, [ensureQuotasLoadedForRuntime, isInitialized]);

  React.useEffect(() => {
    if (groups.length === 0) return;
    preloadProviderLogos(groups.map((group) => group.providerId));
  }, [groups]);

  useReportWorkStatusPresence('usage', groups.length > 0);

  if (groups.length === 0) return null;

  const modeLabel = displayMode === 'remaining'
    ? t('header.services.remaining')
    : t('header.services.used');

  // Collapsed, the section shows the tightest quota of the provider the
  // composer is pointed at — the number that decides whether the next turn
  // lands. With no match it falls back to the display-mode label rather than
  // showing some other provider's quota as if it were the active one.
  const headline = pickUsageHeadline(groups, currentProviderId);
  const headlineRow = headline?.row ?? null;
  // Pace rides next to the used percentage itself; value-label rows (credits,
  // spend) keep their tone but never gain a delta whose units would not match.
  const headlinePaceDelta = headlineRow && displayMode === 'usage' && !headlineRow.window.valueLabel
    ? computePaceDelta(headlineRow.window, now)
    : null;
  const headlineMetric = headlineRow
    ? formatQuotaValueLabel(
      headlineRow.window.valueLabel,
      displayMode === 'remaining' ? headlineRow.window.remainingPercent : headlineRow.window.usedPercent,
    )
    : null;
  const headlineText = headlineMetric !== null && headlineMetric !== '-'
    ? headlinePaceDelta !== null
      ? `${headlineMetric} (${formatPaceDelta(headlinePaceDelta)})`
      : headlineMetric
    : null;
  const headlineUsedPercent = headlineRow?.window.usedPercent ?? null;
  const headlineAria = headlineRow && headlinePaceDelta !== null && headlineUsedPercent !== null
    ? formatPaceAriaLabel(t, headlineUsedPercent, headlinePaceDelta)
    : undefined;

  return (
    <WorkStatusCollapsibleSection
      id="usage"
      title={t('chat.workStatus.section.usage')}
      icon="timer"
      summary={(
        <span className="inline-flex items-center gap-1.5">
          {headline && headlineText ? (
            <>
              <span className="truncate">{headline.row.label}</span>
              <WorkStatusValue
                tone={quotaToneToUsageTone(resolvePaceTone(headline.row.window, now))}
                ariaLabel={headlineAria}
              >
                {headlineText}
              </WorkStatusValue>
            </>
          ) : modeLabel}
        </span>
      )}
      action={(
        <Button
          size="icon"
          variant="ghost"
          className="size-6 shrink-0 text-muted-foreground"
          onClick={() => void fetchQuotas(dropdownProviderIds)}
          aria-label={t('settings.usage.sidebar.actions.refreshAria')}
          title={t('settings.usage.sidebar.actions.refreshTitle')}
          disabled={isLoading}
        >
          <Icon name="refresh" className={cn('size-3.5', isLoading && 'animate-spin')} />
        </Button>
      )}
    >
      {groups.map((group) => (
        <React.Fragment key={group.providerId}>
          <WorkStatusRow
            leading={<ProviderLogo providerId={group.providerId} className="size-4 shrink-0" />}
            label={<span className="font-semibold text-foreground">{group.providerName}</span>}
            value={group.status && group.rows.length === 0 ? (
              <WorkStatusValue tone="muted">{group.status}</WorkStatusValue>
            ) : undefined}
          />
          {group.rows.map((row) => {
            const usedPercent = row.window.usedPercent;
            // Pace is a percentage-point delta: it belongs next to the used
            // percentage itself, so value-label rows (credits, spend) keep
            // their tone but never gain a delta whose units would not match.
            // `computePaceDelta` itself establishes finitude of every field.
            const paceDelta = displayMode === 'usage' && !row.window.valueLabel
              ? computePaceDelta(row.window, now)
              : null;
            const displayPercent = displayMode === 'remaining'
              ? row.window.remainingPercent
              : row.window.usedPercent;
            const metricLabel = formatQuotaValueLabel(row.window.valueLabel, displayPercent);
            const metricText = metricLabel === '-'
              ? undefined
              : paceDelta !== null
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
              <WorkStatusRow
                key={`${group.providerId}-${row.key}`}
                label={(
                  <span className="inline-flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate">
                      {row.subtitle ? `${row.subtitle} · ${row.label}` : row.label}
                    </span>
                    {resetLabel ? (
                      <span className="shrink-0 text-[11px] text-muted-foreground">{resetLabel}</span>
                    ) : null}
                  </span>
                )}
                value={metricText === undefined ? undefined : (
                  <WorkStatusValue
                    tone={quotaToneToUsageTone(resolvePaceTone(row.window, now))}
                    ariaLabel={paceAria}
                  >
                    {metricText}
                  </WorkStatusValue>
                )}
              />
            );
          })}
        </React.Fragment>
      ))}
    </WorkStatusCollapsibleSection>
  );
};