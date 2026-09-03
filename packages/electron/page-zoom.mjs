export const PAGE_ZOOM_MIN = 0.5;
export const PAGE_ZOOM_MAX = 2;
export const PAGE_ZOOM_STEP = 0.05;

export const resolvePageZoomFactor = (factor, direction) => {
  if (direction === 'reset') return 1;
  const percentage = Math.round(factor * 100);
  const nextPercentage = percentage + (direction === 'in' ? 5 : -5);
  return Math.min(PAGE_ZOOM_MAX, Math.max(PAGE_ZOOM_MIN, nextPercentage / 100));
};

export const createPageZoomController = (getWindows) => {
  let factor = 1;

  const applyToWindow = (browserWindow) => {
    if (!browserWindow || browserWindow.isDestroyed()) return false;
    browserWindow.webContents.setZoomFactor(factor);
    return true;
  };

  const change = (direction) => {
    factor = resolvePageZoomFactor(factor, direction);
    for (const browserWindow of getWindows()) {
      applyToWindow(browserWindow);
    }
    return factor;
  };

  return {
    applyToWindow,
    change,
    getFactor: () => factor,
  };
};
