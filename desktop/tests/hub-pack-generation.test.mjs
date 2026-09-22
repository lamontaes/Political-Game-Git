import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanHubState,
  emptyHubState,
} from "../private-controller/hub-model.mjs";

/**
 * A pack states the kit generation it was composed from, or it does not.
 *
 * The number has to survive two whitelists to reach the activated record: the
 * worker's verification result and this state cleaner. Only the cleaner is
 * reachable from a unit test — private-update-worker.mjs parses argv and
 * installs signal handlers at import, so importing it runs it — so the
 * worker's half is proven by the packaged run, where the activated record
 * either names the generation or does not.
 */

const SHA = "a".repeat(40);

const stateWith = (privatePack) =>
  cleanHubState(
    {
      ...emptyHubState("/repo"),
      tracks: {
        main: {
          branch: "main",
          current: {
            revision: SHA,
            appPath: "/tmp/hub/Our Civic Duty.app",
            version: "0.2.0",
            profile: "internal-art-review",
            architecture: "arm64",
            installedAt: "2026-09-19T00:00:00.000Z",
            clientTreeSha256: "c".repeat(64),
            privatePack,
          },
        },
      },
    },
    "/repo",
  );

test("a pack that states its generation carries it to the record", () => {
  const state = stateWith({
    packId: "fixture-pack",
    manifestSha256: "d".repeat(64),
    generation: 16,
  });
  assert.equal(state.tracks.main.current.privatePack.generation, 16);
});

test("a pack without one verifies and records exactly as before", () => {
  const state = stateWith({
    packId: "fixture-pack",
    manifestSha256: "d".repeat(64),
  });
  const pack = state.tracks.main.current.privatePack;
  assert.deepEqual(Object.keys(pack).sort(), ["manifestSha256", "packId"]);
});

test("a non-integer generation is refused rather than carried", () => {
  const pack = stateWith({
    packId: "fixture-pack",
    manifestSha256: "d".repeat(64),
    generation: "sixteen",
  }).tracks.main.current.privatePack;
  assert.equal("generation" in pack, false);
});

test("each game version keeps its own compatible artwork path", () => {
  const state = stateWith({
    packId: "fixture",
    manifestSha256: "d".repeat(64),
  });
  state.privatePackPath = "/packs/new-preview";
  state.tracks.main.privatePackPath = "/packs/github-main";
  const reloaded = cleanHubState(state);
  assert.equal(reloaded.privatePackPath, "/packs/new-preview");
  assert.equal(reloaded.tracks.main.privatePackPath, "/packs/github-main");
  state.tracks.main.privatePackPath = "relative-path";
  assert.equal(cleanHubState(state).tracks.main.privatePackPath, undefined);
});
