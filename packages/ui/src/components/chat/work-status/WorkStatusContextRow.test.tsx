import { expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import { I18nProvider } from '@/lib/i18n';
import { computeContextUsage } from './contextUsage';
import { WorkStatusContextRow } from './WorkStatusContextRow';

test('context counts, accessible reading and over-limit alert follow limit changes without a new answer', async () => {
  const dom = new Window({ url: 'http://status.test' });
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom, document: dom.document, navigator: dom.navigator,
    HTMLElement: dom.HTMLElement, Element: dom.Element, Node: dom.Node,
    Event: dom.Event, IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const messages = [{ id: 'answer', role: 'assistant', tokens: { total: 123_456 } }];
  let opened = 0;
  const render = async (limit: number) => {
    const usage = computeContextUsage(messages, limit);
    if (!usage) throw new Error('Missing context usage');
    await act(async () => root.render(<I18nProvider><WorkStatusContextRow
      usage={usage} onClick={() => { opened += 1; }} warming={null} cost={<span>$1.23</span>}
    /></I18nProvider>));
  };
  try {
    await render(240_000);
    expect(container.textContent).toContain('123k / 240k (51%)');
    expect(container.textContent).toContain('$1.23');
    const button = container.querySelector('button');
    expect(button?.getAttribute('aria-label')).toContain('123,456 / 240,000 tokens (51%)');
    await act(async () => button?.click());
    expect(opened).toBe(1);
    expect(container.querySelector('[role="alert"]')).toBeNull();

    await act(async () => root.render(<I18nProvider><WorkStatusContextRow
      usage={{ state: 'measured', totalTokens: 400, limit: 640_000, percent: 0.0625 }} warming={null} cost={null}
    /></I18nProvider>));
    expect(container.textContent).toContain('0k / 640k (0%)');
    expect(container.querySelector('span[aria-label]')?.getAttribute('aria-label')).toContain('400 / 640,000 tokens');

    await render(100_000);
    expect(container.textContent).toContain('123k / 100k (123%)');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Context exceeds this model's limit");
    expect(container.querySelector('span[style*="--status-error"]')?.textContent).toContain('123k / 100k');
    expect(container.querySelector('div[style*="width: 100%"]')?.getAttribute('style')).toContain('--status-error');

    await render(1_000_000);
    expect(container.textContent).toContain('123k / 1000k (12%)');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector('span[style*="--status-error"]')).toBeNull();

    await render(8_000);
    expect(container.textContent).toContain('123k / 8k (1543%)');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();

    await render(123_456);
    expect(container.textContent).toContain('(100%)');
    expect(container.querySelector('[role="alert"]')).toBeNull();

    await act(async () => root.render(<I18nProvider><WorkStatusContextRow
      usage={{ state: 'compacted', limit: 100_000 }} warming={null} cost={null}
    /></I18nProvider>));
    expect(container.textContent).toContain('\u2014');
    expect(container.textContent).not.toContain('123k');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    await dom.happyDOM.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
