import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { applyLawPayConsequence as native } from "../../simulation/living-world/town-pay";
import { recordResourceFlowTerms } from "../../simulation/resources";
import { lawInForce } from "../../simulation/governing/law-in-force";
import { ensureNationalElectionJurisdiction } from "../../simulation/national-election-geography";
import { completed, worker } from "./test-support/resource-earned-source";
import { lawPayFacts } from "./test-support/law-pay-facts";
import { applyLawPayConsequence, type PayLawInput } from "./law-pay-effects";
import type { World } from "../../simulation/types";
function run(world: World, input: PayLawInput) {
  let expected: World | undefined, nativeError: unknown;
  try {
    expected = native(world, input);
  } catch (error) {
    nativeError = error;
  }
  let current = world,
    ownError: unknown;
  try {
    const gen = applyLawPayConsequence(lawPayFacts(world, input), input);
    let step = gen.next();
    while (!step.done) {
      const r = step.value;
      if (r.kind === "recordResourceFlowTerms")
        current = recordResourceFlowTerms(current, r.input);
      else {
        const rows = expected!.history.earnedLawPayAssessments!,
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
  } catch (error) {
    ownError = error;
  }
  if (nativeError) {
    expect(ownError).toBeInstanceOf(Error);
    expect((ownError as Error).message).toBe((nativeError as Error).message);
  } else {
    if (ownError) throw ownError;
    expect(current).toEqual(expected);
  }
  return current;
}
describe.each(Object.keys(STATES))(
  "complete law-pay public parent in US-%s",
  (usps) => {
    it("matches earned drafts, prospective terms, replay and rejected binding/amount controls", () => {
      const earned = completed(usps),
        typed = earned.assessment.resolvedConsequence;
      const world = run(earned.base, typed);
      run(world, typed);
      run(earned.base, {
        ...typed,
        amount: { ...typed.amount, unit: "minor/hour", value: -1 },
      });
      run(earned.base, { ...typed, activityId: "" as typeof typed.activityId });
      const f = smallWorld({
        place: "US-" + usps,
        people: 4,
        date: "2026-01-05",
        seed: "rules2:law-pay-prospective:" + usps,
      });
      const hired = worker(
          ensureNationalElectionJurisdiction(f.world),
          f.jurisdictionId,
          false,
          true,
          false,
          false,
        ),
        work = hired.world.history.workRelationships.at(-1)!;
      if (typed.action !== "raise-hourly-floor")
        throw Error("Expected canonical federal input");
      const question = Object.values(
        hired.world.policyCatalog.propositions,
      ).find((q) => q.stableKey === typed.questionKey)!;
      const law = lawInForce(hired.world, f.jurisdictionId, question.id)!;
      const { completedShift: ignored, ...prospective } = typed;
      void ignored;
      const input = {
        ...prospective,
        law,
        jurisdictionId: f.jurisdictionId,
        personId: hired.personId,
        workId: work.id,
        payFlowId: hired.flow.id,
        activityId: work.id,
        effectiveAt: hired.world.currentDate,
        sourceRecordIds: [work.id, hired.flow.id],
      };
      const paid = run(hired.world, input);
      expect(paid.history.resourceFlowTerms.length).toBeGreaterThan(
        hired.world.history.resourceFlowTerms.length,
      );
      run(paid, input);
      run(hired.world, { ...input, amount: { ...input.amount, value: 1 } });
    }, 120000);
  },
);
