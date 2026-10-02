import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { stateJurisdictionForKey } from "./life-places";
import { makeIsoDate } from "./dates";
import {
  FISCAL_INSTRUMENT_FAMILIES,
  STANDING_TRANSIT_AUTHORITY,
  STANDING_NON_SPENDING_AUTHORITY,
} from "./legislation-fiscal-families";
import { compileBillDraft } from "./legislation-drafting";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import { deserializeWorld, serializeWorld } from "./serialization";
import type {
  ProgramVariant,
  ResolvedParameters,
  ProgramParameterValue,
} from "./legislation-content-contracts";

const SEED = "a20-fiscal-data-20261002";
const place = drawRandomPlace(SEED, (candidate) => {
  const jurisdiction = candidate.stateJurisdictionKey
    ? stateJurisdictionForKey(candidate.stateJurisdictionKey)
    : null;
  return (
    jurisdiction !== null &&
    legislativePackForJurisdiction(jurisdiction.id) !== null
  );
});
const beforeHashes: Readonly<Record<string, string>> = {
  appropriations:
    "9fca7a5ead24d718caff22c91b0f3ab274823e187728aa120057e271ee61b8c0",
  "program-sunset":
    "b731b114cc47e246c1d7f81aeb08029349f858ad35a47d57e510c30728e6151f",
  "service-charges":
    "fa6ca18ee17c25ac8efffedd919b3e87d042f993f83a28dea97c0ba65e61f8ea",
};
const survivorKeys = [
  "transit-staged-service-v1",
  "federal-passenger-rail-v1",
  "local-fix-it-first-v1",
  "transit-staged-service-v2",
];
const coreFamilies = FISCAL_INSTRUMENT_FAMILIES.map((family) => ({
  ...family,
  variants: family.variants.filter(
    (variant) => !survivorKeys.includes(variant.variantKey),
  ),
}));

