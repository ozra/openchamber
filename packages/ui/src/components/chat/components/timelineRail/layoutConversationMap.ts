import type { PlacedRailSpan } from './layoutRailSpans';

/** A map entry stands for a prompt or a reply. */
export type ConversationMapKind = 'prompt' | 'reply';

/** The map's sizes in rem; `resolveConversationMapMetrics` turns them into px. */
const MAP_SIZES_REM = {
    /** Height of a one-line box. */
    boxHeight: 1.25,
    /** Free space kept between two boxes. */
    boxGap: 0.125,
    /** Dots of one kind closer than this merge into one. */
    dotPitch: 0.3125,
};

export type ConversationMapMetrics = { readonly [Key in keyof typeof MAP_SIZES_REM]: number };

export const resolveConversationMapMetrics = (rootFontPx: number): ConversationMapMetrics => ({
    boxHeight: MAP_SIZES_REM.boxHeight * rootFontPx,
    boxGap: MAP_SIZES_REM.boxGap * rootFontPx,
    dotPitch: MAP_SIZES_REM.dotPitch * rootFontPx,
});

interface ConversationMapBox {
    kind: ConversationMapKind;
    /** Index into the placed spans. */
    index: number;
    /** Rail px of the box's middle, kept inside the rail. */
    center: number;
}

interface ConversationMapDot {
    kind: ConversationMapKind;
    /** Rail px of the left-out span's middle. */
    center: number;
}

interface ConversationMapLayout {
    /** In rail order. */
    boxes: ConversationMapBox[];
    /** Left-out boxes, in rail order. */
    dots: ConversationMapDot[];
}

interface MapEntry {
    kind: ConversationMapKind;
    index: number;
    /** A prompt, or the last reply before the next prompt or the end. */
    leading: boolean;
}

/** Every prompt and reply; each turn's last reply is marked as leading. */
const collectEntries = (placed: readonly PlacedRailSpan[]): MapEntry[] => {
    const entries: MapEntry[] = [];
    let lastReply: MapEntry | null = null;
    for (let index = 0; index < placed.length; index += 1) {
        const { kind } = placed[index].span;
        if (kind === 'user') {
            if (lastReply) lastReply.leading = true;
            lastReply = null;
            entries.push({ kind: 'prompt', index, leading: true });
        } else if (kind === 'agent') {
            lastReply = { kind: 'reply', index, leading: false };
            entries.push(lastReply);
        }
    }
    if (lastReply) lastReply.leading = true;
    return entries;
};

/**
 * One-line boxes for the prompts and replies at their rail positions. Boxes
 * that would overlap thin out: prompts are placed first, then each turn's
 * last reply, then the other replies, earlier first within each group, and a
 * box that collides with one already placed becomes a dot. Dots of one kind
 * closer than `dotPitch` merge.
 */
export const layoutConversationMap = (
    placed: readonly PlacedRailSpan[],
    railHeight: number,
    metrics: ConversationMapMetrics,
): ConversationMapLayout => {
    const half = metrics.boxHeight / 2;
    const pitch = metrics.boxHeight + metrics.boxGap;
    const centerOf = (index: number) => placed[index].top + placed[index].length / 2;
    const clampCenter = (center: number) => Math.max(half, Math.min(center, Math.max(half, railHeight - half)));

    const entries = collectEntries(placed);
    const ordered = [
        ...entries.filter((entry) => entry.kind === 'prompt'),
        ...entries.filter((entry) => entry.kind === 'reply' && entry.leading),
        ...entries.filter((entry) => entry.kind === 'reply' && !entry.leading),
    ];
    // Placed centers, kept sorted for the neighbour check.
    const taken: number[] = [];
    const boxes: ConversationMapBox[] = [];
    const leftOut: ConversationMapDot[] = [];
    for (const entry of ordered) {
        const center = clampCenter(centerOf(entry.index));
        let low = 0;
        let high = taken.length;
        while (low < high) {
            const mid = (low + high) >> 1;
            if (taken[mid] < center) low = mid + 1;
            else high = mid;
        }
        const collides = (low < taken.length && taken[low] - center < pitch)
            || (low > 0 && center - taken[low - 1] < pitch);
        if (collides) {
            leftOut.push({ kind: entry.kind, center: centerOf(entry.index) });
            continue;
        }
        taken.splice(low, 0, center);
        boxes.push({ kind: entry.kind, index: entry.index, center });
    }
    boxes.sort((a, b) => a.center - b.center);
    leftOut.sort((a, b) => a.center - b.center);

    const dots: ConversationMapDot[] = [];
    const lastDot: Partial<Record<ConversationMapKind, number>> = {};
    for (const dot of leftOut) {
        const previous = lastDot[dot.kind];
        if (previous !== undefined && dot.center - previous < metrics.dotPitch) continue;
        lastDot[dot.kind] = dot.center;
        dots.push(dot);
    }
    return { boxes, dots };
};
