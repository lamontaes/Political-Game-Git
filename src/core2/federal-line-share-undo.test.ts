// @vitest-environment node
/**
 * A federal benefit line's bill stops reaching its recipients when the line
 * goes back to its base: the reach rows it wrote end (Laws and effects, crew
 * line #9747; found by the checker at Howland, Maine, where Medicare, veterans
 * and income security kept their reach open after the line went back). The
 * veterans' benefit is paid by the same rule as Medicare's bills and SSI and
 * food aid (`recordLineShare`). A drawn played world; production budgets and
 * benefit payers run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { advanceCore } from "./life";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "federal-line-share-undo");
const KEY = "budget-line:veterans";
const MEASURE = "H.R. 9005 (veterans, test)";

it(`a federal benefit line's reach ends when the line goes back to its base: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const federal = governments(api).find((g) => g.level === "federal")!;
    const budget = [...budgetsOf(api, federal.id)].sort(
      (a, b) => b.fiscalYear - a.fiscalYear,
    )[0]!;
    const delta = Math.round(budget.spendingMinor.veterans! / 5);
    const amend = (deltaMinor: number, measureId: string) =>
      expect(
        amendBudget(api, {
          governmentId: federal.id,
          line: "veterans",
          deltaMinor,
          measureId,
          carry: true,
        }),
      ).not.toBeNull();
    amend(delta, MEASURE);
    advanceCore(world.core, addDays(makeIsoDate(api.state.date), 40));
    const open = () => appliedOn(api, KEY).filter((r) => r.lawId === MEASURE);
    const reached = open().map((r) => r.targetId);
    // The raise reached the town's veterans, named or counted.
    expect(reached.length).toBeGreaterThan(0);
    amend(-delta, "H.R. 9006 (veterans restored, test)");
    advanceCore(world.core, addDays(makeIsoDate(api.state.date), 40));
    // Back at its base, the bill reaches nobody: every row it wrote has ended.
    expect(open()).toEqual([]);
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        reached: reached.length,
        openAfter: open().length,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 300_000);
