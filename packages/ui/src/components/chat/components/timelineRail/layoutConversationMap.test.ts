import { describe, expect, test } from 'bun:test';

import { layoutConversationMap as layoutWith, type ConversationMapMetrics } from './layoutConversationMap';
import type { PlacedRailSpan } from './layoutRailSpans';
import type { RailSpanKind } from './projectRailSpans';

// Round px values: boxes 20 tall with 2 between them, so centers 22 apart fit.
const metrics: ConversationMapMetrics = { boxHeight: 20, boxGap: 2, dotPitch: 5 };
const layoutConversationMap = (placed: readonly PlacedRailSpan[], railHeight = 1000) => layoutWith(placed, railHeight, metrics);

/** A span whose middle sits at `center`. */
const at = (center: number, kind: RailSpanKind): PlacedRailSpan => ({
    span: {
        spanId: `${kind}-${center}`,
        rowKey: 'r',
        turnId: 't',
        messageId: `${kind}-${center}`,
        kind,
        contentChars: 1,
        rowWeight: 10,
        preview: '',
        opensTurn: kind === 'user',
    },
    top: center - 2,
    length: 4,
    overflows: false,
});

const summarize = (placed: readonly PlacedRailSpan[], railHeight?: number) => {
    const { boxes, dots } = layoutConversationMap(placed, railHeight);
    return {
        boxes: boxes.map((box) => [box.kind, placed[box.index].span.spanId, box.center]),
        dots: dots.map((dot) => [dot.kind, dot.center]),
    };
};

describe('layoutConversationMap', () => {
    test('maps every prompt and reply', () => {
        const placed = [
            at(100, 'user'),
            at(130, 'agent'),
            at(160, 'tool'),
            at(200, 'agent'),
            at(300, 'user'),
            at(330, 'reasoning'),
            at(400, 'user'),
            at(450, 'agent'),
            at(500, 'system'),
        ];
        expect(summarize(placed)).toEqual({
            boxes: [
                ['prompt', 'user-100', 100],
                ['reply', 'agent-130', 130],
                ['reply', 'agent-200', 200],
                ['prompt', 'user-300', 300],
                ['prompt', 'user-400', 400],
                ['reply', 'agent-450', 450],
            ],
            dots: [],
        });
    });

    test('a prompt wins over a reply it would overlap', () => {
        expect(summarize([at(100, 'user'), at(110, 'agent'), at(130, 'user')])).toEqual({
            boxes: [['prompt', 'user-100', 100], ['prompt', 'user-130', 130]],
            dots: [['reply', 110]],
        });
    });

    test("a turn's last reply wins over an earlier reply", () => {
        expect(summarize([at(100, 'user'), at(200, 'agent'), at(215, 'agent'), at(300, 'user')])).toEqual({
            boxes: [['prompt', 'user-100', 100], ['reply', 'agent-215', 215], ['prompt', 'user-300', 300]],
            dots: [['reply', 200]],
        });
    });

    test('the earlier prompt wins and the later leaves a dot', () => {
        expect(summarize([at(100, 'user'), at(115, 'user'), at(122, 'user')])).toEqual({
            boxes: [['prompt', 'user-100', 100], ['prompt', 'user-122', 122]],
            dots: [['prompt', 115]],
        });
    });

    test('dots of one kind closer than the pitch merge', () => {
        const { dots } = layoutConversationMap([at(100, 'user'), at(103, 'user'), at(106, 'user'), at(112, 'user')]);
        expect(dots.map((dot) => dot.center)).toEqual([103, 112]);
    });

    test('boxes stay inside the rail and dots keep the span position', () => {
        expect(summarize([at(3, 'user'), at(8, 'agent'), at(198, 'user')], 200)).toEqual({
            boxes: [['prompt', 'user-3', 10], ['prompt', 'user-198', 190]],
            dots: [['reply', 8]],
        });
    });

    test('an empty rail has no map', () => {
        expect(layoutConversationMap([])).toEqual({ boxes: [], dots: [] });
    });
});
