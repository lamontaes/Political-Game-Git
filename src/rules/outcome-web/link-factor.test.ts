import { describe, expect, it } from "vitest";
import {
  shapedLinkFactor as legacyShapedLinkFactor,
  type OutcomeLinkShape,
} from "../../simulation/outcome-web/index";
import { STATES } from "../../simulation/state-reference";
import { shapedLinkFactorFromFacts } from "./link-factor";

describe("standalone outcome link factors", () => {
  it.each(Object.keys(STATES))(
    "matches legacy link shapes for US-%s",
    (usps) => {
      const size = (usps.charCodeAt(0) % 10) / 100;
      const value = 5 + (usps.charCodeAt(1) % 20);
      const baseline = 2 + (usps.charCodeAt(0) % 5);
      const shapes: readonly OutcomeLinkShape[] = [
        { kind: "linear" },
        { kind: "elasticity" },
        { kind: "threshold", at: 8, steeperAt: 16, steeperExtraSize: size / 2 },
        { kind: "diminishing", scale: 4 },
        { kind: "exposure-years" },
        { kind: "acute-decay", halfLifeDays: 90 },
      ];
      for (const shape of shapes) {
        const link = { shape, size };
        expect(shapedLinkFactorFromFacts(link, value, baseline)).toBe(
          legacyShapedLinkFactor(link, value, baseline),
        );
      }
    },
  );
});
