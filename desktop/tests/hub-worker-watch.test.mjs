import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createSilenceWatch,
  silenceNotice,
} from "../private-controller/worker-watch.mjs";

function fakeTimers() {
  const timers = new Map();
  let next = 1;
  return {
    setTimer: (fn, ms) => {
      const id = next++;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
    fire: () => {
      for (const [id, { fn }] of [...timers]) {
        timers.delete(id);
        fn();
      }
    },
    pending: () => timers.size,
  };
}

test("a silent worker produces one notice after the delay", () => {
  const clock = fakeTimers();
  let notices = 0;
  const watch = createSilenceWatch({
    delayMs: 10000,
    onSilent: () => notices++,
    ...clock,
  });
  assert.equal(clock.pending(), 1);
  clock.fire();
  clock.fire();
  assert.equal(notices, 1);
  assert.equal(watch.state, "silent");
});

test("output before the delay cancels the notice", () => {
  const clock = fakeTimers();
  let notices = 0;
  const watch = createSilenceWatch({ onSilent: () => notices++, ...clock });
  watch.heard();
  assert.equal(clock.pending(), 0);
  clock.fire();
  assert.equal(notices, 0);
  assert.equal(watch.state, "heard");
});

test("exit, error or cancellation settles the watch and clears the timer", () => {
  const clock = fakeTimers();
  let notices = 0;
  const watch = createSilenceWatch({ onSilent: () => notices++, ...clock });
  watch.settle();
  assert.equal(clock.pending(), 0);
  watch.heard();
  assert.equal(watch.state, "settled");
  clock.fire();
  assert.equal(notices, 0);
});

test("a late settle after the notice keeps a terminal state", () => {
  const clock = fakeTimers();
  const watch = createSilenceWatch({ onSilent: () => {}, ...clock });
  clock.fire();
  watch.settle();
  assert.equal(watch.state, "settled");
});

test("the notice is qualified and honest about Play", () => {
  const cached = silenceNotice({ hasPlayableBuild: true, seconds: 10 });
  const first = silenceNotice({ hasPlayableBuild: false, seconds: 10 });
  for (const text of [cached, first]) {
    assert.match(text, /If macOS is showing a privacy prompt/);
    assert.match(text, /otherwise the network or disk may be slow/);
    assert.doesNotMatch(text, /Waiting for macOS permission/);
  }
  assert.match(cached, /stays playable/);
  assert.match(first, /no playable build yet/);
  assert.doesNotMatch(first, /unaffected|stays playable/);
});
