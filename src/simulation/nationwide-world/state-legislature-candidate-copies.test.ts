import { describe, expect, it } from "vitest";
import { canonicalJson } from "../canonical-json";
import { addDays } from "../dates";
import { createScenarioWorld, LEXINGTON_DEMO_CONTEXT } from "../demo";
import { PORTABILITY_CONTEXT } from "../portability-fixture";
import { withHistoryAppendTransaction } from "../history-index";
import { decideSelfStarterRun } from "../nominations/field-entry";

// Explicit synthetic scenarios test the writer boundary, not legal eligibility.
describe("self-starter history-copy boundary", () => {
  for (const [name, context] of [
    ["Lexington fixture", LEXINGTON_DEMO_CONTEXT],
    ["portability fixture", PORTABILITY_CONTEXT],
  ] as const) {
    it(`preserves the seeded choice, cutoff and source world in the ${name}`, () => {
      const world = createScenarioWorld(`self-starter-copy:${name}`, context);
      const intakeDate = addDays(world.currentDate, -1);
      const personId = world.personOrder.find(
        (id) =>
          world.people[id]!.birthDate < intakeDate &&
          !(world.control.kind === "person" && world.control.personId === id),
      )!;
      expect(personId).toBeDefined();
      const source = canonicalJson(world);
      const input = {
        stableKey: `self-starter-copy:${name}`,
        decisionType: "election.consider-state-legislative-run",
        personId,
        seatKey: "synthetic-test-seat",
        intakeDate,
      };
      const ordinary = decideSelfStarterRun(world, input);
      let decision!: ReturnType<typeof decideSelfStarterRun>;
      const copied = withHistoryAppendTransaction(
        world,
        ["personalityTendencies"],
        (prepared) => {
          decision = decideSelfStarterRun(prepared, input);
          return decision.world;
        },
      );
      expect(decision.runs).toBe(ordinary.runs);
      expect(decision.decisionTraceId).toBe(ordinary.decisionTraceId);
      expect(canonicalJson(copied)).toBe(canonicalJson(ordinary.world));
      expect(canonicalJson(world)).toBe(source);
      expect(copied.history.personalityTendencies.length).toBeGreaterThan(
        world.history.personalityTendencies.length,
      );
      expect(
        Object.getOwnPropertyDescriptor(
          copied.history.personalityTendencies,
          "length",
        )!.value,
      ).toBe(copied.history.personalityTendencies.length);
    });
  }
});
