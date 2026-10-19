/* global process, console */
// M7-02's check: a save made in a drawn place loads to the same world, and a
// save from an older build (another core version, a command this build no
// longer knows) still loads and keeps playing with every dollar balanced.
// Usage: CORE2_BOOKKEEPING=0 node --import tsx scripts/core2-year/saves.mjs [--seed S]
// Under the golden-path runner it takes GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY,
// and exits 1 when any check fails.
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
const { drawPlace } = await at("scripts/core2-year/place.ts");
const { loadGame, newGame, runCommand, saveGame } =
  await at("src/core2/saves.ts");
const { residentsRuntime } = await at("src/core2/modules/residents.ts");
const seed = value(
  "--seed",
  process.env.GOLDEN_PATH_SEED ??
    (await import("node:crypto")).randomBytes(16).toString("hex"),
);
const givenKey = process.env.GOLDEN_PATH_PLACE_KEY;
const place = givenKey
  ? { seed, key: givenKey, name: givenKey, state: "" }
  : drawPlace(seed, "core2-saves");

const digest = (core) => {
  const hash = createHash("sha256");
  hash.update(core.date);
  for (const [id, row] of core.people) hash.update(`${id}:${row.liquidMinor};`);
  for (const [id, row] of core.organizations)
    hash.update(`${id}:${row.liquidMinor};`);
  hash.update(String(core.cashJournal.nextSequence));
  return hash.digest("hex");
};
const balance = (core) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  ) +
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass, detail });

// Play: two weeks, meet (fill in) a counted resident, two more weeks.
const recipe = {
  place: { seed: place.seed, key: place.key },
  twoLevel: true,
  settings: { population: 1500 },
  preStart: false,
};
const game = newGame(recipe);
const start = game.core.date;
const plus = (days) => {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
runCommand(game, "advance", { through: plus(14) });
const counted = [...residentsRuntime(game.core).households.values()].find(
  (row) => row.people.length,
);
if (counted) runCommand(game, "fill-in", { personId: counted.people[0].id });
runCommand(game, "advance", { through: plus(28) });

// Same build: the save round-trips through JSON to the same world.
const save = JSON.parse(JSON.stringify(saveGame(game)));
const same = loadGame(save);
check(
  "a save loads to the same world",
  same.skipped.length === 0 &&
    same.core.date === game.core.date &&
    digest(same.core) === digest(game.core),
  `${save.commands.length} commands replayed to ${same.core.date}`,
);

// An older build's save: another core version, plus a command this build
// no longer has. It loads, records what it skipped, and keeps playing.
const older = {
  ...save,
  coreApiVersion: "core2-api-v1",
  commands: [
    ...save.commands,
    { date: save.savedAt, kind: "retired.command", payload: {} },
  ],
};
const upgraded = loadGame(JSON.parse(JSON.stringify(older)));
check(
  "an older build's save loads",
  upgraded.upgradedFrom === "core2-api-v1" &&
    upgraded.skipped.length === 1 &&
    upgraded.skipped[0].command.kind === "retired.command" &&
    digest(upgraded.core) === digest(game.core),
  `upgraded from ${upgraded.upgradedFrom}; skipped ${upgraded.skipped.map((row) => row.command.kind).join(", ")}`,
);
const before = balance(upgraded.core);
runCommand(upgraded, "advance", { through: plus(58) });
check(
  "it keeps playing with every dollar balanced",
  upgraded.core.date === plus(58) && balance(upgraded.core) === before,
  `played on to ${upgraded.core.date}`,
);
const again = loadGame(JSON.parse(JSON.stringify(saveGame(upgraded))));
check(
  "its next save loads under this build",
  again.upgradedFrom === undefined &&
    digest(again.core) === digest(upgraded.core),
  `${again.core.date}`,
);

console.log(JSON.stringify({ place: place.name, seed, checks }, null, 1));
const failed = checks.filter((row) => !row.pass);
if (failed.length) {
  console.error(
    `M7-02 saves failed: ${failed.map((row) => row.name).join(", ")}`,
  );
  process.exit(1);
}
