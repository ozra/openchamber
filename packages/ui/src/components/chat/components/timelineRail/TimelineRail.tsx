import React from 'react';

import { Icon } from '@/components/icon/Icon';
import { useI18n, type I18nKey } from '@/lib/i18n';
import { getToolLabelColorVar } from '@/lib/toolHelpers';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';

import { useChatColumnActions } from '../../chatColumnSession';
import { registerComposerInsetReader } from '../../composer/state/composerInsetReaders';
import type { ChatMessageEntry } from '../../lib/turns/types';
import type { MessageListHandle, MessageListTimelineLayout } from '../../MessageList';
import {
    findRailSpanAt,
    layoutRailSpans,
    resolveRailMetrics,
    type PlacedRailSpan,
    type RailLayout,
    type RailMetrics,
    type RailRowGeometry,
} from './layoutRailSpans';
import { laneOfKind, projectRailSpans, type RailLane, type RailSpan, type RailSpanKind } from './projectRailSpans';

/** A non-prompt span to jump to. */
export type TimelineRailMessageTarget = {
    /** The turn the message renders in, when it has one. */
    turnId: string | null;
    messageId: string;
    /** The span is the message's reasoning block. */
    reasoning: boolean;
};

type TimelineRailProps = {
    listRef: React.RefObject<MessageListHandle | null>;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    /** The transcript; a new array means its rows may have changed. */
    messages: readonly ChatMessageEntry[];
    activeTurnId: string | null;
    onSelectTurn: (turnId: string) => void;
    onSelectMessage: (target: TimelineRailMessageTarget) => void;
    canLoadEarlier: boolean;
    isLoadingOlder: boolean;
    onLoadEarlier: () => void;
};

// Same gutter as the prompt rail it replaces: the whole gutter is one target,
// and it narrows to the lanes when the message column reaches under it so
// clicks on the end of user bubbles stay with the bubbles.
const GUTTER_WIDTH_REM = 1.75;
// Keeps the rail clear of the chat's overlay scrollbar, which is sized in px
// (6px wide, 4px in).
const GUTTER_END_OFFSET_PX = 14;
const LANES_BY_INDEX: readonly RailLane[] = ['start', 'center', 'end'];
// The hover card stays this far inside the rail's ends, so it never leaves the chat.
const CARD_EDGE_CLEARANCE = '2.5rem';
// The list header in `ChatContainer` is a fixed `h-12` (3rem) slot above the
// rows (chat/lib/scroll/DOCUMENTATION.md); row positions start below it.
const LIST_HEADER_REM = 3;
// A wheel step reported in lines (Firefox), in px.
const WHEEL_LINE_PX = 20;
const CARD_SHOW_DELAY_MS = 220;
const LAYOUT_MIN_INTERVAL_MS = 250;
const CARD_HIDE_DELAY_MS = 160;

const KIND_LABEL_KEYS = {
    user: 'chat.timelineRail.kind.user',
    agent: 'chat.timelineRail.kind.agent',
    reasoning: 'chat.timelineRail.kind.reasoning',
    system: 'chat.timelineRail.kind.system',
} satisfies Record<Exclude<RailSpanKind, 'tool'>, I18nKey>;

/** Fill of a span: the same theme tokens its message-prefix label uses (OCH-011). */
const spanColor = (span: RailSpan): string => {
    switch (span.kind) {
        case 'user':
            return 'var(--surface-foreground)';
        case 'agent':
            return 'color-mix(in srgb, var(--surface-foreground) 45%, transparent)';
        case 'reasoning':
            return 'var(--tools-label-thinking, var(--tools-title))';
        case 'tool':
            return span.toolFailed ? 'var(--status-error)' : getToolLabelColorVar(span.toolName ?? '');
        case 'system':
            return 'var(--surface-muted-foreground)';
    }
};

// Lanes are offsets with background between them; color carries most of the
// difference.
const lanePitch = (metrics: RailMetrics): number => metrics.spanWidth + metrics.laneGap;
const lanesWidth = (metrics: RailMetrics): number => lanePitch(metrics) * 2 + metrics.spanWidth;
const laneOffset = (metrics: RailMetrics, lane: RailLane): number => LANES_BY_INDEX.indexOf(lane) * lanePitch(metrics);

