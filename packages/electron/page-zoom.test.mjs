import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPageZoomController,
  PAGE_ZOOM_MAX,
  PAGE_ZOOM_MIN,
  resolvePageZoomFactor,
} from './page-zoom.mjs';

test('page zoom changes in five percentage point steps and resets', () => {
  assert.equal(resolvePageZoomFactor(1, 'in'), 1.05);
  assert.equal(resolvePageZoomFactor(1, 'out'), 0.95);
  assert.equal(resolvePageZoomFactor(1.35, 'reset'), 1);
});

test('page zoom clamps to the supported range', () => {
  assert.equal(resolvePageZoomFactor(PAGE_ZOOM_MAX, 'in'), PAGE_ZOOM_MAX);
  assert.equal(resolvePageZoomFactor(PAGE_ZOOM_MIN, 'out'), PAGE_ZOOM_MIN);
});

test('the controller applies and retains one factor across windows and reloads', () => {
  const appliedA = [];
  const appliedB = [];
  const windowA = {
    isDestroyed: () => false,
    webContents: { setZoomFactor: (factor) => appliedA.push(factor) },
  };
  const windowB = {
    isDestroyed: () => false,
    webContents: { setZoomFactor: (factor) => appliedB.push(factor) },
  };
  const controller = createPageZoomController(() => [windowA, windowB]);

  assert.equal(controller.change('in'), 1.05);
  assert.deepEqual(appliedA, [1.05]);
  assert.deepEqual(appliedB, [1.05]);

  controller.applyToWindow(windowA);
  assert.deepEqual(appliedA, [1.05, 1.05]);
});

test('the controller ignores a destroyed window', () => {
  const controller = createPageZoomController(() => []);
  assert.equal(controller.applyToWindow({ isDestroyed: () => true }), false);
});
