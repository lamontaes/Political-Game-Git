/* global URL */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  PLAY_SERVER_SEMI_SPACE_MIB,
  utilityFork,
} from "../play-api-client.mjs";

test("the play server's utility process gets the measured young-generation size", () => {
  const forks = [];
  const fakeUtilityProcess = {
    fork: (hostPath, args, options) => {
      forks.push({ hostPath, args, options });
      return { postMessage() {}, on() {}, kill() {} };
    },
  };
  utilityFork(fakeUtilityProcess)("host.mjs", "/play-api");
  assert.deepEqual(forks[0].options.execArgv, [
    `--max-semi-space-size=${PLAY_SERVER_SEMI_SPACE_MIB}`,
  ]);
  assert.equal(forks[0].options.env.OCD_PLAY_API_ROOT, "/play-api");
});

test("the desktop size equals the guard policy the year was measured with", () => {
  const policies = JSON.parse(
    readFileSync(
      new URL("../../scripts/core2-guard/policies.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(policies.nodeSemiSpaceMiB, PLAY_SERVER_SEMI_SPACE_MIB);
});
