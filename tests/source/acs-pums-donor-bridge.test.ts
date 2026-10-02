import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../fixtures/small-world";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { SeededRng, pickDistinct } from "../../src/simulation/rng";
import {
  ACS_PUMS_2024_PRODUCTION_GATE,
  compileAcsPumsDonorFixture,
  createAcsPums2024StateShardAcquisition,
  openAcsPumsDonorFixture,
} from "../../src/source/domains/acs-pums/index";
import {
  applyAcsPumsCharacterHistoryBridge,
  largestRemainderAllocation,
  selectAcsPumsHouseholdDonor,
} from "../../src/source/adapters/index";
import {
  ageOnDate,
  createDemoWorld,
  deserializeWorld,
  makeIsoDate,
  serializeWorld,
} from "../../src/simulation/index";

const REPO = resolve(import.meta.dirname, "../..");
const FIXTURE = resolve(
  REPO,
  "fixtures/source/acs-pums/coherent-households-2024.json",
);

function corpus() {
  return compileAcsPumsDonorFixture(openAcsPumsDonorFixture(FIXTURE));
}

function compileMutatedFixture(
  mutate: (fixture: {
    fixtureId: string;
    artifacts: Record<string, unknown> & {
      housingCsv: string;
      personCsv: string;
      dictionaryCsv: string;
      identity: Record<string, unknown>;
    };
  }) => void,
) {
  const fixture = JSON.parse(readFileSync(FIXTURE, "utf-8"));
  fixture.fixtureId = "acs-pums/mutated-donor-proof";
  mutate(fixture);
  const scratch = mkdtempSync(
    resolve(REPO, "fixtures/source/acs-pums/mutated-"),
  );
  const path = resolve(scratch, "fixture.json");
  try {
    writeFileSync(path, JSON.stringify(fixture));
    return compileAcsPumsDonorFixture(openAcsPumsDonorFixture(path));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

describe("ACS PUMS 2024 state-shard acquisition boundary", () => {
  it("declares independent cache-only housing, person, and dictionary artifacts without claiming bytes", () => {
    const acquisition = createAcsPums2024StateShardAcquisition({
      stateUsps: "wy",
      stateFips: "56",
    });

    expect(acquisition.identity).toEqual({
      product: "acs-1-year-pums",
      surveyYear: 2024,
      stateUsps: "WY",
      stateFips: "56",
    });
    expect(acquisition.plan.requests).toHaveLength(3);
    expect(acquisition.plan.requests.map((request) => request.storage)).toEqual(
      ["cached-not-committed", "cached-not-committed", "cached-not-committed"],
    );
    expect(acquisition.plan.requests.map((request) => request.url)).toEqual([
      "https://www2.census.gov/programs-surveys/acs/data/pums/2024/1-Year/csv_hwy.zip",
      "https://www2.census.gov/programs-surveys/acs/data/pums/2024/1-Year/csv_pwy.zip",
      "https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_2024.csv",
    ]);
    expect(
      acquisition.plan.requests
        .slice(0, 2)
        .map((request) => request.containerMemberPath),
    ).toEqual(["psam_h56.csv", "psam_p56.csv"]);
    expect(acquisition.lockPath).toBe(
      "data/source/acs-pums/shards/2024/wy/artifact-lock.json",
    );
    expect(existsSync(resolve(REPO, acquisition.lockPath))).toBe(false);
    expect(ACS_PUMS_2024_PRODUCTION_GATE).toMatch(/No 2024.*locked/i);
  });
});

describe("ACS PUMS coherent household donor compiler", () => {
  it("joins every person to one housing record by SERIALNO and preserves weights, geography, provenance, and missingness", () => {
    const compiled = corpus();

    expect(compiled.corpus.inputClass).toBe("fixture");
    expect(compiled.corpus.asOf).toBe("2024-12-31");
    expect(compiled.corpus.recordCount).toBe(2);
    expect(compiled.corpus.coverage.isCompleteUniverse).toBe(false);
    expect(compiled.corpus.coverage.universeDescription).toMatch(/state\/PUMA/);
    expect(compiled.corpus.coverage.universeDescription).toMatch(
      /not.*exact city/i,
    );
    expect(compiled.records.map((record) => record.serialNumber)).toEqual([
      "2024HU0000001",
      "2024HU0000002",
    ]);
    expect(compiled.records.map((record) => record.persons.length)).toEqual([
      3, 2,
    ]);
    expect(compiled.records.map((record) => record.householdWeight)).toEqual([
      expect.objectContaining({ state: "KNOWN", value: 10 }),
      expect.objectContaining({ state: "KNOWN", value: 30 }),
    ]);

    const first = compiled.records[0]!;
    expect(
      first.persons.every(
        (person) => person.serialNumber === first.serialNumber,
      ),
    ).toBe(true);
    expect(first.persons.every((person) => person.puma === first.puma)).toBe(
      true,
    );
    expect(first.persons.map((person) => person.personWeight)).toEqual([
      expect.objectContaining({ state: "KNOWN", value: 12 }),
      expect.objectContaining({ state: "KNOWN", value: 11 }),
      expect.objectContaining({ state: "KNOWN", value: 13 }),
    ]);
    expect(first.persons[1]!.age).toEqual(
      expect.objectContaining({
        state: "KNOWN",
        value: 34,
        allocation: "allocated",
      }),
    );
    expect(first.persons[2]!.schoolEnrollment).toEqual(
      expect.objectContaining({ state: "NOT_APPLICABLE" }),
    );
    expect(first.persons[0]!.relationship).toEqual(
      expect.objectContaining({
        state: "KNOWN",
        value: expect.objectContaining({ canonical: "reference-person" }),
      }),
    );
    expect(compiled.records[1]!.buildingType).toEqual(
      expect.objectContaining({ state: "KNOWN", allocation: "allocated" }),
    );
    expect(compiled.corpus.inputs).toHaveLength(3);
    expect(
      compiled.corpus.inputs.every((input) =>
        /^[0-9a-f]{64}$/.test(input.sha256),
      ),
    ).toBe(true);
  });

  it("rejects orphan joins, duplicate housing keys, household-size disagreement, and wrong vintage", () => {
    expect(() =>
      compileMutatedFixture((fixture) => {
        const row = fixture.artifacts.personCsv.split("\n")[1]!;
        fixture.artifacts.personCsv += `${row.replace("2024HU0000001", "2024HU9999999")}\n`;
      }),
    ).toThrow(/no housing record.*2024HU9999999/i);
    expect(() =>
      compileMutatedFixture((fixture) => {
        const row = fixture.artifacts.housingCsv.split("\n")[1]!;
        fixture.artifacts.housingCsv += `${row}\n`;
      }),
    ).toThrow(/Duplicate PUMS housing SERIALNO/);
    expect(() =>
      compileMutatedFixture((fixture) => {
        fixture.artifacts.housingCsv = fixture.artifacts.housingCsv.replace(
          ",10,3,1,02,",
          ",10,4,1,02,",
        );
      }),
    ).toThrow(/declares NP 4 but joins to 3/);
    expect(() =>
      compileMutatedFixture((fixture) => {
        fixture.artifacts.identity.surveyYear = 2023;
      }),
    ).toThrow(/must name the 2024 1-year product/);
  });

  it("retains an unrecognized dictionary label without assigning canonical meaning", () => {
    const compiled = compileMutatedFixture((fixture) => {
      fixture.artifacts.dictionaryCsv = fixture.artifacts.dictionaryCsv.replace(
        "Opposite-sex husband/wife/spouse",
        "Unrecognized relationship semantics",
      );
    });
    expect(compiled.records[0]!.persons[1]!.relationship).toEqual(
      expect.objectContaining({
        state: "KNOWN",
        value: expect.objectContaining({ canonical: null }),
      }),
    );
  });
});

describe("ACS PUMS deterministic household selection", () => {
  const baseContext = {
    surveyYear: 2024 as const,
    stateUsps: "WY",
    stateFips: "56",
    constraints: { subjectRelationship: "reference-person" as const },
    allocation: { slot: 0, slots: 1 },
  };

  it("is replay-stable for the same seed, corpus, state, version, and constraints", () => {
    const compiled = corpus();
    const first = selectAcsPumsHouseholdDonor(compiled, {
      ...baseContext,
      worldSeed: "same-world",
    });
    const replay = selectAcsPumsHouseholdDonor(compiled, {
      ...baseContext,
      worldSeed: "same-world",
    });

    expect(replay).toStrictEqual(first);
    expect(first.householdWeight).toBeGreaterThan(0);
    expect(first.selectionKey).toContain(compiled.corpus.canonicalSha256);
  });

  it("shares a world's slots among the survey households by weight, with no draw", () => {
    const compiled = corpus();
    const slots = 64;
    const weights = compiled.records
      .filter((household) => household.shard.stateUsps === "WY")
      .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber))
      .map((household) => ({
        serial: household.serialNumber,
        weight: (household.householdWeight as { value: number }).value,
      }));
    const owed = largestRemainderAllocation(
      weights.map((row) => row.weight),
      slots,
    );
    expect(owed.reduce((sum, count) => sum + count, 0)).toBe(slots);
    for (const seed of ["allocation-a", "allocation-b"]) {
      const taken = new Map<string, number>();
      for (let slot = 0; slot < slots; slot += 1) {
        const selection = selectAcsPumsHouseholdDonor(compiled, {
          ...baseContext,
          worldSeed: seed,
          allocation: { slot, slots },
        });
        taken.set(
          selection.household.serialNumber,
          (taken.get(selection.household.serialNumber) ?? 0) + 1,
        );
      }
      // Each household is taken exactly as often as its weight's share.
      weights.forEach((row, index) =>
        expect(taken.get(row.serial) ?? 0, `${seed} ${row.serial}`).toBe(
          owed[index],
        ),
      );
    }
    // Largest remainder in exact integers: 7, 2 and 1 of 10 for 70, 20, 10;
    // a remainder tie goes to the larger weight.
    expect(largestRemainderAllocation([70, 20, 10], 10)).toEqual([7, 2, 1]);
    expect(largestRemainderAllocation([3, 1], 2)).toEqual([2, 0]);
    expect(largestRemainderAllocation([1, 1, 2], 2)).toEqual([1, 0, 1]);
    expect(largestRemainderAllocation([5, 3], 1)).toEqual([1, 0]);
    expect(() =>
      selectAcsPumsHouseholdDonor(compiled, {
        ...baseContext,
        worldSeed: "allocation-a",
        allocation: { slot: 4, slots: 4 },
      }),
    ).toThrow(/outside the 4 allocated/);
    expect(() =>
      selectAcsPumsHouseholdDonor(compiled, {
        ...baseContext,
        worldSeed: "wrong-state",
        stateFips: "08",
      }),
    ).toThrow(/No coherent PUMS household donor/);
  });
});

