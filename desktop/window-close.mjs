/**
 * Close every window through the ordinary close path.
 *
 * A timeout is not persistence. The promise reports whether the windows
 * actually closed; a blocked or unfinished flush leaves them open and the
 * caller must not quit or claim a safe update.
 */

export function waitForWindowClose(win, close, nowClosed, timeoutMs) {
  return new Promise((resolve) => {
    if (nowClosed()) return resolve(true);
    let settled = false;
    const finish = (closed) => {
      if (settled) return;
      settled = true;
      resolve(closed);
    };
    const timer = setTimeout(() => finish(nowClosed()), timeoutMs);
    win.once("closed", () => {
      clearTimeout(timer);
      finish(true);
    });
    close();
  });
}

export async function windowsAllClosed(windows, timeoutMs) {
  const results = await Promise.all(
    windows.map((win) =>
      waitForWindowClose(
        win,
        () => {
          if (!win.isDestroyed()) win.close();
        },
        () => win.isDestroyed(),
        timeoutMs,
      ),
    ),
  );
  return results.every(Boolean);
}
