/**
 * Which rail the chat shows on its end edge while `promptNavigatorEnabled` is
 * on (OCH-047): the fork's timeline rail or upstream's prompt navigator. One
 * at a time, so the toggle shortcut always drives the one that shows.
 */
export const CHAT_RAIL_KINDS = ['timeline', 'prompt'] as const;

export type ChatRailKind = (typeof CHAT_RAIL_KINDS)[number];
