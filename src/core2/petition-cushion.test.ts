/**
 * A campaign gathers more signatures than its petition's minimum, because
 * the clerk strikes names before counting (`petitionSignatureCushion`): the
 * target is the minimum plus the cushion, rounded up, never below the
 * minimum, and the cushion is read from its parameter row within its spread.
 */
import { describe, expect, it } from "vitest";
import { campaignParameter } from "./campaign-views";
import { signaturesToGather } from "./modules/campaigns";
import parameters from "./data/campaigns/parameters.json" with { type: "json" };

describe("a petition's cushion", () => {
  it("gathers the minimum plus the cushion, from its parameter row", () => {
    const cushion = campaignParameter("petitionSignatureCushion");
    const row = (
      parameters.parameters as Record<
        string,
        { value: number; tag: string; spread?: readonly number[] }
      >
    ).petitionSignatureCushion!;
    expect(row.tag).toBe("ESTIMATED");
    expect(cushion).toBe(row.value);
    expect(cushion).toBeGreaterThanOrEqual(row.spread![0]!);
    expect(cushion).toBeLessThanOrEqual(row.spread![1]!);
    for (const needed of [1, 2, 25, 30, 500, 7819]) {
      const target = signaturesToGather(needed);
      expect(target).toBe(Math.ceil(needed * (1 + cushion)));
      expect(target).toBeGreaterThan(needed);
    }
    expect(signaturesToGather(0)).toBe(0);
  });
});
