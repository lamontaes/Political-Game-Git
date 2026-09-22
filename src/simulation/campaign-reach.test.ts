import { describe, expect, it } from "vitest";

import {
  PROVISIONAL,
  resolveCampaignWork,
  type CampaignWorkInput,
  type ElectorateSize,
} from "./campaign-reach";

/**
 * Contrasting situations, not magnitudes.
 *
 * Every assertion here is about the RELATION between two situations, so the
 * provisional numbers can all move without a single case needing to be edited.
 * That is deliberate: the numbers are not findings and a test that pinned one
 * would turn a placeholder into a contract.
 *
 * The defect these describe is that the shipped model has no relation to
 * assert. Measured across four contrasting places at five effort levels it
 * produces one curve: one afternoon a day reaches 74-78% support in a Kentucky
 * small town, a Nevada desert town, a Maryland small city and an Illinois
 * village alike, and two afternoons reach 98-99% in all four.
 */

function population(people: number, name = "Somewhere"): ElectorateSize {
  return {
    kind: "from-recorded-population",
    people,
    geographyName: name,
    period: "2024",
    eligibleShareIsUnknown: true,
  };
}

function afternoon(
  overrides: Partial<CampaignWorkInput> = {},
): CampaignWorkInput {
  return {
    kind: "outreach",
    minutes: 90,
    workers: 2,
    staffCompetence: 0.5,
    peopleAlreadyReached: 0,
    electorate: population(5_000),
    seed: "contrast",
    ...overrides,
  };
}

/** The same work, seeded the same way, in places of different size. */
function acrossSeeds(input: Partial<CampaignWorkInput>, seeds: number) {
  return Array.from({ length: seeds }, (_, index) =>
    resolveCampaignWork(afternoon({ ...input, seed: `seed-${index}` })),
  );
}

describe("the same afternoon in places of different size", () => {
  it("is a larger share of a small place than of a large one", () => {
    const small = acrossSeeds({ electorate: population(5_000) }, 12);
    const large = acrossSeeds({ electorate: population(500_000) }, 12);
    const smallTotal = small.reduce(
      (sum, row) => sum + Math.abs(row.supportChangeBasisPoints ?? 0),
      0,
    );
    const largeTotal = large.reduce(
      (sum, row) => sum + Math.abs(row.supportChangeBasisPoints ?? 0),
      0,
    );
    expect(smallTotal).toBeGreaterThan(largeTotal);
  });

  it("reaches the same people in both, because the work is the same", () => {
    const small = resolveCampaignWork(
      afternoon({ electorate: population(5_000) }),
    );
    const large = resolveCampaignWork(
      afternoon({ electorate: population(500_000) }),
    );
    expect(small.peopleReached).toBe(large.peopleReached);
  });

  it("does not let one afternoon decide a contest of any size", () => {
    for (const people of [2_000, 5_000, 50_000, 500_000]) {
      for (const row of acrossSeeds({ electorate: population(people) }, 8)) {
        // A whole percentage point is 100 basis points. One afternoon on the
        // doors moving several points of an electorate is the thing that made
        // the old curve absurd.
        expect(Math.abs(row.supportChangeBasisPoints ?? 0)).toBeLessThan(100);
      }
    }
  });
});

describe("working the same place twice", () => {
  it("meets fewer new people the second time", () => {
    const first = resolveCampaignWork(afternoon({ peopleAlreadyReached: 0 }));
    const later = resolveCampaignWork(
      afternoon({ peopleAlreadyReached: 4_000 }),
    );
    expect(later.peopleReachedForTheFirstTime).toBeLessThan(
      first.peopleReachedForTheFirstTime,
    );
    expect(later.peopleReachedAgain).toBeGreaterThan(0);
  });

  it("still counts a repeat contact for something, not nothing", () => {
    expect(PROVISIONAL.REPEAT_CONTACT_WEIGHT).toBeGreaterThan(0);
    const saturated = resolveCampaignWork(
      afternoon({ peopleAlreadyReached: 5_000, seed: "saturated" }),
    );
    expect(saturated.peopleReachedForTheFirstTime).toBe(0);
    expect(saturated.peopleReached).toBeGreaterThan(0);
  });
});

describe("persuasion that can fail", () => {
  it("sometimes moves nobody, and sometimes moves people away", () => {
    const outcomes = acrossSeeds({ electorate: population(5_000) }, 40);
    expect(outcomes.some((row) => row.netPeoplePersuaded <= 0)).toBe(true);
    expect(outcomes.some((row) => row.netPeoplePersuaded > 0)).toBe(true);
  });

  it("gives competent staff more execution, never guaranteed minds", () => {
    const poor = acrossSeeds({ staffCompetence: 0 }, 12);
    const good = acrossSeeds({ staffCompetence: 1 }, 12);
    const reach = (rows: readonly { peopleReached: number }[]) =>
      rows.reduce((sum, row) => sum + row.peopleReached, 0);
    expect(reach(good)).toBeGreaterThan(reach(poor));
    // Good staff still have conversations that go nowhere.
    expect(good.some((row) => row.netPeoplePersuaded <= 0)).toBe(true);
  });
});

describe("an electorate nobody has supplied", () => {
  it("declines to state a share rather than dividing by a guess", () => {
    const outcome = resolveCampaignWork(
      afternoon({
        electorate: {
          kind: "unknown",
          reason: "no place population series",
        },
      }),
    );
    expect(outcome.supportChangeBasisPoints).toBeNull();
    expect(outcome.peopleReached).toBeGreaterThan(0);
    expect(outcome.unknowns.join(" ")).toContain("unknown");
  });

  it("says a recorded population is not an electorate, even when it has one", () => {
    const outcome = resolveCampaignWork(afternoon());
    expect(outcome.unknowns.join(" ")).toContain("may vote is not recorded");
  });
});

describe("determinism", () => {
  it("resolves one action the same way however often it is read", () => {
    const input = afternoon({ seed: "read-twice" });
    expect(resolveCampaignWork(input)).toEqual(resolveCampaignWork(input));
  });
});

describe("reading the electorate from the world's demography", () => {
  it("is unknown exactly when the demography reader has no population", async () => {
    const { electorateFromDemography } = await import("./campaign-reach");
    const unknown = electorateFromDemography({
      placeKey: "x",
      censusGeoid: null,
      population: null,
      omissions: [{ field: "population", reason: "acs-pums-not-place" }],
    });
    expect(unknown.kind).toBe("unknown");
    if (unknown.kind === "unknown")
      expect(unknown.reason).toContain("acs-pums-not-place");

    const known = electorateFromDemography({
      placeKey: "y",
      censusGeoid: "2100694",
      population: {
        kind: "population",
        people: 12_345,
        period: "2024",
        geographyLevel: "place",
        geographyCode: "2100694",
        geographyName: "Somewhere city",
        relationship: "same-jurisdiction",
        sourceProduct: "bea-regional",
        sourceSeriesKey: "k",
      },
      omissions: [],
    });
    expect(known.kind).toBe("from-recorded-population");
    if (known.kind === "from-recorded-population") {
      expect(known.people).toBe(12_345);
      expect(known.eligibleShareIsUnknown).toBe(true);
    }
  });
});
