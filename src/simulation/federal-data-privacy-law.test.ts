import { describe, expect, it } from "vitest";
import { createWorld } from "./world";
import { makeIsoDate } from "./dates";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { SeededRng } from "./rng";
import { isLawEffectStamp } from "./law-effect-stamp";
import {
  DATA_PRIVACY_COST_RANGE,
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
  it("uses stable per-place researched-range sizes and preserves the legacy national draw", () => {
    const { world } = fixture();
    const places = ["place_one", "place_two", "place_three"] as EntityId[];
    const shares = places.map((place) =>
      drawnDataPrivacyCostShare(world, place),
    );
    for (const [index, share] of shares.entries()) {
      expect(share).toBeGreaterThanOrEqual(DATA_PRIVACY_COST_RANGE[0]);
      expect(share).toBeLessThanOrEqual(DATA_PRIVACY_COST_RANGE[1]);
      expect(
        drawnDataPrivacyCostShare(
          JSON.parse(JSON.stringify(world)) as World,
          places[index]!,
        ),
      ).toBe(share);
    }
    expect(new Set(shares).size).toBe(3);
    const rng = new SeededRng(world.seed).fork(
      "federal-data-privacy-law:firm-cost",
    );
    expect(drawnDataPrivacyCostShare(world)).toBe(
      0.001 + 0.005 * ((rng.next() + rng.next()) / 2),
    );
  });
  it("stamps the controlling federal law at the consequence's application place", () => {
    const { world, measure } = fixture();
    const town = "place_application" as EntityId;
    const cost = dataPrivacyCostOn(world, world.currentDate, town);
    expect(cost.share).toBeGreaterThan(0);
    expect(cost.lawMeasureIds).toEqual([measure.id]);
    expect(cost.lawEffectStamps).toHaveLength(1);
    expect(isLawEffectStamp(cost.lawEffectStamps[0])).toBe(true);
    expect(cost.lawEffectStamps[0]).toMatchObject({
      governingLawKey: measure.id,
      source: "enacted",
      effectKind: "business-compliance-cost",
      questionKey: NATIONAL_DATA_PRIVACY_QUESTION,
      jurisdictionId: town,
      operativeAt: "2026-04-01",
      appliedAt: "2026-07-01",
      sourceRecordIds: [measure.id],
    });
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
