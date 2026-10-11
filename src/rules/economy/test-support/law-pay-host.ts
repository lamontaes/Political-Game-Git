/** Test-only common transport: prospective terms use the common writer; full earned DTOs are checked against unchanged public-parent canonical rows before prefix intake. */
import { expect } from "vitest";
import { applyLawPayConsequence as native } from "../../../simulation/living-world/town-pay";
import { recordResourceFlowTerms } from "../../../simulation/resources";
import { applyLawPayConsequence, type PayLawInput } from "../law-pay-effects";
import { lawPayFacts } from "./law-pay-facts";
import type { World } from "../../../simulation/types";
export function lawPayHost(
  world: World,
  input: PayLawInput,
  expectedParent: typeof native = native,
): World {
  const gen = applyLawPayConsequence(lawPayFacts(world, input), input);
  let current = world,
    step = gen.next();
  while (!step.done) {
    const r = step.value;
    if (r.kind === "recordResourceFlowTerms")
      current = recordResourceFlowTerms(current, r.input);
    else {
      const expected = expectedParent(current, input),
        rows = expected.history.earnedLawPayAssessments!,
        index = (current.history.earnedLawPayAssessments ?? []).length;
      expect(r.row).toEqual(rows[index]);
      expect(current.history.earnedLawPayAssessments ?? []).toEqual(
        rows.slice(0, index),
      );
      expect(r.row.sequence).toBe(current.history.nextSequence);
      current = {
        ...current,
        history: {
          ...current.history,
          nextSequence: r.row.sequence + 1,
          earnedLawPayAssessments: rows.slice(0, index + 1),
        },
      };
    }
    step = gen.next(lawPayFacts(current, input));
  }
  return current;
}