const readRootFontPx = (): number => Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;

const readMetrics = (): RailMetrics => resolveRailMetrics(readRootFontPx(), window.devicePixelRatio);

const isSameMetrics = (a: RailMetrics, b: RailMetrics): boolean => (
    a.spanWidth === b.spanWidth && a.laneGap === b.laneGap && a.minLength === b.minLength && a.maxLength === b.maxLength
    && a.hitReach === b.hitReach && a.lanePenalty === b.lanePenalty && a.gapMax === b.gapMax && a.frameMinHeight === b.frameMinHeight
    && a.hairline === b.hairline
);

const spanStyle = (placed: PlacedRailSpan, metrics: RailMetrics): React.CSSProperties => {
    const color = spanColor(placed.span);
    const dash = metrics.spanWidth / 2;
    return {
        top: placed.top,
        height: placed.length,
        insetInlineStart: laneOffset(metrics, laneOfKind(placed.span.kind)),
        width: metrics.spanWidth,
        // System and control records are dashed, so they read apart from
        // user input by shape as well as tone.
        background: placed.span.kind === 'system'
            ? `repeating-linear-gradient(to bottom, ${color} 0 ${dash}px, transparent ${dash}px ${dash * 2}px)`
            : color,
        // An edge in the span's own hue mixed toward the chat background,
        // drawn outside the fill so the span keeps its width; it takes a
        // device pixel of the lane gap. Where calls of one kind sit back to
        // back, each start shows.
        boxShadow: `0 0 0 ${metrics.hairline}px color-mix(in srgb, ${color} 45%, var(--surface-background))`,
    };
};

const overflowMarkerStyle = (placed: PlacedRailSpan, metrics: RailMetrics): React.CSSProperties => {
    const dot = Math.max(metrics.laneGap, metrics.spanWidth / 2);
    return {
        top: placed.top + placed.length + metrics.laneGap,
        height: dot * 5,
        insetInlineStart: laneOffset(metrics, laneOfKind(placed.span.kind)) + (metrics.spanWidth - dot) / 2,
        width: dot,
        backgroundImage: `radial-gradient(circle, ${spanColor(placed.span)} 45%, transparent 55%)`,
        backgroundSize: `${dot}px ${dot * 1.5}px`,
    };
};

const readRowGeometry = (state: MessageListTimelineLayout['state'], headerPx: number) => (rowKey: string): RailRowGeometry | undefined => {
    const index = state.indexByKey(rowKey);
    if (index === undefined) return undefined;
    const top = state.positionAtIndex(index);
    if (!Number.isFinite(top)) return undefined;
    // Sizes are known only for measured rows; the next row's position also
    // covers rows the list has placed from its estimate. Past the window the
    // list is updating, a position can be stale and the difference negative.
    const nextTop = state.positionAtIndex(index + 1);
    const size = Number.isFinite(nextTop) ? nextTop - top : state.sizeAtIndex(index) ?? 0;
    return { top: top + headerPx, size: Math.max(0, size) };
};

const isSamePlacement = (previous: readonly PlacedRailSpan[], next: readonly PlacedRailSpan[]): boolean => {
    if (previous.length !== next.length) return false;
    for (let index = 0; index < next.length; index += 1) {
        const a = previous[index];
        const b = next[index];
        if (a.span !== b.span || Math.abs(a.top - b.top) > 0.25 || Math.abs(a.length - b.length) > 0.25) return false;
    }
    return true;
};

type RailSpanMarkProps = {
    id: string;
    label: string;
    style: React.CSSProperties;
    overflowStyle: React.CSSProperties | undefined;
    selected: boolean;
    current: boolean;
};

// One span. Memoized with stable style objects, so moving the highlight
// re-renders the two spans it moves between, not every span on the rail. The
// ring and the dimming of the others come from CSS (`aria-selected` and the
// lanes' `data-dimmed`).
const RailSpanMark = React.memo(function RailSpanMark({ id, label, style, overflowStyle, selected, current }: RailSpanMarkProps) {
    return (
        <>
            <div
                id={id}
                role="option"
                aria-selected={selected}
                aria-current={current ? 'true' : undefined}
                aria-label={label}
                className={cn(
                    'absolute rounded-full opacity-85 transition-opacity duration-150',
                    'group-data-[dimmed=true]/lanes:opacity-40',
                    'aria-selected:z-10 aria-selected:!opacity-100',
                    'aria-selected:[outline:var(--rail-ring)_solid_var(--surface-foreground)] aria-selected:[outline-offset:var(--rail-ring)]',
                )}
                style={style}
            />
            {overflowStyle ? (
                <div
                    aria-hidden="true"
                    className="absolute opacity-85 transition-opacity duration-150 group-data-[dimmed=true]/lanes:opacity-40"
                    style={overflowStyle}
                />
            ) : null}
        </>
    );
});

