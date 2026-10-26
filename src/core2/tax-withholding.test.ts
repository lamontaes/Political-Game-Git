/**
 * Payroll withholding (audit 12, 13, 14): the base a local row names, the
 * record's tag from the law rows read, and tax on pay to workers who live
 * outside the town, in a random place from all 56.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { lawChain, lawInForce, openLaws } from "./modules/laws";
import { openBudgets, withholdingOf } from "./modules/budgets";
import { scheduleTax, withholdingFor } from "./tax-withholding";
import type { LawInForceAnswer } from "./laws-in-force";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`withholding:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

const none = { governing: null } as unknown as LawInForceAnswer;
function income(
  levels: readonly {
    level: string;
    row: Record<string, unknown>;
  }[],
): LawInForceAnswer {
  return {
    levels: levels.map((l, index) => ({
      level: l.level,
      jurisdiction: `j${index}`,
      row: { id: `row-${l.level}`, estimate: false, ...l.row },
    })),
  } as unknown as LawInForceAnswer;
}
const state = {
  level: "state",
  row: {
    value: 0,
    unit: "percent-top-rate",
    terms: {
      schedules: { single: { standardDeduction: 10_000, brackets: [] } },
    },
  },
};
const county = (base: string, extra: Record<string, unknown> = {}) => ({
  level: "county",
  row: { value: 2, unit: "percent-flat", terms: { base }, ...extra },
});
const pay = (levels: ReturnType<typeof income>) =>
  withholdingFor({
    paidMinor: 100_000,
    periodDays: 14,
    yearToDateMinor: 0,
    incomeTax: levels,
    socialSecurity: none,
    medicare: none,
  });

describe("withholding by the base a local row names (audit 14)", () => {
  it("taxes wages and AGI rows on the pay, and taxable-income rows after the standard deduction", () => {
    const annual = (100_000 / 100) * (365 / 14);
    const wages = pay(income([state, county("wages")]));
    const agi = pay(income([state, county("AGI")]));
    const taxable = pay(income([state, county("taxable income")]));
    expect(wages[0]!.minor).toBe(
      Math.round(((annual * 2) / 100 / (365 / 14)) * 100),
    );
    expect(agi[0]!.minor).toBe(wages[0]!.minor);
    expect(taxable[0]!.minor).toBe(
      Math.round((((annual - 10_000) * 2) / 100 / (365 / 14)) * 100),
    );
    expect(taxable[0]!.minor).toBeLessThan(wages[0]!.minor);
    expect(taxable[0]!.base).toBe("taxable income");
  });
});

describe("the record's tag follows the law rows read (audit 13)", () => {
  it("a line carries whether its law row is an estimate", () => {
    const estimated = pay(income([county("wages", { estimate: true })]));
    const sourced = pay(income([county("wages")]));
    expect(estimated[0]!.estimate).toBe(true);
    expect(sourced[0]!.estimate).toBe(false);
  });
});

describe("pay to a worker who lives outside the town (audit 12, 13)", () => {
  it("has federal and state tax withheld, balanced on the journal, and the tag follows the rows", () => {
    const states = [...corePlaceStateIdentities()]
      .map((s) => s.jurisdictionKey)
      .sort();
    const placesIn = (stateKey: string) =>
      [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: stateKey,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const home = placesIn(pick(states, `home:${attempt}`));
      if (!home.length) continue;
      const key = pick(home, `place:${attempt}`).key;
      const full = buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 400,
      });
      const worker = [...full.people]
        .filter((p) => p.jobId)
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      if (!worker) continue;
      const core = createLifeCore(
        collapseToTwoLevels({ ...full, playerId: worker.id }),
      );
      openLaws(core);
      openBudgets(core);
      const api = coreAPI(core);
      const town = lawChain(api).townPlaceId;
      // Another place in the same state as the worker's home.
      const away = placesIn(lawChain(api).stateKey).find((p) => p.key !== key);
      if (!away) continue;
      const awayId = away.context.jurisdiction.id;
      const person = core.people.get(worker.id)!;
      (person as { placeId: string }).placeId = awayId;
      const where = `seed ${seed}, town ${key}, worker lives in ${away.key}`;
      const cashBefore = person.placeId;
      expect(cashBefore).not.toBe(town);
      advanceCore(core, "2026-02-20" as never);
      const records = withholdingOf(api, worker.id);
      if (!records.length) continue;
      const lines = records.flatMap((r) => r.lines);
      expect(
        lines.some((l) => l.level === "federal"),
        where,
      ).toBe(true);
      const stateLaw = lawInForce(api, "income-tax").levels.find(
        (l) => l.level === "state",
      );
      const single = (
        stateLaw?.row?.terms?.schedules as
          { single?: Parameters<typeof scheduleTax>[0] } | undefined
      )?.single;
      // A state's schedule taxes pay only above its standard deduction and any
      // zero bracket, so a low-paid worker can owe it nothing.
      const owesState =
        stateLaw?.row &&
        !stateLaw.setAside &&
        (stateLaw.row.value ?? 0) > 0 &&
        !!single?.brackets.length &&
        records.some((r) => {
          const periods = 365 / Math.max(1, r.periodDays);
          const yearly = scheduleTax(single, (r.paidMinor / 100) * periods);
          return Math.round((yearly / periods) * 100) > 0;
        });
      if (owesState)
        expect(
          lines.some((l) => l.level === "state" && l.tax === "income"),
          where,
        ).toBe(true);
      for (const r of records) {
        expect(
          r.postings.reduce((n, p) => n + p.deltaMinor, 0),
          where,
        ).toBe(0);
        const estimated = r.lines.some((l) => l.estimate);
        expect(r.source.tag, where).toBe(estimated ? "ESTIMATED" : "SOURCED");
        if (estimated) expect(r.source.estimatedFrom, where).toBeTruthy();
      }
      return;
    }
    throw new Error(`no employed worker found in forty draws (seed ${seed})`);
  });
});

describe("a state rate changed without a new table", () => {
  it("scales every bracket of the schedule to the row's top rate, and marks the tax graduated", () => {
    const graduated = (value: number) =>
      income([
        {
          level: "state",
          row: {
            value,
            unit: "percent-top-rate",
            terms: {
              schedules: {
                single: {
                  standardDeduction: 0,
                  brackets: [
                    { over: 0, rate: 2 },
                    { over: 10_000, rate: 4 },
                  ],
                },
              },
            },
          },
        },
      ]);
    const asWritten = pay(graduated(4))[0]!;
    const raised = pay(graduated(4.4))[0]!;
    expect(asWritten.graduated).toBe(true);
    // A 10% higher top rate raises each bracket's rate by 10%.
    expect(raised.minor).toBeCloseTo(asWritten.minor * 1.1, -1);
    expect(raised.minor).toBeGreaterThan(asWritten.minor);
  });
});
