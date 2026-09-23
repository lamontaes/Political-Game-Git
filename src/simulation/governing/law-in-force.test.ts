import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { lawInForce } from "./law-in-force";

/**
 * The reader alone, over hand-written records: which enacted law governs a
 * question in a place. The measure and enactment records are complete typed
 * objects; only the World around them is partial, because the reader reads
 * nothing but the date and those two histories.
 */

const QUESTION = "proposition_question" as EntityId;
const OTHER = "proposition_other" as EntityId;
const ohio = stateJurisdictionForKey("US-OH")!.id;
const texas = stateJurisdictionForKey("US-TX")!.id;
const federal = NATIONAL_ELECTION_JURISDICTION.id;

let sequence = 0;
function law(
  jurisdictionId: EntityId,
  answer: "yes" | "no",
  resolvedAt: string,
  effectiveAt: string | null = null,
  propositionId: EntityId = QUESTION,
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  sequence += 1;
  const id = `measure_${sequence}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:${sequence}`,
      sequence,
      jurisdictionId,
      rulePackId: "test",
      designation: `HB ${sequence}`,
      shortTitle: "A test act",
      summary: "A test act.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "house",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [propositionId],
      propositionAnswers: [{ propositionId, answer }],
    },
    enactment: {
      id: `enactment_${sequence}` as EntityId,
      stableKey: `test:${sequence}:enactment`,
      sequence: 1000 + sequence,
      measureId: id,
      resolvedAt: makeIsoDate(resolvedAt),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: effectiveAt ? makeIsoDate(effectiveAt) : null,
      outcomeEventId: `event_${sequence}` as EntityId,
    },
  };
}

function worldWith(
  currentDate: string,
  laws: readonly ReturnType<typeof law>[],
): World {
  return {
    currentDate: makeIsoDate(currentDate),
    history: {
      legislativeMeasures: laws.map((entry) => entry.measure),
      legislativeEnactments: laws.map((entry) => entry.enactment),
    },
  } as unknown as World;
}

describe("the law in force on a question", () => {
  it("is unknown where no law has answered it", () => {
    expect(lawInForce(worldWith("2027-01-01", []), ohio, QUESTION)).toBeNull();
    const other = law(ohio, "yes", "2026-02-01", null, OTHER);
    expect(
      lawInForce(worldWith("2027-01-01", [other]), ohio, QUESTION),
    ).toBeNull();
  });

  it("waits for the act's effective date, or the blanket ninety days", () => {
    const dated = law(ohio, "yes", "2026-03-01", "2026-07-01");
    expect(
      lawInForce(worldWith("2026-06-30", [dated]), ohio, QUESTION),
    ).toBeNull();
    expect(
      lawInForce(worldWith("2026-07-01", [dated]), ohio, QUESTION),
    ).toMatchObject({ answer: "yes", operativeBasis: "enacted-date" });
    const undated = law(ohio, "no", "2026-03-01");
    expect(
      lawInForce(worldWith("2026-05-29", [undated]), ohio, QUESTION),
    ).toBeNull();
    expect(
      lawInForce(worldWith("2026-05-30", [undated]), ohio, QUESTION),
    ).toMatchObject({ answer: "no", operativeBasis: "game-default" });
  });

  it("lets the later law govern within a level", () => {
    const first = law(ohio, "yes", "2026-02-01");
    const repeal = law(ohio, "no", "2026-09-01");
    expect(
      lawInForce(worldWith("2027-06-01", [repeal, first]), ohio, QUESTION)
        ?.measureId,
    ).toBe(repeal.measure.id);
  });

  it("reaches only the state that enacted it", () => {
    const ohioLaw = law(ohio, "yes", "2026-02-01");
    expect(
      lawInForce(worldWith("2027-01-01", [ohioLaw]), texas, QUESTION),
    ).toBeNull();
  });

  it("puts an Act of Congress over a later state law, everywhere", () => {
    const act = law(federal, "no", "2026-02-01");
    const state = law(ohio, "yes", "2026-10-01");
    const world = worldWith("2027-06-01", [act, state]);
    expect(lawInForce(world, ohio, QUESTION)).toMatchObject({
      answer: "no",
      level: "federal-statute",
    });
    expect(lawInForce(world, texas, QUESTION)?.measureId).toBe(act.measure.id);
  });
});
