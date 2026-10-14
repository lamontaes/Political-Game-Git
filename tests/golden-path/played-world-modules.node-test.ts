/**
 * Regression for the played world's government and civic systems
 * (FIXER-EVERY-MODULE-RUNS, Oct 13, 2026): speeches, parties, the executive's
 * desk, officials' staff and interest groups each change their records in a
 * played world, from the world's own schedule and choices, not the player's.
 *
 * Builds the played world (`buildBenchWorld`, two-level, the bench's opening
 * day) in a random place and runs it a month at a time until all five have
 * changed their records, failing any still unchanged after a year. The seed
 * and place are printed; PLAYED_WORLD_SEED or GOLDEN_PATH_SEED repeats a run.
 * Run: node --max-old-space-size=8192 --import tsx --test tests/golden-path/played-world-modules.node-test.ts
 */
import { createHash, randomBytes } from "node:crypto";
import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState } from "../../src/core2/types";
import { SPEECH_MODULE_ID } from "../../src/core2/modules/speech";
import { PARTIES_MODULE_ID } from "../../src/core2/modules/parties";
import { EXECUTIVE_MODULE_ID } from "../../src/core2/modules/executive";
import { STAFF_MODULE_ID } from "../../src/core2/modules/staff";
import { INTEREST_GROUPS_MODULE_ID } from "../../src/core2/modules/interest-groups";

const OPENING_DATE = gameStartDate();
const MODULES = [
  SPEECH_MODULE_ID,
  PARTIES_MODULE_ID,
  EXECUTIVE_MODULE_ID,
  STAFF_MODULE_ID,
  INTEREST_GROUPS_MODULE_ID,
] as const;
const seed =
  process.env.PLAYED_WORLD_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(20).toString("hex");

/** One module's tables, as a hash. */
function records(core: CoreState, moduleId: string): string {
  const module = core.modules.get(moduleId);
  assert.ok(module?.state, `${moduleId} is not installed in the played world`);
  const hash = createHash("sha1");
  const store = coreAPI(core).moduleState(moduleId);
  for (const name of Object.keys(module.state.tables))
    hash.update(name).update(JSON.stringify(store.table(name).rows()));
  return hash.digest("hex");
}

/** The day each module's records first changed, or null if never in a year. */
const changedOn = new Map<string, string | null>();

describe(`played world: government and civic systems run (seed ${seed})`, () => {
  before(() => {
    setBookkeeping(false); // play runs without the debug checks (AGENTS.md)
    const place = drawPlace(seed, "played-world-modules");
    const core = buildBenchWorld(place.seed, OPENING_DATE, {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    console.log(JSON.stringify({ seed, place: place.key }));
    const start = new Map(MODULES.map((id) => [id, records(core, id)]));
    const end = addDays(makeIsoDate(core.date), 366);
    for (const id of MODULES) changedOn.set(id, null);
    while (core.date < end && [...changedOn.values()].includes(null)) {
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      for (const id of MODULES)
        if (changedOn.get(id) === null && records(core, id) !== start.get(id))
          changedOn.set(id, core.date);
    }
    console.log(JSON.stringify(Object.fromEntries(changedOn)));
  });

  for (const [id, what] of [
    [SPEECH_MODULE_ID, "speeches are heard and retold"],
    [PARTIES_MODULE_ID, "parties meet and tie new adults"],
    [EXECUTIVE_MODULE_ID, "the executive acts on what reaches the desk"],
    [STAFF_MODULE_ID, "officials hire staff who do the work"],
    [INTEREST_GROUPS_MODULE_ID, "residents organize and lobby on bills"],
  ] as const)
    it(`${what} (${id})`, () => {
      assert.ok(
        changedOn.get(id),
        `${id}'s records never changed in a year of the played world (seed ${seed}).`,
      );
    });
});
