import { describe, expect, it } from "vitest";

import { PRESSURE_VALUES_PROVENANCE } from "./contract";

describe("pressure sizes say where they come from", () => {
  it("are marked estimated with a source", () => {
    expect(PRESSURE_VALUES_PROVENANCE.provenance).toBe(
      "estimated-from-average",
    );
    expect(PRESSURE_VALUES_PROVENANCE.estimated).toBe(true);
    expect(PRESSURE_VALUES_PROVENANCE.estimatedFrom).toMatch(/Census/);
  });
});