export function TimelineRail({
    listRef,
    scrollRef,
    messages,
    activeTurnId,
    onSelectTurn,
    onSelectMessage,
    canLoadEarlier,
    isLoadingOlder,
    onLoadEarlier,
}: TimelineRailProps) {
    const { t, direction } = useI18n();
    const idPrefix = React.useId();
    // The toggle shortcut drives the main chat's rail; a pinned column's rail
    // neither opens on it nor closes it.
    const { pinned } = useChatColumnActions();
    const isKeyboardNavOpen = useUIStore((state) => (pinned ? false : state.isPromptNavigatorPanelOpen));
    const setPromptNavigatorPanelOpen = useUIStore((state) => state.setPromptNavigatorPanelOpen);
    const showReasoningTraces = useUIStore((state) => state.showReasoningTraces);
    const showReasoningTracesRef = React.useRef(showReasoningTraces);
    showReasoningTracesRef.current = showReasoningTraces;

    const navRef = React.useRef<HTMLElement | null>(null);
    const trackRef = React.useRef<HTMLDivElement | null>(null);
    const frameRef = React.useRef<HTMLDivElement | null>(null);
    const lanesRef = React.useRef<HTMLDivElement | null>(null);
    const [placed, setPlaced] = React.useState<PlacedRailSpan[]>([]);
    const placedRef = React.useRef(placed);
    placedRef.current = placed;
    const [metrics, setMetrics] = React.useState(readMetrics);
    const metricsRef = React.useRef(metrics);
    metricsRef.current = metrics;
    const toRailRef = React.useRef<RailLayout['toRail'] | null>(null);
    const [highlightedIndex, setHighlightedIndex] = React.useState<number | null>(null);
    const highlightedIndexRef = React.useRef(highlightedIndex);
    highlightedIndexRef.current = highlightedIndex;
    const [isNarrowGutter, setIsNarrowGutter] = React.useState(false);

    const setNavRef = React.useCallback((node: HTMLElement | null) => {
        navRef.current = node;
        return registerComposerInsetReader(node);
    }, []);

    // Shrink the hit zone whenever the message column reaches under the
    // full-width gutter, so bubble clicks (expand/collapse) stay clickable.
    React.useEffect(() => {
        const container = navRef.current?.parentElement;
        if (!container) return;
        const measure = () => {
            const column = container.querySelector('.chat-message-column');
            if (!column) {
                setIsNarrowGutter(false);
                return;
            }
            const containerRect = container.getBoundingClientRect();
            const columnRect = column.getBoundingClientRect();
            const fullGutterLeft = containerRect.right - GUTTER_END_OFFSET_PX - GUTTER_WIDTH_REM * readRootFontPx();
            setIsNarrowGutter(columnRect.right > fullGutterLeft);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // The frame follows the scroll on every frame without a React render; it
    // maps through the same anchors as the spans. React never writes its
    // height, so a metrics change cannot overwrite it.
    const updateFrame = React.useCallback(() => {
        const node = scrollRef.current;
        const track = trackRef.current;
        const frame = frameRef.current;
        const toRail = toRailRef.current;
        if (!node || !track || !frame || !toRail) return;
        const start = toRail(node.scrollTop);
        const height = Math.max(metricsRef.current.frameMinHeight, toRail(node.scrollTop + node.clientHeight) - start);
        const top = Math.min(start, track.clientHeight - height);
        frame.style.transform = `translateY(${Math.max(0, top)}px)`;
        frame.style.height = `${height}px`;
    }, [scrollRef]);

    const refreshLayout = React.useCallback(() => {
        const layout = listRef.current?.getTimelineLayout();
        const node = scrollRef.current;
        const track = trackRef.current;
        if (!layout || !node || !track) return;
        // The interface size or the screen's pixel density may have changed.
        const nextMetrics = readMetrics();
        if (!isSameMetrics(metricsRef.current, nextMetrics)) {
            metricsRef.current = nextMetrics;
            setMetrics(nextMetrics);
        }
        const { placed: next, toRail } = layoutRailSpans({
            spans: projectRailSpans(layout.entries, showReasoningTracesRef.current),
            rowGeometry: readRowGeometry(layout.state, LIST_HEADER_REM * readRootFontPx()),
            contentHeight: node.scrollHeight,
            railHeight: track.clientHeight,
            metrics: metricsRef.current,
        });
        toRailRef.current = toRail;
        if (!isSamePlacement(placedRef.current, next)) {
            // The highlight follows its span when spans before it come or go.
            const current = highlightedIndexRef.current;
            const highlightedId = current === null ? undefined : placedRef.current[current]?.span.spanId;
            setPlaced(next);
            if (highlightedId !== undefined) {
                const at = next.findIndex((entry) => entry.span.spanId === highlightedId);
                setHighlightedIndex(at >= 0 ? at : null);
            }
        }
        updateFrame();
    }, [listRef, scrollRef, updateFrame]);

    // Triggers coalesce into one read per animation frame, at most every
    // LAYOUT_MIN_INTERVAL_MS: while a reply streams the content grows on
    // every frame, which rescales every span.
    const layoutFrameRef = React.useRef<number | null>(null);
    const layoutTimerRef = React.useRef<number | null>(null);
    const lastLayoutAtRef = React.useRef(0);
    const scheduleLayout = React.useCallback(() => {
        if (layoutFrameRef.current !== null || layoutTimerRef.current !== null) return;
        const run = () => {
            layoutFrameRef.current = window.requestAnimationFrame(() => {
                layoutFrameRef.current = null;
                lastLayoutAtRef.current = performance.now();
                refreshLayout();
            });
        };
        const wait = lastLayoutAtRef.current + LAYOUT_MIN_INTERVAL_MS - performance.now();
        if (wait <= 0) {
            run();
            return;
        }
        layoutTimerRef.current = window.setTimeout(() => {
            layoutTimerRef.current = null;
            run();
        }, wait);
    }, [refreshLayout]);
    const scrollFrameRef = React.useRef<number | null>(null);
    const scheduleFrame = React.useCallback(() => {
        if (scrollFrameRef.current !== null) return;
        scrollFrameRef.current = window.requestAnimationFrame(() => {
            scrollFrameRef.current = null;
            updateFrame();
        });
    }, [updateFrame]);

    // Rows move when the list places or measures them; the rail is keyed by
    // session, so the list it subscribes to here is the one it lives beside.
    React.useEffect(() => {
        const state = listRef.current?.getTimelineLayout()?.state;
        const node = scrollRef.current;
        const track = trackRef.current;
        const releases: Array<() => void> = [];
        if (state) {
            releases.push(state.listen('lastPositionUpdate', scheduleLayout));
            releases.push(state.listen('totalSize', scheduleLayout));
        }
        if (node) {
            node.addEventListener('scroll', scheduleFrame, { passive: true });
            releases.push(() => node.removeEventListener('scroll', scheduleFrame));
        }
        if (track) {
            const observer = new ResizeObserver(scheduleLayout);
            observer.observe(track);
            releases.push(() => observer.disconnect());
        }
        // Moving the window to a screen of another pixel density resizes it.
        window.addEventListener('resize', scheduleLayout);
        releases.push(() => window.removeEventListener('resize', scheduleLayout));
        scheduleLayout();
        return () => {
            for (const release of releases) release();
            // Cleared as well as cancelled: StrictMode runs this cleanup and
            // mounts again, and a stale id would block every later schedule.
            if (layoutFrameRef.current !== null) window.cancelAnimationFrame(layoutFrameRef.current);
            if (layoutTimerRef.current !== null) window.clearTimeout(layoutTimerRef.current);
            if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
            layoutFrameRef.current = null;
            layoutTimerRef.current = null;
            scrollFrameRef.current = null;
            lastLayoutAtRef.current = 0;
        };
    }, [listRef, scheduleFrame, scheduleLayout, scrollRef]);

    // A part can change without moving any row (a collapsed tool finishing),
    // and the reasoning setting changes which spans exist.
    React.useEffect(() => {
        scheduleLayout();
    }, [messages, scheduleLayout, showReasoningTraces]);

    // The rail sits beside the scroller, not inside it, so a wheel over the
    // rail would scroll nothing. It goes to the scroller: the event first, so
    // its listeners release live follow as for any wheel, then the scroll.
    React.useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        const handleWheel = (event: WheelEvent) => {
            const node = scrollRef.current;
            if (!node) return;
            event.preventDefault();
            node.dispatchEvent(new WheelEvent('wheel', {
                deltaX: event.deltaX,
                deltaY: event.deltaY,
                deltaMode: event.deltaMode,
                clientX: event.clientX,
                clientY: event.clientY,
            }));
            const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
                ? WHEEL_LINE_PX
                : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? node.clientHeight : 1;
            node.scrollBy({ top: event.deltaY * unit });
        };
        track.addEventListener('wheel', handleWheel, { passive: false });
        return () => track.removeEventListener('wheel', handleWheel);
    }, [scrollRef]);

    const showTimerRef = React.useRef<number | null>(null);
    const hideTimerRef = React.useRef<number | null>(null);
    const pointerRef = React.useRef<{ x: number; y: number } | null>(null);
    const cancelShow = React.useCallback(() => {
        if (showTimerRef.current !== null) window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
    }, []);
    const cancelHide = React.useCallback(() => {
        if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
    }, []);
    React.useEffect(() => () => {
        cancelShow();
        cancelHide();
    }, [cancelHide, cancelShow]);

    // The lane under the pointer counts too: pointing at a prompt picks the
    // prompt, not a tool call level with it.
    const spanIndexAt = React.useCallback((clientX: number, clientY: number): number => {
        const lanes = lanesRef.current;
        if (!lanes) return -1;
        const rect = lanes.getBoundingClientRect();
        const fromStart = direction === 'rtl' ? rect.right - clientX : clientX - rect.left;
        const current = metricsRef.current;
        const laneIndex = Math.max(0, Math.min(LANES_BY_INDEX.length - 1, Math.round((fromStart - current.spanWidth / 2) / lanePitch(current))));
        return findRailSpanAt(placedRef.current, clientY - rect.top, LANES_BY_INDEX[laneIndex], current);
    }, [direction]);

    const highlightAt = React.useCallback((clientX: number, clientY: number) => {
        const index = spanIndexAt(clientX, clientY);
        setHighlightedIndex(index >= 0 ? index : null);
    }, [spanIndexAt]);

    const handlePointerMove = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        cancelHide();
        pointerRef.current = { x: event.clientX, y: event.clientY };
        if (highlightedIndexRef.current !== null) {
            highlightAt(event.clientX, event.clientY);
            return;
        }
        // A pointer only passing over the rail must not flash the card open.
        if (showTimerRef.current === null) {
            showTimerRef.current = window.setTimeout(() => {
                showTimerRef.current = null;
                const pointer = pointerRef.current;
                if (pointer) highlightAt(pointer.x, pointer.y);
            }, CARD_SHOW_DELAY_MS);
        }
    }, [cancelHide, highlightAt]);

    const handlePointerLeave = React.useCallback(() => {
        pointerRef.current = null;
        cancelShow();
        cancelHide();
        hideTimerRef.current = window.setTimeout(() => {
            hideTimerRef.current = null;
            setHighlightedIndex(null);
        }, CARD_HIDE_DELAY_MS);
    }, [cancelHide, cancelShow]);

    const closeKeyboardNav = React.useCallback(() => {
        if (!pinned) setPromptNavigatorPanelOpen(false);
    }, [pinned, setPromptNavigatorPanelOpen]);

    const selectSpan = React.useCallback((index: number) => {
        const target = placedRef.current[index]?.span;
        if (!target) return;
        if (target.opensTurn && target.turnId) onSelectTurn(target.turnId);
        else onSelectMessage({ turnId: target.turnId, messageId: target.messageId, reasoning: target.kind === 'reasoning' });
        cancelShow();
        setHighlightedIndex(null);
        closeKeyboardNav();
        trackRef.current?.blur();
    }, [cancelShow, closeKeyboardNav, onSelectMessage, onSelectTurn]);

    // A pointer never focuses the rail, so the keys stay with Chat; only the
    // toggle shortcut focuses it.
    const handleMouseDown = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
    }, []);

    const handleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const index = spanIndexAt(event.clientX, event.clientY);
        if (index >= 0) selectSpan(index);
    }, [selectSpan, spanIndexAt]);

    const activeIndex = React.useMemo(() => {
        if (!activeTurnId) return -1;
        return placed.findIndex((entry) => entry.span.turnId === activeTurnId);
    }, [activeTurnId, placed]);

    // The toggle shortcut flips the store flag; keyboard mode focuses the
    // rail and starts on the active turn (or the end), once spans exist.
    React.useEffect(() => {
        if (!isKeyboardNavOpen || placed.length === 0) return;
        const track = trackRef.current;
        if (!track || track === document.activeElement) return;
        track.focus();
        setHighlightedIndex((current) => current ?? (activeIndex >= 0 ? activeIndex : placed.length - 1));
    }, [activeIndex, isKeyboardNavOpen, placed.length]);

    React.useEffect(() => () => {
        if (!pinned) setPromptNavigatorPanelOpen(false);
    }, [pinned, setPromptNavigatorPanelOpen]);

    const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        const spans = placedRef.current;
        if (spans.length === 0) return;
        const current = highlightedIndexRef.current ?? (activeIndex >= 0 ? activeIndex : spans.length - 1);
        const moveTo = (index: number) => setHighlightedIndex(Math.max(0, Math.min(spans.length - 1, index)));
        // PageUp/PageDown step by prompt, the arrows by span.
        const findPrompt = (step: 1 | -1): number => {
            for (let index = current + step; index >= 0 && index < spans.length; index += step) {
                if (spans[index].span.kind === 'user') return index;
            }
            return current;
        };
        switch (event.key) {
            case 'ArrowUp':
            case 'ArrowDown':
                event.preventDefault();
                moveTo(current + (event.key === 'ArrowUp' ? -1 : 1));
                return;
            case 'PageUp':
            case 'PageDown':
                event.preventDefault();
                moveTo(findPrompt(event.key === 'PageUp' ? -1 : 1));
                return;
            case 'Home':
                event.preventDefault();
                moveTo(0);
                return;
            case 'End':
                event.preventDefault();
                moveTo(spans.length - 1);
                return;
            case 'Enter':
            case ' ':
                event.preventDefault();
                selectSpan(current);
                return;
            case 'Escape':
                event.preventDefault();
                setHighlightedIndex(null);
                closeKeyboardNav();
                trackRef.current?.blur();
        }
    }, [activeIndex, closeKeyboardNav, selectSpan]);

    const handleBlur = React.useCallback(() => {
        cancelShow();
        setHighlightedIndex(null);
        closeKeyboardNav();
    }, [cancelShow, closeKeyboardNav]);

    const kindLabel = React.useCallback((span: RailSpan): string => (
        span.kind === 'tool' ? span.toolName ?? '' : t(KIND_LABEL_KEYS[span.kind])
    ), [t]);
    const emptyPreviewLabel = t('chat.timeline.noTextContent');
    const loadEarlierLabel = t('chat.history.loadOlder');
    const highlighted = highlightedIndex !== null ? placed[highlightedIndex] : undefined;
    const optionId = React.useCallback((span: RailSpan) => `${idPrefix}-span-${span.spanId}`, [idPrefix]);

    // Built once per layout, so a hover re-renders only the spans whose
    // highlight changed.
    const marks = React.useMemo(() => placed.map((entry) => ({
        key: entry.span.spanId,
        id: optionId(entry.span),
        label: t('chat.timelineRail.spanLabel', { kind: kindLabel(entry.span), preview: entry.span.preview || emptyPreviewLabel }),
        style: spanStyle(entry, metrics),
        overflowStyle: entry.overflows ? overflowMarkerStyle(entry, metrics) : undefined,
    })), [emptyPreviewLabel, kindLabel, metrics, optionId, placed, t]);
    const lanesStyle = React.useMemo<React.CSSProperties & Record<'--rail-ring', string>>(() => ({
        width: lanesWidth(metrics),
        '--rail-ring': `${metrics.laneGap}px`,
    }), [metrics]);

    return (
        <nav
            ref={setNavRef}
            aria-label={t('chat.timelineRail.aria')}
            className="pointer-events-none absolute inset-e-3.5 top-3 z-20 flex flex-col items-end"
            // The floating composer and any panel docked on it cover the
            // bottom of the transcript; the rail ends above them.
            style={{ bottom: 'calc(var(--chat-composer-inset, 0px) + var(--chat-floating-panel-clearance, 0px) + 12px)' }}
        >
            {canLoadEarlier ? (
                <button
                    type="button"
                    tabIndex={-1}
                    className={cn(
                        'pointer-events-auto mb-1.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                        'text-muted-foreground transition-colors',
                        'hover:bg-interactive-hover/60 hover:text-foreground',
                        isLoadingOlder ? 'cursor-wait opacity-70' : undefined,
                    )}
                    aria-label={loadEarlierLabel}
                    title={loadEarlierLabel}
                    disabled={isLoadingOlder}
                    onClick={(event) => {
                        event.stopPropagation();
                        if (!isLoadingOlder) onLoadEarlier();
                    }}
                >
                    {isLoadingOlder ? (
                        <Icon name="loader-4" className="size-3.5 animate-spin" />
                    ) : (
                        <Icon name="arrow-up-s" className="size-3.5" />
                    )}
                </button>
            ) : null}
            <div
                ref={trackRef}
                role="listbox"
                tabIndex={-1}
                aria-activedescendant={highlighted ? optionId(highlighted.span) : undefined}
                className="pointer-events-auto relative min-h-0 flex-1 cursor-default outline-none"
                style={{ width: isNarrowGutter ? lanesWidth(metrics) + metrics.laneGap * 2 : `${GUTTER_WIDTH_REM}rem` }}
                onMouseDown={handleMouseDown}
                onMouseMove={handlePointerMove}
                onMouseLeave={handlePointerLeave}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
            >
                <div
                    ref={lanesRef}
                    data-dimmed={highlighted ? 'true' : undefined}
                    className="group/lanes pointer-events-none absolute inset-y-0 inset-e-0"
                    style={lanesStyle}
                >
                    {marks.map((mark, index) => (
                        <RailSpanMark
                            key={mark.key}
                            id={mark.id}
                            label={mark.label}
                            style={mark.style}
                            overflowStyle={mark.overflowStyle}
                            selected={index === highlightedIndex}
                            current={index === activeIndex}
                        />
                    ))}
                </div>
                {/* The part of the transcript Chat shows; presentation only. */}
                <div
                    ref={frameRef}
                    aria-hidden="true"
                    className={cn(
                        'pointer-events-none absolute top-0 rounded-sm',
                        'border border-[var(--surface-foreground)]/30 bg-[var(--surface-foreground)]/[0.06]',
                    )}
                    style={{
                        insetInlineEnd: -metrics.laneGap * 2,
                        width: lanesWidth(metrics) + metrics.laneGap * 4,
                    }}
                />
                {highlighted ? (
                    <div
                        aria-hidden="true"
                        className={cn(
                            'pointer-events-none absolute inset-e-full z-30 me-3 -translate-y-1/2',
                            'w-[min(20rem,calc(100vw-6rem))] rounded-xl px-3 py-2',
                            'oc-glass-popover oc-glass-floating',
                        )}
                        style={{ top: `clamp(${CARD_EDGE_CLEARANCE}, ${highlighted.top + highlighted.length / 2}px, calc(100% - ${CARD_EDGE_CLEARANCE}))` }}
                    >
                        <div className="flex items-center gap-1.5 typography-meta text-muted-foreground">
                            <span
                                className="block size-2 shrink-0 rounded-full"
                                style={{ background: spanColor(highlighted.span) }}
                            />
                            <span className="truncate">{kindLabel(highlighted.span)}</span>
                        </div>
                        <div
                            className={cn(
                                'mt-0.5 line-clamp-3 [overflow-wrap:anywhere] typography-meta',
                                highlighted.span.preview ? 'text-foreground' : 'text-muted-foreground',
                            )}
                            dir="auto"
                        >
                            {highlighted.span.preview || emptyPreviewLabel}
                        </div>
                    </div>
                ) : null}
            </div>
        </nav>
    );
}
