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
  calibrationRow,
  calibrationRows,
  drawPoliticalLatents,
  generateContest,
  generatePoliticalStartingConditions,
  generateStateExecutiveAffiliation,
  referenceReconstruction,
  zeroPoliticalLatents,
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

const houseRows = calibrationRows("us-house");
const senateRows = calibrationRows("us-senate");
const governorRows = calibrationRows("state-governor");
const certified = houseRows.filter(
  (row) => row.democraticTwoPartyShare !== null,
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
  it("compiled calibration keeps one row per office contest", () => {
    expect(houseRows).toHaveLength(435);
    expect(senateRows).toHaveLength(100);
    expect(governorRows).toHaveLength(50);
    expect(calibrationRows("us-president")).toHaveLength(51);
    expect(certified.length).toBeGreaterThan(350);
    // Every row without a margin says why, and no row borrows another office.
    for (const row of ELECTORAL_CALIBRATION.calibrationRows) {
      if (row.twoPartyMargin === null) {
        expect(row.uncertaintyReason, row.contestKey).toBeTruthy();
        expect(row.democraticTwoPartyShare, row.contestKey).toBeNull();
      } else {
        expect(row.uncertaintyReason, row.contestKey).toBeNull();
        expect(row.democraticTwoPartyShare).not.toBeNull();
        // A stored margin always agrees with the affiliation the same source
        // records for that office.
        expect(
          row.twoPartyMargin > 0 ? "democratic" : "republican",
          row.contestKey,
        ).toBe(row.referenceAffiliation);
      }
      expect(row.contestKey.startsWith(row.office)).toBe(true);
    }
    // A governor row is a dated snapshot and never carries a contest margin.
    for (const row of governorRows) {
      expect(row.twoPartyMargin).toBeNull();
      expect(row.observedContestType).toBe("dated-officeholder-snapshot");
      expect(row.referenceDate).toBe(ELECTORAL_CALIBRATION.asOfDate);
    }
  });

  it("zero perturbation reconstructs the compiled input affiliations", () => {
    const record = referenceReconstruction(seedWorld("zero-perturbation"));
    const byKey = new Map(record.seats.map((seat) => [seat.seatKey, seat]));
    expect(byKey.size).toBe(535);
    for (const row of [...houseRows, ...senateRows]) {
      const seat = byKey.get(row.contestKey)!;
      expect(seat.affiliation, row.contestKey).toBe(row.referenceAffiliation);
      expect(seat.referenceWinner).toBe(row.referenceAffiliation);
    }
    expect(record.presidency.winner).toBe(record.presidency.referenceWinner);
    for (const row of governorRows) {
      const generated = generateStateExecutiveAffiliation(
        seedWorld("zero-perturbation"),
        zeroPoliticalLatents("near-reference"),
        row.stateUsps,
      );
      expect(generated.affiliation, row.stateUsps).toBe(
        row.referenceAffiliation,
      );
    }
  });

  it("a missing margin preserves the recorded affiliation in every world", () => {
    const withoutMargin = [...houseRows, ...senateRows].filter(
      (row) => row.democraticTwoPartyShare === null,
    );
    expect(withoutMargin.length).toBeGreaterThan(20);
    // The nine rows CRUNCH47 names, resolved against their own source rows.
    for (const key of [
      "us-house:CA-20",
      "us-house:FL-20",
      "us-house:IL-15",
      "us-house:IL-16",
      "us-house:PA-03",
      "us-house:TX-09",
      "us-house:TX-20",
      "us-house:TX-30",
      "us-house:WA-04",
    ]) {
      const row = calibrationRow(key)!;
      expect(row.twoPartyMargin, key).toBeNull();
      expect(row.uncertaintyReason, key).toBeTruthy();
    }
    for (const regime of CRUNCH46_POLICY.regimes.order) {
      for (let i = 0; i < 12; i += 1) {
        const world = seedWorld(`missing-margin-${regime}-${i}`);
        const latents = drawPoliticalLatents(world, regime);
        for (const row of withoutMargin) {
          const seat = generateContest(world, latents, row);
          expect(seat.affiliation, row.contestKey).toBe(
            row.referenceAffiliation,
          );
          expect(seat.generatedShare).toBeNull();
          expect(seat.uncertaintyReason).toBeTruthy();
        }
      }
    }
  });

  it("a governor off the state's presidential lean keeps their own party", () => {
    const presidentialLean = (usps: string) => {
      const row = calibrationRow(`us-president:${usps}`)!;
      return row.referenceAffiliation;
    };
    const crossParty = governorRows.filter(
      (row) =>
        row.referenceAffiliation !== null &&
        row.referenceAffiliation !== presidentialLean(row.stateUsps),
    );
    expect(crossParty.length).toBeGreaterThan(5);
    for (const regime of CRUNCH46_POLICY.regimes.order) {
      for (let i = 0; i < 8; i += 1) {
        const world = seedWorld(`governor-${regime}-${i}`);
        const latents = drawPoliticalLatents(world, regime);
        for (const row of crossParty) {
          const generated = generateStateExecutiveAffiliation(
            world,
            latents,
            row.stateUsps,
          );
          expect(generated.affiliation, row.stateUsps).toBe(
            row.referenceAffiliation,
          );
          expect(generated.baselineKind).toBe(
            "reference-affiliation-preserved",
          );
        }
      }
    }
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

  it("every seed and regime preserves each office's certified record", () => {
    for (const regime of CRUNCH46_POLICY.regimes.order) {
      for (const seed of ["certified-opening-a", "certified-opening-b"]) {
        const record = generatePoliticalStartingConditions(
          seedWorld(seed),
          regime,
        );
        expect(record.nationalSwingPp).toBe(0);
        expect(
          Object.values(record.regionSwingPp).every((value) => value === 0),
        ).toBe(true);
        expect(
          Object.values(record.stateSwingPp).every((value) => value === 0),
        ).toBe(true);
        expect(record.seats).toHaveLength(535);
        for (const seat of record.seats) {
          const row = calibrationRow(seat.seatKey)!;
          expect(seat.affiliation, seat.seatKey).toBe(row.referenceAffiliation);
          if (seat.baselineKind === "certified-two-party") {
            expect(seat.generatedShare, seat.seatKey).toBeCloseTo(
              row.democraticTwoPartyShare!,
              6,
            );
            expect(seat.seatResidualPp).toBe(0);
          } else expect(seat.generatedShare).toBeNull();
        }
        for (const row of calibrationRows("us-president")) {
          expect(record.presidency.stateWinners[row.stateUsps]).toBe(
            row.referenceAffiliation,
          );
        }
        expect(
          Object.values(record.presidency.electoralVotes).reduce(
            (a, b) => a + b,
            0,
          ),
        ).toBe(Object.values(ELECTORAL_ALLOCATION).reduce((a, b) => a + b, 0));
      }
    }
  });

  it("a tied or conflicting share preserves the office's recorded winner", () => {
    const row = certified[0]!;
    for (const share of [0.5, 0.1, 0.9]) {
      const source = {
        ...row,
        democraticTwoPartyShare: share,
        referenceAffiliation: "republican",
      };
      const seat = generateContest(
        seedWorld("tie-record"),
        zeroPoliticalLatents("major"),
        source,
      );
      expect(seat.generatedShare).toBe(share);
      expect(seat.affiliation).toBe("republican");
      expect(seat.referenceWinner).toBe("republican");
    }
    const seat = generateContest(
      seedWorld("missing-winner"),
      zeroPoliticalLatents("major"),
      {
        ...row,
        democraticTwoPartyShare: 0.5,
        referenceAffiliation: null,
      },
    );
    expect(seat.affiliation).toBe("unrecorded");
    expect(seat.caucus).toBeNull();
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
