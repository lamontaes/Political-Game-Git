/** Law levels: the two lists of states that bar a local minimum wage agree where a statute has been read. */
import { expect, it } from "vitest";
import authority from "../../data/research/laws/starting-law-2026/labor-workforce.json";
import statutes from "../../data/research/laws/local-starting-law/local-minimum-wage.json";

const authorityAnswers = (
  authority.questions as unknown as Record<
    string,
    { answers: Record<string, { preempts?: boolean }> }
  >
)["us-policy-positions:labor-workforce.local-minimum-wage-authority"]!.answers;

for (const [state, cite] of [
  ["US-ND", /34-06-23/],
  ["US-MT", /7-1-111/],
] as const)
  it(`${state} bars local minimum wages by a statute read in full, in both lists`, () => {
    const row = statutes.statePreemption.find((r) => r.stateKey === state)!;
    expect(row.preempts).toBe(true);
    expect(row.estimate).toBe(false);
    expect(row.source).toMatch(cite);
    expect(authorityAnswers[state]?.preempts, "the authority list").toBe(true);
  });
