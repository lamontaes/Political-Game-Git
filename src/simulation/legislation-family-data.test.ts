import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { compileBillDraft } from "./legislation-drafting";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import { legislativePackForJurisdiction } from "./legislative-institutions";
import { standingAuthority } from "./legislation-program-families";
import {
  STATE_TRANSIT_SERVICE_VARIANT,
  STATE_TRANSIT_VARIANT_KEY,
  TRANSIT_FAMILY_KEY,
  TRANSIT_PROGRAM_KEY,
  TRANSIT_SERVICE_VARIANT,
  STATE_TRANSIT_SERVICE_QUESTION,
} from "./legislation-transit-families";
import { makeIsoDate } from "./dates";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { ResolvedParameters } from "./legislation-content-contracts";

const SEED = "a20-data-bill-wording-20261001";
const place = drawRandomPlace(SEED);

function resolved(amount: number): ResolvedParameters {
  return {
    values: {
      appropriation: { kind: "money", minorUnits: amount, currency: "USD" },
      "service-window": { kind: "enumerated", value: "weekday" },
    },
    filedOn: makeIsoDate("2026-01-05"),
    startsOn: makeIsoDate("2026-01-05"),
    endsOn: null,
    authority: {
      ...standingAuthority(TRANSIT_PROGRAM_KEY)!,
      programLabel: "{{authority:programLabel}}",
      citationLabel: "{{authority:citationLabel}}",
    },
    money: () => "{{money:appropriation}}",
    choice: () => ({
      value: "weekday",
      label: "weekday",
      clausePhrase: "{{choice:service-window}}",
    }),
    integer: () => {
      throw new Error("No integer reader used by these clauses.");
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

describe(`A20 bill wording data in ${place.displayName}, seed ${SEED}`, () => {
  for (const [variant, beforeHash] of [
    [
      TRANSIT_SERVICE_VARIANT,
      "bdaca0b4c12632d06ed455f93fa350987e50c7a9617a599377b41f64804ba347",
    ],
    [
      STATE_TRANSIT_SERVICE_VARIANT,
      "b463b5772326bda53973caac6f3ab3dd684f0b1d06e67cfb23b7bf08e66f15f8",
    ],
  ] as const) {
    it(`preserves all metadata, wording and zero/positive effects of ${variant.variantKey}`, () => {
      // Fingerprints captured from the replaced source before editing, not
      // generated from the data reader. All text and evidence are included.
      const result = {
        ...variant,
        clauses: variant.clauses.map((clause) => ({
          ...clause,
          renderings: [0, 20000, 2000000].map((amount) =>
            clause.render(resolved(amount)),
          ),
        })),
        amendmentInvitation: {
          ...variant.amendmentInvitation,
          text: variant.amendmentInvitation.render(""),
        },
      };
      expect(
        createHash("sha256")
          .update(JSON.stringify(canonical(result)))
          .digest("hex"),
      ).toBe(beforeHash);
    });
  }

  it("retains the original wrong-authority and missing-money refusals", () => {
    const authority = TRANSIT_SERVICE_VARIANT.clauses.find(
      (row) => row.provisionKey === "authority-named",
    )!;
    expect(() =>
      authority.render({ ...resolved(20000), authority: null }),
    ).toThrow(
      "This transit variant requires the authored rural transit program.",
    );
    const amount = TRANSIT_SERVICE_VARIANT.clauses.find(
      (row) => row.provisionKey === "amount-provided",
    )!;
    expect(() => amount.render({ ...resolved(20000), values: {} })).toThrow(
      "Missing transit appropriation amount.",
    );
  });

  it("compiles data wording, files it through the canonical bill writers and preserves it on Continue", () => {
    const small = smallWorld({
      place: place.key,
      seed: SEED,
      date: "2026-01-05",
      laws: [STATE_TRANSIT_SERVICE_QUESTION],
    });
    const pack = legislativePackForJurisdiction(small.stateJurisdictionId)!;
    const draft = compileBillDraft({
      familyKey: TRANSIT_FAMILY_KEY,
      variantKey: STATE_TRANSIT_VARIANT_KEY,
      scenarioKey: `institution:${pack.packId}`,
      jurisdictionId: small.stateJurisdictionId,
      rulePackId: pack.packId,
      designation: "Fixture bill 20",
      filedOn: small.world.currentDate,
      parameterValues: {
        appropriation: { kind: "money", minorUnits: 20000, currency: "USD" },
        "service-window": { kind: "enumerated", value: "weekend" },
      },
      predicateAuthority: standingAuthority(TRANSIT_PROGRAM_KEY)!,
    });
    let world = introduceMeasure(small.world, {
      stableKey: "a20:data-bill",
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
        stableKey: `a20:data-bill:${clause.provisionKey}`,
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
    expect(
      provisions.find((row) => row.provisionKey === "administrative-mandate")!
        .text,
    ).toContain("additional weekend vehicle-service hours");
    expect(
      draft.clauses.find((row) => row.provisionKey === "amount-provided")!
        .operativeEffect,
    ).toMatchObject({ kind: "public-program-appropriation" });
    const restored = deserializeWorld(serializeWorld(world));
    expect(
      restored.history.legislativeProvisions!.filter(
        (row) => row.measureId === measureId,
      ),
    ).toEqual(provisions);
  });
});
