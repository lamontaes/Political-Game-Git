import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { makeIsoDate } from "./dates";
import {
  LOCAL_FIX_IT_FIRST_VARIANT as variant,
  LOCAL_FIX_IT_FIRST_PROPOSITION_KEY,
} from "./legislation-local-fiscal-families";
import { compileBillDraft } from "./legislation-drafting";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import {
  municipalGovernmentForLifePlace,
  municipalRulePackFor,
  localFiscalAuthorityScopeForRulePackId,
} from "./municipal-government";
import { deserializeWorld, serializeWorld } from "./serialization";
import type {
  ResolvedParameters,
  PredicateAuthority,
} from "./legislation-content-contracts";

const SEED = "a20-local-fiscal-data-20261002";
const place = drawRandomPlace(SEED, (candidate) => {
  const government = municipalGovernmentForLifePlace(candidate);
  if (!government) return false;
  const rules = municipalRulePackFor(government);
  return (
    rules.ok &&
    localFiscalAuthorityScopeForRulePackId(rules.pack.packId) !== null
  );
});

function resolved(
  amount: number,
  years: number,
  choice: string,
): ResolvedParameters {
  return {
    values: {
      appropriation: { kind: "money", minorUnits: amount, currency: "USD" },
      "availability-term": { kind: "duration-years", years },
      "reporting-duty": { kind: "enumerated", value: choice },
    },
    filedOn: makeIsoDate("2026-01-05"),
    startsOn: makeIsoDate("2026-01-05"),
    endsOn: null,
    authority: {
      kind: "standing-statute",
      authorityKey: "fixture",
      citationLabel: "Fixture citation",
      programLabel: "Fixture program",
      authorizesSpending: true,
      authorizedCeilingMinorUnits: null,
      currency: "USD",
      evidence: {
        kind: "authored-parameter",
        note: "Authored reader fixture.",
      },
    },
    money: () => `USD ${amount}`,
    choice: () => ({
      value: choice,
      label: choice,
      clausePhrase:
        choice === "annual-statement"
          ? "an annual statement"
          : "a quarterly statement",
    }),
    integer: () => {
      throw new Error("No integer reader used.");
    },
  };
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

describe(`A20 local maintenance data in ${place.displayName}, seed ${SEED}`, () => {
  it("preserves source metadata, ordered eligibility and all boundary wording", () => {
    const cases = [0, 25000000, 100000000000].flatMap((amount) =>
      [1, 2, 4].flatMap((years) =>
        ["annual-statement", "quarterly-statement"].map((choice) => ({
          amount,
          years,
          choice,
        })),
      ),
    );
    const result = {
      ...variant,
      clauses: variant.clauses.map((clause) => ({
        ...clause,
        renderings: cases.map(({ amount, years, choice }) =>
          clause.render(resolved(amount, years, choice)),
        ),
      })),
      amendmentInvitation: {
        ...variant.amendmentInvitation,
        text: variant.amendmentInvitation.render(""),
      },
    };
    // Captured from the replaced source before editing, across 18 parameter combinations.
    expect(
      createHash("sha256")
        .update(JSON.stringify(canonical(result)))
        .digest("hex"),
    ).toBe("a8f75b7f3c3dffde8b9058ca24632277b1694bab5f5994f3e96e3f26c4f51fd0");
    expect(variant.npcEligibility?.map((row) => row.governmentLevel)).toEqual([
      "municipality",
      "county",
    ]);
  });

  it("preserves exact missing authority, amount and duration refusals", () => {
    const render = (key: string) =>
      variant.clauses.find((row) => row.provisionKey === key)!.render;
    expect(() =>
      render("authority-named")({
        ...resolved(25000000, 2, "annual-statement"),
        authority: null,
      }),
    ).toThrow("The local maintenance authority is missing.");
    expect(() =>
      render("amount-provided")({
        ...resolved(25000000, 2, "annual-statement"),
        values: {},
      }),
    ).toThrow("The local maintenance amount is missing.");
    expect(() =>
      render("availability-term")({
        ...resolved(25000000, 2, "annual-statement"),
        values: {
          "availability-term": { kind: "duration-years", years: null },
        },
      }),
    ).toThrow("The local maintenance availability term is missing.");
  });

  it("compiles, files and retains ordered local bill provisions on Continue", () => {
    const small = smallWorld({
      place: place.key,
      seed: SEED,
      date: "2026-01-05",
      laws: [LOCAL_FIX_IT_FIRST_PROPOSITION_KEY],
    });
    const government = municipalGovernmentForLifePlace(place)!;
    const rules = municipalRulePackFor(government);
    if (!rules.ok)
      throw new Error("Selected local rule pack was not admitted.");
    const scope = localFiscalAuthorityScopeForRulePackId(rules.pack.packId)!;
    const authority: PredicateAuthority = {
      kind: "game-profile",
      authorityKey: scope.authority.authorityKey,
      authorityVersion: scope.authority.authorityVersion,
      profileVersion: scope.authority.profileVersion,
      rulePackId: rules.pack.packId,
      governmentLevel: scope.authority.level,
      publicGovernmentIdentity: {
        kind: "jurisdiction",
        jurisdictionId: scope.jurisdictionId,
      },
      permittedEffects: scope.authority.permittedEffects,
      citationLabel: "Fixture local public-works authority",
      programLabel: "Fixture local maintenance program",
      authorizedCeilingMinorUnits: null,
      currency: "USD",
      basis: "game-profile",
    };
    const draft = compileBillDraft({
      familyKey: "appropriations",
      variantKey: variant.variantKey,
      scenarioKey: `institution:${rules.pack.packId}`,
      jurisdictionId: scope.jurisdictionId,
      rulePackId: rules.pack.packId,
      designation: "Fixture local bill 20",
      filedOn: small.world.currentDate,
      parameterValues: {
        appropriation: { kind: "money", minorUnits: 25000000, currency: "USD" },
        "availability-term": { kind: "duration-years", years: 4 },
        "reporting-duty": { kind: "enumerated", value: "quarterly-statement" },
      },
      predicateAuthority: authority,
    });
    let world = introduceMeasure(small.world, {
      stableKey: "a20:local-data-bill",
      jurisdictionId: scope.jurisdictionId,
      rulePackId: rules.pack.packId,
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
        stableKey: `a20:local-data-bill:${clause.provisionKey}`,
        measureId,
        provisionKey: clause.provisionKey,
        sectionNumber: clause.sectionNumber,
        heading: clause.heading,
        text: clause.text,
        beneficiary: clause.beneficiary,
        applicationScope: {
          jurisdictionId: scope.jurisdictionId,
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
    expect(provisions.map((row) => row.provisionKey)).toEqual([
      "authority-named",
      "amount-provided",
      "maintenance-priority",
      "availability-term",
      "reporting-duty",
    ]);
    expect(provisions.map((row) => row.text)).toEqual(
      draft.clauses.map((row) => row.text),
    );
    expect(provisions[3]!.text).toContain("4 years");
    expect(provisions[4]!.text).toContain("a quarterly statement");
    expect(draft.clauses[1]!.operativeEffect).toEqual({
      kind: "public-program-appropriation",
    });
    expect(
      deserializeWorld(
        serializeWorld(world),
      ).history.legislativeProvisions!.filter(
        (row) => row.measureId === measureId,
      ),
    ).toEqual(provisions);
  });
});
