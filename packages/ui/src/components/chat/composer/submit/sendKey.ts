/**
 * What an Enter keypress means in the composer (PRD-031).
 *
 * The composer has two submit actions, not one: "submit" honors the
 * `followUpBehavior` setting (queue the message, or steer it into the running
 * turn), while "submit-now" bypasses both and sends immediately. Whichever send
 * key the user picks, both have to stay reachable — otherwise the queue becomes
 * unreachable from the keyboard.
 */
import type { ComposerSendKey } from '@/stores/useUIStore';

/** The composer surfaces `auto` distinguishes between. */
export interface ComposerSendSurface {
    isMobile: boolean;
    /** Desktop focus mode: the composer expanded to fill the column. */
    isDesktopExpanded: boolean;
}

/** The parts of a keydown this decision reads. */
export interface ComposerSendKeyEvent {
    key: string;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
}

export type ComposerKeyIntent =
    /** Fall through to the editor so Enter inserts a line break. */
    | 'newline'
    /** Submit, honoring `followUpBehavior` (queue or steer). */
    | 'submit'
    /** Submit immediately, bypassing queue and steer. */
    | 'submit-now';

/**
 * `null` means "not this module's business" — the key was not Enter, and the
 * caller should carry on with its other handlers.
 */
export function resolveComposerKeyIntent(
    event: ComposerSendKeyEvent,
    sendKey: ComposerSendKey,
    surface: ComposerSendSurface,
): ComposerKeyIntent | null {
    if (event.key !== 'Enter') return null;

    const withModifier = event.ctrlKey || event.metaKey;

    if (sendKey === 'mod-enter') {
        // Enter is always a line break here, so both submit actions live on the
        // modifier: Ctrl/Cmd+Enter takes over the role plain Enter had, and the
        // send-now escalation moves up to Ctrl/Cmd+Shift+Enter.
        if (!withModifier) return 'newline';
        return event.shiftKey ? 'submit-now' : 'submit';
    }

    // `auto` — the original behavior, unchanged. Shift+Enter is a newline
    // whatever else is held, so Ctrl/Cmd+Shift+Enter stays a newline too.
    if (event.shiftKey) return 'newline';
    if (withModifier) return 'submit-now';
    // Mobile and desktop focus mode are surfaces for composing long prompts,
    // where an accidental send costs more than an extra keypress.
    return surface.isMobile || surface.isDesktopExpanded ? 'newline' : 'submit';
}
