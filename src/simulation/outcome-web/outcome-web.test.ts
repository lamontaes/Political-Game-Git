import { describe, expect, it } from "vitest";
import { UNRESEARCHED_UNEMPLOYMENT_EFFECT } from "../crime/causes";
import type { EntityId, IsoDate, World } from "../types";
import { makeIsoDate } from "../dates";
import {
  monthsBefore,
  webAdjustedRate,
  webFactor,
  type MeasureRead,
} from "./combine";
import type { OutcomeLink, OutcomeLinksFile } from "./contract";
import { outcomeLinkProblems, outcomeLinks } from "./links";
import { OUTCOME_MEASURES } from "./registry";

const WORLD = {} as World;
const PLACE = "place:test" as EntityId;
const ASOF = makeIsoDate("2030-06-15");

function link(overrides: Partial<OutcomeLink>): OutcomeLink {
  return {
    id: "test",
    from: "economy.unemployment-rate",
    to: "safety-net.poverty-rate",
    direction: "up",
    size: 0.1,
    effect: "relative",
    unit: "test",
    shape: "linear",
    lagMonths: 0,
    fullMonths: 0,
    who: "everyone",
    strength: "moderate",
    provenance: "researched",
    sourceKey: "test",
    ownerLane: "F",
    ...overrides,
  };
}

const table = (...links: OutcomeLink[]): OutcomeLinksFile => ({
  version: "test",
  about: "test",
  directEffects: [],
  links,
});

/** A reader from a function of months before `ASOF`. */
const reader =
  (
    values: Record<string, (monthsAgo: number) => number | null>,
    baselines: Record<string, number> = {},
  ): MeasureRead =>
  (_world, key, _place, asOf) => {
    const series = values[key];
    if (!series) return null;
    let monthsAgo = 0;
    while (monthsBefore(ASOF, monthsAgo) > asOf) monthsAgo += 1;
    const value = series(monthsAgo);
    return value === null
      ? null
      : { value, baseline: baselines[key] ?? 0, provenance: "recorded" };
  };

describe("the outcome links table", () => {
  it("is valid, names only defined measures and has every about-zero link as zero", () => {
    const file = outcomeLinks();
    expect(outcomeLinkProblems(file)).toEqual([]);
    expect(file.links.length).toBeGreaterThan(0);
    const aboutZero = file.links.filter((row) => row.strength === "about-zero");
    expect(aboutZero.map((row) => row.id).sort()).toEqual(
      [
        "coverage->blood-pressure-control",
        "unemployment->mortality",
        "work-requirement->employment",
      ].sort(),
    );
    const defined = new Set(OUTCOME_MEASURES.map((row) => row.key));
    for (const row of file.links) {
      expect(defined.has(row.from) && defined.has(row.to)).toBe(true);
    }
  });

  it("refuses a link that moves itself, repeats a direct effect, loops in one month or sizes an about-zero effect", () => {
    const direct: OutcomeLinksFile = {
      ...table(
        link({
          id: "a",
          from: "law.medicaid-expansion",
          to: "health.coverage",
        }),
      ),
      directEffects: [
        {
          from: "law.medicaid-expansion",
          to: "health.coverage",
          ownerLane: "F",
          where: "test",
        },
      ],
    };
    expect(outcomeLinkProblems(direct).join()).toContain(
      "repeats a direct effect",
    );
    expect(
      outcomeLinkProblems(
        table(link({ from: "health.coverage", to: "health.coverage" })),
      ).join(),
    ).toContain("moves its own cause");
    expect(
      outcomeLinkProblems(
        table(
          link({
            id: "a",
            from: "safety-net.poverty-rate",
            to: "health.coverage",
          }),
          link({
            id: "b",
            from: "health.coverage",
            to: "safety-net.poverty-rate",
          }),
        ),
      ).join(),
    ).toContain("in the same month");
    // The same loop with a lag is allowed: it fades rather than repeating at once.
    expect(
      outcomeLinkProblems(
        table(
          link({
            id: "a",
            from: "safety-net.poverty-rate",
            to: "health.coverage",
            lagMonths: 1,
            fullMonths: 1,
          }),
          link({
            id: "b",
            from: "health.coverage",
            to: "safety-net.poverty-rate",
          }),
        ),
      ),
    ).toEqual([]);
    expect(
      outcomeLinkProblems(
        table(link({ strength: "about-zero", size: 0.2 })),
      ).join(),
    ).toContain("about zero");
    expect(
      outcomeLinkProblems(table(link({ from: "nowhere.at-all" }))).join(),
    ).toContain("no lane defines");
  });
});

