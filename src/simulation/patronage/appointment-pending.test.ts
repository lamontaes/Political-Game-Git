import { afterEach, describe, expect, it, vi } from "vitest";
import * as decisions from "../decisions";
import { createPortabilityFixture } from "../portability-fixture";
import { recordRelationshipInteraction } from "../records";
import { deserializeWorld, serializeWorld } from "../serialization";
import { chooseAppointee } from "./appointments";
const evaluate = decisions.evaluateDecision;
type EvaluationArgs = Parameters<typeof evaluate>;
afterEach(() => vi.restoreAllMocks());
function fixture() {
  const world = createPortabilityFixture();
  const [appointer, candidate] = world.personOrder;
  if (!appointer || !candidate) throw new Error("Fixture needs two people.");
  return { world, appointer, candidate };
}
describe("A125 appointment pending boundary", () => {
  it.each(["null", "stale-key"] as const)(
    "an undecided %s packet writes no durable appointment trace, including after reload",
    (packet: "null" | "stale-key") => {
      const { world, appointer, candidate } = fixture();
      const trace = vi.spyOn(decisions, "recordDurableDecisionTrace");
      const decision = vi
        .spyOn(decisions, "evaluateDecision")
        .mockImplementation(
          (
            inputWorld: EvaluationArgs[0],
            input: EvaluationArgs[1],
          ): ReturnType<typeof evaluate> => ({
            ...evaluate(inputWorld, input),
            outcomeKind: "undecided",
            selectedOptionKey: packet === "null" ? null : `person:${candidate}`,
          }),
        );
      for (const current of [world, deserializeWorld(serializeWorld(world))]) {
        const before = serializeWorld(current);
        expect(
          chooseAppointee(current, {
            stableKey: "a125:pending-post",
            appointerPersonId: appointer,
            post: {
              officeKey: "fixture-council-seat",
              title: "council member",
            },
            circle: [candidate],
            eligible: () => true,
          }),
        ).toBeNull();
        expect(serializeWorld(current)).toBe(before);
      }
      expect(decision).toHaveBeenCalledTimes(2);
      expect(trace).not.toHaveBeenCalled();
    },
  );
  it("preserves an actual selected appointment from a recorded relationship", () => {
    const { world, appointer, candidate } = fixture();
    const before = recordRelationshipInteraction(world, {
      stableKey: "a125:recorded-help",
      personIds: [candidate, appointer],
      eventId: null,
      occurredAt: world.currentDate,
      kind: "support:helped-through-a-hard-time",
      change: "strengthened",
      significance: "major",
      summary: "The candidate helped the appointer.",
      tags: [`relationship.actor:${candidate}`],
    });
    const result = chooseAppointee(before, {
      stableKey: "a125:selected-post",
      appointerPersonId: appointer,
      post: { officeKey: "fixture-council-seat", title: "council member" },
      circle: [candidate],
      eligible: () => true,
    });
    expect(result?.personId).toBe(candidate);
    expect(result?.world.history.decisionTraces.at(-1)?.outcomeKind).toBe(
      "selected",
    );
    expect(result?.world.history.decisionTraces.at(-1)?.selectedOptionKey).toBe(
      `person:${candidate}`,
    );
  });
});
