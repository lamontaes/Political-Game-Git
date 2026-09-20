/* global EventTarget, Event, CustomEvent, setTimeout, clearTimeout, setImmediate */
import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import {
  hasSavableLife,
  prepareQuit,
  saveOpenLife,
  suspendInteraction,
} from "../private-controller/game-session.mjs";

function page({ active = null, dirty = false, save = true } = {}) {
  const window = new EventTarget();
  if (active !== null)
    window.addEventListener("ocd:query-session", (event) =>
      event.detail.respond(active),
    );
  if (dirty)
    window.addEventListener("beforeunload", (event) => event.preventDefault());
  let saves = 0;
  window.addEventListener("ocd:request-save", (event) => {
    event.preventDefault();
    saves += 1;
    Promise.resolve(save).then(event.detail.complete);
  });
  const root = { inert: false, dataset: {} };
  const contents = {
    isDestroyed: () => false,
    executeJavaScript: (code) =>
      Promise.resolve(
        runInNewContext(code, {
          window,
          document: { documentElement: root },
          Event,
          CustomEvent,
          setTimeout,
          clearTimeout,
        }),
      ),
  };
  return { contents, root, saves: () => saves };
}
const prompts = (save = 0, discard = 0) => ({
  save: () => save,
  discard: () => discard,
  failed: () => {},
});

test("unknown and failed session queries never become clean", async () => {
  assert.equal(await hasSavableLife(page().contents), null);
  assert.equal(
    await hasSavableLife({
      isDestroyed: () => false,
      executeJavaScript: () => Promise.reject(new Error("unavailable")),
    }),
    null,
  );
  let asked = false;
  assert.equal(
    await prepareQuit([{ contents: page().contents, game: true }], {
      ...prompts(),
      discard: () => {
        asked = true;
        return 0;
      },
    }),
    false,
  );
  assert.equal(asked, true);
});
test("save waits for acknowledgment and failure keeps the session", async () => {
  let acknowledge;
  const pending = new Promise((resolve) => {
    acknowledge = resolve;
  });
  const game = page({ active: true, save: pending });
  let finished = false;
  const quitting = prepareQuit(
    [{ contents: game.contents, game: true }],
    prompts(),
  ).then((result) => {
    finished = true;
    return result;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(finished, false);
  acknowledge(false);
  assert.equal(await quitting, false);
  assert.equal(game.saves(), 1);
  assert.equal(await saveOpenLife(page({ save: true }).contents), true);
});
test("bench cancel retains a life even after choosing discard", async () => {
  const game = page({ active: true });
  const bench = page({ dirty: true });
  assert.equal(
    await prepareQuit(
      [
        { contents: game.contents, game: true },
        { contents: bench.contents, game: false },
      ],
      prompts(1, 0),
    ),
    false,
  );
  assert.equal(game.contents.isDestroyed(), false);
  assert.equal(game.saves(), 0);
});
test("the pending exit blocks editing and cancellation restores prior state", async () => {
  const game = page();
  assert.equal(await suspendInteraction(game.contents, true), true);
  assert.equal(game.root.inert, true);
  await suspendInteraction(game.contents, false);
  assert.equal(game.root.inert, false);
  game.root.inert = true;
  await suspendInteraction(game.contents, true);
  await suspendInteraction(game.contents, false);
  assert.equal(game.root.inert, true);
});
