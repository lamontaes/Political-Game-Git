import { describe, expect, it, vi } from "vitest";
vi.mock("../presentation/engine-people29-data", () => {
  const part = (id: string, kind: string, channel: string, extra = {}) => ({
    id,
    kind,
    sha256: `${id}-sha`,
    materials: [{ channel }],
    ...extra,
  });
  const parts = [
    part("body", "body", "skin"),
    part("shirt", "top", "top"),
    part("pants", "bottom", "bottom"),
    part("hair", "hair-front", "hair"),
    part("head", "head", "skin"),
    part("sleeve", "top", "top", {
      anatomyOverride: "corrective",
      coverageMaskPath: "sleeve-mask",
    }),
    part("corrective", "body-corrective", "skin"),
  ];
  return {
    PREPARED_FAMILIES: [{ id: "family", parts }],
    ENGINE_PEOPLE29_TEMPLATES: Object.fromEntries(
      parts.map((p) => [
        p.id,
        { familyId: "family", partIds: [p.id], sourceSha256: p.sha256 },
      ]),
    ),
  };
});
import { preparedVariantKey } from "./engine-people29-svg";
import type { AppearanceMaterial } from "../simulation/appearance-material";
const material = {
  version: "engine-people29-v1",
  familyId: "family",
  palettes: { skin: "light", hair: "brown", top: "blue", bottom: "navy" },
  features: {},
} as AppearanceMaterial;
describe("per-layer rendering dependencies", () => {
  it("reuses pants when hair or face changes", () => {
    const next = {
      ...material,
      palettes: { ...material.palettes, hair: "black", skin: "dark" },
    };
    expect(
      preparedVariantKey("pants", next, ["body", "head", "pants", "hair"]),
    ).toBe(preparedVariantKey("pants", material, ["body", "pants"]));
  });
  it("invalidates the actual affected material", () => {
    const next = {
      ...material,
      palettes: { ...material.palettes, hair: "black" },
    };
    expect(preparedVariantKey("hair", next, [])).not.toBe(
      preparedVariantKey("hair", material, []),
    );
  });
  it("retains garment anatomy and coverage dependencies without rerendering every layer", () => {
    expect(preparedVariantKey("body", material, ["sleeve"])).not.toBe(
      preparedVariantKey("body", material, ["shirt"]),
    );
    expect(preparedVariantKey("pants", material, ["sleeve"])).toBe(
      preparedVariantKey("pants", material, ["shirt"]),
    );
  });
  it("keeps unrelated materials out of shirt keys", () => {
    const next = {
      ...material,
      palettes: { ...material.palettes, bottom: "black" },
    };
    expect(preparedVariantKey("shirt", material, [])).toBe(
      preparedVariantKey("shirt", next, []),
    );
  });
});
