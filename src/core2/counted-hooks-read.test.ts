import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { paydayLaw } from "./counted-money";
import { BUDGETS_MODULE_ID } from "./modules/budgets";
import { residentsRuntime } from "./modules/residents";
import { countedStateGrowth } from "./modules/counted-moves";
import { regionalMonth, regionOfPlace } from "./modules/regional";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// The counted-group hooks are read by another engine (one model, two tiers):
// the budgets engine withholds tax from counted pay into the treasuries, and
// the regional engine moves a region's population by the state's counted
// totals. Retirement re-rating and counted births are shown by
// residents.test.ts ("pays counted and filled-in retirees at the benefit level
// in force") and births-counted.test.ts. The played bench world, a place drawn from all 56 on a seed nobody
// chose, three months of days, every module installed.
const seed = process.env.COUNTED_HOOKS_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "counted-hooks");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core as unknown as CoreState;
const api = coreAPI(core);
const before = core.date;
advanceCore(core, addDays(makeIsoDate(core.date), 95));

describe(`counted hooks read by other engines (${place.name}, seed ${seed})`, () => {
  it("counted pay is withheld on each payday into the treasuries, and the budgets engine keeps no second pooled path", () => {
    const rt = residentsRuntime(core)!;
    expect(rt.funded, "groups hold their own accounts").toBe(true);
    const withheld = [...rt.withheld.entries()];
    expect(withheld.length, `${place.name} from ${before}`).toBeGreaterThan(0);
    for (const [key, minor] of withheld) {
      expect(minor, key).toBeGreaterThan(0);
      expect(key.split("|").length, key).toBe(4);
    }
    const treasuries = paydayLaw(api)!.accounts;
    // A paid-leave premium is keyed by its law; the rest by the government paid.
    const paid = new Set(
      withheld
        .filter(([key]) => key.split("|")[3] !== "paid-leave")
        .map(([key]) => key.split("|")[2]!),
    );
    expect(paid.size, "a government paid by withholding").toBeGreaterThan(0);
    for (const jurisdiction of paid)
      expect(treasuries.has(jurisdiction), jurisdiction).toBe(true);
    // The old pooled-account withholding is gone: no record carries its id.
    const old = api
      .moduleState(BUDGETS_MODULE_ID)
      .table("withholding")
      .rows()
      .filter((row) => String(row.id).startsWith("withholding:counted:"));
    expect(old).toEqual([]);
  });

  it("the regional engine moves a region's population by the state's counted totals", () => {
    const placeId = world.placeId as string;
    const region = regionOfPlace(placeId);
    expect(region, `${place.name}'s region`).toBeTruthy();
    const growth = countedStateGrowth(core, place.state.replace(/^US-/, ""));
    expect(growth, "two months of counted totals").toBeDefined();
    const months: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const d = new Date(`${core.date.slice(0, 7)}-01T00:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }
    const rows = months
      .map((month) => regionalMonth(api, placeId, month))
      .filter((row) => row !== undefined);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const ratio = rows[0]!.population / rows[1]!.population;
    // The latest step used the counted growth of its own moment; a region
    // follows its state's counts, not its own unemployment term.
    expect(Math.abs(ratio - 1)).toBeLessThan(0.2);
    expect(ratio).not.toBeNaN();
  });
});
