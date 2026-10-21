import { describe, expect, test } from 'bun:test';

import {
    RAIL_SPAN_CONTENT_CUTOFF,
    findRailSpanAt,
    layoutRailSpans as layoutWith,
    resolveRailMetrics,
    resolveSpanLength,
    type PlacedRailSpan,
    type RailMetrics,
    type RailRowGeometry,
} from './layoutRailSpans';

// Round px values, so the expectations below read as plain arithmetic.
const metrics: RailMetrics = {
    spanWidth: 4,
    laneGap: 1,
    minLength: 3,
    maxLength: 28,
    hitReach: 8,
    lanePenalty: 6,
    gapMax: 7,
    frameMinHeight: 6,
    hairline: 1,
};
const layoutRailSpans = (input: Omit<Parameters<typeof layoutWith>[0], 'metrics'>) => layoutWith({ ...input, metrics });
const findAt = (placed: readonly PlacedRailSpan[], y: number, lane: Parameters<typeof findRailSpanAt>[2]) => findRailSpanAt(placed, y, lane, metrics);
import type { RailSpan, RailSpanKind } from './projectRailSpans';

const span = (spanId: string, rowKey: string, contentChars: number, rowWeight = 10, kind: RailSpanKind = 'agent'): RailSpan => ({
    spanId,
    rowKey,
    turnId: rowKey,
    messageId: spanId,
    kind,
    contentChars,
    rowWeight,
    preview: '',
    opensTurn: false,
});

const rows = (geometry: Record<string, RailRowGeometry>) => (rowKey: string) => geometry[rowKey];

/** One empty span per row, rows `pitch` px apart. */
const evenRows = (count: number, pitch: number) => {
    const spans: RailSpan[] = [];
    const geometry: Record<string, RailRowGeometry> = {};
    for (let index = 0; index < count; index += 1) {
        spans.push(span(`s${index}`, `r${index}`, 0));
        geometry[`r${index}`] = { top: index * pitch, size: pitch };
    }
    return { spans, rowGeometry: rows(geometry) };
};

const placedAt = (top: number, length: number, kind: RailSpanKind = 'agent'): PlacedRailSpan => ({
    span: span(`s${top}-${kind}`, 'r', 1, 10, kind),
    top,
    length,
    overflows: false,
});

describe('resolveRailMetrics', () => {
    test('follows the root font size', () => {
        const normal = resolveRailMetrics(16, 2);
        const larger = resolveRailMetrics(20, 2);
        expect(larger.spanWidth).toBeGreaterThan(normal.spanWidth);
        expect(larger.maxLength).toBeGreaterThan(normal.maxLength);
    });

    test('snaps every size to whole device pixels, at least one', () => {
        for (const ratio of [1, 1.5, 2]) {
            const sizes = resolveRailMetrics(16, ratio);
            for (const value of Object.values(sizes)) {
                expect(Number.isInteger(Math.round(value * ratio * 1000) / 1000)).toBe(true);
                expect(value * ratio).toBeGreaterThanOrEqual(1);
            }
        }
    });
});

describe('resolveSpanLength', () => {
    test('empty content paints the minimum length', () => {
        expect(resolveSpanLength(0, metrics)).toBe(metrics.minLength);
    });

    test('grows continuously on a log scale and clamps at the cutoff', () => {
        const ten = resolveSpanLength(10, metrics);
        const hundred = resolveSpanLength(100, metrics);
        const thousand = resolveSpanLength(1000, metrics);
        expect(ten).toBeGreaterThan(metrics.minLength);
        expect(hundred).toBeGreaterThan(ten);
        expect(thousand).toBeGreaterThan(hundred);
        // Equal steps on the log scale, not on the character count.
        expect(thousand - hundred).toBeLessThan(hundred - ten + 1);
        expect(Math.round(resolveSpanLength(RAIL_SPAN_CONTENT_CUTOFF, metrics) * 1000)).toBe(metrics.maxLength * 1000);
        expect(resolveSpanLength(RAIL_SPAN_CONTENT_CUTOFF * 5, metrics)).toBe(resolveSpanLength(RAIL_SPAN_CONTENT_CUTOFF, metrics));
    });
});

