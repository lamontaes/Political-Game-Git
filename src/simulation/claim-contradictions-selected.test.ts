import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import * as decisions from "./decisions";
import { simulationMomentAtLocalTime } from "./dates";
import {
  claimContradictionTransitionHandler,
  scheduleContradictionCheck,
  SOURCE_CONFIRMED_EVENT,
  CLAIM_CONTRADICTION_TRANSITION_KEY,
} from "./claim-contradictions";
import {
  claimStanceTag,
  CLAIM_CONTRADICTION_EVENT,
  type ClaimStance,
} from "./claim-stances";
import { recordWorldEvent } from "./world";
import { recordPlayerClaim } from "./claim-stances";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { DecisionOutcomeKind, EntityId, World } from "./types";

const evaluate = decisions.evaluateDecision;
function fixture() {
  let world = smallWorld({
    place: "kentucky",
    people: 3,
    seed: "a125-claim-confirmation",
  }).world;
  const [speaker, reporter, source] = Object.keys(world.people) as EntityId[];
  expect([speaker, reporter, source].every(Boolean)).toBe(true);
  function event(
    key: string,
    participants: Parameters<typeof recordWorldEvent>[1]["participants"],
    tags: readonly string[] = [],
  ) {
    world = recordWorldEvent(world, {
      stableKey: key,
      type: "test.claim-answer",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.people[speaker!]!.homeJurisdictionId,
      involvedEntityIds: [speaker!, reporter!, source!],
      participants,
      personFactConstraints: [],
      visibility: "private",
      tags,
      summary: "A recorded conversation.",
      context: {
        location: {
          jurisdictionId: world.people[speaker!]!.homeJurisdictionId,
          label: "By phone",
          setting: null,
        },
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    return world.history.events.at(-1)!;
  }
  const invitation = event("a125:invitation", [
    { personId: source!, role: "agency:asked", detail: "Invited them" },
  ]);
  const accepted = event(
    "a125:accepted",
    [{ personId: speaker!, role: "agency:participant", detail: "Accepted" }],
    [`invitation:${invitation.id}`],
  );
  const stance: ClaimStance = {
    version: 1,
    propositionKey: `accepted:${accepted.id}`,
    proposition: "They accepted the invitation",
    asserted: "denies",
    speakerBelief: "believes-true",
    intent: "deceive",
    statement: "I did not accept.",
    beliefEvidenceIds: [accepted.id],
    recipientPersonIds: [reporter!],
    audibility: "The reporter heard it",
    sourceEntityIds: [accepted.id],
  };
  const answer = event(
    "a125:denial",
    [{ personId: speaker!, role: "agency:participant", detail: "Answered" }],
    [claimStanceTag(stance)],
  );
  world = recordPlayerClaim(world, {
    stableKey: answer.stableKey,
    eventId: answer.id,
    speakerPersonId: speaker!,
    audience: "limited",
    stance,
    worldTruth: "true",
  });
  world = scheduleContradictionCheck(world, {
    stanceEventId: answer.id,
    speakerPersonId: speaker!,
    stance,
    jurisdictionId: answer.jurisdictionId,
  });
  const due = world.history.futureDueItems.find(
    (row) => row.transitionKey === CLAIM_CONTRADICTION_TRANSITION_KEY,
  )!;
  expect(due).toBeDefined();
  // Handler entry at its actual scheduled date, without invoking unrelated clocks.
  world = {
    ...world,
    currentDate: due.dueAt,
    currentMoment: simulationMomentAtLocalTime({
      date: due.dueAt,
      minuteOfDay: world.currentMoment.minuteOfDay,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    }),
  };
  return { world, due, source: source!, reporter: reporter!, accepted };
}
function force(
  outcomeKind: DecisionOutcomeKind,
  selectedOptionKey: string | null,
) {
  let calls = 0;
  const spy = vi
    .spyOn(decisions, "evaluateDecision")
    .mockImplementation(
      (world: World, context: Parameters<typeof evaluate>[1]) => {
        const result = evaluate(world, context);
        if (context.decisionType !== "press.confirm-account") return result;
        calls++;
        return { ...result, outcomeKind, selectedOptionKey };
      },
    );
  return { spy, calls: () => calls };
}
function evidence(world: World) {
  return world.history.events.filter(
    (e) =>
      e.type === SOURCE_CONFIRMED_EVENT || e.type === CLAIM_CONTRADICTION_EVENT,
  );
}
describe("claim confirmation requires the source's selected decision", () => {
  it.each([
    ["undecided", null],
    ["no-available-option", null],
    ["selected", null],
    ["undecided", "confirm"],
    ["undecided", "decline"],
    ["no-available-option", "confirm"],
    ["no-available-option", "decline"],
  ] as const)(
    "keeps %s / %s blocked without confirmation through reload and repeat",
    (kind: DecisionOutcomeKind, key: string | null) => {
      const { world, due } = fixture();
      const forced = force(kind, key);
      try {
        for (const start of [world, deserializeWorld(serializeWorld(world))]) {
          const first = claimContradictionTransitionHandler(start, due);
          const repeat = claimContradictionTransitionHandler(
            deserializeWorld(serializeWorld(first.world)),
            due,
          );
          for (const result of [first, repeat]) {
            expect(result.status).toBe("blocked");
            expect(result.reasonKey).toBe("claim-check:source-undecided");
            expect(result.outcomeEventId).toBeNull();
            expect(evidence(result.world)).toEqual(evidence(start));
            for (const name of [
              "claims",
              "knowledge",
              "memories",
              "relationshipInteractions",
              "events",
            ] as const)
              expect(result.world.history[name]).toEqual(start.history[name]);
          }
        }
        expect(forced.calls()).toBe(4);
      } finally {
        forced.spy.mockRestore();
      }
    },
  );
  it.each(["confirm", "decline"] as const)(
    "retains the actual selected %s writers",
    (key: string) => {
      const { world, due, source, reporter, accepted } = fixture();
      const forced = force("selected", key);
      try {
        const direct = claimContradictionTransitionHandler(world, due);
        const saved = claimContradictionTransitionHandler(
          deserializeWorld(serializeWorld(world)),
          due,
        );
        expect(saved.world.history).toEqual(direct.world.history);
        expect(direct.status).toBe("resolved");
        expect(direct.reasonKey).toBe(
          key === "confirm"
            ? "claim-check:contradicted"
            : "claim-check:source-declined",
        );
        if (key === "confirm") {
          expect(evidence(direct.world).map((e) => e.type)).toEqual([
            SOURCE_CONFIRMED_EVENT,
            CLAIM_CONTRADICTION_EVENT,
          ]);
          expect(
            direct.world.history.claims.slice(world.history.claims.length),
          ).toHaveLength(1);
          expect(
            direct.world.history.knowledge.slice(
              world.history.knowledge.length,
            ),
          ).toContainEqual(
            expect.objectContaining({
              personId: reporter,
              eventId: accepted.id,
              source: expect.objectContaining({
                kind: "told-by",
                sourcePersonId: source,
              }),
            }),
          );
          expect(direct.world.history.memories.length).toBe(
            world.history.memories.length + 1,
          );
          expect(direct.world.history.relationshipInteractions.length).toBe(
            world.history.relationshipInteractions.length + 1,
          );
        } else {
          expect(evidence(direct.world)).toEqual(evidence(world));
          expect(direct.outcomeEventId).toBeNull();
        }
        const repeated = claimContradictionTransitionHandler(
          deserializeWorld(serializeWorld(direct.world)),
          due,
        );
        expect(evidence(repeated.world)).toEqual(evidence(direct.world));
        expect(repeated.world.history.claims).toEqual(
          direct.world.history.claims,
        );
        expect(forced.calls()).toBeGreaterThanOrEqual(2);
      } finally {
        forced.spy.mockRestore();
      }
    },
  );
});
