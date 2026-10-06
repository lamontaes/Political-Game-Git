import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../../../dates";
import { lawInForce } from "../../../governing/law-in-force";
import { stateJurisdictionForKey } from "../../../life-places";
import { lawEffectStamp } from "../../../law-effect-stamp";
import { lawExposuresOf } from "../../../law-exposure";
import { recordWorldEvent } from "../../../world";
import { smallWorld } from "../../../../../tests/fixtures/small-world";
import type { EntityId, World } from "../../../types";
import type { LawConsequenceRow } from "../../../law-consequence-types";
import {
  CASH_BAIL_QUESTION,
  JUSTICE_PERSON_EXPOSURE_KIND,
  MANDATORY_MINIMUM_QUESTION,
  applyJusticePersonExposure,
  resolveJusticePersonExposure,
} from "./index";
import {
  PRETRIAL_HELD_EVENT,
  PRETRIAL_RELEASED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
} from "../../../justice/jail-terms";

const cashRow: LawConsequenceRow = {
  id: "justice:test-cash-bail-person-exposure",
  kind: JUSTICE_PERSON_EXPOSURE_KIND,
  when: "case-stage",
  who: { selector: "justice.pretrial-defendant", predicates: [] },
  what: "record-cash-bail-exposure",
  decision: { op: "record", key: "effect", type: "decision" },
  conditions: [
    { capability: "justice.saved-cash-bail-effect", parameters: {} },
  ],
  lag: { days: 0, sourceIds: [] },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: ["data/research/laws/starting-law-2026.json"],
    population: "A named criminal defendant affected by the cash-bail rule",
    scope: "An actual saved pretrial hold or bail-free release event",
    why: "The event and its operative law stamp establish the individual effect.",
    uncertainty: "No unrecorded payment or judicial decision is inferred.",
  },
};

const cashRowWithoutDecision = { ...cashRow };
delete cashRowWithoutDecision.decision;
const minimumRow: LawConsequenceRow = {
  ...cashRowWithoutDecision,
  id: "justice:test-minimum-person-exposure",
  who: { selector: "justice.sentenced-defendant", predicates: [] },
  what: "record-mandatory-minimum-exposure",
  amount: { op: "record", key: "months", unit: "months" },
  conditions: [
    { capability: "justice.saved-minimum-sentence-effect", parameters: {} },
  ],
} as const;

function stampedCashEvent(
  place: "US-AK" | "US-DC",
  type: typeof PRETRIAL_HELD_EVENT | typeof PRETRIAL_RELEASED_EVENT,
  tags: string[],
): { world: World; eventId: EntityId; personId: EntityId } {
  const fixture = smallWorld({
    place,
    people: 4,
    seed: `lw17-person-landings:${place}:${type}`,
    date: "2026-01-14",
  });
  const world = fixture.world;
  const personId = fixture.personId;
  const jurisdictionId = fixture.stateJurisdictionId;
  const question = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === CASH_BAIL_QUESTION,
  )!;
  const law = lawInForce(
    world,
    jurisdictionId,
    question.id,
    world.currentDate,
  )!;
  const recorded = recordWorldEvent(world, {
    stableKey: `lw17:${place}:${type}`,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [personId],
    participants: [{ personId, role: "focus:defendant", detail: null }],
    personFactConstraints: [],
    visibility: "public",
    tags,
    summary: "Authored event fixture for the focused module test.",
    context: {
      location: null,
      socialContext: "Criminal case",
      pressure: null,
      choice: null,
      motivation: "The saved event is the source for this focused test.",
      immediateReaction: null,
    },
  });
  const event = recorded.history.events.at(-1)!;
  const stamp = lawEffectStamp(law, {
    effectKind: type,
    questionKey: CASH_BAIL_QUESTION,
    jurisdictionId,
    appliedAt: event.occurredAt,
    sourceRecordIds: [event.id],
  })!;
  const stamped: World = {
    ...recorded,
    history: {
      ...recorded.history,
      events: [
        ...recorded.history.events.slice(0, -1),
        { ...event, lawEffectStamps: [stamp] },
      ],
    },
  };
  return { world: stamped, eventId: event.id, personId };
}

function context(world: World, eventId: EntityId, personId: EntityId) {
  return {
    onDate: world.currentDate,
    activity: "case-stage" as const,
    activityId: eventId,
    subjectIds: [personId],
    questionKey: CASH_BAIL_QUESTION,
  };
}

