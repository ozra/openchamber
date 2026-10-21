import { z } from 'zod';

import type { Message, Part, ToolInput } from '@/lib/opencode/model';
import { normalizeToolName } from '@/lib/opencode/tools';

import { isHiddenUserMessage } from '../../message/hiddenUserMessage';
import { normalizeUserDisplayParts } from '../../message/normalizeUserDisplayParts';
import { filterVisibleParts, isEmptyTextPart, normalizeParts } from '../../message/partUtils';
import type { TimelineEntry } from '../../lib/turns/timelineEntries';
import type { ChatMessageEntry } from '../../lib/turns/types';

/** What a span stands for; the lane and the color follow from it. */
export type RailSpanKind = 'user' | 'agent' | 'reasoning' | 'tool' | 'system';

export type RailLane = 'start' | 'center' | 'end';

export interface RailSpan {
    /**
     * Stable across re-projections and unique in the session: the part id for
     * text and reasoning (which carry their message id), `<message id>:<part
     * id>` for a tool call (its part id is the provider's call id, which a
     * provider may repeat across turns), the message id for single-record
     * messages.
     */
    spanId: string;
    /** The list row the span renders in (`TimelineEntry.key`). */
    rowKey: string;
    turnId: string | null;
    messageId: string;
    partId?: string;
    kind: RailSpanKind;
    /** Normalized tool name, for tool spans. */
    toolName?: string;
    toolFailed?: boolean;
    /** Characters of user-visible source text the span represents. */
    contentChars: number;
    /**
     * Rough rendered height in Chat, px. Only its share of the row matters:
     * the list knows where rows are, not where parts sit inside them.
     */
    rowWeight: number;
    /** Plain text for the hover card; empty when the span has no text. */
    preview: string;
    /** The span is the message that opens its turn, so a click jumps to the turn. */
    opensTurn: boolean;
}

const PREVIEW_MAX_CHARS = 200;

// Rendered-height guesses for placing spans inside a row. Text wraps at about
// 90 characters a line in the chat column; tool rows, reasoning blocks and
// notices show a header line whatever their size.
const TEXT_CHARS_PER_LINE = 90;
const TEXT_LINE_PX = 22;
const TEXT_BLOCK_PX = 24;
const TOOL_ROW_PX = 32;
const REASONING_ROW_PX = 44;
const NOTICE_ROW_PX = 32;

export const laneOfKind = (kind: RailSpanKind): RailLane => {
    if (kind === 'user') return 'start';
    if (kind === 'tool') return 'end';
    return 'center';
};

const textWeight = (chars: number): number => TEXT_BLOCK_PX + TEXT_LINE_PX * Math.ceil(chars / TEXT_CHARS_PER_LINE);

const toPreview = (text: string): string => {
    const collapsed = text.replace(/\s+/g, ' ').trim();
    return collapsed.length > PREVIEW_MAX_CHARS ? `${collapsed.slice(0, PREVIEW_MAX_CHARS - 1)}…` : collapsed;
};

/**
 * Size of the tool arguments as the expanded row shows them: each value's
 * JSON, without the top-level keys, which are labels. The log scale makes a
 * string's two quotes irrelevant.
 */
const countInputChars = (input: ToolInput): number => {
    let sum = 0;
    for (const value of Object.values(input)) sum += JSON.stringify(value).length;
    return sum;
};

// The argument that names what a call is about, in the order the preview
// prefers them. A field of another type drops out alone.
const previewField = z.string().optional().catch(undefined);
const toolPreviewSchema = z.object({
    description: previewField,
    path: previewField,
    filePath: previewField,
    command: previewField,
    pattern: previewField,
    query: previewField,
    url: previewField,
    prompt: previewField,
});

const toolPreview = (input: ToolInput): string => {
    for (const value of Object.values(toolPreviewSchema.parse(input))) {
        if (value?.trim()) return toPreview(value);
    }
    return '';
};

const joinedText = (parts: readonly Part[]): string => parts
    .map((part) => (part.type === 'text' ? part.text : part.type === 'file' ? part.filename ?? '' : ''))
    .filter(Boolean)
    .join('\n');

/** The text a single-record message shows; `null` for records Chat does not show as a row of their own. */
const recordText = (info: Message): string | null => {
    switch (info.role) {
        case 'synthetic':
        case 'system':
        case 'skill':
            return info.text;
        case 'shell':
            return `${info.command}\n${info.output?.output ?? ''}`;
        case 'compaction':
            return info.summary;
        case 'agent-switched':
            return info.agent;
        case 'model-switched':
            return info.model.id;
        case 'location-switched':
            return info.directory;
        case 'idle':
        case 'user':
        case 'assistant':
            return null;
    }
};

