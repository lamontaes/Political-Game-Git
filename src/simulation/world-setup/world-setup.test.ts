import { describe, expect, it } from "vitest";
import { ELECTORAL_ALLOCATION } from "../national-election-rules";
import { SeededRng } from "../rng";
import type { World } from "../types";
import { drawMacroStartingConditions, drawStartingRegime } from "./conditions";
import {
  detExp,
  detLog,
  inverseStandardNormal,
  logistic,
  standardNormal,
} from "./deterministic-math";
import { CRUNCH46_POLICY } from "./policy";
import {
  ELECTORAL_CALIBRATION,
  applySwing,
  generatePoliticalStartingConditions,
} from "./political-start";
import type { StartingRegime } from "./types";

/** Only the seed feeds these generators; no other World field is read. */
const seedWorld = (seed: string) => ({ seed }) as unknown as World;

describe("deterministic math", () => {
  it("matches the platform functions closely without depending on them", () => {
    for (const x of [1e-9, 0.001, 0.046, 0.5, 1, 1.7, 2, 37.5, 1e6]) {
      expect(Math.abs(detLog(x) - Math.log(x))).toBeLessThan(1e-12);
    }
    for (const x of [-30, -2.5, -0.2, 0, 0.3, 1, 4.2, 30]) {
      expect(Math.abs(detExp(x) / Math.exp(x) - 1)).toBeLessThan(1e-12);
    }
    expect(inverseStandardNormal(0.5)).toBe(0);
    expect(inverseStandardNormal(0.975)).toBeCloseTo(1.959964, 5);
    expect(inverseStandardNormal(0.01)).toBeCloseTo(-2.326348, 5);
  });

  it("draws standard normals with the right moments", () => {
    const rng = new SeededRng("world46-normal-moments");
    const draws = Array.from({ length: 40_000 }, () => standardNormal(rng));
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
    const variance =
      draws.reduce((a, b) => a + (b - mean) ** 2, 0) / draws.length;
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(Math.abs(variance - 1)).toBeLessThan(0.03);
  });
});

describe("starting regime and macro kernel (crunch46-provisional-v1)", () => {
  it("draws regimes at the authored frequencies", () => {
    const counts: Record<StartingRegime, number> = {
      "near-reference": 0,
      modest: 0,
      major: 0,
    };
    const n = 6000;
    for (let i = 0; i < n; i += 1) {
      counts[drawStartingRegime(seedWorld(`regime-${i}`))] += 1;
    }
    for (const regime of CRUNCH46_POLICY.regimes.order) {
      const expected = CRUNCH46_POLICY.regimes.frequency[regime];
      expect(Math.abs(counts[regime] / n - expected)).toBeLessThan(0.02);
    }
  });

  it("applies the section 13 startup equations exactly", () => {
    for (const regime of CRUNCH46_POLICY.regimes.order) {
      const macro = drawMacroStartingConditions(seedWorld("macro-a"), regime);
      const scale = CRUNCH46_POLICY.macro.volatilityScale[regime];
      const { cycle, cost, housing, credit } = macro.latents;
      expect(macro.volatilityScale).toBe(scale);
      expect(macro.initial.realGrowthAnnualPct).toBeCloseTo(
        2 + scale * cycle,
        5,
      );
      expect(macro.initial.unemploymentPct).toBeCloseTo(
        logistic(Math.log(0.046 / 0.954) - 0.2 * scale * cycle) * 100,
        5,
      );
      expect(macro.initial.inflation12mPct).toBeCloseTo(
        2.7 + 0.6 * scale * cost,
        5,
      );
      expect(macro.initial.housingSupplyDemandRatio).toBeCloseTo(
        Math.exp(0.06 * scale * housing),
        5,
      );
      expect(macro.initial.creditTightness).toBeCloseTo(
        logistic(0.4 * scale * credit),
        5,
      );
    }
  });

  it("an adequate-housing draw is recorded as adequate, not as a shortage", () => {
    let found = false;
    for (let i = 0; i < 50 && !found; i += 1) {
      const macro = drawMacroStartingConditions(
        seedWorld(`housing-${i}`),
        "near-reference",
      );
      if (macro.latents.housing >= 0) {
        expect(macro.initial.housingSupplyDemandRatio).toBeGreaterThanOrEqual(
          1,
        );
        found = true;
      }
    }
    expect(found).toBe(true);
  });
});

const certified = ELECTORAL_CALIBRATION.house.filter(
  (row) => row.democraticTwoPartyShare !== null && !row.ambiguous,
);

function flipsAt(swingPp: number): number {
  return certified.filter((row) => {
    const reference = row.democraticTwoPartyShare! > 0.5;
    return (
      applySwing(row.democraticTwoPartyShare!, swingPp) > 0.5 !== reference
    );
  }).length;
}

