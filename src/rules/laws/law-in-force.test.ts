import { describe, expect, it } from "vitest";
import {
  LAW_LEVELS,
  lawInForceFromCandidates,
  lawLevelRank,
  outranks,
  statuteAnswer,
  type LawCandidate,
} from "./law-in-force";
import { lawInForce as legacyLawInForce } from "../../simulation/governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "../../simulation/national-election-geography";
import { makeIsoDate } from "../../simulation/dates";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { STATES } from "../../simulation/state-reference";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../simulation/types";

function candidate(
  key: string,
  level: LawCandidate["level"],
  answer: LawCandidate["answer"],
  origin: LawCandidate["origin"],
  sequence: number,
  operativeAt = "2026-01-02",
): LawCandidate {
  return {
    answer,
    measureId: key,
    level,
    origin,
    sequence,
    operativeAt,
    operativeBasis: "enacted-date",
  };
}

function legacyPairWorld(
  jurisdictionId: EntityId,
  stateAnswer: "yes" | "no",
): World {
  const entries = [
    {
      measure: {
        id: "federal-measure" as EntityId,
        stableKey: "golden:federal",
        sequence: 1,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        rulePackId: "golden",
        designation: "Federal act",
        shortTitle: "Federal act",
        summary: "Federal act",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "house",
        sponsorPersonId: null,
        introducedAt: makeIsoDate("2026-01-01"),
        sourceDocumentKey: null,
        policyAlternativeIds: [],
        propositionIds: ["golden-question" as EntityId],
        propositionAnswers: [
          { propositionId: "golden-question" as EntityId, answer: "no" },
        ],
      } as LegislativeMeasureRecord,
      enactment: {
        id: "federal-enactment" as EntityId,
        stableKey: "golden:federal:enactment",
        sequence: 101,
        measureId: "federal-measure" as EntityId,
        resolvedAt: makeIsoDate("2026-01-02"),
        outcome: "enacted",
        actDesignation: null,
        effectiveAt: makeIsoDate("2026-01-02"),
        outcomeEventId: "federal-event" as EntityId,
      } as LegislativeEnactmentRecord,
    },
    {
      measure: {
        id: "state-measure" as EntityId,
        stableKey: "golden:state",
        sequence: 2,
        jurisdictionId,
        rulePackId: "golden",
        designation: "State act",
        shortTitle: "State act",
        summary: "State act",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "house",
        sponsorPersonId: null,
        introducedAt: makeIsoDate("2026-01-01"),
        sourceDocumentKey: null,
        policyAlternativeIds: [],
        propositionIds: ["golden-question" as EntityId],
        propositionAnswers: [
          { propositionId: "golden-question" as EntityId, answer: stateAnswer },
        ],
      } as LegislativeMeasureRecord,
      enactment: {
        id: "state-enactment" as EntityId,
        stableKey: "golden:state:enactment",
        sequence: 102,
        measureId: "state-measure" as EntityId,
        resolvedAt: makeIsoDate("2026-01-02"),
        outcome: "enacted",
        actDesignation: null,
        effectiveAt: makeIsoDate("2026-01-02"),
        outcomeEventId: "state-event" as EntityId,
      } as LegislativeEnactmentRecord,
    },
  ];
  return {
    currentDate: makeIsoDate("2026-01-02"),
    history: {
      legislativeMeasures: entries.map(({ measure }) => measure),
      legislativeEnactments: entries.map(({ enactment }) => enactment),
    },
  } as unknown as World;
}

describe("standalone law-in-force rules", () => {
  it("preserves the old rank order and statute closing rule", () => {
    expect(LAW_LEVELS).toHaveLength(12);
    for (let i = 0; i < LAW_LEVELS.length - 1; i += 1)
      expect(lawLevelRank(LAW_LEVELS[i]!)).toBeGreaterThan(
        lawLevelRank(LAW_LEVELS[i + 1]!),
      );
    expect(outranks("federal-statute", "state-statute")).toBe(true);
    expect(
      statuteAnswer(
        lawInForceFromCandidates({
          enacted: [],
          starting: candidate(
            "constitution",
            "state-constitution",
            "yes",
            "in-force-at-start",
            -1,
          ),
        }),
      ),
    ).toBe("closed");
  });

  it.each(Object.keys(STATES).map((usps) => `US-${usps}`))(
    "matches the legacy reader for federal and local statutes in %s",
    (key) => {
      const place = stateJurisdictionForKey(key)!;
      const world = legacyPairWorld(place.id, "yes");
      const legacy = legacyLawInForce(
        world,
        place.id,
        "golden-question" as EntityId,
      );
      const lifted = lawInForceFromCandidates({
        enacted: [
          candidate("federal-measure", "federal-statute", "no", "enacted", 101),
          candidate("state-measure", "state-statute", "yes", "enacted", 102),
        ],
      });
      expect(lifted, key).toEqual(legacy);
    },
  );

  it("prefers enacted law over a starting law on the same rank even if the latter date is later", () => {
    const lifted = lawInForceFromCandidates({
      enacted: [
        candidate("repeal", "state-statute", "no", "enacted", 7, "2026-02-01"),
      ],
      starting: candidate(
        "starting",
        "state-statute",
        "yes",
        "in-force-at-start",
        -1,
        "2028-01-01",
      ),
    });
    expect(lifted?.measureId).toBe("repeal");
  });
});
