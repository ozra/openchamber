/**
 * Where the timeline rail's conversation map boxes show (OCH-046) and how much room they
 * need. The map's own sizes live here because the room check and the blanket
 * that dims the chat under the boxes both take the widest of them.
 */

/** The persisted choices, in the order the Settings chips list them. */
export const CONVERSATION_MAP_VISIBILITIES = ['always', 'whenRoom', 'off'] as const;

export type ConversationMapVisibility = (typeof CONVERSATION_MAP_VISIBILITIES)[number];

/**
 * Rem sizes shared by the map and the blanket under it. `boxViewportRem` is
 * what a box gives up to stay inside a narrow window, so
 * `min(13rem, 100vw - 10.75rem)` reads here in the units the CSS uses.
 */
const MAP_EXTENT_SIZES_REM = {
    /** A reply box. */
    boxWidth: 13,
    /** A prompt box sits this much farther from the rail than a reply box. */
    promptOffset: 2.5,
    /** Free space kept between a box and the rail. */
    boxMargin: 0.75,
    boxViewportRem: 10.75,
};

/** The same sizes as CSS, for the elements painting the map boxes. */
export const CONVERSATION_MAP_BOX_WIDTH_CSS = `min(${MAP_EXTENT_SIZES_REM.boxWidth}rem, 100vw - ${MAP_EXTENT_SIZES_REM.boxViewportRem}rem)`;
export const CONVERSATION_MAP_PROMPT_OFFSET_CSS = `${MAP_EXTENT_SIZES_REM.promptOffset}rem`;

/** The same sizes in px, resolved with the rest of the map's metrics. */
type ConversationMapExtentMetrics = {
    readonly [Key in keyof typeof MAP_EXTENT_SIZES_REM]: number;
};

export const resolveConversationMapExtentMetrics = (rootFontPx: number): ConversationMapExtentMetrics => ({
    boxWidth: MAP_EXTENT_SIZES_REM.boxWidth * rootFontPx,
    promptOffset: MAP_EXTENT_SIZES_REM.promptOffset * rootFontPx,
    boxMargin: MAP_EXTENT_SIZES_REM.boxMargin * rootFontPx,
    boxViewportRem: MAP_EXTENT_SIZES_REM.boxViewportRem * rootFontPx,
});

/** How far from the rail the farthest box, a prompt's, reaches at this viewport width. */
const measureMapExtent = (metrics: ConversationMapExtentMetrics, viewportWidth: number): number => (
    Math.min(metrics.boxWidth, viewportWidth - metrics.boxViewportRem) + metrics.boxMargin + metrics.promptOffset
);

/** What the rail measured beside the transcript. */
export type ConversationMapRoom = {
    /** px of chat column between the rail's start edge and the message column. */
    available: number;
    /** px, for the viewport clamp of the boxes. */
    viewportWidth: number;
};

/**
 * Whether the boxes show. `always` needs no measurement, so the map shows as
 * OCH-044 built it even before the rail has measured the room (`room` null).
 */
export const conversationMapShowsBoxes = (
    visibility: ConversationMapVisibility,
    room: ConversationMapRoom | null,
    metrics: ConversationMapExtentMetrics,
): boolean => {
    if (visibility === 'off') return false;
    if (visibility === 'always') return true;
    return room !== null && room.available >= measureMapExtent(metrics, room.viewportWidth);
};

/**
 * The width of the blanket dimming the chat under the boxes, or null. It goes
 * with the boxes, and only where they reach over the message column; the hover
 * card needs none.
 */
export const conversationMapBlanketWidth = (
    visibility: ConversationMapVisibility,
    room: ConversationMapRoom | null,
    metrics: ConversationMapExtentMetrics,
): number | null => {
    if (!room || !conversationMapShowsBoxes(visibility, room, metrics)) return null;
    const extent = measureMapExtent(metrics, room.viewportWidth);
    return room.available < extent ? extent : null;
};
