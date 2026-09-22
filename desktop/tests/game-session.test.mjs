/* global EventTarget, Event, CustomEvent, setTimeout, clearTimeout, setImmediate */
import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import {
  hasSavableLife,
  isIdleTitle,
  prepareQuit,
  saveOpenLife,
  suspendInteraction,
} from "../private-controller/game-session.mjs";

function page({
  active = null,
  dirty = false,
  save = true,
  idleTitle = null,
} = {}) {
  const window = new EventTarget();
  if (idleTitle !== null)
    window.addEventListener("ocd:query-update-boundary", (event) =>
      event.detail.respond(idleTitle),
    );
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
const prompts = (save = 0, discard = 0, unresponsive = 0) => ({
  save: () => save,
  discard: () => discard,
  unresponsive: () => unresponsive,
  failed: () => {},
});
// A hung renderer: executeJavaScript never settles.
const hung = () => {
  let asked = 0;
  return {
    contents: {
      isDestroyed: () => false,
      executeJavaScript: () => {
        asked += 1;
        return new Promise(() => {});
      },
    },
    asked: () => asked,
  };
};
const QUICK = 20;

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

test("a page that never answers the freeze is reported, not awaited", async () => {
  const page = hung();
  assert.equal(await suspendInteraction(page.contents, true, QUICK), null);
  // Restoring a hung page is bounded too, so an abandoned quit can unlock.
  assert.equal(await suspendInteraction(page.contents, false, QUICK), null);
  assert.equal(await suspendInteraction(null, true, QUICK), false);
});

test("a hung bench does not block quit and is never asked twice", async () => {
  const bench = hung();
  const game = page({ active: false });
  const participants = [
    { contents: game.contents, game: true },
    { contents: bench.contents, game: false },
  ];
  let unresponsiveAsked = false;
  const result = await prepareQuit(
    participants,
    {
      ...prompts(),
      unresponsive: () => {
        unresponsiveAsked = true;
        return 0;
      },
    },
    { timeoutMs: QUICK },
  );
  assert.equal(result, true);
  assert.equal(unresponsiveAsked, false);
  assert.equal(participants[1].unresponsive, true);
  assert.equal(bench.asked(), 1);
  // Already known unresponsive (from the freeze): no further questions.
  const again = hung();
  assert.equal(
    await prepareQuit(
      [{ contents: again.contents, game: false, unresponsive: true }],
      prompts(),
      { timeoutMs: QUICK },
    ),
    true,
  );
  assert.equal(again.asked(), 0);
});

test("a hung game asks the owner before its life can be discarded", async () => {
  for (const [choice, expected] of [
    [0, false],
    [1, true],
  ]) {
    const game = hung();
    let asked = 0;
    const participants = [{ contents: game.contents, game: true }];
    const result = await prepareQuit(
      participants,
      {
        ...prompts(),
        discard: () => assert.fail("a hung game uses the unresponsive prompt"),
        unresponsive: () => {
          asked += 1;
          return choice;
        },
      },
      { timeoutMs: QUICK },
    );
    assert.equal(result, expected);
    assert.equal(asked, 1);
    assert.equal(participants[0].unresponsive, true);
  }
});

test("a save that never completes keeps the app open", async () => {
  const game = page({ active: true });
  // The page answers questions but its renderer hangs on the save itself.
  const contents = {
    isDestroyed: () => false,
    executeJavaScript: (code, ...rest) =>
      code.includes("ocd:request-save")
        ? new Promise(() => {})
        : game.contents.executeJavaScript(code, ...rest),
  };
  let failed = false;
  const result = await prepareQuit(
    [{ contents, game: true }],
    { ...prompts(0), failed: () => (failed = true) },
    { timeoutMs: QUICK, saveTimeoutMs: QUICK },
  );
  assert.equal(result, false);
  assert.equal(failed, true);
});

test("the whole quit sequence settles with a hung Art Desk", async () => {
  const game = page({ active: false });
  const bench = hung();
  const participants = [
    { contents: game.contents, game: true },
    { contents: bench.contents, game: false },
  ];
  const suspended = [];
  for (const participant of participants) {
    const answer = await suspendInteraction(participant.contents, true, QUICK);
    assert.notEqual(answer, false);
    if (answer === null) participant.unresponsive = true;
    suspended.push(participant.contents);
  }
  assert.equal(game.root.inert, true);
  assert.equal(
    await prepareQuit(participants, prompts(), { timeoutMs: QUICK }),
    true,
  );
  for (const contents of suspended)
    await suspendInteraction(contents, false, QUICK);
  assert.equal(game.root.inert, false);
});

test("only an explicit idle title permits automatic update, not a clean creator", async () => {
  assert.equal(
    await isIdleTitle(page({ active: false, dirty: false }).contents),
    false,
  );
  assert.equal(
    await isIdleTitle(page({ active: false, idleTitle: false }).contents),
    false,
  );
  assert.equal(
    await isIdleTitle(page({ active: false, idleTitle: true }).contents),
    true,
  );
});