describe("political starting conditions", () => {
  it("compiled calibration covers every seat", () => {
    expect(ELECTORAL_CALIBRATION.house).toHaveLength(435);
    expect(ELECTORAL_CALIBRATION.senate).toHaveLength(100);
    expect(certified.length).toBeGreaterThan(350);
  });

  it("controlled inputs: no swing keeps every certified seat; larger swings flip more", () => {
    expect(flipsAt(0)).toBe(0);
    const near = flipsAt(1.5);
    const modest = flipsAt(3.5);
    const major = flipsAt(7.5);
    expect(near).toBeLessThanOrEqual(modest);
    expect(modest).toBeLessThanOrEqual(major);
    expect(major).toBeGreaterThan(near);
    expect(flipsAt(-7.5)).toBeGreaterThan(0);
  });

  it("uses shared effects: a whole region moves together, not independent coin flips", () => {
    const seats = generatePoliticalStartingConditions(
      seedWorld("shared-effects"),
      "major",
    ).seats.filter((seat) => seat.baselineKind === "certified-two-party");
    // Within each state, generated shift in logit space shares one component.
    const byState = new Map<string, number[]>();
    for (const seat of seats) {
      const state = seat.seatKey.replace(/^us-(house|senate):/, "").slice(0, 2);
      const shift =
        Math.log(seat.generatedShare! / (1 - seat.generatedShare!)) -
        Math.log(seat.baselineShare! / (1 - seat.baselineShare!)) -
        seat.seatResidualPp! / 25;
      byState.set(state, [...(byState.get(state) ?? []), shift]);
    }
    for (const shifts of byState.values()) {
      for (const shift of shifts) expect(shift).toBeCloseTo(shifts[0]!, 2);
    }
  });

  it("across many seeds: recognizable starts are common, departures possible, nothing capped", () => {
    const summary: Record<
      string,
      { houseD: number[]; flips: number[]; presidents: Record<string, number> }
    > = {};
    const referenceHouseD = ELECTORAL_CALIBRATION.house.filter(
      (row) => row.certifiedWinnerParty === "democratic",
    ).length;
    for (let i = 0; i < 240; i += 1) {
      const world = seedWorld(`distribution-${i}`);
      const regime = drawStartingRegime(world);
      const record = generatePoliticalStartingConditions(world, regime);
      const house = record.seats.filter((seat) =>
        seat.seatKey.startsWith("us-house:"),
      );
      const bucket = (summary[regime] ??= {
        houseD: [],
        flips: [],
        presidents: {},
      });
      bucket.houseD.push(
        house.filter((seat) => seat.affiliation === "democratic").length,
      );
      bucket.flips.push(
        house.filter((seat) => seat.referenceWinner !== seat.affiliation)
          .length,
      );
      bucket.presidents[record.presidency.winner] =
        (bucket.presidents[record.presidency.winner] ?? 0) + 1;
      const electors = Object.values(record.presidency.electoralVotes).reduce(
        (a, b) => a + b,
        0,
      );
      expect(electors).toBe(
        Object.values(ELECTORAL_ALLOCATION).reduce((a, b) => a + b, 0),
      );
      expect(house).toHaveLength(435);
    }
    const median = (values: number[]) =>
      [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
    const near = summary["near-reference"]!;
    // Evidence for the receiving review (distribution, not a preferred winner).
    console.info(
      JSON.stringify(
        Object.fromEntries(
          Object.entries(summary).map(([regime, bucket]) => [
            regime,
            {
              worlds: bucket.houseD.length,
              referenceHouseD,
              houseDMin: Math.min(...bucket.houseD),
              houseDMedian: median(bucket.houseD),
              houseDMax: Math.max(...bucket.houseD),
              flipsMedian: median(bucket.flips),
              flipsMax: Math.max(...bucket.flips),
              presidents: bucket.presidents,
            },
          ]),
        ),
      ),
    );
    expect(Math.abs(median(near.houseD) - referenceHouseD)).toBeLessThan(30);
    const all = Object.values(summary).flatMap((bucket) => bucket.flips);
    expect(Math.max(...all)).toBeGreaterThan(median(near.flips));
  });

  it("replays exactly from the same seed", () => {
    const a = generatePoliticalStartingConditions(
      seedWorld("replay"),
      "modest",
    );
    const b = generatePoliticalStartingConditions(
      seedWorld("replay"),
      "modest",
    );
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("keeps non-major members as themselves", () => {
    const record = generatePoliticalStartingConditions(
      seedWorld("independents"),
      "major",
    );
    const retained = record.seats.filter(
      (seat) => seat.baselineKind === "retained-non-major",
    );
    for (const seat of retained) {
      expect(seat.affiliation).not.toBe("democratic");
      expect(seat.affiliation).not.toBe("republican");
      expect(seat.generatedShare).toBeNull();
    }
  });
});
