import React from 'react';
import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '@/lib/i18n';
import { SessionWorkSettings } from './SessionWorkSettings';

test('the sidebar archive preference has a searchable, accessible control that defaults off', () => {
  const html = renderToStaticMarkup(<I18nProvider><SessionWorkSettings /></I18nProvider>);
  expect(html).toContain('data-settings-item="sessions.show-archive-button"');
  expect(html).toContain('aria-label="Show archive button on session rows"');
  const row = html.slice(html.indexOf('data-settings-item="sessions.show-archive-button"'));
  expect(row.slice(0, row.indexOf('Show archive button on session rows'))).toContain('aria-pressed="false"');
});
