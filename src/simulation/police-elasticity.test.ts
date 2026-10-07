import { expect, it } from "vitest";
import {
  OUTCOME_LINKS,
  outcomeLinkStatus,
  shapedLinkFactor,
} from "./outcome-web";
it("connects researched elasticities to the recorded officer density, and says which outcome is still missing", () => {
  // Officers per 1,000 people is a recorded place outcome (FBI 2024). Violent
  // crime is a kept place outcome, so its link acts; property crime is not.
  for (const [key, coefficient, status] of [
    ["police-to-violent-crime", -0.34, "built"],
    ["police-to-property-crime", -0.17, "outcome-not-produced"],
  ] as const) {
    const l = OUTCOME_LINKS.find((l) => l.key === key)!;
    expect(l.shape.kind).toBe("elasticity");
    expect(l.size).toBe(coefficient);
    expect(shapedLinkFactor(l, 2.2, 2)).toBeCloseTo(1 + coefficient * 0.1);
    expect(outcomeLinkStatus(l)).toBe(status);
  }
});
