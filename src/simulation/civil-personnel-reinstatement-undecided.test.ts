import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { civilAuthorityFixture } from "../../tests/e2e/support/civil-authority-world";
import * as decisions from "./decisions";
import type { DecisionContext, EntityId, World } from "./types";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";
import {
  assessMinnesotaReinstatement,
  offerMinnesotaReinstatement,
  personnelOfferResponses,
  reinstatementOpportunities,
} from "./civil-personnel-actions";
import { workStatusAt } from "./life-queries";

type Answer =
  "undecided" | "no-available-option" | "selected-null" | "accept" | "decline";
let ready: World;
let personId: EntityId;
let positionId: EntityId;
let actorId: EntityId;
beforeAll(() => {
  const fixture = civilAuthorityFixture(
    "2026-09-14",
    "US-MN",
    "otherDirector",
    "c8-reinstatement-pending",
  );
  ready = fixture.world;
  personId = fixture.formerEmployee;
  positionId = fixture.otherSpecialistPositionId;
  actorId = fixture.otherDirector;
  expect(
    assessMinnesotaReinstatement(ready, actorId, positionId, personId),
  ).toMatchObject({ available: true, probationAllowed: true });
});
afterEach(() => vi.restoreAllMocks());
function control(answer: Answer) {
  const actual = decisions.evaluateDecision;
  return vi
    .spyOn(decisions, "evaluateDecision")
    .mockImplementation((world: World, context: DecisionContext) => {
      if (context.decisionType !== "civil-personnel.reinstatement-response")
        return actual(world, context);
      if (answer === "undecided" || answer === "selected-null") {
        return {
          ...actual(world, context),
          outcomeKind: answer === "undecided" ? "undecided" : "selected",
          selectedOptionKey: null,
        };
      }
      // Controlled availability proves the caller; it is not a new legal condition or natural motive.
      return actual(world, {
        ...context,
        randomness: "none",
        constraints: [
          ...context.constraints,
          ...context.options
            .filter(
              (option) =>
                answer === "no-available-option" || option.key !== answer,
            )
            .map((option) => ({
              stableKey: `fixture:c8-reinstatement:${option.key}`,
              optionKey: option.key,
              kind: "fixture:controlled-answer",
              explanation:
                "This caller fixture controls which answer is available.",
              sourceRefs: [],
            })),
        ],
      });
    });
}
function offer(world: World) {
  return offerMinnesotaReinstatement(world, {
    positionId,
    personId,
    probation: "required",
  });
}
describe("unanswered reinstatement preserves the original World under the existing atomic offer contract", () => {
  it.each(["undecided", "no-available-option", "selected-null"] as const)(
    "%s refuses without saving a false offer or answer",
    (answer: Answer) => {
      const spy = control(answer);
      const before = serializeWorld(ready);
      const result = offer(ready);
      expect(result.ok).toBe(false);
      if (result.ok)
        throw new Error(
          "An unresolved answer must not create a finalized offer.",
        );
      expect(result.world).toBe(ready);
      expect(serializeWorld(result.world)).toBe(before);
      expect(personnelOfferResponses(result.world)).toHaveLength(0);
      expect(result.reason).toBe(
        "They have not decided whether to accept reinstatement.",
      );
      const saved = deserializeWorld(before);
      assertWorldIntegrity(saved);
      const readBytes = serializeWorld(saved);
      const opportunity = reinstatementOpportunities(saved).find(
        (item) => item.position.id === positionId,
      )!;
      expect(
        opportunity.candidates.map((candidate) => candidate.personId),
      ).toContain(personId);
      expect(
        assessMinnesotaReinstatement(saved, actorId, positionId, personId)
          .available,
      ).toBe(true);
      expect(serializeWorld(saved)).toBe(readBytes);
      // A later explicit attempt is still eligible; there is no automatic retry or saved pending-offer type.
      const again = offer(saved);
      expect(again.ok).toBe(false);
      expect(serializeWorld(again.world)).toBe(readBytes);
      expect(
        spy.mock.calls.filter(
          ([, context]: Parameters<typeof decisions.evaluateDecision>) =>
            context.decisionType === "civil-personnel.reinstatement-response",
        ),
      ).toHaveLength(2);
    },
  );
  it.each(["accept", "decline"] as const)(
    "preserves selected %s and actual employment/refusal",
    (answer: Answer) => {
      const spy = control(answer);
      const result = offer(ready);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      const saved = deserializeWorld(serializeWorld(result.world));
      assertWorldIntegrity(saved);
      expect(saved.currentMoment).toEqual(ready.currentMoment);
      const responses = personnelOfferResponses(saved);
      expect(responses).toHaveLength(1);
      const response = responses[0]!;
      expect(response.personId).toBe(personId);
      expect(response.offerId).toBe(result.recordId);
      expect(response.response).toBe(
        answer === "accept" ? "accepted" : "declined",
      );
      const trace = saved.history.decisionTraces.find(
        (trace) => trace.id === response.decisionTraceId,
      )!;
      expect(trace.context.actorPersonId).toBe(personId);
      expect(trace.selectedOptionKey).toBe(answer);
      if (answer === "accept") {
        expect(response.workRelationshipId).not.toBeNull();
        const work = saved.history.workRelationships.find(
          (work) => work.id === response.workRelationshipId,
        )!;
        expect(work.personId).toBe(personId);
        expect(workStatusAt(saved, work.id)!.status).toBe("active");
        expect(saved.history.personnelRecords!.at(-1)).toMatchObject({
          kind: "incumbency",
          tenure: "probationary",
          workRelationshipId: work.id,
        });
        // The existing reinstatement writer does not invent an unknown plan rate.
        expect(
          saved.history.resourceFlows.filter(
            (flow) =>
              flow.basisReference.kind === "work" &&
              flow.basisReference.workRelationshipId === work.id,
          ),
        ).toHaveLength(0);
      } else {
        expect(response.workRelationshipId).toBeNull();
        expect(
          assessMinnesotaReinstatement(saved, actorId, positionId, personId),
        ).toMatchObject({
          available: false,
          reason: expect.stringContaining("that answer stands"),
        });
      }
      const beforeRead = serializeWorld(saved);
      reinstatementOpportunities(saved);
      expect(serializeWorld(saved)).toBe(beforeRead);
      const repeated = offer(saved);
      expect(repeated.ok).toBe(false);
      expect(serializeWorld(repeated.world)).toBe(beforeRead);
      expect(
        spy.mock.calls.filter(
          ([, context]: Parameters<typeof decisions.evaluateDecision>) =>
            context.decisionType === "civil-personnel.reinstatement-response",
        ),
      ).toHaveLength(1);
    },
  );
});