interface RowContext {
    rowKey: string;
    turnId: string | null;
}

const projectPart = (part: Part, message: ChatMessageEntry, row: RowContext): RailSpan | null => {
    const base = { rowKey: row.rowKey, turnId: row.turnId, messageId: message.info.id, partId: part.id, spanId: part.id, opensTurn: false };
    switch (part.type) {
        case 'text': {
            if (isEmptyTextPart(part)) return null;
            const chars = part.text.length;
            return { ...base, kind: 'agent', contentChars: chars, rowWeight: textWeight(chars), preview: toPreview(part.text) };
        }
        case 'reasoning':
            return { ...base, kind: 'reasoning', contentChars: part.text.length, rowWeight: REASONING_ROW_PX, preview: toPreview(part.text) };
        case 'tool': {
            const { state } = part;
            const output = state.status === 'completed' ? state.output : state.status === 'error' ? `${state.error}${state.output ?? ''}` : '';
            return {
                ...base,
                spanId: `${message.info.id}:${part.id}`,
                kind: 'tool',
                toolName: normalizeToolName(part.tool) || part.tool,
                toolFailed: state.status === 'error',
                contentChars: countInputChars(state.input) + output.length,
                rowWeight: TOOL_ROW_PX,
                preview: toolPreview(state.input),
            };
        }
        case 'file':
        case 'agent':
            return null;
    }
};

const projectMessage = (message: ChatMessageEntry, row: RowContext, includeReasoning: boolean, out: RailSpan[]): void => {
    const { info } = message;
    const base = { rowKey: row.rowKey, turnId: row.turnId, messageId: info.id, spanId: info.id };
    if (info.role === 'user') {
        if (isHiddenUserMessage(message)) {
            const text = joinedText(normalizeParts(message.parts));
            out.push({ ...base, kind: 'system', contentChars: text.length, rowWeight: NOTICE_ROW_PX, preview: toPreview(text), opensTurn: false });
            return;
        }
        const text = joinedText(normalizeUserDisplayParts(normalizeParts(message.parts)));
        out.push({
            ...base,
            kind: 'user',
            contentChars: text.length,
            rowWeight: textWeight(text.length),
            preview: toPreview(text),
            opensTurn: row.turnId === info.id,
        });
        return;
    }
    if (info.role === 'assistant') {
        for (const part of filterVisibleParts(message.parts, { includeReasoning })) {
            const span = projectPart(part, message, row);
            if (span) out.push(span);
        }
        return;
    }
    const text = recordText(info);
    if (text === null) return;
    out.push({
        ...base,
        kind: 'system',
        contentChars: text.length,
        rowWeight: NOTICE_ROW_PX,
        preview: toPreview(text),
        opensTurn: row.turnId === info.id,
    });
};

const projectEntry = (entry: TimelineEntry, includeReasoning: boolean): RailSpan[] => {
    const spans: RailSpan[] = [];
    if (entry.kind === 'ungrouped') {
        projectMessage(entry.message, { rowKey: entry.key, turnId: null }, includeReasoning, spans);
        return spans;
    }
    const row = { rowKey: entry.key, turnId: entry.turn.turnId };
    for (const record of entry.turn.messages) projectMessage(record.message, row, includeReasoning, spans);
    return spans;
};

// The list keeps an unchanged row's entry object across renders
// (`buildHistoryEntries`), so only rows that changed are projected again.
// One cache per reasoning setting, so flipping it never serves stale spans.
const spansByEntry = { shown: new WeakMap<TimelineEntry, RailSpan[]>(), hidden: new WeakMap<TimelineEntry, RailSpan[]>() };

/**
 * Every span of the rendered rows, in transcript order. Reasoning spans
 * follow the "Show reasoning traces" setting, as Chat does.
 */
export const projectRailSpans = (entries: readonly TimelineEntry[], includeReasoning: boolean): RailSpan[] => {
    const cache = includeReasoning ? spansByEntry.shown : spansByEntry.hidden;
    const spans: RailSpan[] = [];
    for (const entry of entries) {
        let entrySpans = cache.get(entry);
        if (!entrySpans) {
            entrySpans = projectEntry(entry, includeReasoning);
            cache.set(entry, entrySpans);
        }
        for (const span of entrySpans) spans.push(span);
    }
    return spans;
};