describe('layoutRailSpans', () => {
    test('dense spans keep the minimap scale', () => {
        // Rail spacing 10 px for a 3 px span leaves 7 px of air: nothing to cut.
        const { placed } = layoutRailSpans({ ...evenRows(10, 100), contentHeight: 1000, railHeight: 100 });
        expect(placed.map((entry) => Math.round(entry.top))).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    });

    test('spreads a row between its spans by their weight', () => {
        const { placed } = layoutRailSpans({
            spans: [span('a', 'r1', 0, 10), span('b', 'r1', 0, 10), span('c', 'r1', 0, 30)],
            rowGeometry: rows({ r1: { top: 0, size: 25 } }),
            contentHeight: 25,
            railHeight: 25,
        });
        expect(placed.map((entry) => entry.top)).toEqual([0, 5, 10]);
    });

    test('cuts a long empty stretch short and lets the rest grow', () => {
        const layout = layoutRailSpans({
            spans: [span('a', 'r1', 0), span('b', 'r2', 0), span('c', 'r3', 0)],
            rowGeometry: rows({ r1: { top: 0, size: 100 }, r2: { top: 100, size: 9000 }, r3: { top: 9100, size: 100 } }),
            contentHeight: 10_000,
            railHeight: 100,
        });
        const [a, b, c] = layout.placed;
        // Uncut, b would sit 1 px below a; the cut stretch after b lets the
        // scale grow, so a and b move apart.
        expect(b.top - a.top).toBeGreaterThan(1);
        expect(Math.abs(c.top - (b.top + b.length) - metrics.gapMax)).toBeLessThan(0.001);
        expect(layout.toRail(10_000)).toBeLessThanOrEqual(100);
    });

    test('the frame maps through the same anchors as the spans', () => {
        const layout = layoutRailSpans({
            spans: [span('a', 'r1', 0), span('b', 'r2', 500)],
            rowGeometry: rows({ r1: { top: 0, size: 3000 }, r2: { top: 3000, size: 200 } }),
            contentHeight: 4000,
            railHeight: 200,
        });
        expect(layout.toRail(0)).toBe(layout.placed[0].top);
        expect(layout.toRail(3000)).toBe(layout.placed[1].top);
        // Monotone between anchors.
        expect(layout.toRail(1500)).toBeGreaterThanOrEqual(layout.toRail(1000));
        expect(layout.toRail(3500)).toBeGreaterThanOrEqual(layout.toRail(3000));
    });

    test('marks content past the cutoff', () => {
        const { placed } = layoutRailSpans({
            spans: [span('a', 'r1', RAIL_SPAN_CONTENT_CUTOFF), span('b', 'r1', RAIL_SPAN_CONTENT_CUTOFF + 1)],
            rowGeometry: rows({ r1: { top: 0, size: 100 } }),
            contentHeight: 100,
            railHeight: 100,
        });
        expect(placed.map((entry) => entry.overflows)).toEqual([false, true]);
    });

    test('keeps every span on the rail at its minimum length with tops in order', () => {
        const { placed } = layoutRailSpans({ ...evenRows(80, 10), contentHeight: 800, railHeight: 100 });
        for (let index = 0; index < placed.length; index += 1) {
            const entry = placed[index];
            expect(entry.top + entry.length).toBeLessThanOrEqual(100);
            expect(entry.length).toBeGreaterThanOrEqual(metrics.minLength);
            if (index > 0) expect(entry.top).toBeGreaterThanOrEqual(placed[index - 1].top);
        }
    });

    test('keeps positions in order when the list reports a stale row above the one before it', () => {
        const { placed } = layoutRailSpans({
            spans: [span('a', 'r1', 0), span('b', 'r2', 0), span('c', 'r3', 0)],
            rowGeometry: rows({ r1: { top: 0, size: 100 }, r2: { top: 500, size: 100 }, r3: { top: 200, size: 100 } }),
            contentHeight: 1000,
            railHeight: 100,
        });
        for (let index = 1; index < placed.length; index += 1) {
            expect(placed[index].top).toBeGreaterThanOrEqual(placed[index - 1].top);
        }
    });

    test('leaves out rows the list has not positioned', () => {
        const { placed } = layoutRailSpans({
            spans: [span('a', 'r1', 0), span('b', 'missing', 0)],
            rowGeometry: rows({ r1: { top: 0, size: 100 } }),
            contentHeight: 100,
            railHeight: 100,
        });
        expect(placed.map((entry) => entry.span.spanId)).toEqual(['a']);
    });
});

describe('findRailSpanAt', () => {
    test('a point on a span selects it', () => {
        expect(findAt([placedAt(10, 5), placedAt(40, 5)], 12, 'center')).toBe(0);
    });

    test('the gap between two spans splits at the midpoint', () => {
        const placed = [placedAt(10, 4), placedAt(24, 4)];
        // Gap from 14 to 24; the midpoint is 19.
        expect(findAt(placed, 18, 'center')).toBe(0);
        expect(findAt(placed, 20, 'center')).toBe(1);
    });

    test('the lane under the pointer picks between spans level with each other', () => {
        const placed = [placedAt(10, 10, 'user'), placedAt(10, 10, 'tool')];
        expect(findAt(placed, 15, 'start')).toBe(0);
        expect(findAt(placed, 15, 'end')).toBe(1);
    });

    test('a span in another lane is still reached when nothing is closer', () => {
        expect(findAt([placedAt(10, 10, 'tool')], 15, 'start')).toBe(-1);
        expect(findAt([placedAt(10, 10, 'agent')], 15, 'start')).toBe(0);
    });

    test('overlapping spans in one lane resolve to the later one, which paints on top', () => {
        expect(findAt([placedAt(10, 10), placedAt(14, 10)], 16, 'center')).toBe(1);
    });

    test('a short span is reachable within the hit reach', () => {
        expect(findAt([placedAt(50, metrics.minLength)], 50 - metrics.hitReach + 1, 'center')).toBe(0);
    });

    test('nothing is selected out of reach', () => {
        expect(findAt([placedAt(50, 3)], 50 - metrics.hitReach - 2, 'center')).toBe(-1);
        expect(findAt([], 10, 'center')).toBe(-1);
    });

    test('finds spans after long ones far above', () => {
        const placed = [placedAt(0, metrics.maxLength), ...Array.from({ length: 50 }, (_, index) => placedAt(40 + index * 10, 3))];
        expect(findAt(placed, 341, 'center')).toBe(31);
    });
});
