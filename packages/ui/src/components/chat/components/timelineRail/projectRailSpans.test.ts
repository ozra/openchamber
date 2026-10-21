import { describe, expect, test } from 'bun:test';
import type { AssistantMessage, Message, Part, UserMessage } from '@/lib/opencode/model';

import { projectTurnRecords } from '../../lib/turns/projectTurnRecords';
import { buildHistoryEntries, type TimelineEntry } from '../../lib/turns/timelineEntries';
import type { ChatMessageEntry } from '../../lib/turns/types';
import { laneOfKind, projectRailSpans } from './projectRailSpans';

const user = (id: string, text: string): ChatMessageEntry => {
    const info: UserMessage = { id, sessionID: 's', role: 'user', time: { created: 1 } };
    return { info, parts: [{ id: `${id}:text:0`, sessionID: 's', messageID: id, type: 'text', text }] };
};

const assistant = (id: string, parts: Part[]): ChatMessageEntry => {
    const info: AssistantMessage = { id, sessionID: 's', role: 'assistant', time: { created: 1 }, agent: 'build', providerID: 'p', modelID: 'm' };
    return { info, parts };
};

const text = (messageID: string, ordinal: number, value: string): Part => ({
    id: `${messageID}:text:${ordinal}`, sessionID: 's', messageID, type: 'text', text: value,
});

const reasoning = (messageID: string, value: string): Part => ({
    id: `${messageID}:reasoning:0`, sessionID: 's', messageID, type: 'reasoning', text: value, time: { start: 1, end: 2 },
});

const readTool = (messageID: string, callID: string, path: string, output: string): Part => ({
    id: callID,
    sessionID: 's',
    messageID,
    type: 'tool',
    callID,
    tool: 'opencode.read',
    state: { status: 'completed', input: { path }, output, time: { start: 1, end: 2 } },
});

const failedTool = (messageID: string, callID: string): Part => ({
    id: callID,
    sessionID: 's',
    messageID,
    type: 'tool',
    callID,
    tool: 'shell',
    state: { status: 'error', input: { command: 'false' }, error: 'exit 1', time: { start: 1, end: 2 } },
});

const system = (id: string, value: string): ChatMessageEntry => {
    const info: Message = { id, sessionID: 's', role: 'system', time: { created: 1 }, text: value };
    return { info, parts: [] };
};

/** Every turn as a history row, the way the list receives them. */
const rowsOf = (messages: ChatMessageEntry[]): TimelineEntry[] => {
    const projection = projectTurnRecords(messages);
    return buildHistoryEntries({
        staticTurns: projection.turns,
        lastTurnId: projection.lastTurnId,
        turnsWithLaterAssistant: new Set(),
        messages,
        ungroupedMessageIds: projection.ungroupedMessageIds,
        hasStreamingTurn: true,
        trailingEntryFirstMessage: undefined,
    }, []);
};

describe('projectRailSpans', () => {
    test('one span per prompt, reply text, thinking block and tool call, with stable ids', () => {
        const messages = [
            user('u1', 'Fix the parser'),
            assistant('a1', [
                reasoning('a1', 'Look at the tokenizer first'),
                readTool('a1', 'call-1', 'src/parser.ts', 'x'.repeat(50)),
                text('a1', 0, 'Done.'),
            ]),
        ];
        const spans = projectRailSpans(rowsOf(messages), true);

        expect(spans.map((span) => [span.spanId, span.kind])).toEqual([
            ['u1', 'user'],
            ['a1:reasoning:0', 'reasoning'],
            ['a1:call-1', 'tool'],
            ['a1:text:0', 'agent'],
        ]);
        for (const span of spans) {
            expect(span.rowKey).toBe('turn:u1');
            expect(span.turnId).toBe('u1');
        }
        expect(spans[0].opensTurn).toBe(true);
        expect(spans[2]).toMatchObject({ messageId: 'a1', partId: 'call-1', toolName: 'read', preview: 'src/parser.ts' });
    });

    test('counts visible tool input and output as content, without the argument names', () => {
        const spans = projectRailSpans(rowsOf([
            user('u1', 'go'),
            assistant('a1', [readTool('a1', 'call-1', 'abc', 'x'.repeat(40))]),
        ]), true);
        expect(spans[1].contentChars).toBe(JSON.stringify('abc').length + 40);
    });

    test('marks failed tools and puts each kind in its lane', () => {
        const spans = projectRailSpans(rowsOf([
            user('u1', 'go'),
            assistant('a1', [failedTool('a1', 'call-1'), text('a1', 0, 'It failed.')]),
        ]), true);
        expect(spans[1].toolFailed).toBe(true);
        expect(spans.map((span) => laneOfKind(span.kind))).toEqual(['start', 'end', 'center']);
    });

    test('skips empty reply text', () => {
        const spans = projectRailSpans(rowsOf([
            user('u1', 'go'),
            assistant('a1', [text('a1', 0, '   '), text('a1', 1, 'Answer')]),
        ]), true);
        expect(spans.map((span) => span.spanId)).toEqual(['u1', 'a1:text:1']);
    });

    test('a system record before any prompt is its own row and reads as system', () => {
        const spans = projectRailSpans(rowsOf([system('n1', 'Instructions updated'), user('u1', 'go')]), true);
        const notice = spans.find((span) => span.messageId === 'n1');
        expect(notice?.kind).toBe('system');
        expect(notice?.kind).not.toBe('user');
        expect(spans.find((span) => span.messageId === 'u1')?.kind).toBe('user');
    });

    test('leaves reasoning out when reasoning traces are hidden', () => {
        const entries = rowsOf([user('u1', 'go'), assistant('a1', [reasoning('a1', 'hmm'), text('a1', 0, 'Done.')])]);
        expect(projectRailSpans(entries, false).map((span) => span.kind)).toEqual(['user', 'agent']);
        expect(projectRailSpans(entries, true).map((span) => span.kind)).toEqual(['user', 'reasoning', 'agent']);
    });

    test('tool spans stay unique when a provider repeats a call id across turns', () => {
        const spans = projectRailSpans(rowsOf([
            user('u1', 'one'),
            assistant('a1', [readTool('a1', 'call-1', 'x', '')]),
            user('u2', 'two'),
            assistant('a2', [readTool('a2', 'call-1', 'y', '')]),
        ]), true);
        const ids = spans.map((span) => span.spanId);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('reuses the spans of an unchanged row', () => {
        const entries = rowsOf([user('u1', 'one'), user('u2', 'two')]);
        const first = projectRailSpans(entries, true);
        const second = projectRailSpans(entries, true);
        expect(second[0]).toBe(first[0]);
        expect(second[1]).toBe(first[1]);
    });
});
