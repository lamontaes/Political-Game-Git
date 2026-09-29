import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import {
  PAID_LEAVE_QUESTION,
  paidLeavePremium,
  premiumOn,
  type PaidLeavePremium,
} from "./state-paid-leave-law";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "./types";

/**
 * A state paid family and medical leave program's employee premium, read
 * over the programs places began with and over laws written into the test.
 * The World around them is partial, because the rule reads nothing but the
 * seed, the catalog and the laws.
 */

const LEAVE = "proposition_leave" as EntityId;
const stateId = (key: string) => chiefExecutiveJurisdiction(key.slice(3))!.id;

let sequence = 0;
function enacted(
  stateKey: string,
  answer: "yes" | "no",
  effectiveAt: string,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  sequence += 1;
  const id = `measure_leave_${sequence}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:leave:${sequence}`,
      sequence,
      jurisdictionId: stateId(stateKey),
      rulePackId: "test",
      designation: `HB ${sequence}`,
      shortTitle: "A paid leave act",
      summary: "A paid leave act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-02-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [LEAVE],
      propositionAnswers: [{ propositionId: LEAVE, answer }],
    },
    enactment: {
      id: `enactment_leave_${sequence}` as EntityId,
      stableKey: `test:leave:${sequence}:enactment`,
      sequence: 7000 + sequence,
      measureId: id,
      resolvedAt: makeIsoDate("2026-04-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate(effectiveAt),
      outcomeEventId: `event_leave_${sequence}` as EntityId,
    },
  };
}

function lawWorld(
  laws: readonly ReturnType<typeof enacted>[] = [],
  seed = "leave",
): World {
  return {
    seed,
    currentDate: makeIsoDate("2029-01-01"),
    jurisdictions: {},
    policyCatalog: {
      propositions: { [LEAVE]: { id: LEAVE, stableKey: PAID_LEAVE_QUESTION } },
    },
    history: {
      legislativeMeasures: laws.map((entry) => entry.measure),
      legislativeEnactments: laws.map((entry) => entry.enactment),
    },
  } as unknown as World;
}

const on = (date: string) => makeIsoDate(date);
function premium(
  read: PaidLeavePremium,
): Extract<PaidLeavePremium, { kind: "premium" }> {
  if (read.kind !== "premium") throw new Error(read.kind);
  return read;
}

