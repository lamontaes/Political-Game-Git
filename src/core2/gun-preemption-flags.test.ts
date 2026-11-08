/** Law levels: which states bar towns from making their own gun rules (Giffords Law Center, Preemption of Local Laws). */
import { expect, it } from "vitest";
import data from "../../data/research/laws/starting-law-2026/justice-public-safety.json";

const NO_BAR = ["US-CT", "US-HI", "US-MA", "US-NJ", "US-NY"];
const GUN = [
  "stand-your-ground",
  "child-access-prevention",
  "raise-handgun-purchase-age",
  "permit-to-carry-concealed",
];

for (const name of GUN)
  it(`${name}: only CT, HI, MA, NJ and NY leave towns free`, () => {
    const answers = (
      data.questions as unknown as Record<
        string,
        { answers: Record<string, { preempts?: boolean }> }
      >
    )[`us-policy-positions:justice-public-safety.${name}`]!.answers;
    for (const [state, row] of Object.entries(answers)) {
      if (NO_BAR.includes(state)) expect(row.preempts, state).toBe(false);
      else if (state !== "US-CA" && state !== "US-CO")
        expect(row.preempts, state).toBe(true);
    }
  });