describe("ACS PUMS one-way character-history bridge", () => {
  function setup() {
    const compiled = corpus();
    const world = createDemoWorld("pums-bridge-test");
    const subjectPersonId = world.personOrder.find(
      (personId) =>
        ageOnDate(world.people[personId]!.birthDate, world.currentDate) === 35,
    )!;
    const selection = selectAcsPumsHouseholdDonor(compiled, {
      worldSeed: world.seed,
      allocation: { slot: 0, slots: 1 },
      surveyYear: 2024,
      stateUsps: "WY",
      stateFips: "56",
      constraints: {
        householdSizeMin: 3,
        householdSizeMax: 3,
        subjectAgeMin: 35,
        subjectAgeMax: 35,
        subjectRelationship: "reference-person",
      },
    });
    const jurisdictionId = world.people[subjectPersonId]!.homeJurisdictionId;
    return { compiled, world, subjectPersonId, selection, jurisdictionId };
  }

  it("creates canonical household, relationship, dwelling, and tenure history without inventing identity or private-state facts", () => {
    const { world, subjectPersonId, selection, jurisdictionId } = setup();
    const privateCounts = {
      events: world.history.events.length,
      memories: world.history.memories.length,
      privateBeliefs: world.history.privateBeliefs.length,
      personalityTendencies: world.history.personalityTendencies.length,
      workRelationships: world.history.workRelationships.length,
      educationEnrollments: world.history.educationEnrollments.length,
    };
    const applied = applyAcsPumsCharacterHistoryBridge({
      world,
      selection,
      subjectPersonId,
      effectiveAt: world.currentDate,
      householdStableKey: "fixture:pums-household",
      householdLabel: "Fictional donor-shaped household",
      residence: {
        jurisdictionId,
        label: "Fictional placement supplied by the world generator",
        provenance: {
          kind: "generated",
          generatorKey: "fixture-placement-v1",
        },
      },
      bindings: [
        { personNumber: 1, personId: subjectPersonId },
        {
          personNumber: 2,
          contextPerson: {
            stableKey: "fixture:pums-person:2",
            givenName: "Robin",
            familyName: "Vale",
            birthDate: makeIsoDate("1991-06-01"),
            homeJurisdictionId: jurisdictionId,
            identity: { gender: "nonbinary", pronouns: "they-them" },
          },
        },
        {
          personNumber: 3,
          contextPerson: {
            stableKey: "fixture:pums-person:3",
            givenName: "Morgan",
            familyName: "Vale",
            birthDate: makeIsoDate("2023-06-01"),
            homeJurisdictionId: jurisdictionId,
            identity: { gender: "male", pronouns: "he-him" },
          },
        },
      ],
    });
    const next = applied.world;

    expect(next.history.households).toHaveLength(
      world.history.households.length + 1,
    );
    expect(next.history.householdMemberships).toHaveLength(
      world.history.householdMemberships.length + 3,
    );
    expect(next.history.partnerships).toHaveLength(
      world.history.partnerships.length + 1,
    );
    expect(next.history.kinshipRelationships).toHaveLength(
      world.history.kinshipRelationships.length + 1,
    );
    expect(next.history.dwellings).toHaveLength(
      world.history.dwellings.length + 1,
    );
    expect(next.history.housingTenures).toHaveLength(
      world.history.housingTenures.length + 1,
    );
    expect(next.history.partnerships.at(-1)?.kind).toBe("legal:spouse");
    expect(next.history.kinshipRelationships.at(-1)?.kind).toBe(
      "lineal:biological-parent-child",
    );
    expect(next.history.dwellings.at(-1)?.classification).toBe(
      "residential:single-family",
    );
    expect(next.history.housingTenures.at(-1)?.kind).toBe("lease:rental");
    expect(next.people[subjectPersonId]!.identity).toBeUndefined();
    const contextPeople = Object.values(applied.contextPersonIds).map(
      (personId) => next.people[personId]!,
    );
    expect(contextPeople.map((person) => person.identity)).toEqual([
      { gender: "nonbinary", pronouns: "they-them" },
      { gender: "male", pronouns: "he-him" },
    ]);
    expect(next.history.events).toHaveLength(privateCounts.events);
    expect(next.history.memories).toHaveLength(privateCounts.memories);
    expect(next.history.privateBeliefs).toHaveLength(
      privateCounts.privateBeliefs,
    );
    expect(next.history.personalityTendencies).toHaveLength(
      privateCounts.personalityTendencies,
    );
    expect(next.history.workRelationships).toHaveLength(
      privateCounts.workRelationships,
    );
    expect(next.history.educationEnrollments).toHaveLength(
      privateCounts.educationEnrollments,
    );
    expect(applied.audit).toContainEqual(
      expect.objectContaining({
        personNumber: 1,
        variable: "SEX",
        disposition: "identity-evidence-only",
      }),
    );
    expect(applied.audit).toContainEqual(
      expect.objectContaining({
        variable: "OCCP",
        disposition: "retained-unmapped",
      }),
    );
    expect(applied.sourceReference).toMatch(/puma=00100/);
    expect(applied.sourceReference).not.toMatch(/city|address/i);
    expect(JSON.stringify(next)).not.toContain(
      selection.household.serialNumber,
    );
    expect(deserializeWorld(serializeWorld(next))).toStrictEqual(next);
  });

  it("rejects partial binding and donor-age mismatch instead of filling gaps", () => {
    const { world, subjectPersonId, selection, jurisdictionId } = setup();
    const base = {
      world,
      selection,
      subjectPersonId,
      effectiveAt: world.currentDate,
      householdStableKey: "fixture:invalid-household",
      householdLabel: "Invalid fixture household",
    } as const;
    expect(() =>
      applyAcsPumsCharacterHistoryBridge({
        ...base,
        bindings: [{ personNumber: 1, personId: subjectPersonId }],
      }),
    ).toThrow(/every person.*bound exactly once/i);
    expect(() =>
      applyAcsPumsCharacterHistoryBridge({
        ...base,
        bindings: [
          { personNumber: 1, personId: subjectPersonId },
          {
            personNumber: 2,
            contextPerson: {
              stableKey: "fixture:wrong-age:2",
              givenName: "A",
              familyName: "Person",
              birthDate: makeIsoDate("2000-01-01"),
              homeJurisdictionId: jurisdictionId,
            },
          },
          {
            personNumber: 3,
            contextPerson: {
              stableKey: "fixture:valid-age:3",
              givenName: "B",
              familyName: "Person",
              birthDate: makeIsoDate("2023-06-01"),
              homeJurisdictionId: jurisdictionId,
            },
          },
        ],
      }),
    ).toThrow(/age does not match donor AGEP/);
  });
});

