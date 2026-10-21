import { laneOfKind, type RailLane, type RailSpan } from './projectRailSpans';

/** Content at or past this many characters paints at the maximum length. */
export const RAIL_SPAN_CONTENT_CUTOFF = 10_000;

/**
 * The rail's sizes, in rem so they follow the interface size setting like the
 * rest of the UI (it scales the root font size). `resolveRailMetrics` turns
 * them into px snapped to device pixels.
 */
const RAIL_SIZES_REM = {
    /** Width of a span. */
    spanWidth: 0.3125,
    /** Background between two lanes. */
    laneGap: 0.09375,
    /** Shortest painted span: every span stays a visible mark. */
    minLength: 0.1875,
    maxLength: 1.75,
    /**
     * A pointer this close to a span still reaches it. Between two spans the
     * nearer one wins, so the space between neighbours splits at the midpoint.
     */
    hitReach: 0.5,
    /** What a pointer over another lane adds to its distance from a span, per lane. */
    lanePenalty: 0.375,
    /** Empty rail between two spans is cut down to this. */
    gapMax: 0.4375,
    frameMinHeight: 0.375,
};

export type RailMetrics = { readonly [Key in keyof typeof RAIL_SIZES_REM]: number } & {
    /** One device pixel, for the edge that sets neighbouring spans apart. */
    readonly hairline: number;
};

/** The rail's sizes in px for a root font size and device pixel ratio, each a whole number of device pixels. */
export const resolveRailMetrics = (rootFontPx: number, devicePixelRatio: number): RailMetrics => {
    const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
    const toPx = (rem: number) => Math.max(1, Math.round(rem * rootFontPx * ratio)) / ratio;
    return {
        spanWidth: toPx(RAIL_SIZES_REM.spanWidth),
        laneGap: toPx(RAIL_SIZES_REM.laneGap),
        minLength: toPx(RAIL_SIZES_REM.minLength),
        maxLength: toPx(RAIL_SIZES_REM.maxLength),
        hitReach: toPx(RAIL_SIZES_REM.hitReach),
        lanePenalty: toPx(RAIL_SIZES_REM.lanePenalty),
        gapMax: toPx(RAIL_SIZES_REM.gapMax),
        frameMinHeight: toPx(RAIL_SIZES_REM.frameMinHeight),
        hairline: 1 / ratio,
    };
};

const LOG_CUTOFF = Math.log1p(RAIL_SPAN_CONTENT_CUTOFF);
const LANE_INDEX = { start: 0, center: 1, end: 2 } satisfies Record<RailLane, number>;
const SCALE_SEARCH_STEPS = 40;
const FILL_TOLERANCE_PX = 0.5;

/** Painted length on the shared logarithmic content scale. */
export const resolveSpanLength = (contentChars: number, metrics: RailMetrics): number => {
    const chars = Math.max(0, Math.min(contentChars, RAIL_SPAN_CONTENT_CUTOFF));
    const ratio = Math.log1p(chars) / LOG_CUTOFF;
    return metrics.minLength + ratio * (metrics.maxLength - metrics.minLength);
};

/** A list row's place in the scroll content, px. */
export interface RailRowGeometry {
    top: number;
    size: number;
}

export interface PlacedRailSpan {
    span: RailSpan;
    /** Rail px from the rail's top edge. */
    top: number;
    length: number;
    /** Content past the cutoff: the span carries the overflow marker. */
    overflows: boolean;
}

export interface RailLayout {
    placed: PlacedRailSpan[];
    /** Maps a scroll-content offset onto the rail; the viewport frame uses it. */
    toRail: (contentY: number) => number;
}

interface LayoutRailSpansInput {
    spans: readonly RailSpan[];
    rowGeometry: (rowKey: string) => RailRowGeometry | undefined;
    /** Height of the whole scroll content, px. */
    contentHeight: number;
    railHeight: number;
    metrics: RailMetrics;
}

interface ContentSpan {
    span: RailSpan;
    contentY: number;
    length: number;
}

interface Anchor {
    content: number;
    rail: number;
}

const EMPTY_LAYOUT: RailLayout = { placed: [], toRail: () => 0 };

/**
 * Where each span sits in the scroll content. A row's spans share its extent
 * by their estimated rendered height. Spans of a row the list has not
 * positioned yet are left out.
 */
const resolveContentSpans = (
    spans: readonly RailSpan[],
    rowGeometry: LayoutRailSpansInput['rowGeometry'],
    metrics: RailMetrics,
): ContentSpan[] => {
    const located: ContentSpan[] = [];
    // The list can hold stale positions past the window it is updating, so a
    // row may report a top above the row before it. Positions never go back:
    // the hit test and the frame mapping search them in order.
    let floor = 0;
    let index = 0;
    while (index < spans.length) {
        const rowKey = spans[index].rowKey;
        let end = index;
        let rowWeight = 0;
        while (end < spans.length && spans[end].rowKey === rowKey) {
            rowWeight += spans[end].rowWeight;
            end += 1;
        }
        const row = rowGeometry(rowKey);
        if (row && rowWeight > 0) {
            const pxPerWeight = row.size / rowWeight;
            let offset = 0;
            for (let at = index; at < end; at += 1) {
                const span = spans[at];
                floor = Math.max(floor, row.top + offset);
                located.push({ span, contentY: floor, length: resolveSpanLength(span.contentChars, metrics) });
                offset += span.rowWeight * pxPerWeight;
            }
        }
        index = end;
    }
    return located;
};

