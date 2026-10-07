import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { makeIsoDate } from "./dates";
import { SERVICE_FAMILIES } from "./legislation-service-families";
import { compileBillDraft } from "./legislation-drafting";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import { deserializeWorld, serializeWorld } from "./serialization";
import type {
  ProgramVariant,
  ResolvedParameters,
} from "./legislation-content-contracts";

const SEED = "a20-services-data-20261002";
const place = drawRandomPlace(SEED);
const beforeHashes: Readonly<Record<string, string>> = {
  "education-facilities":
    "ed51964e824ba36176d38a693b6ad3c925bf4647f6b7794308c86e2db272e070",
  "health-service-capacity":
    "233cf9382226bc378ec0e62572bf23d2b8f8dfb75953fc3e8e94779da1f4826a",
  "environmental-monitoring":
    "9378a2664dffce5fef4650d1375a8ae414c78bb81cbc97279eea465a91988def",
  "procurement-disclosure":
    "be40baebedaa816ceabb6edafa6eba55ffe4759aee1f48d88ed9e9119c3831b0",
  "social-service-access":
    "5728ec8b4bdb7bf39424b6e19f16e804152beb169978e105f0da100f26d5287d",
  "agricultural-conservation":
    "7634f20de25a37900f2cab2d752a7409615aa1be4b0a11357b14b05db1aa274f",
  "veteran-transition-referrals":
    "877206fb9a6e12f0ab95b4e5d19546ff3aeb03828482814d1a7b36df777928b0",
};
function resolved(
  variant: ProgramVariant,
  amount: number,
  duty: string,
  commencement: string,
): ResolvedParameters {
  return {
    values: {
      "programme-ceiling": {
        kind: "money",
        minorUnits: amount,
        currency: "USD",
      },
    },
    authority: null,
    filedOn: makeIsoDate("2026-01-05"),
    startsOn: makeIsoDate("2026-01-05"),
    endsOn: null,
    money: () => `USD ${amount}`,
    choice: (key) => {
      const spec = variant.parameters.find((row) => row.key === key);
      if (!spec || spec.kind !== "enumerated")
        throw new Error("Expected enumerated fixture parameter.");
      return spec.options.find(
        (option) =>
          option.value === (key === "operative-choice" ? duty : commencement),
      )!;
    },
    integer: () => {
      throw new Error("No integer reader used.");
    },
  };
}
function cases(variant: ProgramVariant): ResolvedParameters[] {
  const duty = variant.parameters.find(
    (row) => row.key === "operative-choice",
  )!;
  const commencement = variant.parameters.find(
    (row) => row.key === "commencement",
  )!;
  if (duty.kind !== "enumerated" || commencement.kind !== "enumerated")
    throw new Error("Expected enumerated fixture parameters.");
  return [0, 100000000, 600000000, 5000000000].flatMap((amount) =>
    duty.options.flatMap((d) =>
      commencement.options.map((c) =>
        resolved(variant, amount, d.value, c.value),
      ),
    ),
  );
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined && typeof item !== "function")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}