function resolved(
  variant: ProgramVariant,
  boundary: number,
  option: number,
  endsOn: ResolvedParameters["endsOn"],
): ResolvedParameters {
  const values: Record<string, ProgramParameterValue> = {};
  for (const parameter of variant.parameters) {
    if (parameter.kind === "money") {
      const base = variant.defaults[parameter.key]!;
      if (base.kind !== "money") throw new Error("Expected money default.");
      values[parameter.key] = {
        kind: "money",
        currency: parameter.currency,
        minorUnits:
          boundary === 0
            ? 0
            : boundary === 1
              ? parameter.minMinorUnits
              : boundary === 2
                ? base.minorUnits
                : parameter.maxMinorUnits,
      };
    } else if (parameter.kind === "integer") {
      const base = variant.defaults[parameter.key]!;
      if (base.kind !== "integer") throw new Error("Expected integer default.");
      values[parameter.key] = {
        kind: "integer",
        value:
          boundary === 0
            ? parameter.min
            : boundary === 3
              ? parameter.max
              : base.value,
      };
    } else values[parameter.key] = variant.defaults[parameter.key]!;
  }
  return {
    values,
    endsOn,
    authority: {
      ...STANDING_TRANSIT_AUTHORITY,
      citationLabel: "Fixture citation",
      programLabel: "Fixture program",
    },
    filedOn: makeIsoDate("2026-01-05"),
    startsOn: makeIsoDate("2026-01-05"),
    money: (key) => {
      const value = values[key]!;
      if (value.kind !== "money") throw new Error("Expected money value.");
      return `USD ${value.minorUnits}`;
    },
    integer: (key) => {
      const value = values[key]!;
      if (value.kind !== "integer") throw new Error("Expected integer value.");
      return value.value;
    },
    choice: (key) => {
      const parameter = variant.parameters.find((row) => row.key === key)!;
      if (parameter.kind !== "enumerated")
        throw new Error("Expected enumerated parameter.");
      return parameter.options[option % parameter.options.length]!;
    },
  };
}
function cases(variant: ProgramVariant): ResolvedParameters[] {
  const count = Math.max(
    ...variant.parameters
      .filter((row) => row.kind === "enumerated")
      .map((row) => row.options.length),
    1,
  );
  return [0, 1, 2, 3].flatMap((boundary) =>
    Array.from({ length: count }, (_, option) =>
      [null, makeIsoDate("2031-12-29"), makeIsoDate("2033-01-02")].flatMap(
        (end) =>
          ["default", "null", "min", "max"].flatMap((mode) => {
            const row = resolved(variant, boundary, option, end);
            const values = { ...row.values };
            for (const parameter of variant.parameters)
              if (parameter.kind === "duration-years") {
                const base = variant.defaults[parameter.key]!;
                if (base.kind !== "duration-years")
                  throw new Error("Expected duration default.");
                values[parameter.key] = {
                  kind: "duration-years",
                  years:
                    mode === "null"
                      ? null
                      : mode === "min"
                        ? parameter.minYears
                        : mode === "max"
                          ? parameter.maxYears
                          : base.years,
                };
              }
            return [
              { ...row, values },
              { ...row, values, authority: null },
            ];
          }),
      ),
    ).flat(),
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

function renderOrRefusal(
  clause: ProgramVariant["clauses"][number],
  row: ResolvedParameters,
) {
  try {
    return clause.render(row);
  } catch (error) {
    return { error: (error as Error).message };
  }
}

describe(`A20 fiscal data in ${place.displayName}, seed ${SEED}`, () => {
  for (const family of coreFamilies)
    it(`preserves original-source metadata, terms and amendment wording in ${family.familyKey}`, () => {
      const result = {
        ...family,
        variants: family.variants.map((variant) => ({
          ...variant,
          clauses: variant.clauses.map((clause) => ({
            ...clause,
            renderings: cases(variant).map((row) =>
              renderOrRefusal(clause, row),
            ),
          })),
          amendmentInvitation: {
            ...variant.amendmentInvitation,
            texts: ["USD 0", "USD 60000000", "example label"].map((label) =>
              variant.amendmentInvitation.render(label),
            ),
          },
        })),
      };
      // Captured from the replaced source before edits: choices, bounds, null/two dated ends and amendment labels.
      expect(
        createHash("sha256")
          .update(JSON.stringify(canonical(result)))
          .digest("hex"),
      ).toBe(beforeHashes[family.familyKey]);
    });

  it("preserves family/variant order and optional fiscal readings", () => {
    expect(coreFamilies.map((family) => family.familyKey)).toEqual(
      Object.keys(beforeHashes),
    );
    expect(coreFamilies.flatMap((family) => family.variants)).toHaveLength(8);
    expect(
      coreFamilies[0]!.variants[0]!.amendmentInvitation.render("$& $$"),
    ).toContain("$& $$");
    expect(
      FISCAL_INSTRUMENT_FAMILIES[0]!.variants
        .slice(-4)
        .map((row) => row.variantKey),
    ).toEqual(survivorKeys);
    expect(STANDING_TRANSIT_AUTHORITY).toBe(
      FISCAL_INSTRUMENT_FAMILIES[0]!.standingAuthorities![0],
    );
    expect(STANDING_NON_SPENDING_AUTHORITY).toBe(
      FISCAL_INSTRUMENT_FAMILIES[0]!.standingAuthorities![2],
    );
    for (const family of coreFamilies)
      for (const variant of family.variants) {
        const money = variant.parameters.find((row) => row.kind === "money");
        if (!money) continue;
        const clause = variant.clauses.find(
          (row) => row.parameterKey === money.key,
        )!;
        const value = clause.render({
          ...cases(variant)[0]!,
          values: {},
          money: () => "fixture amount",
        });
        expect(value.fiscalExposureMinorUnits).toBeNull();
        expect(value.operativeEffect).toBeUndefined();
      }
  });

  it("compiles authority and zero-match wording, files ordered provisions and retains them on Continue", () => {
    const small = smallWorld({
      place: place.key,
      seed: SEED,
      date: "2026-01-05",
    });
    const pack = legislativePackForJurisdiction(small.stateJurisdictionId)!;
    const variant = coreFamilies[0]!.variants.find(
      (row) => row.variantKey === "conditional-match",
    )!;
    const draft = compileBillDraft({
      familyKey: "appropriations",
      variantKey: variant.variantKey,
      scenarioKey: `institution:${pack.packId}`,
      jurisdictionId: small.stateJurisdictionId,
      rulePackId: pack.packId,
      designation: "Fixture fiscal bill 20",
      filedOn: small.world.currentDate,
      predicateAuthority: STANDING_TRANSIT_AUTHORITY,
      parameterValues: {
        ...variant.defaults,
        "match-share": { kind: "integer", value: 0 },
      },
    });
    let world = introduceMeasure(small.world, {
      stableKey: "a20:fiscal-data-bill",
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
        stableKey: `a20:fiscal-data-bill:${clause.provisionKey}`,
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
    expect(provisions.map((row) => row.provisionKey)).toEqual(
      variant.clauses.map((row) => row.provisionKey),
    );
    expect(
      provisions.find((row) => row.provisionKey === "match-condition")!.text,
    ).toBe(
      "No local contribution is required as a condition of disbursement under this Act.",
    );
    expect(
      provisions.find((row) => row.provisionKey === "availability")!.text,
    ).toContain("January 5, 2029");
    expect(
      draft.clauses.every((row) => row.operativeEffect === undefined),
    ).toBe(true);
    expect(
      deserializeWorld(
        serializeWorld(world),
      ).history.legislativeProvisions!.filter(
        (row) => row.measureId === measureId,
      ),
    ).toEqual(provisions);
  });
});
