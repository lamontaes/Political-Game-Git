// @vitest-environment node
/**
 * Counted people move between states by the country tier, which the macro
 * module keeps. A world built without it (a small test world) has no tier, so
 * no one moves between states and a month runs without error; the game's own
 * worlds always install the economy, and there the tier holds every state's
 * people. Pinned: Edmore, North Dakota (3822340), world seed
 * counted-moves-without-economy.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { buildPopulation } from "./population";
import { countedMoves } from "./modules/counted-moves";
import { countryFlowsIn } from "./country-model";
import { countryOpened } from "./modules/macro";
import { collapseToTwoLevels } from "./residents";
import { coreAPI } from "./state";

const PLACE = "3822340";
const SEED = "counted-moves-without-economy";

it("a world without the economy has no tier and a month runs with no state moves (Edmore, North Dakota)", () => {
  setBookkeeping(false);
  const full = buildPopulation({
    seed: SEED,
    placeKey: PLACE,
    startedAt: "2026-01-05",
    minimumPeople: 400,
  });
  const player = [...full.people]
    .filter((p) => 2026 - Number(p.birthDate.slice(0, 4)) >= 18)
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const core = createLifeCore(
    collapseToTwoLevels({ ...full, playerId: player.id }),
  );
  const api = coreAPI(core);
  expect(core.modules.has("macro"), "no economy installed").toBe(false);
  expect(countryOpened(api)).toBe(false);
  expect(countryFlowsIn(api).states).toEqual([]);
  // The first of the next month is a counted-moves month.
  advanceCore(core, addDays(makeIsoDate(core.date), 40));
  expect(countedMoves(api)).toEqual([]);
}, 120_000);

it("the game's worlds install the economy and the tier holds every state's people (Edmore, North Dakota)", () => {
  setBookkeeping(false);
  const world = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(world.core);
  expect(world.core.modules.has("macro"), "the game's worlds install it").toBe(
    true,
  );
  // The economy opens on the game's first day.
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 40));
  expect(countryOpened(api)).toBe(true);
  expect(countryFlowsIn(api).states.length).toBeGreaterThan(50);
}, 120_000);
