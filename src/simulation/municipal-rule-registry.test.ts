import { describe, expect, it, vi } from "vitest";

// Importing the inventory anywhere in this cold lookup graph must fail.
vi.mock("./municipal-government", () => {
  throw new Error("Legislative lookup must not load municipal inventory");
});
import { rulePackById } from "./legislature-rule-packs";
import { MUNICIPAL_RULE_PACKS_JSON } from "./municipal-rule-registry.generated";

describe("synchronous municipal registry on a clean start", () => {
  it("resolves nonmunicipal rules without inventory or initialization", () => {
    const pack = rulePackById("us-ky-general-assembly-v1");
    expect(pack.packId).toBe("us-ky-general-assembly-v1");
    expect(pack).not.toBeInstanceOf(Promise);
    expect(() => rulePackById("municipal:unregistered")).toThrow(
      "No legislative rule pack is registered",
    );
  });
  it("resolves every complete admitted municipal entry without a screen visit", () => {
    for (const pack of JSON.parse(MUNICIPAL_RULE_PACKS_JSON)) {
      expect(rulePackById(pack.packId)).toEqual(pack);
    }
  });
  it("synchronously loads a nonempty compiled registry on its first lookup", async () => {
    // A transport fixture, never a source claim or production admission.
    const pack = {
      ...rulePackById("us-ky-general-assembly-v1"),
      packId: "municipal:transport-fixture",
    };
    vi.resetModules();
    vi.doMock("./municipal-rule-registry.generated", () => ({
      MUNICIPAL_RULE_PACKS_JSON: JSON.stringify([pack]),
    }));
    try {
      const cold = await import("./legislature-rule-packs");
      expect(cold.rulePackById(pack.packId)).toEqual(pack);
      expect(cold.rulePackById(pack.packId)).not.toBeInstanceOf(Promise);
    } finally {
      vi.doUnmock("./municipal-rule-registry.generated");
      vi.resetModules();
    }
  });
});