// A151, end to end: a small world in a place drawn from all 56 takes its
// donor households from the survey's own households for that state, each
// with every member's recorded age, or is refused where the corpus holds none.
const SMALL_WORLD_SEED = "a151-survey-households";
const [DRAWN] = pickDistinct(
  new SeededRng(SMALL_WORLD_SEED),
  lifePlaceStateIdentities(),
  1,
);
describe(`A151: a small world's donor households come from its state's survey households (${DRAWN!.jurisdictionKey}, seed ${SMALL_WORLD_SEED}, drawn from all 56)`, () => {
  it("allocates the drawn place's households by weight, or refuses a state the corpus does not hold", () => {
    expect(lifePlaceStateIdentities()).toHaveLength(56);
    const compiled = corpus();
    for (const usps of [DRAWN!.usps, "WY"]) {
      const small = smallWorld({
        place: `US-${usps}`,
        seed: SMALL_WORLD_SEED,
        people: 3,
      });
      const records = compiled.records.filter(
        (household) => household.shard.stateUsps === small.stateUsps,
      );
      const context = {
        worldSeed: small.world.seed,
        surveyYear: 2024 as const,
        stateUsps: small.stateUsps,
        stateFips: records[0]?.shard.stateFips ?? "00",
        constraints: {},
      };
      if (records.length === 0) {
        expect(() =>
          selectAcsPumsHouseholdDonor(compiled, {
            ...context,
            allocation: { slot: 0, slots: 1 },
          }),
        ).toThrow(/No coherent PUMS household donor/);
        continue;
      }
      const slots = records.length * 3;
      for (let slot = 0; slot < slots; slot += 1) {
        const selection = selectAcsPumsHouseholdDonor(compiled, {
          ...context,
          allocation: { slot, slots },
        });
        // A partner's and a child's ages are the survey household's own.
        for (const person of selection.household.persons)
          expect(person.age.state, selection.household.serialNumber).toBe(
            "KNOWN",
          );
        expect(selection.household.shard.stateUsps).toBe(small.stateUsps);
      }
    }
  });
});

// A151: the donor is allocated by weight, never drawn.
describe("A151: the household donor is allocated, not drawn", () => {
  it("its module holds no seeded stream", () => {
    const source = readFileSync(
      resolve(REPO, "src/source/adapters/acs-pums-character-history.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/SeededRng|\brng\./);
    expect(source).toMatch(/largestRemainderAllocation\(/);
  });
});
