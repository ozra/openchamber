import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OpenCode } from '@opencode/client';

import { installHookTestDom } from '@/components/session/sidebar/test-utils/testDom';
import { opencodeClient } from '@/lib/opencode/client';
import type { Message, Model, Session } from '@/lib/opencode/model';
import { AUTO_MODEL_ID, AUTO_PROVIDER_ID } from '@/lib/routing/autoModel';
import type { ContextWindowLimits } from '@/lib/routing/contextWindowLimits';
import { useConfigStore } from '@/stores/useConfigStore';
import { useSessionWarmingStore } from '@/stores/useSessionWarmingStore';
import { useSelectionStore } from '@/sync/selection-store';
import { SyncProvider, useDirectoryStore } from '@/sync/sync-context';
import { useContextWindowLimits } from './useContextWindowLimits';

const DIRECTORY = '/context-limits';
const OTHER_DIRECTORY = '/context-limits-other';
const SESSION_ID = 'ses_context';
const LARGE = { context: 240_000, output: 32_000 };
const SMALL = { context: 80_000, output: 8_000 };

const model = (id: string, limit: ContextWindowLimits): Model => ({
  id, modelID: id, providerID: 'provider', name: id,
  capabilities: { tools: true, input: ['text'], output: ['text'] },
  variants: [], time: { released: 0 },
  cost: [{ input: 0, output: 0, cache: { read: 0, write: 0 } }],
  status: 'active', enabled: true, limit,
});

const session = (modelId?: string, id = SESSION_ID, directory = DIRECTORY): Session => ({
  id, directory, projectID: 'project', title: id, cost: 0,
  tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  time: { created: 1, updated: 1 },
  model: modelId ? { providerID: 'provider', id: modelId } : undefined,
});

