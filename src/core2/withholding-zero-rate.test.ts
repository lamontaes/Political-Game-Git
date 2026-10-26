import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { appliedOn } from "./law-reach/applied";
import { withholdingOf } from "./modules/budgets";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import { coreAPI } from "./state";

// A zero state income-tax rate that keeps its table stops collecting: named
// paychecks and counted groups read the same rate in force.
const seed = process.env.ZERO_RATE_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 20;

describe(`a state income tax set to zero with its schedule kept (seed ${seed})`, () => {
  it("collects nothing from later named and counted paychecks while the federal tax still comes off", () => {
    const tried: string[] = [];
    for (let i = 0; i < DRAWS; i += 1) {
      const place = drawPlace(`${seed}:${i}`, "zero-rate-withholding");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const stateLevel = lawChain(api).levels.find((l) => l.level === "state")!;
      const row = lawInForce(api, "income-tax").levels.find(
        (l) => l.level === "state" && !l.setAside,
      )?.row;
      const schedules = row?.terms?.schedules as
        { single?: { brackets?: unknown[] } } | undefined;
      if (!row || !(row.value ?? 0) || !schedules?.single?.brackets?.length) {
        tried.push(`${where}: no state income tax schedule in force`);
        continue;
      }
      advanceCore(core, addDays(makeIsoDate(core.date), 35));
      const stateLines = (from: string) =>
        [...core.people.keys()].flatMap((id) =>
          withholdingOf(api, id)
            .filter((w) => w.date >= from)
            .flatMap((w) =>
              w.lines.filter((l) => l.level === "state" && l.tax === "income"),
            ),
        );
      const federalLines = (from: string) =>
        [...core.people.keys()].flatMap((id) =>
          withholdingOf(api, id)
            .filter((w) => w.date >= from)
            .flatMap((w) => w.lines.filter((l) => l.level === "federal")),
        );
      if (!stateLines(core.startedAt).length) {
        tried.push(`${where}: no named paycheck withheld the state tax`);
        continue;
      }
      const repealed = enactLaw(api, {
        jurisdiction: stateLevel.jurisdiction,
        level: "state",
        series: "income-tax",
        value: 0,
        unit: row.unit ?? "percent-top-rate",
        effectiveDate: addDays(makeIsoDate(core.date), 1),
        measureId: "zero-rate-test",
        citation: "Test act: the state income tax set to zero, schedule kept",
        terms: { ...row.terms },
      });
      const from = repealed.effectiveDate;
      advanceCore(core, addDays(makeIsoDate(core.date), 45));
      expect(
        lawInForce(api, "income-tax").levels.find((l) => l.level === "state")
          ?.row?.id,
        where,
      ).toBe(repealed.id);
      // No named paycheck after the zero rate takes effect pays state income tax.
      expect(
        stateLines(from).map((l) => `${l.lawId} ${l.minor}`),
        `${where}: state income tax withheld after ${from}`,
      ).toEqual([]);
      // Counted groups read the same rate: no income-tax row cites the zero law with money.
      expect(
        appliedOn(api, "income-tax").filter(
          (r) => r.lawId === repealed.id && r.amountMinor > 0,
        ),
        `${where}: counted or named rows citing ${repealed.id}`,
      ).toEqual([]);
      // Other levels still balance: the federal tax came off those same paychecks.
      expect(
        federalLines(from).length,
        `${where}: federal withholding after ${from}`,
      ).toBeGreaterThan(0);
      return;
    }
    throw new Error(
      `No drawn place had a state income tax schedule: ${tried.join("; ")}`,
    );
  }, 900_000);
});
