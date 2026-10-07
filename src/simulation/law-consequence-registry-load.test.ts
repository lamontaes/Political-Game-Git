import { describe, expect, it } from "vitest";
// The opening life is the real entry into the law registry from play. Loading
// it first used to start the library module before the registry finished, so
// the generated manifest read that module's registrations while it was still
// empty and the registry held an undefined handler.
import "../presentation/opening-life";
import { LAW_CONSEQUENCE_MODULE_KEYS } from "./law-consequence-module-manifest";
import { LAW_CONSEQUENCE_REGISTRATIONS } from "./law-consequence-registry";

describe("the law consequence registry loads from the opening life", () => {
  it("holds a real handler for every registration, with the library and SNAP owners present", () => {
    expect(LAW_CONSEQUENCE_MODULE_KEYS.length).toBeGreaterThan(0);
    expect(LAW_CONSEQUENCE_REGISTRATIONS.every((entry) => !!entry?.kind)).toBe(
      true,
    );
    const kinds = LAW_CONSEQUENCE_REGISTRATIONS.map((entry) => entry.kind);
    expect(kinds).toContain("public-library-service");
    expect(kinds).toContain("snap-participation");
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});