describe("combining causes", () => {
  it("moves nothing through an about-zero link, whatever the cause does", () => {
    for (const row of outcomeLinks().links.filter(
      (l) => l.strength === "about-zero",
    )) {
      for (const value of [0, 5, 50, 500]) {
        const reading = webFactor(WORLD, row.to, PLACE, ASOF, {
          links: table(row),
          read: reader({ [row.from]: () => value }, { [row.from]: 1 }),
        });
        expect(reading.factor).toBe(1);
        expect(reading.points).toBe(0);
        expect(reading.chain[0]!.status).toBe("about-zero");
      }
    }
  });

  it("treats an unknown cause as unknown and an unsized link as moving nothing, never as zero", () => {
    const reading = webFactor(WORLD, "safety-net.poverty-rate", PLACE, ASOF, {
      links: table(
        link({ id: "known-unrecorded" }),
        link({
          id: "unsized",
          from: "economy.minimum-wage",
          size: null,
          provenance: "provisional",
        }),
      ),
      read: reader({}),
    });
    expect(reading.factor).toBe(1);
    expect(reading.chain.map((step) => step.status)).toEqual([
      "unknown-cause",
      "unsized",
    ]);
  });

  it("keeps the crime rules' unemployment effect exactly as it was", () => {
    const file = outcomeLinks();
    for (const [offense, size] of Object.entries(
      UNRESEARCHED_UNEMPLOYMENT_EFFECT.perPointAbove,
    )) {
      const row = file.links.find((l) => l.to === `safety.crime.${offense}`)!;
      expect(row.size).toBe(size);
      expect(row.baseline).toBe(UNRESEARCHED_UNEMPLOYMENT_EFFECT.baselinePct);
      for (const unemployment of [2, 4, 7.5, 40]) {
        const reading = webFactor(WORLD, row.to, PLACE, ASOF, {
          read: reader(
            { "economy.unemployment-rate": () => unemployment },
            { "economy.unemployment-rate": 5 },
          ),
        });
        const expected = Math.min(
          2,
          Math.max(0.5, 1 + (unemployment - 4) * size),
        );
        expect(reading.factor).toBeCloseTo(expected, 12);
      }
    }
  });

  it("applies each shape: threshold, diminishing, exposure-years, acute-decay and moderated", () => {
    const at = (row: OutcomeLink, values: MeasureRead) =>
      webFactor(WORLD, row.to, PLACE, ASOF, {
        links: table(row),
        read: values,
      });
    // Threshold: nothing below 22, one slope to 32, a steeper one after.
    const threshold = link({
      shape: "threshold",
      effect: "points",
      size: 1,
      thresholds: [22, 32],
      slopes: [0.1, 0.3],
    });
    const burden = (value: number) =>
      reader(
        { "economy.unemployment-rate": () => value },
        { "economy.unemployment-rate": 15 },
      );
    expect(at(threshold, burden(20)).points).toBeCloseTo(0, 12);
    expect(at(threshold, burden(30)).points).toBeCloseTo(0.8, 12);
    expect(at(threshold, burden(40)).points).toBeCloseTo(1 + 2.4, 12);
    // Diminishing: an elasticity on the ratio; doubling counts less than twice a 50% rise.
    const elastic = link({
      shape: "diminishing",
      direction: "down",
      size: 0.34,
    });
    const officers = (value: number) =>
      reader(
        { "economy.unemployment-rate": () => value },
        { "economy.unemployment-rate": 100 },
      );
    expect(at(elastic, officers(110)).factor).toBeCloseTo(
      1 - 0.34 * Math.log(1.1),
      12,
    );
    const doubled = 1 - at(elastic, officers(200)).factor;
    const half = 1 - at(elastic, officers(150)).factor;
    expect(doubled).toBeLessThan(2 * half);
    // Exposure-years: capped at the years that count.
    const years = link({
      shape: "exposure-years",
      effect: "points",
      size: 0.5,
      maxYears: 12,
    });
    const exposed = (value: number) =>
      reader({ "economy.unemployment-rate": () => value });
    expect(at(years, exposed(10)).points).toBeCloseTo(5, 12);
    expect(at(years, exposed(18)).points).toBeCloseTo(6, 12);
    // Acute-decay: a one-month hit fades.
    const hit = link({
      shape: "acute-decay",
      effect: "points",
      size: 1,
      decayMonths: 1,
    });
    const hitAgo = (ago: number) =>
      reader({ "economy.unemployment-rate": (m) => (m === ago ? 1 : 0) });
    const now = at(hit, hitAgo(0)).points;
    const later = at(hit, hitAgo(2)).points;
    expect(now).toBeCloseTo(1, 12);
    expect(later).toBeCloseTo(Math.exp(-2), 12);
    expect(at(hit, hitAgo(12)).points).toBe(0);
    // Moderated: air conditioning removes 75% of the harm where every home has it.
    const heat = link({
      shape: "moderated",
      effect: "points",
      size: 1,
      moderator: { measure: "health.coverage", mode: "offset", share: 0.75 },
    });
    const withShare = (share: number) =>
      reader({
        "economy.unemployment-rate": () => 10,
        "health.coverage": () => share,
      });
    expect(at(heat, withShare(0)).points).toBeCloseTo(10, 12);
    expect(at(heat, withShare(1)).points).toBeCloseTo(2.5, 12);
    expect(
      at(heat, reader({ "economy.unemployment-rate": () => 10 })).chain[0]!
        .status,
    ).toBe("unknown-cause");
  });

  it("builds a change in over the link's window instead of all at once", () => {
    // The cause steps from 0 to 10 three months ago; the link is felt from 0 to 11 months.
    const row = link({
      effect: "points",
      size: 1,
      lagMonths: 0,
      fullMonths: 11,
    });
    const step = reader({
      "economy.unemployment-rate": (m) => (m <= 3 ? 10 : 0),
    });
    const reading = webFactor(WORLD, row.to, PLACE, ASOF, {
      links: table(row),
      read: step,
    });
    expect(reading.points).toBeCloseTo((4 * 10) / 12, 12);
  });

  it("lets a loop fade after a shock instead of running away", () => {
    // A pushes B up next month and B pushes A up next month, well under one full pass.
    const links = table(
      link({
        id: "a-to-b",
        from: "safety-net.poverty-rate",
        to: "health.depression",
        effect: "relative",
        size: 0.02,
        lagMonths: 1,
        fullMonths: 1,
      }),
      link({
        id: "b-to-a",
        from: "health.depression",
        to: "safety-net.poverty-rate",
        effect: "relative",
        size: 0.02,
        lagMonths: 1,
        fullMonths: 1,
      }),
    );
    const base = { "safety-net.poverty-rate": 10, "health.depression": 20 };
    const series: Record<string, number[]> = {
      "safety-net.poverty-rate": [],
      "health.depression": [],
    };
    const start = makeIsoDate("2030-01-15");
    const monthIndex = (asOf: IsoDate) => {
      let index = 0;
      while (monthsBefore(asOf, index) > start) index += 1;
      return index;
    };
    const read: MeasureRead = (_w, key, _p, asOf) => {
      const value = series[key]?.[monthIndex(asOf)];
      return value === undefined
        ? null
        : {
            value,
            baseline: base[key as keyof typeof base],
            provenance: "calibrated",
          };
    };
    for (let month = 0; month < 60; month += 1) {
      const asOf = monthsBefore(makeIsoDate("2035-01-15"), 60 - month);
      for (const key of Object.keys(base) as (keyof typeof base)[]) {
        const shock = key === "safety-net.poverty-rate" && month === 0 ? 5 : 0;
        const reading = webFactor(WORLD, key, PLACE, asOf, { links, read });
        series[key]!.push(webAdjustedRate(base[key] + shock, reading));
      }
    }
    const poverty = series["safety-net.poverty-rate"]!;
    expect(Math.max(...poverty)).toBeLessThan(20);
    expect(Math.abs(poverty.at(-1)! - 10)).toBeLessThan(0.01);
  });
});
