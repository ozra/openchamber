import React from 'react';
import { cn } from '@/lib/utils';
import { clampPercent } from '@/lib/quota';
import type { QuotaTone } from '@/lib/quota';

interface UsageProgressBarProps {
  percent: number | null;
  /** Resolved quota tone (PRD-020 paces eligible windows); already computed by
   * the caller so the bar can never disagree with the value beside it. */
  tone: QuotaTone;
  className?: string;
}

export const UsageProgressBar: React.FC<UsageProgressBarProps> = ({
  percent,
  tone,
  className,
}) => {
  const clamped = clampPercent(percent) ?? 0;

  const fillStyle = tone === 'critical'
    ? { backgroundColor: 'var(--status-error)' }
    : tone === 'warn'
      ? { backgroundColor: 'var(--status-warning)' }
      : { backgroundColor: 'var(--status-success)' };

  return (
    <div className={cn('relative h-2.5 rounded-full bg-[var(--interactive-border)] overflow-hidden', className)}>
      <div
        className="h-full transition-all duration-300"
        style={{ ...fillStyle, width: `${clamped}%` }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
};