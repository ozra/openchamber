export interface EnterKeyPolicyInput {
    isMobile: boolean;
    isDesktopExpanded: boolean;
    enterToSend: boolean;
    enterToSendConfigured: boolean;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
}

export const shouldSubmitEnter = (input: EnterKeyPolicyInput): boolean => {
    const enterSendsByDefault = !input.isMobile && !input.isDesktopExpanded;
    const isCtrlEnter = input.ctrlKey || input.metaKey;
    if (!input.enterToSendConfigured) {
        return !input.shiftKey && (enterSendsByDefault || isCtrlEnter);
    }
    // PRD-031 (fork): Shift+Enter is a newline whatever else is held. Upstream
    // makes it submit when "Enter sends" is off, which spends the one chord
    // every editor uses for a line break; the fork keeps Ctrl/Cmd+Enter as the
    // only send in that mode.
    const sendsWithEnter = input.enterToSend && !input.shiftKey;

    return isCtrlEnter || sendsWithEnter;
};

export interface EnterModifierState {
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
}

export const restoreDeferredEnterModifiers = (
    event: EnterModifierState,
    modifiers: EnterModifierState,
    preserveShift = true,
): void => {
    if (preserveShift && modifiers.shiftKey) {
        Object.defineProperty(event, 'shiftKey', { value: true });
    }
    if (modifiers.ctrlKey) Object.defineProperty(event, 'ctrlKey', { value: true });
    if (modifiers.metaKey) Object.defineProperty(event, 'metaKey', { value: true });
};
