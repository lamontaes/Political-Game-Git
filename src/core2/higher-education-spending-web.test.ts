import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { govMeasure } from "./gov-measures";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";

// A state that adds to its higher-education line sees more adults with a
// bachelor's degree two years later (outcome-web link
// higher-education-spending-to-college-completion; Deming and Walters 2018).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const KEY = "higher-education-spending-to-college-completion";

it(`a raise in the state's higher-education line moves the share of adults with a degree two years on, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const place = drawPlace(seed, `higher-ed:${attempt}`);
    const where = `${place.name} [${place.key}], seed ${seed}`;
    tried.push(where);
    const { core, placeId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const state = governments(api).find((g) => g.level === "state");
    const line =
      state && budgetsOf(api, state.id).at(-1)?.spendingMinor.higherEducation;
    if (!state || !line) continue;
    const before = govMeasure(api, "budget.higherEducation-added-pct");
    amendBudget(api, {
      governmentId: state.id,
      line: "higherEducation",
      deltaMinor: Math.round(line * 0.1),
      measureId: "test:higher-education",
    });
    const added = govMeasure(api, "budget.higherEducation-added-pct")!;
    expect(added, `${where}: the line reads 10% higher`).toBeCloseTo(
      (before ?? 0) + 10,
      0,
    );
    const lag = WEB_LINKS.find((row) => row.key === KEY)!.lagMonths;
    // The web records the measure each month; the link reads it `lag` months on.
    advanceCore(core, addDays(makeIsoDate(core.date), 31 * (lag + 2)));
    const rows = api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .query("byPlace", [placeId]) as unknown as WebMonth[];
    const moved = rows.filter((row) => (row.effects[KEY] ?? 0) > 0);
    expect(
      moved.length,
      `${where}: the link moved school.college-completion-pct in some month`,
    ).toBeGreaterThan(0);
    const last = moved.sort((a, b) => b.month.localeCompare(a.month))[0]!;
    expect(
      last.values["school.college-completion-pct"]!,
      `${where}: ${last.id}`,
    ).toBeGreaterThan(last.bases["school.college-completion-pct"]!);
    return;
  }
  throw new Error(
    `no drawn place had a state higher-education line (${tried.join("; ")})`,
  );
}, 1_800_000);