/**
 * Lays spans down the rail at `scale` rail px per content px, cutting every
 * empty stretch longer than `gapMax` down to it. Tops only grow.
 */
const stackSpans = (located: readonly ContentSpan[], contentHeight: number, scale: number, gapMax: number) => {
    const tops: number[] = [];
    const anchors: Anchor[] = [{ content: 0, rail: 0 }];
    let previous = anchors[0];
    let paintedEnd = 0;
    const advance = (contentY: number): number => {
        const natural = previous.rail + (contentY - previous.content) * scale;
        return natural - paintedEnd <= gapMax ? natural : paintedEnd + gapMax;
    };
    for (const entry of located) {
        const top = advance(entry.contentY);
        tops.push(top);
        previous = { content: entry.contentY, rail: top };
        anchors.push(previous);
        paintedEnd = Math.max(paintedEnd, top + entry.length);
    }
    const end = advance(contentHeight);
    anchors.push({ content: contentHeight, rail: end });
    return { tops, anchors, total: Math.max(end, paintedEnd) };
};

const interpolate = (anchors: readonly Anchor[]) => (contentY: number): number => {
    let low = 0;
    let high = anchors.length - 1;
    if (contentY <= anchors[low].content) return anchors[low].rail;
    if (contentY >= anchors[high].content) return anchors[high].rail;
    while (high - low > 1) {
        const mid = (low + high) >> 1;
        if (anchors[mid].content <= contentY) low = mid;
        else high = mid;
    }
    const from = anchors[low];
    const to = anchors[high];
    const span = to.content - from.content;
    return span > 0 ? from.rail + ((contentY - from.content) / span) * (to.rail - from.rail) : from.rail;
};

/**
 * Maps every span onto the rail. Spans start on the content-to-rail scale of
 * a minimap; long empty stretches (a long answer, the tail spacer) are cut
 * short and the scale grows until the spans fill the rail again, up to 1:1.
 * A short session that cannot fill the rail leaves its end empty. The cut
 * keeps a short gap, so a long stretch still reads as a break.
 * The viewport frame maps through the same anchors, so spans and frame line
 * up. Painted length never moves a span: overlapping neighbours paint in
 * transcript order, later on top.
 */
export const layoutRailSpans = ({ spans, rowGeometry, contentHeight, railHeight, metrics }: LayoutRailSpansInput): RailLayout => {
    if (contentHeight <= 0 || railHeight <= 0) return EMPTY_LAYOUT;
    const located = resolveContentSpans(spans, rowGeometry, metrics);
    const total = (scale: number) => stackSpans(located, contentHeight, scale, metrics.gapMax).total;
    const baseScale = railHeight / contentHeight;
    const maxScale = Math.max(baseScale, 1);
    // The total grows with the scale until every long stretch is cut, then
    // stays put. Take the smallest scale that fills the rail as far as the
    // spans can, so stretches are cut only as much as filling needs.
    const target = Math.min(railHeight, total(maxScale)) - FILL_TOLERANCE_PX;
    let scale = baseScale;
    if (total(baseScale) < target) {
        let low = baseScale;
        let high = maxScale;
        for (let step = 0; step < SCALE_SEARCH_STEPS; step += 1) {
            const mid = (low + high) / 2;
            if (total(mid) < target) low = mid;
            else high = mid;
        }
        scale = high;
    }
    const { tops, anchors } = stackSpans(located, contentHeight, scale, metrics.gapMax);
    const placed = located.map((entry, index) => {
        // Clamped against a fixed bound so tops stay in transcript order
        // (`findRailSpanAt` relies on it); a span at the very end is
        // shortened instead of pushed up.
        const top = Math.max(0, Math.min(tops[index], railHeight - metrics.minLength));
        return {
            span: entry.span,
            top,
            length: Math.min(entry.length, railHeight - top),
            overflows: entry.span.contentChars > RAIL_SPAN_CONTENT_CUTOFF,
        };
    });
    return { placed, toRail: interpolate(anchors) };
};

/**
 * The span a pointer at rail `y` over lane `pointerLane` reaches: the one
 * with the smallest distance within reach, where every lane between the
 * pointer and the span adds `lanePenalty`. The later span wins a tie (it
 * paints on top). -1 when none is in reach.
 */
export const findRailSpanAt = (
    placed: readonly PlacedRailSpan[],
    y: number,
    pointerLane: RailLane,
    metrics: RailMetrics,
): number => {
    // Tops are in transcript order, so they only grow; start at the first
    // span whose longest possible extent could reach `y`.
    const from = y - metrics.maxLength - metrics.hitReach;
    let low = 0;
    let high = placed.length;
    while (low < high) {
        const mid = (low + high) >> 1;
        if (placed[mid].top < from) low = mid + 1;
        else high = mid;
    }
    const pointerIndex = LANE_INDEX[pointerLane];
    let best = -1;
    let bestDistance = metrics.hitReach;
    for (let index = low; index < placed.length; index += 1) {
        const { top, length, span } = placed[index];
        if (top > y + metrics.hitReach) break;
        const alongRail = y < top ? top - y : y > top + length ? y - top - length : 0;
        const distance = alongRail + Math.abs(LANE_INDEX[laneOfKind(span.kind)] - pointerIndex) * metrics.lanePenalty;
        if (distance <= bestDistance) {
            best = index;
            bestDistance = distance;
        }
    }
    return best;
};
