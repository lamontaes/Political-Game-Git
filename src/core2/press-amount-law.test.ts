/**
 * A change to a law's amount (the minimum wage, a tax rate) reaches the paper:
 * the desk sizes its readers' care by how far the amount in force moved.
 * Ohio's state wage ended on April 28, 2025 (the in-force wage fell from
 * $10.70 to $7.25), in a played world from the opening; and a state wage
 * raised in a drawn place from all 56.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { outletsHere, storiesPrinted } from "./modules/press";
import { placeLocalities } from "./places";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

/** The stories any local outlet printed about a wage law taking effect. */
function wageStories(api: ReturnType<typeof coreAPI>) {
  return outletsHere(api).flatMap((outlet) =>
    storiesPrinted(api, outlet.id).filter(
      (story) =>
        story.kind === "law-took-effect" && story.topic === "minimum-wage",
    ),
  );
}

describe(`an amount law in the paper (seed ${seed})`, () => {
  it("prints the end of Ohio's state minimum wage, sized by how far the wage in force fell", () => {
    setBookkeeping(false);
    try {
      const locality = [...placeLocalities("US-OH")].sort((a, b) =>
        a.key.localeCompare(b.key),
      )[0]!;
      const where = `${locality.displayName} (${locality.key}), seed ${seed}:ohio`;
      const { core } = buildBenchWorld(`${seed}:ohio`, gameStartDate(), {
        twoLevel: true,
        placeKey: locality.key,
      });
      const api = coreAPI(core);
      advanceCore(core, makeIsoDate("2025-06-01"));
      const stories = wageStories(api);
      expect(stories.length, `${where}: wage stories printed`).toBeGreaterThan(
        0,
      );
      for (const story of stories) {
        // Before the wage law, the reader care was 0 (the series is no policy topic).
        expect(
          story.pick!.readerCare,
          `${where}: ${story.wireId}`,
        ).toBeGreaterThan(0);
        expect(story.pick!.readerCare, where).toBeLessThanOrEqual(1);
      }
    } finally {
      setBookkeeping(true);
    }
  }, 1_500_000);

  it("prints a state wage raised in a drawn place", () => {
    setBookkeeping(false);
    try {
      const tried: string[] = [];
      for (let draw = 0; draw < 10; draw += 1) {
        const place = drawPlace(`${seed}:${draw}`, "press-amount-law");
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const api = coreAPI(core);
        const stateRow = lawInForce(api, "minimum-wage").levels.find(
          (level) => level.level === "state",
        );
        const jurisdiction = stateRow?.jurisdiction;
        const hasReporter = outletsHere(api).some(
          (o) => o.tier === "local" && o.reporterIds.length > 0,
        );
        if (!jurisdiction || !hasReporter) {
          tried.push(`${where}: no state wage level or no reporter`);
          continue;
        }
        const wage = lawInForce(api, "minimum-wage").value ?? 725;
        const row = enactLaw(api, {
          jurisdiction,
          level: "state",
          series: "minimum-wage",
          value: Math.round(wage * 1.5),
          unit: "minor/hour",
          effectiveDate: addDays(makeIsoDate(core.date), 1),
          measureId: "TEST-WAGE-RAISE",
          citation: "Minimum wage raised for the press test",
        });
        advanceCore(core, addDays(makeIsoDate(core.date), 21));
        const printed = wageStories(api).filter((s) =>
          s.wireId.includes("TEST-WAGE-RAISE"),
        );
        expect(
          printed.length,
          `${where}: no outlet printed ${row.id}`,
        ).toBeGreaterThan(0);
        return;
      }
      throw new Error(`no drawn place could raise a wage: ${tried.join("; ")}`);
    } finally {
      setBookkeeping(true);
    }
  }, 1_500_000);

  it("prints a town's new tax and its repeal, as it prints a wage that moved", () => {
    setBookkeeping(false);
    try {
      const tried: string[] = [];
      for (let draw = 0; draw < 10; draw += 1) {
        const place = drawPlace(`${seed}:${draw}`, "press-new-amount-law");
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const api = coreAPI(core);
        // The town's own level of law, as the law chain names it.
        const townLevel = lawChain(api).levels.at(-1);
        const hasReporter = outletsHere(api).some(
          (o) => o.tier === "local" && o.reporterIds.length > 0,
        );
        if (!townLevel || !hasReporter) {
          tried.push(`${where}: no town or no reporter`);
          continue;
        }
        for (const [value, measureId, effectiveDays] of [
          [1, "TEST-CITY-TAX-NEW", 1],
          [0, "TEST-CITY-TAX-REPEAL", 30],
        ] as const)
          enactLaw(api, {
            jurisdiction: townLevel.jurisdiction,
            level: townLevel.level,
            series: "sales-tax",
            unit: "percent",
            value: value * 1.5,
            effectiveDate: addDays(makeIsoDate(core.date), effectiveDays),
            measureId,
            citation: "A town sales tax for the press test",
          });
        advanceCore(core, addDays(makeIsoDate(core.date), 60));
        const printed = outletsHere(api).flatMap((outlet) =>
          storiesPrinted(api, outlet.id).filter(
            (story) =>
              story.kind === "law-took-effect" && story.topic === "sales-tax",
          ),
        );
        for (const id of ["TEST-CITY-TAX-NEW", "TEST-CITY-TAX-REPEAL"]) {
          const stories = printed.filter((story) => story.wireId.includes(id));
          expect(
            stories.length,
            `${where}: no outlet printed ${id}`,
          ).toBeGreaterThan(0);
          // A tax that begins or ends moves everything it sets, so readers' care is full.
          for (const story of stories)
            expect(story.pick!.readerCare, `${where}: ${id}`).toBe(1);
        }
        return;
      }
      throw new Error(`no drawn place could print a tax: ${tried.join("; ")}`);
    } finally {
      setBookkeeping(true);
    }
  }, 1_500_000);
});
