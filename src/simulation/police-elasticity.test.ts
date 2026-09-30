import { expect, it } from "vitest";
import {
  OUTCOME_LINKS,
  outcomeLinkStatus,
  shapedLinkFactor,
} from "./outcome-web";
it("connects researched elasticities while retaining the missing-cause boundary", () => {
  for (const [key, coefficient] of [
    ["police-to-violent-crime", -0.34],
    ["police-to-property-crime", -0.17],
  ] as const) {
    const l = OUTCOME_LINKS.find((l) => l.key === key)!;
    expect(l.shape.kind).toBe("elasticity");
    expect(l.size).toBe(coefficient);
    expect(shapedLinkFactor(l, 2.2, 2)).toBeCloseTo(1 + coefficient * 0.1);
    expect(outcomeLinkStatus(l)).toBe("cause-not-recorded");
  }
});
