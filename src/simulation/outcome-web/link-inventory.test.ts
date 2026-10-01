import { describe, expect, it } from "vitest";
import {
  OUTCOME_LINKS,
  outcomeLinkStatus,
  outcomeWebStatus,
  validateOutcomeLinkInventory,
} from "./index";

describe("declared outcome-link inventory", () => {
  it("validates the actual catalog and exposes research evidence separately", () => {
    expect(() => validateOutcomeLinkInventory(OUTCOME_LINKS)).not.toThrow();
    const rows = outcomeWebStatus();
    expect(rows).toHaveLength(OUTCOME_LINKS.length);
    for (const evidence of ["provisional", "to-confirm"] as const) {
      const link = OUTCOME_LINKS.find((row) => row.evidence === evidence)!;
      expect(link).toBeDefined();
      expect(rows.find((row) => row.key === link.key)!.evidence).toBe(evidence);
    }
  });

  it("rejects a declared status that claims a different existing capability", () => {
    const link = OUTCOME_LINKS.find((row) => row.status === "built")!;
    expect(() =>
      validateOutcomeLinkInventory([{ ...link, status: "cause-not-recorded" }]),
    ).toThrow(link.key);
  });

  it("requires a missing-size reason even when the existing shape is person-level", () => {
    const link = OUTCOME_LINKS.find(
      (row) => row.status === "person-level" && row.size === null,
    )!;
    expect(link).toBeDefined();
    expect(link.unsupportedReason).toBe("size-not-set");
    expect(outcomeLinkStatus(link)).toBe("person-level");
    expect(() =>
      validateOutcomeLinkInventory([{ ...link, unsupportedReason: null }]),
    ).toThrow(link.key);
  });

  it("rejects an invented missing-cause reason on a structurally built link", () => {
    const link = OUTCOME_LINKS.find((row) => row.status === "built")!;
    expect(() =>
      validateOutcomeLinkInventory([
        { ...link, unsupportedReason: "cause-not-recorded" },
      ]),
    ).toThrow(link.key);
  });

  it("keeps an unrecorded coefficient unavailable despite forged built metadata", () => {
    const link = OUTCOME_LINKS.find((row) => row.status === "size-not-set")!;
    expect(link).toBeDefined();
    const forged = {
      ...link,
      status: "built" as const,
      unsupportedReason: null,
    };
    expect(outcomeLinkStatus(forged)).toBe("size-not-set");
    expect(() => validateOutcomeLinkInventory([forged])).toThrow(link.key);
  });
});