describe("a state paid leave premium", () => {
  it("collects a program's read premium from the date its pages give", () => {
    const world = lawWorld();
    // Minnesota: 0.44% from each worker from January 1, 2026, capped at the
    // Social Security wage base.
    expect(paidLeavePremium(world, "US-MN", on("2025-12-15")).kind).toBe(
      "none",
    );
    const minnesota = premium(
      paidLeavePremium(world, "US-MN", on("2026-03-15")),
    );
    expect(minnesota.employeeRatePerMillion).toBe(4_400);
    expect(minnesota.annualWageCapMinor).toBe(18_450_000);
    expect(minnesota.estimatedFromAverage).toBeUndefined();
    expect(minnesota.sourceUrl).toMatch(/^https:\/\/pl\.mn\.gov\//);
    // Maryland collects from January 1, 2027, before its benefits begin.
    expect(paidLeavePremium(world, "US-MD", on("2026-06-01")).kind).toBe(
      "none",
    );
    expect(
      premium(paidLeavePremium(world, "US-MD", on("2027-01-15")))
        .employeeRatePerMillion,
    ).toBe(4_500);
    // California's premium has no wage cap.
    expect(
      premium(paidLeavePremium(world, "US-CA", on("2026-03-15")))
        .annualWageCapMinor,
    ).toBeNull();
    // D.C.'s premium falls on employers alone.
    expect(
      premium(paidLeavePremium(world, "US-DC", on("2026-03-15")))
        .employeeRatePerMillion,
    ).toBe(0);
    // No program, no law: nothing.
    expect(paidLeavePremium(world, "US-TX", on("2026-03-15")).kind).toBe(
      "none",
    );
  });

  it("estimates a premium that was not read from the average of the programs read", () => {
    const world = lawWorld();
    const rhodeIsland = premium(
      paidLeavePremium(world, "US-RI", on("2026-03-15")),
    );
    expect(rhodeIsland.estimatedFromAverage).toMatch(
      /^ESTIMATED FROM AVERAGE: the average employee premium of the 13 state paid leave programs read/,
    );
    expect(rhodeIsland.annualWageCapMinor).toBe(18_450_000);
    // Virginia collects from April 1, 2028, at a rate not yet set.
    expect(paidLeavePremium(world, "US-VA", on("2028-03-31")).kind).toBe(
      "none",
    );
    const virginia = premium(
      paidLeavePremium(world, "US-VA", on("2028-04-01")),
    );
    expect(virginia.estimatedFromAverage).toBeDefined();
    // Within half a standard deviation of the average, about 0.5%.
    for (const estimate of [rhodeIsland, virginia]) {
      expect(estimate.employeeRatePerMillion).toBeGreaterThan(3_500);
      expect(estimate.employeeRatePerMillion).toBeLessThan(6_500);
    }
  });

  it("starts a premium where a law enacted in play creates a program", () => {
    const law = enacted("US-TX", "yes", "2027-01-01");
    const world = lawWorld([law]);
    expect(paidLeavePremium(world, "US-TX", on("2026-12-31")).kind).toBe(
      "none",
    );
    const texas = premium(paidLeavePremium(world, "US-TX", on("2027-01-15")));
    expect(texas.lawMeasureIds).toEqual([law.measure.id]);
    expect(texas.estimatedFromAverage).toMatch(/^ESTIMATED FROM AVERAGE: /);
    expect(texas.sourceUrl).toBeNull();
    // Another world draws its own premium within the same spread.
    expect(
      premium(
        paidLeavePremium(lawWorld([law], "other"), "US-TX", on("2027-01-15")),
      ).employeeRatePerMillion,
    ).not.toBe(texas.employeeRatePerMillion);
  });

  it("ends a program's premium when a law enacted in play repeals it", () => {
    const repeal = enacted("US-OR", "no", "2027-07-01");
    const world = lawWorld([repeal]);
    expect(paidLeavePremium(world, "US-OR", on("2027-06-30")).kind).toBe(
      "premium",
    );
    expect(paidLeavePremium(world, "US-OR", on("2027-07-01"))).toEqual({
      kind: "ended",
      lawMeasureIds: [repeal.measure.id],
    });
    // A "no" where no program was collecting changes nothing.
    expect(
      paidLeavePremium(
        lawWorld([enacted("US-TX", "no", "2027-01-01")]),
        "US-TX",
        on("2027-03-01"),
      ).kind,
    ).toBe("none");
  });

  it("keeps a repeal enacted in play over a program dated to start later", () => {
    // Virginia's program begins collecting on April 1, 2028; a repeal in
    // effect from December 1, 2026 comes after the start and governs.
    const repeal = enacted("US-VA", "no", "2026-12-01");
    const world = lawWorld([repeal]);
    expect(paidLeavePremium(world, "US-VA", on("2027-06-01")).kind).toBe(
      "none",
    );
    expect(paidLeavePremium(world, "US-VA", on("2028-05-01"))).toEqual({
      kind: "ended",
      lawMeasureIds: [repeal.measure.id],
    });
  });

  it("collects a re-adopted program from its own start date", () => {
    // Maryland re-adopted from July 1, 2026 still collects from January 1,
    // 2027, at its own 0.45% up to the Social Security wage cap.
    const readopt = enacted("US-MD", "yes", "2026-07-01");
    const world = lawWorld([readopt]);
    expect(paidLeavePremium(world, "US-MD", on("2026-08-01")).kind).toBe(
      "none",
    );
    const maryland = premium(
      paidLeavePremium(world, "US-MD", on("2027-02-01")),
    );
    expect(maryland.employeeRatePerMillion).toBe(4_500);
    expect(maryland.annualWageCapMinor).toBe(18_450_000);
    expect(maryland.lawMeasureIds).toEqual([readopt.measure.id]);
    expect(maryland.estimatedFromAverage).toBeUndefined();
  });

  it("stops at the wage cap and rounds to the cent", () => {
    const minnesota = premium(
      paidLeavePremium(lawWorld(), "US-MN", on("2026-03-15")),
    );
    // $72.00 at 0.44% is $0.3168: $0.32.
    expect(premiumOn(7_200, 0, minnesota)).toEqual({
      taxableMinor: 7_200,
      premiumMinor: 32,
    });
    // $184,000.00 already paid this year leaves $500.00 under the cap.
    expect(premiumOn(100_000, 18_400_000, minnesota)).toEqual({
      taxableMinor: 50_000,
      premiumMinor: 220,
    });
    expect(premiumOn(100_000, 18_450_000, minnesota).premiumMinor).toBe(0);
  });
});
