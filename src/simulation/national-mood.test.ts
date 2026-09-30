import { describe, expect, it } from "vitest";

import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../presentation/observer-world";
import { currentPresidentOf } from "./crisis/offices";
import {
  MIDTERM_PENALTY_POINTS,
  midtermPresidentPartyShift,
  presidentialStandingForMidterm,
  nationalMoodDemocraticShift,
} from "./national-mood";
import { majorPartyOf } from "./statewide-electorate";
import { addDays, makeIsoDate } from "./dates";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "./national-election-geography";
import { createExactQuantity } from "./quantity";
import {
  createWorldMetricCatalog,
  createWorldMetricDefinition,
  recordWorldMetricObservation,
} from "./world-metrics";
import type { EntityId, IsoDate, World } from "./types";

describe("the national mood", () => {
  // A random place from all 56; the mood is national, so any place reads it.
  const seed = "b24-national-mood";
  const place = observerPlace(seed);
  const { world } = openObserverWorld(observerSetup(seed));

  it(`turns a midterm against the President's party (${place.key}, seed ${seed})`, () => {
    const president = currentPresidentOf(world)!;
    expect(president).not.toBeNull();
    const party = majorPartyOf(world, president.personId, world.currentDate);
    const midterm = nationalMoodDemocraticShift(
      world,
      makeIsoDate("2026-11-03"),
    );
    expect(party).not.toBeNull();
    const shift =
      midtermPresidentPartyShift(
        presidentialStandingForMidterm(world, makeIsoDate("2026-11-03")),
      ) / 100;
    expect(midterm).toBe((party === "democratic" ? 1 : -1) * shift);
  });

  function withApprovalMetric(base: World) {
    const definition = createWorldMetricDefinition({
      stableKey: "politics.presidential-job-approval",
      name: "Presidential job approval",
      description: "Approval reported by the fixture's national poll.",
      domainKey: "politics.approval",
      valueKind: "quantity",
      quantityUnit: "rate:share",
      measureNature: "rate",
      referencePeriodKind: "point",
      denominatorMetricId: null,
      aggregationKind: "not-aggregatable",
      aggregationNote: "Separate samples are not summed.",
      stateSemantics: "primitive",
      tags: [
        `person.${currentPresidentOf(base)!.personId.replaceAll("_", "-")}`,
      ],
    });
    return {
      world: {
        ...ensureNationalElectionJurisdiction(base),
        metricCatalog: createWorldMetricCatalog({
          definitions: [
            ...Object.values(base.metricCatalog.definitions),
            definition,
          ],
        }),
      },
      metricId: definition.id,
    };
  }

  function approvalPoll(
    base: World,
    metricId: EntityId,
    key: string,
    percent: number,
    at: IsoDate,
    jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id,
  ) {
    return recordWorldMetricObservation(base, {
      stableKey: key,
      metricId,
      scope: { jurisdictionId, segmentKey: null },
      referencePeriod: { kind: "point", at },
      value: {
        kind: "quantity",
        quantity: createExactQuantity(percent, 100, "rate:share"),
      },
      sourceSeriesKey: `fixture.${key}`,
      sourceLabel: "National-mood test poll",
      sourceReference: null,
      methodologyKey: null,
      releaseDate: at,
      recordedAt: base.currentDate,
      vintageKey: "fixture.first",
      uncertainty: { kind: "none" },
      supersedesObservationId: null,
      underlyingStateId: null,
    });
  }

  it("uses the newest national poll period even if an older sample is appended later", () => {
    const fixture = withApprovalMetric(world);
    let polled = approvalPoll(
      fixture.world,
      fixture.metricId,
      "newer",
      68,
      world.currentDate,
    );
    polled = approvalPoll(
      polled,
      fixture.metricId,
      "older",
      35,
      addDays(world.currentDate, -1),
    );
    const before = polled.history.nextSequence;
    const standing = presidentialStandingForMidterm(polled, world.currentDate);
    expect(standing.approvalPct).toBe(68);
    expect(standing.basis).toBe("observed-poll");
    expect(polled.history.nextSequence).toBe(before);
  });

  it("does not use a local poll or a poll recorded after the date being read", () => {
    const fixture = withApprovalMetric(world);
    const local = Object.values(world.jurisdictions).find(
      (j) => j.id !== NATIONAL_ELECTION_JURISDICTION.id,
    )!;
    let polled = approvalPoll(
      fixture.world,
      fixture.metricId,
      "local",
      95,
      world.currentDate,
      local.id,
    );
    expect(
      presidentialStandingForMidterm(polled, world.currentDate).basis,
    ).toBe("estimated-from-average");
    polled = approvalPoll(
      polled,
      fixture.metricId,
      "national",
      68,
      world.currentDate,
    );
    expect(
      presidentialStandingForMidterm(polled, addDays(world.currentDate, -1))
        .basis,
    ).toBe("estimated-from-average");
  });

  it("adds nothing in a presidential year or an odd year", () => {
    expect(nationalMoodDemocraticShift(world, makeIsoDate("2028-11-07"))).toBe(
      0,
    );
    expect(nationalMoodDemocraticShift(world, makeIsoDate("2027-11-02"))).toBe(
      0,
    );
  });
});

describe("the smooth midterm response", () => {
  const neutral = {
    approvalPct: 53,
    growthChange: 0,
    unemploymentChange: 0,
    inflationChange: 0,
  };
  it("retains the mean at neutral conditions", () => {
    expect(midtermPresidentPartyShift(neutral)).toBeCloseTo(
      -MIDTERM_PENALTY_POINTS,
    );
  });
  it("can reward a popular president and punish a bad economy", () => {
    expect(
      midtermPresidentPartyShift({
        ...neutral,
        approvalPct: 75,
        growthChange: 3,
      }),
    ).toBeGreaterThan(0);
    expect(
      midtermPresidentPartyShift({
        ...neutral,
        approvalPct: 40,
        unemploymentChange: 5,
      }),
    ).toBeLessThan(-6);
  });
  it("responds to small changes without an approval cutoff", () => {
    const below = midtermPresidentPartyShift({
      ...neutral,
      approvalPct: 49.99,
    });
    const above = midtermPresidentPartyShift({
      ...neutral,
      approvalPct: 50.01,
    });
    expect(above).toBeGreaterThan(below);
    expect(above - below).toBeLessThan(0.02);
  });
  it("stays inside the measured swing range", () => {
    for (const approvalPct of [0, 20, 40, 60, 80, 100]) {
      const shift = midtermPresidentPartyShift({ ...neutral, approvalPct });
      expect(shift).toBeGreaterThanOrEqual(-9);
      expect(shift).toBeLessThanOrEqual(2.3);
    }
  });
});
