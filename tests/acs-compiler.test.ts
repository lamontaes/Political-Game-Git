import { describe, it, expect } from "vitest";
import { compileAcsDonorShards } from "../src/data/acs/compiler";
import type { AcsPumsManifest } from "../src/data/acs/compiler";
import type { AcsHousingRecord, AcsPersonRecord } from "../src/data/acs/types";
import { sampleHouseholdLifeBackground } from "../src/data/calibration/sampler";

const baseManifest: AcsPumsManifest = {
  state: "ky",
  vintageYear: 2024,
  product: "1-Year",
  housingUrl: "https://example.com/h.zip",
  personUrl: "https://example.com/p.zip",
  retrievedAt: "2024-01-01T00:00:00Z",
  housingHash: "hash1",
  personHash: "hash2",
  housingByteSize: 100,
  personByteSize: 100,
  rawHousingCount: 0,
  rawPersonCount: 0,
  retainedOrdinaryHouseholdCount: 0,
  compiledDonorCount: 0,
};

describe("ACS PUMS Compiler Stage A & Boundary Constraints", () => {
  it("joins housing and person records by SERIALNO and filters out non-ordinary households (TYPEHUGQ != 1)", () => {
    const housing: AcsHousingRecord[] = [
      {
        SERIALNO: "H1",
        STATE: "21",
        PUMA: "00100",
        WGTP: 100,
        NP: 2,
        TYPEHUGQ: 1,
        TEN: 1,
        HINCP: 50000,
        ADJINC: 1000000,
      },
      {
        SERIALNO: "H2",
        STATE: "21",
        PUMA: "00200",
        WGTP: 150,
        NP: 1,
        TYPEHUGQ: 2,
        TEN: null,
        HINCP: null,
        ADJINC: 1000000,
      }, // GQ, should be excluded
    ];
    const persons: AcsPersonRecord[] = [
      { SERIALNO: "H1", SPORDER: 2, PWGTP: 100, AGEP: 42, RELSHIPP: 21 },
      { SERIALNO: "H1", SPORDER: 1, PWGTP: 100, AGEP: 45, RELSHIPP: 20 },
      { SERIALNO: "H2", SPORDER: 1, PWGTP: 150, AGEP: 25, RELSHIPP: 37 }, // Excluded due to GQ housing
    ];

    const { shards, updatedManifest } = compileAcsDonorShards(
      housing,
      persons,
      baseManifest,
    );

    expect(shards.length).toBe(1);
    expect(shards[0].state).toBe("21");
    expect(shards[0].puma).toBe("00100");

    expect(shards[0].donors.length).toBe(1);
    const donor = shards[0].donors[0];

    expect(donor.housing.SERIALNO).toBe("H1");
    expect(donor.persons.length).toBe(2);

    // Sort SPORDER correctness
    expect(donor.persons[0].SPORDER).toBe(1);
    expect(donor.persons[1].SPORDER).toBe(2);

    // Manifest counts
    expect(updatedManifest.rawHousingCount).toBe(2);
    expect(updatedManifest.rawPersonCount).toBe(3);
    expect(updatedManifest.retainedOrdinaryHouseholdCount).toBe(1);
    expect(updatedManifest.compiledDonorCount).toBe(1);
  });

  it("strictly distinguishes WGTP vs PWGTP semantics", () => {
    const housing: AcsHousingRecord[] = [
      {
        SERIALNO: "H1",
        STATE: "21",
        PUMA: "00100",
        WGTP: 500,
        NP: 1,
        TYPEHUGQ: 1,
        TEN: 1,
        HINCP: 50000,
        ADJINC: 1000000,
      },
    ];
    const persons: AcsPersonRecord[] = [
      { SERIALNO: "H1", SPORDER: 1, PWGTP: 250, AGEP: 45, RELSHIPP: 20 },
    ];

    const { shards } = compileAcsDonorShards(housing, persons, baseManifest);
    const donor = shards[0].donors[0];

    expect(donor.housing.WGTP).not.toBe(donor.persons[0].PWGTP);
    expect(donor.housing.WGTP).toBe(500); // Household unit weight
    expect(donor.persons[0].PWGTP).toBe(250); // Person estimand weight
  });

  it("fails if 5-Year product is passed, enforcing 1-Year product consistency", () => {
    const invalidManifest = { ...baseManifest, product: "5-Year" };
    expect(() => compileAcsDonorShards([], [], invalidManifest)).toThrow(
      "Only 1-Year PUMS product is authorized.",
    );
  });

  it("verifies null/missing values do not coerce to literal zero", () => {
    const housing: AcsHousingRecord[] = [
      {
        SERIALNO: "H1",
        STATE: "21",
        PUMA: "00100",
        WGTP: 100,
        NP: 1,
        TYPEHUGQ: 1,
        TEN: null,
        HINCP: null,
        ADJINC: 1000000,
        VEH: null,
      },
    ];
    const persons: AcsPersonRecord[] = [
      {
        SERIALNO: "H1",
        SPORDER: 1,
        PWGTP: 100,
        AGEP: 45,
        RELSHIPP: 20,
        OCCP: null,
        WKHP: null,
      },
    ];

    const { shards } = compileAcsDonorShards(housing, persons, baseManifest);
    const donor = shards[0].donors[0];

    // Explicit null checks (not zero)
    expect(donor.housing.TEN).toBeNull();
    expect(donor.housing.HINCP).toBeNull();
    expect(donor.housing.VEH).toBeNull();

    expect(donor.persons[0].OCCP).toBeNull();
    expect(donor.persons[0].WKHP).toBeNull();
  });

  it("proves PUMA != city identity (PUMA is a statistical sample area, not a place name)", () => {
    const housing: AcsHousingRecord[] = [
      {
        SERIALNO: "H1",
        STATE: "21",
        PUMA: "00100",
        WGTP: 100,
        NP: 1,
        TYPEHUGQ: 1,
        TEN: 1,
        HINCP: 50000,
        ADJINC: 1000000,
      },
    ];
    const persons: AcsPersonRecord[] = [
      { SERIALNO: "H1", SPORDER: 1, PWGTP: 100, AGEP: 45, RELSHIPP: 20 },
    ];

    const { shards } = compileAcsDonorShards(housing, persons, baseManifest);
    const shard = shards[0];

    expect(shard.puma).toBe("00100");
    // PUMA string must not be coerced to a city name like "Louisville"
    expect(shard.puma).not.toMatch(/[a-z]/i);
  });

  it("proves deprecated synthetic fallback does not fabricate financial cash or debt", () => {
    const profile = sampleHouseholdLifeBackground("fallback-test");

    // These must explicitly remain unresolved/0 in the synthetic fallback
    expect(profile.liquidResourcesUsd).toBe(0);
    expect(profile.debt.totalDebtUsd).toBe(0);
    expect(profile.assets.estimatedHomeValueUsd).toBe(0);
    expect(profile.assets.retirementSavingsUsd).toBe(0);
  });
});
