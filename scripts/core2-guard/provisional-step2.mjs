/* global process, console */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runCommand } from "./process.mjs";
import { prepareWorld } from "./month.mjs";
import policies from "./policies.json" with { type: "json" };
const receipt = await runCommand(
  [
    process.execPath,
    "node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "src/core2/tooling/vitest.config.ts",
    "src/core2/focus.test.ts",
  ],
  { cwd: process.cwd(), milliseconds: policies.prMilliseconds },
);
process.stdout.write(receipt.output);
assert.equal(receipt.timedOut, false);
assert.equal(
  receipt.code,
  0,
  "Provisional contact/relationship boundary tests failed",
);
const { input, place } = await prepareWorld({
  seed: process.env.GOLDEN_PATH_SEED,
  placeKey: process.env.GOLDEN_PATH_PLACE_KEY,
});
const { createLifeCore } = await import(
  pathToFileURL(resolve("src/core2/life.ts")).href
);
const core = createLifeCore(input),
  player = core.people.get(input.playerId);
assert.ok(player);
assert.ok(player.knownIds.size > 0, "Generated adult has no known people");
for (const id of player.knownIds) {
  assert.ok(core.people.has(id));
  assert.ok(
    core.knowledgeByPerson.get(player.id)?.has(`person:${id}:name`),
    "Known name has no record",
  );
}
console.log(
  JSON.stringify({
    scope:
      "PROVISIONAL contact boundaries plus generated opening; not the 91-day M0-07 acceptance test",
    seed: input.seed,
    place,
    playerId: player.id,
    knownPeople: player.knownIds.size,
  }),
);
