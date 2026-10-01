import { describe, expect, it } from "vitest";
import { createWorld } from "./world";
import { makeIsoDate } from "./dates";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import {
  NATIONAL_DATA_PRIVACY_QUESTION,
  dataPrivacyCostOn,
  drawnDataPrivacyCostShare,
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

describe("federal privacy compliance cost attribution", () => {
  it("keeps a read-only cost stable across repeated reads and reloading", () => {
    const { world } = fixture();
    const before = JSON.stringify(world);
    const places = ["place_one", "place_two", "place_three"] as EntityId[];
    const shares = places.map((place) =>
      drawnDataPrivacyCostShare(world, place),
    );
    for (const [index, share] of shares.entries()) {
      expect(share).toBe(0);
      expect(
        drawnDataPrivacyCostShare(
          JSON.parse(JSON.stringify(world)) as World,
          places[index]!,
        ),
      ).toBe(share);
    }
    expect(JSON.stringify(world)).toBe(before);
  });
  it("does not change a recorded law's compliance cost when only the seed changes", () => {
    const { world } = fixture();
    const place = NATIONAL_ELECTION_JURISDICTION.id;
    const expected = dataPrivacyCostOn(world, world.currentDate, place);
    for (const seed of ["privacy-comparison-a", "privacy-comparison-b", ""]) {
      const comparison = { ...world, seed };
      expect(
        dataPrivacyCostOn(comparison, comparison.currentDate, place),
      ).toEqual(expected);
    }
  });
  it("retains the controlling measure without inventing a recurring expense or stamp", () => {
    const { world, measure } = fixture();
    const cost = dataPrivacyCostOn(world, world.currentDate);
    expect(cost.share).toBe(0);
    expect(cost.lawMeasureIds).toEqual([measure.id]);
    expect(cost.lawEffectStamps).toEqual([]);
  });
  it("does not stamp an absent, future or repealed compliance duty", () => {
    const { world } = fixture();
    expect(dataPrivacyCostOn(world, makeIsoDate("2026-03-31"))).toEqual({
      share: 0,
      lawMeasureIds: [],
      lawEffectStamps: [],
    });
    expect(
      dataPrivacyCostOn(
        createWorld({
          seed: "no-privacy-law",
          currentDate: makeIsoDate("2026-07-01"),
          jurisdictions: [NATIONAL_ELECTION_JURISDICTION],
          people: [],
          lineage: "production",
        }),
        world.currentDate,
      ).lawEffectStamps,
    ).toEqual([]);
    expect(
      dataPrivacyCostOn(fixture("no").world, world.currentDate).share,
    ).toBe(0);
  });
});
