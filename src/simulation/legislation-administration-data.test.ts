import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { stateJurisdictionForKey } from "./life-places";
import { makeIsoDate } from "./dates";
import {
  PUBLIC_ADMINISTRATION_FAMILIES,
  STANDING_ASSISTANCE_AUTHORITY,
} from "./legislation-administration-families";
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

const SEED = "a20-administration-data-20261002";
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
  "assistance-eligibility":
    "5ffb97942f782dee450868da9ca675d930488f244d2e412cc01a725f20dbac19",
  "agency-reporting":
    "0c745283a5032f9c730505c65637675925b69fac10a63a907cc13c10191aa304",
  "public-workforce":
    "391d54f6314e3e391eb7b3b04373334eae54d0a5b6e933a1d20b7afe2bda1ded",
};
const coreFamilies = PUBLIC_ADMINISTRATION_FAMILIES;

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
      ...STANDING_ASSISTANCE_AUTHORITY,
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

describe(`A20 administration data in ${place.displayName}, seed ${SEED}`, () => {
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
    expect(coreFamilies.flatMap((family) => family.variants)).toHaveLength(9);
    expect(STANDING_ASSISTANCE_AUTHORITY).toBe(
      PUBLIC_ADMINISTRATION_FAMILIES[0]!.standingAuthorities![0],
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

  it("compiles singular-position wording, files ordered provisions and retains them on Continue", () => {
    const small = smallWorld({
      place: place.key,
      seed: SEED,
      date: "2026-01-05",
    });
    const pack = legislativePackForJurisdiction(small.stateJurisdictionId)!;
    const variant = coreFamilies[2]!.variants.find(
      (row) => row.variantKey === "authorize-positions",
    )!;
    const draft = compileBillDraft({
      familyKey: "public-workforce",
      variantKey: variant.variantKey,
      scenarioKey: `institution:${pack.packId}`,
      jurisdictionId: small.stateJurisdictionId,
      rulePackId: pack.packId,
      designation: "Fixture administration bill 20",
      filedOn: small.world.currentDate,
      parameterValues: {
        ...variant.defaults,
        "post-count": { kind: "integer", value: 1 },
      },
    });
    let world = introduceMeasure(small.world, {
      stableKey: "a20:administration-data-bill",
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
        stableKey: `a20:administration-data-bill:${clause.provisionKey}`,
        measureId,
        provisionKey: clause.provisionKey,
        sectionNumber: clause.sectionNumber,
        heading: clause.heading,
        text: clause.text,
        beneficiary: clause.beneficiary,
        ...(clause.fiscalPeriod === undefined
          ? {}
          : { fiscalPeriod: clause.fiscalPeriod }),
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
      provisions.find((row) => row.provisionKey === "posts-authorized")!.text,
    ).toContain("authorized 1 post of inspector");
    expect(
      provisions.find((row) => row.provisionKey === "post-term")!.text,
    ).toContain("January 5, 2030");
    expect(
      provisions.find((row) => row.provisionKey === "salary-ceiling")!
        .fiscalExposureMinorUnits,
    ).toBe(96000000);
    expect(
      provisions.find((row) => row.provisionKey === "salary-ceiling")!
        .fiscalPeriod,
    ).toBe("annual");
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
