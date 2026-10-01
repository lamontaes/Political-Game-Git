import { afterEach, describe, expect, it, vi } from "vitest";
import * as decisions from "./decisions";
import type { World, DecisionContext } from "./types";
import { currentLifeCutoff } from "./life-queries";
import { createDemoWorld } from "./demo";
import { addDays } from "./dates";
import { recordWorldEvent, advanceWorld } from "./world";
import {
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
  scheduleFutureDueItem,
  resolveFutureDueItemsThrough,
} from "./future-transitions";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  LIFE_CALLBACK_TRANSITION_KEY,
  LIFE_CALLBACK_EVENT,
  lifeCallbackTransitionHandler,
} from "./life-callbacks";

function callbackWorld() {
  let world = createDemoWorld("c8-life-callback-undecided");
  const [personId, counterpartId] = world.personOrder;
  if (!personId || !counterpartId)
    throw new Error("The recorded household pair is required.");
  world = recordWorldEvent(world, {
    stableKey: "c8:earlier-matter",
    type: "life.situation-resolved",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId, counterpartId],
    participants: [
      { personId, role: "focus:subject", detail: "Recorded household member" },
      {
        personId: counterpartId,
        role: "focus:counterpart",
        detail: "Recorded household member",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["adult.workplace-disagreement"],
    summary: "An earlier disagreement was recorded.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const origin = world.history.events.at(-1)!;
  world = scheduleFutureDueItem(world, {
    stableKey: "c8:earlier-matter:callback",
    dueAt: addDays(world.currentDate, 1),
    transitionKey: LIFE_CALLBACK_TRANSITION_KEY,
    entityIds: [personId, origin.id].sort(),
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [origin.id] },
  });
  return {
    world,
    due: world.history.futureDueItems.at(-1)!,
    origin,
    counterpartId,
  };
}
afterEach(() => vi.restoreAllMocks());
const registry = () =>
  createFutureTransitionHandlerRegistry([
    [LIFE_CALLBACK_TRANSITION_KEY, lifeCallbackTransitionHandler],
  ]);
describe("an unanswered earlier-matter decision", () => {
  it.each(["undecided", "no-available-option", "selected-null"] as const)(
    "does not raise or dismiss the matter for %s, including after save",
    (outcome: "undecided" | "no-available-option" | "selected-null") => {
      const fixture = callbackWorld();
      const evaluate = decisions.evaluateDecision;
      const spy = vi
        .spyOn(decisions, "evaluateDecision")
        .mockImplementation((world: World, context: DecisionContext) => {
          const actual = evaluate(world, context);
          if (context.decisionType !== "life.raise-earlier-matter")
            return actual;
          return {
            ...actual,
            outcomeKind: outcome === "selected-null" ? "selected" : outcome,
            selectedOptionKey: null,
          };
        });
      const before = serializeWorld(fixture.world);
      for (const input of [fixture.world, deserializeWorld(before)]) {
        const result = advanceWorld(input, 1, registry());
        expect(spy).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            actorPersonId: fixture.counterpartId,
            decisionType: "life.raise-earlier-matter",
          }),
        );
        expect(
          result.history.events.filter(
            (event) => event.type === LIFE_CALLBACK_EVENT,
          ),
        ).toHaveLength(0);
        const state = futureDueItemStateAt(
          result,
          fixture.due.id,
          currentLifeCutoff(result),
        );
        expect(state?.status).toBe("blocked");
        expect(state?.reasonKey).toBe("life:decision-undecided");
        expect(state?.outcomeEventId).toBeNull();
        expect(
          result.history.events.find((event) => event.id === fixture.origin.id),
        ).toEqual(fixture.origin);
        expect(
          result.history.futureDueItems.find(
            (item) => item.id === fixture.due.id,
          ),
        ).toEqual(fixture.due);
        const saved = serializeWorld(result);
        expect(
          serializeWorld(
            resolveFutureDueItemsThrough(
              deserializeWorld(saved),
              result.currentDate,
              registry(),
            ),
          ),
        ).toBe(saved);
      }
      expect(spy).toHaveBeenCalledTimes(2);
      expect(serializeWorld(fixture.world)).toBe(before);
    },
  );
  it.each(["raise-it", "let-it-lie"] as const)(
    "retains a selected %s",
    (answer: "raise-it" | "let-it-lie") => {
      const fixture = callbackWorld();
      const evaluate = decisions.evaluateDecision;
      const spy = vi
        .spyOn(decisions, "evaluateDecision")
        .mockImplementation((world: World, context: DecisionContext) => {
          const actual = evaluate(world, context);
          if (context.decisionType !== "life.raise-earlier-matter")
            return actual;
          return {
            ...actual,
            outcomeKind: "selected",
            selectedOptionKey: answer,
          };
        });
      const result = advanceWorld(fixture.world, 1, registry());
      expect(spy).toHaveBeenCalledTimes(1);
      expect(
        futureDueItemStateAt(result, fixture.due.id, currentLifeCutoff(result))
          ?.status,
      ).toBe(answer === "raise-it" ? "resolved" : "cancelled");
      expect(
        result.history.events.filter(
          (event) => event.type === LIFE_CALLBACK_EVENT,
        ),
      ).toHaveLength(answer === "raise-it" ? 1 : 0);
      expect(serializeWorld(deserializeWorld(serializeWorld(result)))).toBe(
        serializeWorld(result),
      );
    },
  );
});
