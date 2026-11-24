/** Law levels: Oregon (ORS 91.225) and Washington (RCW 35.21.830) bar local rent control though each has a state cap. */
import { expect, it } from "vitest";
import data from "../../data/research/laws/starting-law-2026/housing-land-use.json";

it("Oregon and Washington bar towns from rent rules in every phase", () => {
  const answers = (
    data.questions as unknown as Record<
      string,
      {
        answers: Record<
          string,
          { preempts: boolean; phases?: { preempts: boolean }[] }
        >;
      }
    >
  )["us-policy-positions:housing-land-use.rent-stabilization"]!.answers;
  for (const state of ["US-OR", "US-WA"]) {
    expect(answers[state]!.preempts, state).toBe(true);
    for (const phase of answers[state]!.phases ?? [])
      expect(phase.preempts, state).toBe(true);
  }
});
