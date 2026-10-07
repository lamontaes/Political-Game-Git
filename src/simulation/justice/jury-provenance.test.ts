import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { JURY_PANEL_ESTIMATE } from "./court-reasoning";

describe("the jury panel size says where it comes from", () => {
  it("is the common felony rule, flagged as an estimate with its source", () => {
    expect(JURY_PANEL_ESTIMATE.size).toBe(12);
    expect(JURY_PANEL_ESTIMATE.estimated).toBe(true);
    expect(JURY_PANEL_ESTIMATE.provenance).toBe("estimated-from-average");
    expect(JURY_PANEL_ESTIMATE.estimatedFrom).toMatch(/Williams v\. Florida/);
  });

  it.each(["court-reasoning.ts", "jail-absence.ts"])(
    "%s has no placeholder, unresearched or blanket marker",
    (file) => {
      const text = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      expect(text).not.toMatch(/placeholder|unresearched|blanket/i);
    },
  );
});
