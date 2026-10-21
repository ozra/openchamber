import React from 'react';

import { areModelChoicesEqual, extractSessionRecordModelChoice } from '@/lib/messages/userModelChoice';
import { isAutoModel } from '@/lib/routing/autoModel';
import {
  findAnsweringModelKey,
  limitsForAnsweringModel,
  type ContextWindowLimits,
} from '@/lib/routing/contextWindowLimits';
import { useConfigStore } from '@/stores/useConfigStore';
import { useSelectionStore } from '@/sync/selection-store';
import { useDirectorySync, useSessionSelector } from '@/sync/sync-context';

/**
 * Which model's window the context readouts measure against.
 *
 * A session's saved picker choice applies before send, while its record still
 * names the previous model. Auto names no real model, so its routed session
 * record supplies the limit, with the newest answer as a legacy fallback.
 * A record changed since the composer last followed it outranks a saved manual
 * choice, using the same reconciliation metadata as ModelControls.
 * Only drafts use the global picker; another session's selection must never
 * supply a limit for an existing session.
 */
export const useContextWindowLimits = (sessionId: string | null, directory?: string): ContextWindowLimits => {
  const draftModelKey = useConfigStore((state) => (
    !sessionId && state.currentProviderId && state.currentModelId
      ? `${state.currentProviderId}/${state.currentModelId}`
      : null
  ));
  const providers = useConfigStore((state) => state.providers);
  const selectedModelKey = useSelectionStore(React.useCallback((state) => {
    const selection = sessionId ? state.sessionModelSelections.get(sessionId) : null;
    return selection && !isAutoModel(selection.providerId, selection.modelId)
      ? `${selection.providerId}/${selection.modelId}`
      : null;
  }, [sessionId]));
  const followedModelKey = useSelectionStore(React.useCallback((state) => (
    sessionId ? state.sessionFollowedModels.get(sessionId) : undefined
  ), [sessionId]));

  const recordChoice = useSessionSelector(
    sessionId ?? undefined,
    directory,
    extractSessionRecordModelChoice,
    areModelChoicesEqual,
  );
  const sessionModelKey = recordChoice ? `${recordChoice.providerID}/${recordChoice.modelID}` : null;
  const recordModelKey = sessionModelKey ? `${sessionModelKey}#${recordChoice?.variant ?? ''}` : null;
  const recordModelSwitched = recordModelKey !== null
    && followedModelKey !== undefined && followedModelKey !== recordModelKey;
  // A model key keeps streamed updates on the same model from re-rendering.
  const answeringModelKey = useDirectorySync(
    React.useCallback((state) => (
      sessionId ? findAnsweringModelKey(state.message[sessionId] ?? []) : null
    ), [sessionId]),
    directory,
  );

  return React.useMemo(() => {
    if (selectedModelKey) {
      return limitsForAnsweringModel(recordModelSwitched ? sessionModelKey : selectedModelKey, providers);
    }
    const onRecord = limitsForAnsweringModel(sessionModelKey, providers);
    if (onRecord.context > 0) return onRecord;
    const answering = limitsForAnsweringModel(answeringModelKey, providers);
    if (answering.context > 0) return answering;
    return limitsForAnsweringModel(draftModelKey, providers);
  }, [selectedModelKey, recordModelSwitched, sessionModelKey, answeringModelKey, draftModelKey, providers]);
};
