import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { appliedOn } from "./law-reach/applied";
import { HOUSING_LINE_KEY } from "./law-reach/group-a-money";
import { townShare } from "./law-reach/group-b-money";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { coreAPI } from "./state";
import parameters from "./data/laws/reach-group-a-parameters.json" with { type: "json" };

// A state's housing line above its base is shared across all its people: the
// played town receives the part its own people stand for, not the whole state's
// extra (Rockville, Maryland once took 2,120 vouchers, about a hundred times
// its share).
const seed = process.env.RENT_SHARE_SEED ?? randomBytes(8).toString("hex");

describe(`a state's housing line in one town (seed ${seed})`, () => {
  it("pays the town only the part its own people stand for", () => {
    setBookkeeping(false);
    try {
      const tried: string[] = [];
      for (let i = 0; i < 6; i += 1) {
        const place = drawPlace(`${seed}:${i}`, "rent-help-share");
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const core = world.core;
        const api = coreAPI(core);
        const state = governments(api).find((g) => g.level === "state");
        if (!state || !budgetsOf(api, state.id).length) {
          tried.push(`${where}: no state budget`);
          continue;
        }
        const annual = parameters.parameters.housingAssistanceAnnualMinor.value;
        const vouchers = 1000;
        // Advance a year first, as the family test does, so the leases are in place.
        advanceCore(core, addDays(makeIsoDate(core.date), 120));
        amendBudget(api, {
          governmentId: state.id,
          line: "housing",
          deltaMinor: annual * vouchers,
          measureId: "housing-share-test",
        });
        const share = townShare(api, state);
        const days = 65;
        advanceCore(core, addDays(makeIsoDate(core.date), days));
        const paid = appliedOn(api, HOUSING_LINE_KEY)
          .filter((r) => r.what === "rent-assistance")
          .reduce((n, r) => n + r.amountMinor, 0);
        if (paid <= 0) {
          tried.push(`${where}: nothing paid in ${days} days`);
          continue;
        }
        // At most the town's share of the extra for the months paid (rounded up to whole months).
        const months = Math.ceil(days / 30) + 1;
        const ceiling = (annual * vouchers * share * months) / 12;
        expect(
          paid,
          `${where}: ${paid} paid in ${days} days against a ceiling of ${Math.round(ceiling)} (town share ${share.toFixed(5)} of the state's ${vouchers} vouchers)`,
        ).toBeLessThanOrEqual(ceiling * 1.01 + 1);
        return;
      }
      throw new Error(`no drawn place paid rent help: ${tried.join("; ")}`);
    } finally {
      setBookkeeping(true);
    }
  }, 1_200_000);
});
