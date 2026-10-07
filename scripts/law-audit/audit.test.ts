import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import { makeIsoDate } from "../../src/simulation/dates";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import type {
  EntityId,
  World,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../../src/simulation/types";
import { lawEffectStamp } from "../../src/simulation/law-effect-stamp";
import { lawInForce } from "../../src/simulation/governing/law-in-force";
import { nationalSummary } from "./national";
import {
  auditWorld,
  summarize,
  stampAuditCoverage,
  lawJurisdictionTable,
} from "./audit";
const QUESTION =
  "us-policy-positions:transportation-infrastructure.fix-it-first";
const PROP = "proposition_test_audit" as EntityId;
function fixture(
  factor: number,
  recordPlace = "US-OH",
  effectiveAt = "2026-06-01",
) {
  const jurisdiction = stateJurisdictionForKey("US-OH")!.id;
  const measure: LegislativeMeasureRecord = {
    id: "measure_test_audit" as EntityId,
    stableKey: "test:audit",
    sequence: 1,
    jurisdictionId: jurisdiction,
    rulePackId: "test",
    designation: "HB 1",
    shortTitle: "Road repair",
    summary: "Test fixture",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate("2026-05-01"),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [PROP],
    propositionAnswers: [{ propositionId: PROP, answer: "yes" }],
  };
  const enacted: LegislativeEnactmentRecord = {
    id: "enactment_test_audit" as EntityId,
    stableKey: "test:audit:enacted",
    sequence: 2,
    measureId: measure.id,
    resolvedAt: makeIsoDate("2026-06-01"),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate(effectiveAt),
    outcomeEventId: "event_test_audit" as EntityId,
  };
  const opening = {
    currentDate: makeIsoDate("2026-01-05"),
    actionSequence: 0,
    policyCatalog: {
      propositions: { [PROP]: { id: PROP, stableKey: QUESTION } },
    },
    jurisdictions: { [jurisdiction]: { name: "Ohio" } },
    people: {},
    history: {
      nextSequence: 0,
      legislativeMeasures: [],
      legislativeEnactments: [],
      resourceFlowTerms: [],
      resourceFlows: [],
    },
    placeOutcomes: { months: [] },
  } as unknown as World;
  const world = {
    ...opening,
    currentDate: makeIsoDate("2033-01-05"),
    history: {
      ...opening.history,
      legislativeMeasures: [measure],
      legislativeEnactments: [enacted],
    },
    placeOutcomes: {
      months: [
        {
          month: makeIsoDate("2032-08-01"),
          records: [
            {
              measure: "roads.poor-condition-pct",
              placeKey: recordPlace,
              jurisdictionId: stateJurisdictionForKey(recordPlace)!.id,
              month: makeIsoDate("2032-08-01"),
              base: 12,
              multiplier: factor,
              value: 10,
              causes: [{ key: "fix-it-first-to-poor-roads", factor }],
            },
          ],
        },
      ],
    },
  } as World;
  return { opening, world };
}
describe("law-effect audit attribution", () => {
  it("counts a saved plain yes/no law cause without typed provisions and keeps the world unchanged", () => {
    const { opening, world } = fixture(0.82);
    const before = JSON.stringify(world);
    const rows = auditWorld(opening, world);
    const road = rows.find(
      (row) => row.reader === "fix-it-first-to-poor-roads",
    )!;
    expect(road.fired).toBe(true);
    expect(road.evidence[0]?.after).toBe(10);
    expect(road.evidence[0]?.before).toBeNull();
    expect(JSON.stringify(world)).toBe(before);
    expect(summarize(rows).lawsAudited).toBe(1);
  });
  it("never attributes neutral drift or another state's saved factor to the enacted law", () => {
    for (const input of [fixture(1), fixture(0.82, "US-TX")])
      expect(
        auditWorld(input.opening, input.world).find(
          (row) => row.reader === "fix-it-first-to-poor-roads",
        )?.fired,
      ).toBe(false);
  });
  it("keeps future-effective effects explicit instead of inventing a person result", () => {
    const { opening, world } = fixture(0.82, "US-OH", "2040-01-01");
    const row = auditWorld(opening, world).find(
      (row) => row.reader === "fix-it-first-to-poor-roads",
    )!;
    expect(row.fired).toBe(false);
    expect(row.reason).toBe("effective-after-run");
  });
});

it("reads actual stamped consequences but never promotes a stamp alone or a wrong law into proof", () => {
  const { opening, world } = fixture(1);
  const at = makeIsoDate("2032-08-01");
  const jurisdictionId = stateJurisdictionForKey("US-OH")!.id;
  const stamp = lawEffectStamp(lawInForce(world, jurisdictionId, PROP, at), {
    effectKind: "test.saved-service",
    questionKey: QUESTION,
    jurisdictionId,
    appliedAt: at,
    sourceRecordIds: ["service_test" as EntityId],
  })!;
  expect(stamp).not.toBeNull();
  const records = [
    { id: "service_test", sequence: 3, amount: 123, lawEffectStamps: [stamp] },
    {
      id: "stamp_only",
      sequence: 4,
      lawEffectStamps: [{ ...stamp, effectKind: "test.stamp-only" }],
    },
    {
      id: "wrong_law",
      sequence: 5,
      amount: 456,
      lawEffectStamps: [
        {
          ...stamp,
          governingLawKey: "measure_unrelated",
          effectKind: "test.wrong-law",
        },
      ],
    },
  ];
  const candidate = {
    ...world,
    history: { ...world.history, stampedTestRecords: records },
  } as World;
  const rows = auditWorld(opening, candidate);
  expect(
    rows.find((row) => row.effect === "stamped:test.saved-service")?.evidence[0]
      ?.after,
  ).toEqual({ amount: 123 });
  expect(
    rows.find((row) => row.effect === "stamped:test.stamp-only")?.fired,
  ).toBe(false);
  expect(
    rows.find((row) => row.effect === "stamped:test.wrong-law"),
  ).toBeUndefined();
  const nation = nationalSummary(candidate, rows);
  expect(nation.states).toHaveLength(56);
  expect(nation.states.filter((row) => row.lawsAudited > 0)).toHaveLength(1);
  expect(nation.national.lawsAudited).toBe(1);
  expect(
    nation.states.find((row) => row.jurisdictionKey === "US-OH")?.lawsAudited,
  ).toBe(1);
});

const PRIVACY =
  "us-federal-positions:science-communications.national-data-privacy";
function privacyFixture() {
  const { opening: original, world: originalWorld } = fixture(1);
  const place = drawRandomPlace("team2-stamp-collector-20260930");
  const federal = NATIONAL_ELECTION_JURISDICTION;
  const opening = {
    ...original,
    jurisdictions: {
      ...original.jurisdictions,
      [federal.id]: federal,
      [place.context.jurisdiction.id]: place.context.jurisdiction,
    },
    policyCatalog: {
      ...original.policyCatalog,
      propositions: {
        [PROP]: {
          ...original.policyCatalog.propositions[PROP]!,
          stableKey: PRIVACY,
        },
      },
    },
  } as World;
  const world = {
    ...originalWorld,
    ...opening,
    currentDate: originalWorld.currentDate,
    history: {
      ...originalWorld.history,
      legislativeMeasures: [
        {
          ...originalWorld.history.legislativeMeasures![0]!,
          jurisdictionId: federal.id,
          designation: "HR 1",
          shortTitle: "Privacy",
        },
      ],
    },
  } as World;
  const appliedAt = makeIsoDate("2032-08-01");
  const stamp = lawEffectStamp(lawInForce(world, federal.id, PROP, appliedAt), {
    effectKind: "business-compliance-cost",
    questionKey: PRIVACY,
    jurisdictionId: place.context.jurisdiction.id,
    appliedAt,
    sourceRecordIds: [
      world.history.legislativeMeasures![0]!.id,
      "business_privacy" as EntityId,
    ],
  })!;
  expect(stamp).not.toBeNull();
  return { opening, world, stamp, place };
}

it("attributes nested privacy books and budget months, retaining dates, IDs, prior values and only one flat alias", () => {
  const { opening, world, stamp, place } = privacyFixture();
  const oldBook = {
    organizationId: "business_privacy",
    lastQuarterPrivacyCost: 12,
    cash: 800,
    lastRound: "2032-05-01",
  };
  const book = {
    ...oldBook,
    lastQuarterPrivacyCost: 42,
    cash: 758,
    lastRound: "2032-08-01",
    lawEffectStamps: [stamp, stamp],
  };
  const budgetStamp = {
    ...stamp,
    effectKind: "budget-revenue",
    sourceRecordIds: ["budget_saved" as EntityId],
  };
  const month = {
    month: "2032-08-01",
    revenue: [90, 10],
    spending: [40],
    balance: 60,
    lawEffectStamps: [budgetStamp, budgetStamp],
  };
  const candidate = {
    ...world,
    townFinances: { businesses: { business_privacy: book } },
    publicBudgets: {
      governments: [{ key: place.stateJurisdictionKey, months: [month] }],
      federal: {
        months: [
          {
            month: "2032-08-01",
            receipts: [8],
            outlays: [2],
            deficit: -6,
            lawEffectStamps: [{ ...stamp, effectKind: "federal-budget" }],
          },
        ],
      },
    },
    history: {
      ...world.history,
      aliases: [{ ...book, id: "business_privacy", sequence: 3 }, month],
    },
  } as unknown as World;
  const before = {
    ...opening,
    townFinances: { businesses: { business_privacy: oldBook } },
    publicBudgets: {
      governments: [
        {
          key: place.stateJurisdictionKey,
          months: [{ ...month, balance: 50, lawEffectStamps: undefined }],
        },
      ],
    },
  } as unknown as World;
  const snapshot = JSON.stringify(candidate);
  const rows = auditWorld(before, candidate);
  const privacy = rows.find(
    (row) => row.effect === "stamped:business-compliance-cost",
  )!;
  expect(privacy.source).toBe("enacted");
  expect(privacy.evidence).toHaveLength(1);
  expect(privacy.evidence[0]).toMatchObject({
    record: "townFinances.businesses:business_privacy",
    appliedAt: stamp.appliedAt,
    recordDate: "2032-08-01",
    sourceRecordIds: stamp.sourceRecordIds,
    before: { lastQuarterPrivacyCost: 12 },
    after: { lastQuarterPrivacyCost: 42 },
  });
  expect(privacy.evidence[0]!.touched).toContain("business_privacy");
  const budget = rows.find((row) => row.effect === "stamped:budget-revenue")!;
  expect(budget.evidence).toHaveLength(1);
  expect(budget.evidence[0]).toMatchObject({
    record: `publicBudgets.governments:${place.stateJurisdictionKey}:months:2032-08-01`,
    recordDate: "2032-08-01",
    before: { balance: 50 },
    after: { revenue: [90, 10], spending: [40], balance: 60 },
  });
  expect(
    rows.find((row) => row.effect === "stamped:federal-budget")?.evidence[0]
      ?.after,
  ).toMatchObject({ receipts: [8], outlays: [2], deficit: -6 });
  expect(stampAuditCoverage(before, candidate)).toMatchObject({
    stampedRecordObjects: 4,
    rawStamps: 7,
    uniqueCanonicalStampsInWindow: 3,
    canonicalStampsWithPayload: 3,
    excluded: { "duplicate-record-stamp": 4 },
  });
  const grouped = lawJurisdictionTable(rows).find(
    (row) => row.jurisdictionId === stamp.jurisdictionId,
  )!;
  expect(grouped).toMatchObject({
    source: "enacted",
    fired: true,
    stamped: true,
  });
  expect(
    grouped.records.filter(
      (record) => record.record === "townFinances.businesses:business_privacy",
    ),
  ).toHaveLength(1);
  expect(
    grouped.records.find(
      (record) => record.record === "townFinances.businesses:business_privacy",
    )?.amountFields,
  ).toMatchObject({ lastQuarterPrivacyCost: 42 });
  expect(JSON.stringify(candidate)).toBe(snapshot);
});

it("walks arbitrary saved containers, paychecks and transfers without sequence assumptions, and rejects wrong or out-of-window stamps", () => {
  const { opening, world, stamp } = privacyFixture();
  const saved = {
    id: "paycheck_saved",
    amount: 15,
    lawEffectStamps: [{ ...stamp, effectKind: "paycheck" }],
  };
  const candidate = {
    ...world,
    extraSavedStore: {
      nested: [
        saved,
        { ...saved },
        {
          id: "transfer_saved",
          amount: 20,
          lawEffectStamps: [{ ...stamp, effectKind: "transfer" }],
        },
        ...[
          {
            ...stamp,
            appliedAt: opening.currentDate,
            effectKind: "before-window",
          },
          {
            ...stamp,
            appliedAt: makeIsoDate("2040-01-01"),
            effectKind: "after-window",
          },
          {
            ...stamp,
            governingLawKey: "measure_wrong" as EntityId,
            effectKind: "wrong-key",
          },
          {
            ...stamp,
            operativeAt: makeIsoDate("2026-05-01"),
            effectKind: "wrong-operative",
          },
        ].map((invalid) => ({ amount: 99, lawEffectStamps: [invalid] })),
        {
          id: "stamp_only",
          lawEffectStamps: [{ ...stamp, effectKind: "stamp-only" }],
        },
        { amount: 999 },
      ],
    },
  } as unknown as World;
  const rows = auditWorld(opening, candidate).filter((row) =>
    row.effect.startsWith("stamped:"),
  );
  expect(rows.map((row) => row.effect).sort()).toEqual([
    "stamped:paycheck",
    "stamped:stamp-only",
    "stamped:transfer",
  ]);
  expect(
    rows.find((row) => row.effect === "stamped:paycheck")?.evidence,
  ).toHaveLength(1);
  expect(
    rows.find((row) => row.effect === "stamped:transfer")?.evidence[0]?.after,
  ).toEqual({ amount: 20 });
  expect(rows.find((row) => row.effect === "stamped:stamp-only")?.fired).toBe(
    false,
  );
});

it("labels observed canonical starting-law consequences separately, without inventing an enactment or an absent-store effect", () => {
  const { opening, world: enactedWorld } = privacyFixture();
  const startingQuestion =
    "us-policy-positions:health-human-services.work-requirement-for-assistance";
  const world = {
    ...enactedWorld,
    policyCatalog: {
      ...enactedWorld.policyCatalog,
      propositions: {
        [PROP]: {
          ...enactedWorld.policyCatalog.propositions[PROP]!,
          stableKey: startingQuestion,
        },
      },
    },
    history: {
      ...enactedWorld.history,
      legislativeMeasures: [],
      legislativeEnactments: [],
    },
  } as World;
  const federal = NATIONAL_ELECTION_JURISDICTION.id;
  const law = lawInForce(world, federal, PROP, makeIsoDate("2026-07-01"));
  expect(law?.origin).toBe("in-force-at-start");
  const stamp = lawEffectStamp(law, {
    questionKey: startingQuestion,
    effectKind: "starting-cost",
    jurisdictionId: federal,
    appliedAt: makeIsoDate("2026-07-01"),
  })!;
  const candidate = {
    ...world,
    saved: { cost: { amount: 10, lawEffectStamps: [stamp] } },
  } as unknown as World;
  const rows = auditWorld(opening, candidate);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    source: "starting",
    lawSource: "in-force-at-start",
    enactmentId: null,
    measureId: law!.measureId,
    effect: "stamped:starting-cost",
    fired: true,
  });
  expect(summarize(rows)).toMatchObject({
    lawsAudited: 0,
    effectsFiring: 0,
    effectsMissing: 0,
    startingLawsObserved: 1,
    startingEffectsFiring: 1,
  });
  expect(auditWorld(opening, world)).toEqual([]);
});

it("retains an observed consequence of a law enacted before opening without inventing missing adapter rows", () => {
  const { opening, world, stamp } = privacyFixture();
  const before = {
    ...opening,
    currentDate: makeIsoDate("2027-01-05"),
    history: world.history,
  } as World;
  const candidate = {
    ...world,
    saved: { id: "existing_law_saved", amount: 7, lawEffectStamps: [stamp] },
  } as unknown as World;
  const rows = auditWorld(before, candidate);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    source: "enacted",
    effect: "stamped:business-compliance-cost",
    fired: true,
  });
});