describe(`A20 service-family data in ${place.displayName}, seed ${SEED}`, () => {
  for (const family of SERVICE_FAMILIES)
    it(`preserves original-source metadata and all wording in ${family.familyKey}`, () => {
      const result = {
        ...family,
        variants: family.variants.map((variant) => ({
          ...variant,
          clauses: variant.clauses.map((clause) => ({
            ...clause,
            renderings: cases(variant).map((row) => clause.render(row)),
          })),
          amendmentInvitation: {
            ...variant.amendmentInvitation,
            text: variant.amendmentInvitation.render(""),
          },
        })),
      };
      // Captured from the replaced source before editing, including every option and amount boundary.
      expect(
        createHash("sha256")
          .update(JSON.stringify(canonical(result)))
          .digest("hex"),
      ).toBe(beforeHashes[family.familyKey]);
    });

  it("preserves family/variant order and authorization ceilings without appropriation effects", () => {
    expect(SERVICE_FAMILIES.map((family) => family.familyKey)).toEqual(
      Object.keys(beforeHashes),
    );
    expect(SERVICE_FAMILIES.flatMap((family) => family.variants)).toHaveLength(
      11,
    );
    for (const family of SERVICE_FAMILIES)
      for (const variant of family.variants) {
        const ceiling = variant.clauses.find(
          (row) => row.parameterKey === "programme-ceiling",
        );
        if (!ceiling) continue;
        expect(() =>
          ceiling.render({ ...cases(variant)[0]!, values: {} }),
        ).toThrow("A service authorization requires a typed money ceiling.");
        for (const parameters of cases(variant)) {
          const rendered = ceiling.render(parameters);
          expect(rendered.operativeEffect).toBeUndefined();
          expect(rendered.fiscalExposureLabel).toBe(
            `${parameters.money("programme-ceiling")} total program authorization`,
          );
        }
      }
  });

  it("compiles alternative service wording, files ordered provisions and retains them on Continue", () => {
    const small = smallWorld({
      place: place.key,
      seed: SEED,
      date: "2026-01-05",
    });
    const pack = legislativePackForJurisdiction(small.stateJurisdictionId)!;
    const draft = compileBillDraft({
      familyKey: "education-facilities",
      variantKey: "school-repair-authorization",
      scenarioKey: `institution:${pack.packId}`,
      jurisdictionId: small.stateJurisdictionId,
      rulePackId: pack.packId,
      designation: "Fixture service bill 20",
      filedOn: small.world.currentDate,
      parameterValues: {
        "programme-ceiling": {
          kind: "money",
          minorUnits: 600000000,
          currency: "USD",
        },
        "operative-choice": { kind: "enumerated", value: "prevent-closure" },
        commencement: { kind: "enumerated", value: "next-calendar-year" },
      },
    });
    let world = introduceMeasure(small.world, {
      stableKey: "a20:service-data-bill",
      jurisdictionId: small.stateJurisdictionId,
      rulePackId: pack.packId,
      designation: draft.designation,
      shortTitle: draft.shortTitle,
      summary: draft.summary,
      origin: "member-introduction",
      subjectClass: draft.subjectClass,
      sponsorPersonId: small.personId,
    });
    const measureId = world.history.legislativeMeasures!.at(-1)!.id;
    for (const clause of draft.clauses)
      world = recordFiledProvision(world, {
        stableKey: `a20:service-data-bill:${clause.provisionKey}`,
        measureId,
        provisionKey: clause.provisionKey,
        sectionNumber: clause.sectionNumber,
        heading: clause.heading,
        text: clause.text,
        beneficiary: clause.beneficiary,
        applicationScope: {
          jurisdictionId: small.stateJurisdictionId,
          segmentKey: null,
        },
        ...(clause.fiscalExposureLabel === null
          ? {}
          : {
              fiscalExposureLabel: clause.fiscalExposureLabel,
              fiscalExposureMinorUnits: clause.fiscalExposureMinorUnits,
            }),
      });
    const provisions = world.history.legislativeProvisions!.filter(
      (row) => row.measureId === measureId,
    );
    expect(provisions.map((row) => row.text)).toEqual(
      draft.clauses.map((row) => row.text),
    );
    expect(provisions.map((row) => row.provisionKey)).toEqual([
      "school-repair-authorization-scope",
      "school-repair-authorization-operative-duty",
      "school-repair-authorization-safeguard",
      "school-repair-authorization-commencement",
      "school-repair-authorization-programme-ceiling",
    ]);
    expect(provisions[1]!.text).toContain("keep teaching spaces usable");
    expect(provisions[3]!.text).toBe(
      "This Act takes effect on January 1 of the calendar year following its enactment.",
    );
    expect(draft.clauses[4]!.operativeEffect).toBeUndefined();
    expect(provisions[4]!.fiscalExposureMinorUnits).toBe(600000000);
    expect(
      deserializeWorld(
        serializeWorld(world),
      ).history.legislativeProvisions!.filter(
        (row) => row.measureId === measureId,
      ),
    ).toEqual(provisions);
  });
});
