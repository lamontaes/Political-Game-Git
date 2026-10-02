import { describe, expect, it } from "vitest";
import { createWorld } from "./world";
import { makeIsoDate } from "./dates";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import {
  NATIONAL_DATA_PRIVACY_QUESTION,
  dataPrivacyInitialCostOn,
} from "./federal-data-privacy-law";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "./types";

function fixture(answer: "yes" | "no" = "yes") {
  const world = createWorld({
    seed: "team1-privacy-stamp",
    currentDate: makeIsoDate("2026-07-01"),
    jurisdictions: [NATIONAL_ELECTION_JURISDICTION],
    people: [],
    lineage: "production",
  });
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (p) => p.stableKey === NATIONAL_DATA_PRIVACY_QUESTION,
  )!;
  const measure: LegislativeMeasureRecord = {
    id: "measure_privacy_fixture" as EntityId,
    stableKey: "test:privacy:measure",
    sequence: 1,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "test",
    designation: "H.R. 1",
    shortTitle: "Controlled privacy law",
    summary: "Controlled privacy law.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate("2026-01-05"),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: "enactment_privacy_fixture" as EntityId,
    stableKey: "test:privacy:enactment",
    sequence: 2,
    measureId: measure.id,
    resolvedAt: makeIsoDate("2026-01-06"),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate("2026-04-01"),
    outcomeEventId: "event_privacy_fixture" as EntityId,
  };
  return {
    world: {
      ...world,
      history: {
        ...world.history,
        legislativeMeasures: [measure],
        legislativeEnactments: [enactment],
      },
    },
    measure,
  };
}

// These retained legacy worlds supply no saved firm books or employees.
// They prove absence-of-applicability refusal, not a zero cost or payment.
// The positive one-time writer is covered in privacy-initial-compliance-writer.test.ts.
describe("the sole federal privacy cost reader refuses missing firm facts", () => {
  it("keeps the absent-firm refusal read-only across repeat and reloading", () => {
    const { world } = fixture();
    const before = JSON.stringify(world);
    const firms = [
      "organization_unread_one",
      "organization_unread_two",
      "organization_unread_three",
    ] as EntityId[];
    const costs = firms.map((firm) =>
      dataPrivacyInitialCostOn(world, world.currentDate, firm),
    );
    for (const [index, cost] of costs.entries()) {
      expect(cost).toBeNull();
      expect(
        dataPrivacyInitialCostOn(
          JSON.parse(JSON.stringify(world)) as World,
          world.currentDate,
          firms[index]!,
        ),
      ).toBe(cost);
    }
    expect(JSON.stringify(world)).toBe(before);
  });
  it("does not infer firm applicability when only the seed changes", () => {
    const { world } = fixture();
    const firm = "organization_unread_one" as EntityId;
    const expected = dataPrivacyInitialCostOn(world, world.currentDate, firm);
    for (const seed of ["privacy-comparison-a", "privacy-comparison-b", ""]) {
      const comparison = { ...world, seed };
      expect(
        dataPrivacyInitialCostOn(comparison, comparison.currentDate, firm),
      ).toEqual(expected);
    }
  });
  it("retains saved law records without treating unread firm facts as zero cost", () => {
    const { world, measure } = fixture();
    const before = JSON.stringify(world);
    expect(
      dataPrivacyInitialCostOn(
        world,
        world.currentDate,
        "organization_unread_one" as EntityId,
      ),
    ).toBeNull();
    expect(world.history.legislativeMeasures).toContainEqual(measure);
    expect(JSON.stringify(world)).toBe(before);
  });
  it("does not infer a charge with missing firm facts under absent, future or repealed law", () => {
    const { world } = fixture();
    const firm = "organization_unread_one" as EntityId;
    expect(
      dataPrivacyInitialCostOn(world, makeIsoDate("2026-03-31"), firm),
    ).toBeNull();
    expect(
      dataPrivacyInitialCostOn(
        createWorld({
          seed: "no-privacy-law",
          currentDate: makeIsoDate("2026-07-01"),
          jurisdictions: [NATIONAL_ELECTION_JURISDICTION],
          people: [],
          lineage: "production",
        }),
        world.currentDate,
        firm,
      ),
    ).toBeNull();
    expect(
      dataPrivacyInitialCostOn(fixture("no").world, world.currentDate, firm),
    ).toBeNull();
  });
});