const answer = (modelID = 'large'): Message => ({
  id: 'msg_previous', sessionID: SESSION_ID, role: 'assistant',
  agent: 'build', providerID: 'provider', modelID, time: { created: 1 },
  tokens: { input: 120_000, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
});

const sdk = OpenCode.make({
  baseUrl: 'https://sync.test',
  fetch: async (request) => {
    const path = new URL(request instanceof Request ? request.url : request.toString()).pathname;
    if (path.endsWith('/event')) {
      return new Response(new ReadableStream(), { headers: { 'content-type': 'text/event-stream' } });
    }
    return new Response(JSON.stringify(path.endsWith('/session/active') ? {} : { data: [] }), {
      headers: { 'content-type': 'application/json' },
    });
  },
});

describe('useContextWindowLimits', () => {
  let dom: ReturnType<typeof installHookTestDom>;
  let root: Root;
  let store: ReturnType<typeof useDirectoryStore>;
  let otherStore: ReturnType<typeof useDirectoryStore>;
  let readings: ContextWindowLimits;
  let renders: number;
  let previousConfig: ReturnType<typeof useConfigStore.getState>;
  let previousSelections: ReturnType<typeof useSelectionStore.getState>;
  let restoreSpies: Array<() => void>;
  let previousSurface: typeof window.__OPENCHAMBER_SURFACE__;

  function Probe({ sessionId, directory }: { sessionId: string | null; directory: string }) {
    store = useDirectoryStore(DIRECTORY, { bootstrap: false });
    otherStore = useDirectoryStore(OTHER_DIRECTORY, { bootstrap: false });
    readings = useContextWindowLimits(sessionId, directory);
    renders += 1;
    return null;
  }

  const render = async (sessionId: string | null = SESSION_ID, directory = DIRECTORY) => {
    await act(async () => root.render(
      <SyncProvider sdk={sdk} directory="">
        <Probe sessionId={sessionId} directory={directory} />
      </SyncProvider>,
    ));
  };

  const seed = async (record: Session, messages: Message[] = [answer()]) => {
    await act(async () => store.setState({ session: [record], message: { [record.id]: messages } }));
  };

  const pick = async (modelId: string, sessionId = SESSION_ID) => {
    await act(async () => useSelectionStore.getState().saveSessionModelSelection(sessionId, 'provider', modelId));
  };

  beforeEach(() => {
    dom = installHookTestDom();
    previousSurface = window.__OPENCHAMBER_SURFACE__;
    window.__OPENCHAMBER_SURFACE__ = 'desktop';
    previousConfig = useConfigStore.getState();
    previousSelections = useSelectionStore.getState();
    useConfigStore.setState({
      providers: [{
        id: 'provider', name: 'Provider', activation: 'enabled', package: 'provider',
        models: [model('large', LARGE), model('small', SMALL)],
      }],
      currentProviderId: 'provider', currentModelId: 'large',
    });
    useSelectionStore.setState({ sessionModelSelections: new Map(), sessionFollowedModels: new Map() });
    const spies = [
      spyOn(opencodeClient, 'getFilesystemHomeInfo').mockResolvedValue({ home: '/home' }),
      spyOn(opencodeClient, 'getFilesystemHome').mockResolvedValue('/home'),
      spyOn(opencodeClient, 'getLocation').mockResolvedValue({
        directory: DIRECTORY,
        project: { id: 'project', directory: DIRECTORY, canonical: DIRECTORY },
      }),
      spyOn(opencodeClient, 'getConfig').mockResolvedValue({}),
      spyOn(opencodeClient, 'listProjects').mockResolvedValue([]),
      spyOn(opencodeClient, 'listSessionsPage').mockResolvedValue({ sessions: [], cursor: {} }),
      spyOn(useSessionWarmingStore.getState(), 'refresh').mockResolvedValue(undefined),
    ];
    restoreSpies = spies.map((spy) => () => spy.mockRestore());
    root = createRoot(dom.container);
    renders = 0;
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    restoreSpies.forEach((restore) => restore());
    useConfigStore.setState(previousConfig);
    useSelectionStore.setState(previousSelections);
    window.__OPENCHAMBER_SURFACE__ = previousSurface;
    dom.restore();
  });

  test('manual switches lower and raise the limit before send or a new answer', async () => {
    await render();
    await seed(session('large'));
    const messages = store.getState().message[SESSION_ID];
    expect(readings).toEqual(LARGE);

    await pick('small');
    expect(readings).toEqual(SMALL);
    expect(120_000 / readings.context * 100).toBe(150);
    await pick('large');
    expect(readings).toEqual(LARGE);
    expect(120_000 / readings.context * 100).toBe(50);
    expect(store.getState().session[0].model?.id).toBe('large');
    expect(store.getState().message[SESSION_ID]).toBe(messages);
  });

  test('other session selections and global picker changes cannot supply this session limit', async () => {
    await render();
    await seed(session('large'));
    const settled = renders;
    await pick('small', 'ses_other');
    await act(async () => useConfigStore.setState({ currentModelId: 'small' }));
    expect(readings).toEqual(LARGE);
    expect(renders).toBe(settled);

    await seed(session(), []);
    expect(readings).toEqual({ context: 0, output: 0 });
    await render('ses_other');
    expect(readings).toEqual(SMALL);
    await render();
    expect(readings).toEqual({ context: 0, output: 0 });
  });

  test('read-only chat follows remote model switches using the composer reconciliation metadata', async () => {
    // The composer followed this record before saving its manual choice. Only
    // the readout mounts here; ModelControls never reconciles the remote switch.
    useSelectionStore.getState().markSessionModelFollowed(SESSION_ID, 'provider/large#');
    useSelectionStore.getState().saveSessionModelSelection(SESSION_ID, 'provider', 'large');
    await render();
    await seed(session('large'));
    expect(readings).toEqual(LARGE);
    const messages = store.getState().message[SESSION_ID];
    await act(async () => store.setState({ session: [session('small')] }));
    expect(readings).toEqual(SMALL);
    expect(store.getState().message[SESSION_ID]).toBe(messages);
    // Reading the limit must leave reconciliation for the composer to perform.
    expect(useSelectionStore.getState().isSessionModelSwitched(SESSION_ID, 'provider/small#')).toBe(true);
    expect(useSelectionStore.getState().getSessionModelSelection(SESSION_ID)?.modelId).toBe('large');
    await render('ses_other');
    await render();
    expect(readings).toEqual(SMALL);
  });

  test('an unchanged followed record preserves a genuinely pending manual choice', async () => {
    useSelectionStore.getState().markSessionModelFollowed(SESSION_ID, 'provider/large#');
    await render();
    await seed(session('large'));
    await pick('small');
    expect(readings).toEqual(SMALL);
    await seed({ ...session('large'), time: { created: 1, updated: 2 } });
    expect(readings).toEqual(SMALL);
    await render('ses_other');
    await render();
    expect(readings).toEqual(SMALL);
    // The owner eventually follows a real remote switch, then a new local pick
    // can again take precedence over that unchanged record.
    await seed(session('small'));
    expect(readings).toEqual(SMALL);
    await act(async () => useSelectionStore.getState().markSessionModelFollowed(SESSION_ID, 'provider/small#'));
    await pick('large');
    expect(readings).toEqual(LARGE);
  });

  test('record and answer fallbacks stay scoped to the requested directory', async () => {
    await render();
    await seed(session('large'));
    await act(async () => otherStore.setState({
      session: [session('small', SESSION_ID, OTHER_DIRECTORY)],
      message: { [SESSION_ID]: [answer('small')] },
    }));
    expect(readings).toEqual(LARGE);
    await render(SESSION_ID, OTHER_DIRECTORY);
    expect(readings).toEqual(SMALL);
    await act(async () => otherStore.setState({ session: [] }));
    expect(readings).toEqual(SMALL);
    await render();
    expect(readings).toEqual(LARGE);
  });

  test('Auto follows routed record updates before any new answer and falls back to history', async () => {
    useSelectionStore.getState().markSessionModelFollowed(SESSION_ID, 'provider/large#');
    await render();
    await seed(session('large'));
    await pick('small');
    expect(readings).toEqual(SMALL);
    await act(async () => useSelectionStore.getState().saveSessionModelSelection(
      SESSION_ID, AUTO_PROVIDER_ID, AUTO_MODEL_ID,
    ));
    expect(readings).toEqual(LARGE);
    await seed(session('small'));
    expect(readings).toEqual(SMALL);
    await seed(session('large'));
    expect(readings).toEqual(LARGE);
    await seed(session(), [answer('small')]);
    expect(readings).toEqual(SMALL);
    await seed(session(), []);
    expect(readings).toEqual({ context: 0, output: 0 });
  });

  test('drafts follow the global picker and missing manual metadata stays unknown', async () => {
    await render(null);
    expect(readings).toEqual(LARGE);
    await act(async () => useConfigStore.setState({ currentModelId: 'small' }));
    expect(readings).toEqual(SMALL);
    await act(async () => useConfigStore.setState({ currentProviderId: AUTO_PROVIDER_ID, currentModelId: AUTO_MODEL_ID }));
    expect(readings).toEqual({ context: 0, output: 0 });

    await render();
    await seed(session('large'));
    await pick('not-discovered');
    expect(readings).toEqual({ context: 0, output: 0 });
    await act(async () => useConfigStore.setState((state) => ({
      providers: state.providers.map((provider) => ({ ...provider, models: [...provider.models, model('not-discovered', SMALL)] })),
    })));
    expect(readings).toEqual(SMALL);
  });

  test('same-model streamed updates and repeated selections do not re-render', async () => {
    await render();
    await seed(session('large'));
    await pick('small');
    const settled = renders;
    for (let step = 2; step < 8; step += 1) {
      await seed({ ...session('large'), time: { created: 1, updated: step } });
      await pick('small');
    }
    expect(readings).toEqual(SMALL);
    expect(renders).toBe(settled);
  });
});
