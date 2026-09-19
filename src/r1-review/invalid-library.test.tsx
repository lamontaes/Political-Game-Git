import type * as PrivateManifests from "../presentation/private-candidate-manifests";
import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { privateModularInputs } from "../presentation/private-test-inputs";
const available = privateModularInputs("invalid candidate input", [
  "art/manifest/character_candidate_modular45_registry.json",
]);
afterEach(() => {
  vi.doUnmock("../presentation/private-candidate-manifests");
  vi.resetModules();
});
it.skipIf(!available)(
  "an invalid profile refuses candidate people without throwing at app-module import or changing saved identity",
  { timeout: 30000 }, // Includes a cold import of the actual app graph after fault injection.
  async () => {
    vi.resetModules();
    vi.doMock("../presentation/private-candidate-manifests", async () => {
      const actual = await vi.importActual<typeof PrivateManifests>(
        "../presentation/private-candidate-manifests",
      );
      return {
        ...actual,
        MODULAR45_REGISTRY: {
          ...actual.MODULAR45_REGISTRY,
          preparedProfiles: actual.MODULAR45_REGISTRY.preparedProfiles!.map(
            (p) => ({ ...p, sha256: "0".repeat(64) }),
          ),
        },
      };
    });
    const loaded = await import("../presentation/engine-people29-review");
    expect(loaded.ENGINE_PEOPLE29_INPUT_ERROR).toMatch(/profile/i);
    expect(loaded.ENGINE_PEOPLE29_CHARACTER_LIBRARY.components.size).toBe(0);
    const { artPreviewLibraries, previewArtRefusal } =
      await import("../presentation/art-preview");
    expect(
      artPreviewLibraries("candidate-review")?.unavailableReason,
    ).toContain("pack needs repair");
    expect(
      previewArtRefusal({ id: "test", birthDate: "1990-01-01" }, "2026-01-01"),
    ).toContain("pack needs repair");
    const { DEFAULT_NEW_GAME_SETUP } = await import("../presentation/new-game");
    const { CreatorAppearanceStep } =
      await import("../player/CreatorAppearanceStep");
    const markup = renderToStaticMarkup(
      <CreatorAppearanceStep
        setup={{
          ...DEFAULT_NEW_GAME_SETUP,
          seed: "invalid-pack-control",
          startAge: 30,
          appearanceCatalogGeneration: 16,
          appearanceOutfitVersion: "complete-outfit-v2",
        }}
        mode="candidate-review"
        onBegin={() => {}}
      />,
    );
    expect(markup).toContain("pack needs repair");
    expect(markup).toContain('data-testid="creator-invalid-pack"');
    expect(markup).toMatch(/data-testid="begin"[^>]*disabled/);
  },
);
