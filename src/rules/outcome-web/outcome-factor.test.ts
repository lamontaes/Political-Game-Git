import { describe, expect, it } from "vitest";
import { shapedLinkFactor as legacyShapedLinkFactor } from "../../simulation/outcome-web/index";
import { STATES } from "../../simulation/state-reference";
import { outcomeFactorFromFacts } from "./outcome-factor";

describe("standalone outcome factor composition", () => {
  it.each(Object.keys(STATES))("composes selected links for US-%s", (usps) => {
    const delta = 1 + (usps.charCodeAt(0) % 4);
    const candidates = [
      {
        key: `${usps}:linear`,
        from: "measure:linear",
        link: { shape: { kind: "linear" } as const, size: 0.1 },
        value: 5 + delta,
        baseline: 5,
        readAt: "2026-01-01",
        evidence: "researched",
        eligible: true,
        endedByRevert: false,
      },
      {
        key: `${usps}:moderated`,
        from: "measure:moderated",
        link: { shape: { kind: "diminishing", scale: 4 } as const, size: 0.2 },
        value: 8,
        baseline: 4,
        readAt: "2026-01-01",
        evidence: "provisional",
        eligible: true,
        endedByRevert: false,
        moderator: { mode: "only-when" as const, effectAtFull: 0, level: 0.5 },
      },
      {
        key: `${usps}:unknown`,
        from: "measure:unknown",
        link: { shape: { kind: "threshold", at: 1 } as const, size: 1 },
        value: null,
        baseline: 0,
        readAt: "2026-01-01",
        evidence: "contested",
        eligible: true,
        endedByRevert: false,
      },
      {
        key: `${usps}:reverted`,
        from: "law:repealed",
        link: { shape: { kind: "elasticity" } as const, size: 0.1 },
        value: 2,
        baseline: 1,
        readAt: "2026-01-01",
        evidence: "researched",
        eligible: true,
        endedByRevert: true,
      },
    ];
    const reading = outcomeFactorFromFacts("measure:outcome", candidates);
    const linearFactor = legacyShapedLinkFactor(
      candidates[0]!.link,
      candidates[0]!.value!,
      candidates[0]!.baseline!,
    );
    const moderatedFactor =
      1 +
      (legacyShapedLinkFactor(
        candidates[1]!.link,
        candidates[1]!.value!,
        candidates[1]!.baseline!,
      ) -
        1) *
        0.5;
    expect(reading).toEqual({
      outcome: "measure:outcome",
      multiplier: linearFactor * moderatedFactor,
      causes: [
        {
          key: `${usps}:linear`,
          from: "measure:linear",
          factor: linearFactor,
          causeValue: 5 + delta,
          causeBaseline: 5,
          readAt: "2026-01-01",
          evidence: "researched",
        },
        {
          key: `${usps}:moderated`,
          from: "measure:moderated",
          factor: moderatedFactor,
          causeValue: 8,
          causeBaseline: 4,
          readAt: "2026-01-01",
          evidence: "provisional",
        },
      ],
    });
  });
});
