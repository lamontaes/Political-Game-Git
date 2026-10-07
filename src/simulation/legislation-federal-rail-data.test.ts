import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { createWorld } from "./world";
import { makeIsoDate } from "./dates";
import {
  FEDERAL_PASSENGER_RAIL_VARIANT as variant,
  FEDERAL_PASSENGER_RAIL_PROPOSITION_KEY,
} from "./legislation-federal-rail-family";
import { compileBillDraft } from "./legislation-drafting";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { deserializeWorld, serializeWorld } from "./serialization";
import type {
  ResolvedParameters,
  PredicateAuthority,
} from "./legislation-content-contracts";

const SEED = "a20-federal-rail-data-20261002";
const place = drawRandomPlace(SEED);

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

describe(`A20 federal rail data in ${place.displayName}, seed ${SEED}`, () => {
  it("preserves source metadata, ordered eligibility and all boundary wording", () => {
    const cases = [0, 25000000000, 1000000000000].flatMap((amount) =>
      [1, 4, 8].flatMap((years) =>
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
    ).toBe("978dac0c64e3889f29fcd316804f4d201f3ccdfaeafb7b0f830189186194e645");
    expect(variant.npcEligibility?.map((row) => row.governmentLevel)).toEqual([
      "federal",
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
    ).toThrow("The federal rail game-profile authority is missing.");
    expect(() =>
      render("amount-provided")({
        ...resolved(25000000, 2, "annual-statement"),
        values: {},
      }),
    ).toThrow("The federal rail appropriation amount is missing.");
    expect(() =>
      render("availability-term")({
        ...resolved(25000000, 2, "annual-statement"),
        values: {
          "availability-term": { kind: "duration-years", years: null },
        },
      }),
    ).toThrow("The federal rail availability term is missing.");
  });

  it("compiles, files and retains ordered federal bill provisions on Continue", () => {
    const small = smallWorld({
      place: place.key,
      seed: SEED,
      date: "2026-01-05",
      laws: [FEDERAL_PASSENGER_RAIL_PROPOSITION_KEY],
    });
    const pack = legislativePackForJurisdiction(
      NATIONAL_ELECTION_JURISDICTION.id,
    )!;
    const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
    const initialWorld = createWorld({
      seed: small.world.seed,
      currentDate: small.world.currentDate,
      people: small.world.personOrder.map((id) => small.world.people[id]!),
      jurisdictions: [
        ...small.world.jurisdictionOrder.map(
          (id) => small.world.jurisdictions[id]!,
        ),
        NATIONAL_ELECTION_JURISDICTION,
      ],
      policyCatalog: small.world.policyCatalog,
    });
    const authority: PredicateAuthority = {
      kind: "game-profile",
      authorityKey: "game-profile:federal-passenger-rail/v1",
      authorityVersion: "fixture-authority/v1",
      profileVersion: "fixture-profile/v1",
      rulePackId: pack.packId,
      governmentLevel: "federal",
      publicGovernmentIdentity: { kind: "jurisdiction", jurisdictionId },
      permittedEffects: ["public-program-appropriation"],
      citationLabel: "Fixture federal rail authority",
      programLabel: "Fixture passenger rail program",
      authorizedCeilingMinorUnits: null,
      currency: "USD",
      basis: "game-profile",
    };
    const draft = compileBillDraft({
      familyKey: "appropriations",
      variantKey: variant.variantKey,
      scenarioKey: `institution:${pack.packId}`,
      jurisdictionId: jurisdictionId,
      rulePackId: pack.packId,
      designation: "Fixture rail bill 20",
      filedOn: small.world.currentDate,
      parameterValues: {
        appropriation: {
          kind: "money",
          minorUnits: 25000000000,
          currency: "USD",
        },
        "availability-term": { kind: "duration-years", years: 4 },
        "reporting-duty": { kind: "enumerated", value: "quarterly-statement" },
      },
      predicateAuthority: authority,
    });
    let world = introduceMeasure(initialWorld, {
      stableKey: "a20:rail-data-bill",
      jurisdictionId: jurisdictionId,
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
        stableKey: `a20:rail-data-bill:${clause.provisionKey}`,
        measureId,
        provisionKey: clause.provisionKey,
        sectionNumber: clause.sectionNumber,
        heading: clause.heading,
        text: clause.text,
        beneficiary: clause.beneficiary,
        applicationScope: {
          jurisdictionId: jurisdictionId,
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
      "availability-term",
      "reporting-duty",
    ]);
    expect(provisions.map((row) => row.text)).toEqual(
      draft.clauses.map((row) => row.text),
    );
    expect(provisions[2]!.text).toContain("4 years");
    expect(provisions[3]!.text).toContain("a quarterly statement");
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
