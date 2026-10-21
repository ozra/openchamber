import React from 'react';
import { useI18n } from '@/lib/i18n';
import { resolveUsageTone } from '@/lib/quota';
import { computeContextUsage } from './contextUsage';
import { WorkStatusMeter, WorkStatusRow, WorkStatusValue } from './WorkStatusPrimitives';

const compactTokens = (tokens: number) => `${Math.round(tokens / 1_000)}k`;

export const WorkStatusContextRow: React.FC<{
  usage: NonNullable<ReturnType<typeof computeContextUsage>>;
  onClick?: () => void;
  warming: React.ReactNode;
  cost: React.ReactNode;
}> = ({ usage, onClick, warming, cost }) => {
  const { t } = useI18n();
  const measured = usage.state === 'measured';
  const overLimit = measured && usage.totalTokens > usage.limit;
  const percent = measured ? usage.percent : null;
  const tone = percent === null ? null : resolveUsageTone(Math.round(percent));
  const meterColor = tone === 'critical' ? 'var(--status-error)'
    : tone === 'warn' ? 'var(--status-warning)' : 'var(--status-success)';
  const reading = measured
    ? `${compactTokens(usage.totalTokens)} / ${compactTokens(usage.limit)} (${Math.round(usage.percent)}%)`
    : '\u2014';
  const fullReading = measured ? t('chat.workStatus.context.reading', {
    used: usage.totalTokens.toLocaleString(),
    limit: usage.limit.toLocaleString(),
    percent: Math.round(usage.percent),
  }) : t('contextUsage.compacted.description');
  const warning = t('chat.workStatus.context.overLimit');

  return (
    <>
      <WorkStatusRow
        icon="donut-chart"
        iconColor={overLimit ? 'var(--status-error)' : undefined}
        onClick={onClick}
        ariaLabel={`${t('chat.workStatus.action.openContext')}. ${fullReading}${overLimit ? `. ${warning}` : ''}`}
        tooltip={fullReading}
        label={t('chat.workStatus.context.label')}
        value={(
          <>
            {warming}
            <WorkStatusValue tone={overLimit ? 'error' : 'default'} ariaLabel={fullReading}>{reading}</WorkStatusValue>
            {cost}
          </>
        )}
      />
      <WorkStatusMeter percent={percent ?? 0} color={meterColor} />
      {overLimit ? (
        <p role="alert" className="mx-1 mb-1 text-[11px] font-semibold leading-4 text-[var(--status-error)]">
          {warning}
        </p>
      ) : null}
      {usage.state === 'compacted' ? (
        <p className="mx-1 mb-1 text-[11px] leading-4 text-muted-foreground">
          {t('contextUsage.compacted.description')}
        </p>
      ) : null}
    </>
  );
};
