import { describe, expect, it, vi } from "vitest";

import { makeIsoDate } from "../dates";
import { lifePlaceByKey, stateJurisdictionForKey } from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { lawInForce } from "./law-in-force";

/**
 * A state's starting "no" says whether it bars its localities too. "No, and
 * cities are barred" outranks a city's own ordinance; "no statewide law,
 * cities may act" leaves a city's own answer standing in that city. The
 * starting-law file is replaced here with three states, one of each kind.
 */
const KEY = "us-policy-positions:housing-land-use.rent-stabilization";

vi.mock("../../../data/research/laws/starting-law-2026.json", () => ({
  default: {
    defaultOperativeAt: "2000-01-01",
    questions: {
      "us-policy-positions:housing-land-use.rent-stabilization": {
        answers: {
          "US-KY": { answer: "no", preempts: false },
          "US-OH": { answer: "no", preempts: true },
          "US-IN": { answer: "no" },
        },
      },
    },
  },
}));

const POLICY = createProductionPolicyCatalog();
const QUESTION = POLICY.propositionOrder.find(
  (id) => POLICY.propositions[id]!.stableKey === KEY,
)!;

function ordinance(
  jurisdictionId: EntityId,
  answer: "yes" | "no",
): {
  measure: LegislativeMeasureRecord;
  enactment: LegislativeEnactmentRecord;
} {
  const id = `measure_${jurisdictionId}` as EntityId;
  return {
    measure: {
      id,
      stableKey: `test:${jurisdictionId}`,
      sequence: 1,
      jurisdictionId,
      rulePackId: "test",
      designation: "ORD 1",
      shortTitle: "Rent Stabilization Ordinance",
      summary: "A test ordinance.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "council",
      sponsorPersonId: null,
      introducedAt: makeIsoDate("2026-01-01"),
      sourceDocumentKey: null,
      policyAlternativeIds: [],
      propositionIds: [QUESTION],
      propositionAnswers: [{ propositionId: QUESTION, answer }],
    },
    enactment: {
      id: `enactment_${jurisdictionId}` as EntityId,
      stableKey: `test:${jurisdictionId}:enactment`,
      sequence: 1001,
      measureId: id,
      resolvedAt: makeIsoDate("2026-02-01"),
      outcome: "enacted",
      actDesignation: null,
      effectiveAt: makeIsoDate("2026-02-01"),
      outcomeEventId: `event_${jurisdictionId}` as EntityId,
    },
  };
}

function worldWith(laws: readonly ReturnType<typeof ordinance>[]): World {
  return {
    currentDate: makeIsoDate("2027-01-01"),
    policyCatalog: POLICY,
    history: {
      legislativeMeasures: laws.map((law) => law.measure),
      legislativeEnactments: laws.map((law) => law.enactment),
    },
  } as unknown as World;
}

const lexington = lifePlaceByKey("2146027")!.context.jurisdiction.id;
const columbus = lifePlaceByKey("3918000")!.context.jurisdiction.id;
const indianapolis = lifePlaceByKey("1836003")!.context.jurisdiction.id;

describe("a state's starting no, and its towns", () => {
  it("leaves a city's own yes standing where the state does not bar it", () => {
    const law = ordinance(lexington, "yes");
    const world = worldWith([law]);
    expect(lawInForce(world, lexington, QUESTION)).toMatchObject({
      answer: "yes",
      level: "local-ordinance",
      measureId: law.measure.id,
    });
    // The state's no still governs the state itself, and every town with no
    // ordinance of its own.
    expect(
      lawInForce(world, stateJurisdictionForKey("US-KY")!.id, QUESTION),
    ).toMatchObject({ answer: "no", origin: "in-force-at-start" });
  });

  it("puts a preempting no over the city's ordinance", () => {
    const world = worldWith([ordinance(columbus, "yes")]);
    expect(lawInForce(world, columbus, QUESTION)).toMatchObject({
      answer: "no",
      level: "state-statute",
      origin: "in-force-at-start",
    });
  });

  it("keeps the blanket rank where the row does not say", () => {
    const world = worldWith([ordinance(indianapolis, "yes")]);
    expect(lawInForce(world, indianapolis, QUESTION)).toMatchObject({
      answer: "no",
      level: "state-statute",
    });
  });
});
