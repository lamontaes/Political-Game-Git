import { describe, expect, it } from "vitest";
import { normalizeMunicipalPacks } from "../../src/source/domains/municipal-governance/normalize";
import { MUNICIPAL_PRODUCTION_PACKS } from "../../src/source/domains/municipal-governance/production-packs";
import {
  validateMunicipalGovernanceCorpus,
  compileMunicipalFixture,
  openMunicipalFixture,
} from "../../src/source/domains/municipal-governance/index";

const pack = MUNICIPAL_PRODUCTION_PACKS.find(
  (entry) => entry.sourceGovernmentKey === "us-va-charlottesville",
)!;
function normalized(value: unknown) {
  return normalizeMunicipalPacks(
    [
      {
        ...pack,
        legislativeProcedure: {
          ...pack.legislativeProcedure,
          introductionToPassage: {
            ...pack.legislativeProcedure.introductionToPassage!,
            value,
          },
        },
      },
    ],
    "2026-09-19",
  ).records[0]!;
}

describe("municipal passage interval source contract", () => {
  it.each([
    { minimumInterveningDays: 5, sameDayException: null },
    {
      basis: "WHOLE_INTERVENING_DAYS",
      minimumInterveningDays: 5,
      sameDayException: null,
    },
    { basis: "ELAPSED_DAYS", minimumElapsedDays: 5, sameDayException: null },
  ])(
    "preserves the declared count and basis through normalization",
    (value) => {
      expect(
        normalized(value).legislativeProcedure.introductionToPassage,
      ).toMatchObject({ state: "KNOWN", value });
      const fixture = compileMunicipalFixture(
        openMunicipalFixture(
          "fixtures/source/municipal-governance/kentucky-pilot.json",
        ),
      );
      const report = validateMunicipalGovernanceCorpus({
        ...fixture,
        records: [normalized(value)],
      });
      expect(
        report.findings.filter(
          (finding) => finding.code === "municipal/invalid-passage-interval",
        ),
      ).toEqual([]);
    },
  );

  it.each([
    { basis: "ELAPSED_DAYS", minimumElapsedDays: -1 },
    { basis: "ELAPSED_DAYS", minimumElapsedDays: 1.5 },
    { basis: "UNKNOWN_BASIS", minimumInterveningDays: 5 },
    { basis: "ELAPSED_DAYS", minimumElapsedDays: 5, minimumInterveningDays: 5 },
    { minimumElapsedDays: 5 },
  ])("rejects unsupported or ambiguous interval arithmetic", (value) => {
    const fixture = compileMunicipalFixture(
      openMunicipalFixture(
        "fixtures/source/municipal-governance/kentucky-pilot.json",
      ),
    );
    const record = normalized({ ...value, sameDayException: null });
    const report = validateMunicipalGovernanceCorpus({
      ...fixture,
      records: [record],
    });
    expect(
      report.findings.some(
        (finding) => finding.code === "municipal/invalid-passage-interval",
      ),
    ).toBe(true);
  });
});
