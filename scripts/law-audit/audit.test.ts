import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../../src/simulation/dates";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import type {
  EntityId,
  World,
  LegislativeMeasureRecord,
  LegislativeEnactmentRecord,
} from "../../src/simulation/types";
import { auditWorld, summarize } from "./audit";
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