describe("LW-17 named-person landings", () => {
  it("records a gain for a stamped bail-free release, once", () => {
    const { world, eventId, personId } = stampedCashEvent(
      "US-DC",
      PRETRIAL_RELEASED_EVENT,
      [],
    );
    const resolved = resolveJusticePersonExposure(
      world,
      cashRow,
      context(world, eventId, personId),
    );
    expect(resolved).toHaveLength(1);
    const first = applyJusticePersonExposure(world, resolved[0]!);
    expect(lawExposuresOf(first, personId)).toMatchObject([
      {
        measureId: resolved[0]!.law.measureId,
        channel: "court-outcome",
        direction: "gain",
        amount: null,
        cadence: null,
        sourceRecordId: eventId,
      },
    ]);
    expect(applyJusticePersonExposure(first, resolved[0]!)).toBe(first);
  });

  it("records a cost for a law-stamped unpaid cash-bail hold, with no fictional payment", () => {
    const { world, eventId, personId } = stampedCashEvent(
      "US-AK",
      PRETRIAL_HELD_EVENT,
      ["justice.bail:4200"],
    );
    const resolved = resolveJusticePersonExposure(
      world,
      cashRow,
      context(world, eventId, personId),
    );
    expect(resolved).toHaveLength(1);
    const next = applyJusticePersonExposure(world, resolved[0]!);
    expect(lawExposuresOf(next, personId)).toMatchObject([
      {
        channel: "court-outcome",
        direction: "cost",
        amount: null,
        cadence: null,
        sourceRecordId: eventId,
      },
    ]);
  });

  it("rejects bail-free release under cash-bail law and release events with a bail amount", () => {
    const held = stampedCashEvent("US-AK", PRETRIAL_HELD_EVENT, []);
    expect(
      resolveJusticePersonExposure(
        held.world,
        cashRow,
        context(held.world, held.eventId, held.personId),
      ),
    ).toEqual([]);
    const paid = stampedCashEvent("US-AK", PRETRIAL_RELEASED_EVENT, [
      "justice.bail:4200",
    ]);
    expect(
      resolveJusticePersonExposure(
        paid.world,
        cashRow,
        context(paid.world, paid.eventId, paid.personId),
      ),
    ).toEqual([]);
  });

  it("rejects a sentence event without a matching saved minimum record and authority", () => {
    const fixture = smallWorld({
      place: "US-DC",
      people: 4,
      seed: "lw17-person-landings:missing-minimum",
      date: "2026-01-14",
    });
    const jurisdictionId = stateJurisdictionForKey("US-DC")!.id;
    const eventWorld = recordWorldEvent(fixture.world, {
      stableKey: "lw17:sentence-without-minimum-record",
      type: PROSECUTION_SENTENCED_EVENT,
      occurredAt: fixture.world.currentDate,
      recordedAt: fixture.world.currentDate,
      jurisdictionId,
      involvedEntityIds: [fixture.personId],
      participants: [
        { personId: fixture.personId, role: "focus:defendant", detail: null },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "No minimum record is saved for this fixture event.",
      context: {
        location: null,
        socialContext: "Criminal case",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = eventWorld.history.events.at(-1)!.id;
    const result = resolveJusticePersonExposure(eventWorld, minimumRow, {
      onDate: eventWorld.currentDate,
      activity: "case-stage",
      activityId: eventId,
      subjectIds: [fixture.personId],
      questionKey: MANDATORY_MINIMUM_QUESTION,
    });
    expect(result).toEqual([]);
    expect(
      applyJusticePersonExposure(eventWorld, {
        row: minimumRow,
        law: {
          measureId: "missing-law" as EntityId,
          origin: "in-force-at-start",
          operativeAt: makeIsoDate("2000-01-01"),
          level: "state-statute",
          operativeBasis: "game-default",
          answer: "yes",
        },
        questionKey: MANDATORY_MINIMUM_QUESTION,
        jurisdictionId,
        subject: { kind: "person", id: fixture.personId },
        activityId: eventId,
        effectiveAt: eventWorld.currentDate,
        sourceRecordIds: [eventId],
        value: { type: "amount", value: 120, unit: "months" },
      }),
    ).toBe(eventWorld);
  });
});
