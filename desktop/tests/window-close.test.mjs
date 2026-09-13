import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import { waitForWindowClose, windowsAllClosed } from "../window-close.mjs";

test("waitForWindowClose is true only when the window actually closed", async () => {
  const closed = new EventEmitter();
  let destroyed = false;
  const win = {
    once: (event, fn) => closed.once(event, fn),
    isDestroyed: () => destroyed,
    close: () => {
      destroyed = true;
      closed.emit("closed");
    },
  };
  assert.equal(
    await waitForWindowClose(
      win,
      () => win.close(),
      () => win.isDestroyed(),
      50,
    ),
    true,
  );
});

test("waitForWindowClose is false when close is blocked past the timeout", async () => {
  const closed = new EventEmitter();
  const win = {
    once: (event, fn) => closed.once(event, fn),
    isDestroyed: () => false,
    close: () => undefined,
  };
  assert.equal(
    await waitForWindowClose(
      win,
      () => win.close(),
      () => win.isDestroyed(),
      40,
    ),
    false,
  );
});

test("windowsAllClosed is false if any window stays open", async () => {
  const closed = new EventEmitter();
  const blocked = {
    once: (event, fn) => closed.once(event, fn),
    isDestroyed: () => false,
    close: () => undefined,
  };
  assert.equal(await windowsAllClosed([blocked], 30), false);
});
