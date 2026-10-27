import { describe, expect, test } from 'bun:test';

import {
    conversationMapBlanketWidth,
    conversationMapShowsBoxes,
    resolveConversationMapExtentMetrics,
    type ConversationMapRoom,
    type ConversationMapVisibility,
} from './conversationMapVisibility';

// A 16px root font: boxes 208 wide, prompt boxes 40 farther out, with 12 of
// margin, so the map needs 260.
const metrics = resolveConversationMapExtentMetrics(16);
const room = (available: number, viewportWidth = 1400): ConversationMapRoom => ({ available, viewportWidth });
const boxes = (visibility: ConversationMapVisibility, available: number, viewportWidth?: number) => (
    conversationMapShowsBoxes(visibility, room(available, viewportWidth), metrics)
);
const blanket = (visibility: ConversationMapVisibility, available: number, viewportWidth?: number) => (
    conversationMapBlanketWidth(visibility, room(available, viewportWidth), metrics)
);

describe('conversationMapShowsBoxes', () => {
    test('always shows, off never shows', () => {
        expect(boxes('always', 0)).toBe(true);
        expect(boxes('off', 4000)).toBe(false);
    });

    test('always shows before the room is measured; whenRoom waits for it', () => {
        expect(conversationMapShowsBoxes('always', null, metrics)).toBe(true);
        expect(conversationMapShowsBoxes('whenRoom', null, metrics)).toBe(false);
    });

    test('whenRoom needs the room a prompt box takes, and stops short of it', () => {
        expect(boxes('whenRoom', 260)).toBe(true);
        expect(boxes('whenRoom', 259)).toBe(false);
    });

    test('the map reach follows its own viewport clamp', () => {
        // 379 wide: 100vw - 10.75rem is one px under 13rem, so the box narrows
        // with the window and asks for one px less.
        expect(boxes('whenRoom', 259, 379)).toBe(true);
        expect(boxes('whenRoom', 258, 379)).toBe(false);
    });
});

describe('conversationMapBlanketWidth', () => {
    test('spans what the boxes cover', () => {
        expect(blanket('always', 100)).toBe(260);
    });

    test('stays away where the boxes sit beside the messages', () => {
        expect(blanket('always', 260)).toBeNull();
        expect(blanket('whenRoom', 260)).toBeNull();
    });

    test('goes with the boxes, whatever the card covers', () => {
        expect(blanket('off', 100)).toBeNull();
        expect(blanket('whenRoom', 100)).toBeNull();
        expect(conversationMapBlanketWidth('always', null, metrics)).toBeNull();
    });
});
