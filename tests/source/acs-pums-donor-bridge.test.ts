import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACS_PUMS_2024_PRODUCTION_GATE,
  compileAcsPumsDonorFixture,
  createAcsPums2024StateShardAcquisition,
  openAcsPumsDonorFixture,
} from "../../src/source/domains/acs-pums/index";

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
