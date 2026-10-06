import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import type { LawInForce } from "./governing/law-in-force";
import { isLawEffectStamp, lawEffectStamp } from "./law-effect-stamp";
import type { LawEffectContext } from "./law-effect-stamp";
import type { EntityId } from "./types";

const law: LawInForce = {
  answer: "yes",
  measureId: "measure_education" as EntityId,
  origin: "enacted",
  level: "state-statute",
  operativeAt: makeIsoDate("2026-08-01"),
  operativeBasis: "enacted-date",
};
const context: LawEffectContext = {
  effectKind: "price-cost",
  questionKey:
    "us-policy-positions:education.public-funds-for-private-schooling",
  jurisdictionId: "jurisdiction_subject" as EntityId,
  appliedAt: makeIsoDate("2026-09-01"),
  sourceRecordIds: ["enrollment_1", "school_1", "spending_1"] as EntityId[],
};

describe("saved law-effect attribution", () => {
  it("preserves a consumer's canonical law and enrollment/payment chain without changing inputs", () => {
    const before = JSON.stringify({ law, context });
    const stamp = lawEffectStamp(law, context)!;
    expect(stamp.governingLawKey).toBe(law.measureId);
    expect(stamp.source).toBe(law.origin);
    expect(stamp.operativeAt).toBe(law.operativeAt);
    expect(stamp.sourceRecordIds).toEqual(context.sourceRecordIds);
    expect(stamp.sourceRecordIds).not.toBe(context.sourceRecordIds);
    expect(isLawEffectStamp(JSON.parse(JSON.stringify(stamp)))).toBe(true);
    expect(JSON.stringify({ law, context })).toBe(before);
  });
  it("keeps an actual starting-law key separate from enacted measures, including a no answer", () => {
    const starting: LawInForce = {
      ...law,
      answer: "no",
      origin: "in-force-at-start",
      measureId: `starting-law:US:${context.questionKey}` as EntityId,
      level: "federal-statute",
    };
    expect(lawEffectStamp(starting, context)?.governingLawKey).toBe(
      starting.measureId,
    );
    expect(lawEffectStamp(starting, context)?.source).toBe("in-force-at-start");
  });
  it("persists source versus modeled term evidence and clones donor references", () => {
    const modeled = {
      kind: "modeled" as const,
      termKey: "housing-land-use.inclusionary-requirement",
      value: 0.09,
      unit: "ratio" as const,
      requestedAt: makeIsoDate("2026-09-01"),
      applicability: {
        kind: "census-regions" as const,
        regions: ["south" as const],
      },
      estimate: {
        methodKey: "comparable-place-world-spread",
        mean: 0.1,
        spread: 0.02,
        selectedDonorValue: 0.08,
        selectionKey: "seeded-place-selection:fixture",
        worldSeed: "fixture-world-seed",
        donors: [
          {
            placeKey: "US-DC",
            lawMeasureId: "measure_dc" as EntityId,
            sourceRecordIds: ["record_dc" as EntityId],
            value: 0.08,
            unit: "ratio" as const,
            region: "south" as const,
          },
        ],
        donorReferences: [],
      },
    };
    const stamp = lawEffectStamp(law, { ...context, termResolution: modeled })!;
    expect(stamp.termResolution).toEqual(modeled);
    expect(stamp.termResolution).not.toBe(modeled);
    expect(isLawEffectStamp(JSON.parse(JSON.stringify(stamp)))).toBe(true);
    expect(
      isLawEffectStamp({
        ...stamp,
        termResolution: {
          kind: "modeled",
          termKey: "term",
          value: 1,
          unit: "ratio",
          requestedAt: "2026-09-01",
          estimate: { ...modeled.estimate, donors: [], donorReferences: [] },
        },
      }),
    ).toBe(false);
  });
  it("refuses unknown or future law and malformed saved dates/source identities", () => {
    expect(lawEffectStamp(null, context)).toBeNull();
    expect(
      lawEffectStamp(
        { ...law, operativeAt: makeIsoDate("2027-01-01") },
        context,
      ),
    ).toBeNull();
    const stamp = lawEffectStamp(law, context)!;
    for (const invalid of [
      { ...stamp, appliedAt: "2026-02-30" },
      { ...stamp, source: "in-force-at-start" },
      { ...stamp, governingLawKey: "starting-law:US:question" },
      { ...stamp, sourceRecordIds: [null] },
      { ...stamp, effectKind: "" },
      { ...stamp, effectKind: "invented-new-effect" },
      { ...stamp, version: "law-effect-stamp/v2" },
    ])
      expect(isLawEffectStamp(invalid)).toBe(false);
    expect(isLawEffectStamp({})).toBe(false);
    expect(isLawEffectStamp(null)).toBe(false);
  });
});

describe("standing service authority attribution", () => {
  const authority = {
    kind: "standing-program-appropriation" as const,
    appropriationId: "appropriation_fixture" as EntityId,
    programKey: "behavioral-health-crisis-response:us-nh",
    jurisdictionId: context.jurisdictionId,
    accountOrganizationId: "government_account_fixture" as EntityId,
    publicGovernmentIdentity: {
      kind: "jurisdiction" as const,
      jurisdictionId: context.jurisdictionId,
    },
    availableFrom: makeIsoDate("2026-01-01"),
    availableThrough: makeIsoDate("2026-12-31"),
    sourceBasis: {
      kind: "sourced" as const,
      note: "Explicit source-reference shape fixture; no delivery asserted.",
    },
  };
  const service: LawEffectContext = {
    ...context,
    effectKind: "service-delivered",
    questionKey: null,
    sourceRecordIds: [
      authority.appropriationId,
      "completed_activity_fixture" as EntityId,
    ],
  };
  it("retains the actual appropriation identity without creating an enacted measure", () => {
    const stamp = lawEffectStamp(authority, service)!;
    expect(stamp.governingLawKey).toBe(authority.appropriationId);
    expect(stamp.source).toBe("standing-appropriation");
    expect(stamp.standingAuthority).toEqual(authority);
    expect(stamp.standingAuthority).not.toBe(authority);
    expect(stamp.standingAuthority!.sourceBasis).not.toBe(
      authority.sourceBasis,
    );
    expect(stamp.questionKey).toBeNull();
    expect(isLawEffectStamp(JSON.parse(JSON.stringify(stamp)))).toBe(true);
  });
  it("refuses unbacked identity, expired authority, wrong kind and invented question", () => {
    expect(
      lawEffectStamp(authority, { ...service, sourceRecordIds: [] }),
    ).toBeNull();
    expect(
      lawEffectStamp(authority, {
        ...service,
        appliedAt: makeIsoDate("2027-01-01"),
      }),
    ).toBeNull();
    expect(
      lawEffectStamp(authority, {
        ...service,
        appliedAt: makeIsoDate("2025-12-31"),
      }),
    ).toBeNull();
    expect(
      lawEffectStamp(authority, { ...service, effectKind: "pay" }),
    ).toBeNull();
    expect(
      lawEffectStamp(authority, { ...service, questionKey: "invented" }),
    ).toBeNull();
    expect(
      lawEffectStamp(
        {
          ...authority,
          sourceBasis: {
            kind: "authored-fixture",
            note: "Not sourced authority",
          },
        },
        service,
      ),
    ).toBeNull();
  });
});
