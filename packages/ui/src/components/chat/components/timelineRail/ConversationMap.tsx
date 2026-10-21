import React from 'react';

import { cn } from '@/lib/utils';

import { layoutConversationMap, type ConversationMapKind, type ConversationMapMetrics } from './layoutConversationMap';
import type { PlacedRailSpan } from './layoutRailSpans';

type ConversationMapProps = {
    placed: readonly PlacedRailSpan[];
    railHeight: number;
    metrics: ConversationMapMetrics;
    emptyPreviewLabel: string;
};

// Prompt boxes sit PROMPT_OFFSET farther from the rail than reply boxes, both
// edges, so prompts and replies alternate sides like a chat, as the prompt
// lane sits farthest out on the rail.
const BOX_WIDTH = 'min(13rem, 100vw - 10.75rem)';
const PROMPT_OFFSET = '2.5rem';
const DOT_SIZE_REM = 0.1875;
// Dots sit in the room between the boxes and the rail (`me-3`), a prompt's
// farther out than a reply's.
const DOT_INSET_REM = { prompt: 0.45, reply: 0.15 } satisfies Record<ConversationMapKind, number>;

// Translucent tone steps of the text color over the chat background, so the
// boxes read in every theme; prompts a step brighter than replies.
const BOX_FILL = {
    prompt: 'bg-[color-mix(in_srgb,var(--surface-foreground)_18%,color-mix(in_srgb,var(--surface-background)_72%,transparent))]',
    reply: 'bg-[color-mix(in_srgb,var(--surface-foreground)_9%,color-mix(in_srgb,var(--surface-background)_72%,transparent))]',
} satisfies Record<ConversationMapKind, string>;
const TEXT_TONE = {
    prompt: 'text-[color-mix(in_srgb,var(--surface-foreground)_88%,transparent)]',
    reply: 'text-muted-foreground',
} satisfies Record<ConversationMapKind, string>;
const DOT_TONE = {
    prompt: 'bg-[color-mix(in_srgb,var(--surface-foreground)_88%,transparent)]',
    reply: 'bg-muted-foreground',
} satisfies Record<ConversationMapKind, string>;

/**
 * One-line boxes for the prompts and replies beside the rail, shown
 * while its hover card is. Presentation only: the rail keeps every pointer
 * and key, and the card paints above the map. Memoized on the layout, so
 * moving the highlight never re-renders it.
 */
export const ConversationMap = React.memo(function ConversationMap({ placed, railHeight, metrics, emptyPreviewLabel }: ConversationMapProps) {
    const { boxes, dots } = React.useMemo(
        () => layoutConversationMap(placed, railHeight, metrics),
        [metrics, placed, railHeight],
    );
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 inset-e-full z-20">
            {boxes.map((box) => {
                const { span } = placed[box.index];
                return (
                    <div
                        key={span.spanId}
                        className={cn(
                            'absolute me-3 flex h-5 -translate-y-1/2 items-center rounded-md px-2 typography-meta',
                            BOX_FILL[box.kind],
                            span.preview ? TEXT_TONE[box.kind] : 'text-muted-foreground',
                        )}
                        style={{
                            top: box.center,
                            insetInlineEnd: box.kind === 'prompt' ? PROMPT_OFFSET : 0,
                            width: BOX_WIDTH,
                        }}
                    >
                        <span className="truncate" dir="auto">{span.preview || emptyPreviewLabel}</span>
                    </div>
                );
            })}
            {dots.map((dot) => (
                <div
                    key={`${dot.kind}-${dot.center}`}
                    className={cn('absolute -translate-y-1/2 rounded-full', DOT_TONE[dot.kind])}
                    style={{
                        top: dot.center,
                        insetInlineEnd: `${DOT_INSET_REM[dot.kind]}rem`,
                        width: `${DOT_SIZE_REM}rem`,
                        height: `${DOT_SIZE_REM}rem`,
                    }}
                />
            ))}
        </div>
    );
});
