import { describe, expect, it } from "vitest";

import { SCENE_REGISTRY } from "./scene-registry";
import {
  resolveTitlePresentation,
  selectTableauDeterministically,
  TITLE_TABLEAU_REGISTRY,
  type TitleHeroInput,
} from "./title-tableau";

const BASE = {
  assetLibraryVersion: "library-v1",
  registry: TITLE_TABLEAU_REGISTRY,
  scenes: SCENE_REGISTRY,
} as const;

function hero(overrides: Partial<TitleHeroInput> = {}): TitleHeroInput {
  return {
    heroIdentityKey: "hero-key-1",
    displayName: "Jeffrey Schneider",
    capabilities: ["adult"],
    availablePoseFamilies: ["standing-neutral"],
    availableFacings: ["front"],
    ...overrides,
  };
}

describe("title tableau resolution", () => {
  it("shows a banked no-character tableau when there is no hero", () => {
    const presentation = resolveTitlePresentation({ ...BASE, hero: null });
    expect(presentation.kind).toBe("neutral-tableau");
    expect(presentation.heroName).toBeNull();
    expect(presentation.tableau!.supportsNoCharacter).toBe(true);
  });

  it("puts an eligible, art-capable hero into a tableau", () => {
    const presentation = resolveTitlePresentation({ ...BASE, hero: hero() });
    expect(presentation.kind).toBe("hero-in-tableau");
    expect(presentation.tableau!.tableauId).toBe("civic-office-standing");
    expect(presentation.heroName).toBe("Jeffrey Schneider");
    expect(presentation.heroAnchorId).toBe("near-desk-standing");
    expect(presentation.scene!.sceneId).toBe("office-council-staff-fixture");
  });

  /**
   * The honesty rule, structurally. Capability tags are caller truth, so a
   * character whose life did not include an office cannot be shown at one, and
   * no argument this module could be passed would change that.
   */
  it("never offers a tableau the character's capabilities do not justify", () => {
    const ordinary = hero({ capabilities: ["adult"] });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const presentation = resolveTitlePresentation({
        ...BASE,
        hero: { ...ordinary, heroIdentityKey: `hero-${attempt}` },
      });
      expect(presentation.tableau?.requiredCapabilities ?? []).not.toContain(
        "office",
      );
      expect(presentation.tableau?.requiredCapabilities ?? []).not.toContain(
        "legislature",
      );
    }
  });

  it("gives a character with no qualifying capabilities the neutral bank", () => {
    const child = hero({ capabilities: [], displayName: "Ada Whitfield" });
    const presentation = resolveTitlePresentation({ ...BASE, hero: child });
    expect(presentation.kind).toBe("neutral-tableau");
    expect(presentation.heroName).toBe("Ada Whitfield");
    expect(presentation.reasons.join(" ")).toContain("capabilities (none)");
  });

  it("opens the office desk only to a character who has an office", () => {
    const staffer = hero({
      capabilities: ["adult", "office", "legislature"],
      availablePoseFamilies: ["seated-at-desk"],
      heroIdentityKey: "staffer-1",
    });
    const presentation = resolveTitlePresentation({ ...BASE, hero: staffer });
    expect(presentation.kind).toBe("hero-in-tableau");
    expect(presentation.tableau!.requiredPoseFamily).toBe("seated-at-desk");
  });

  /**
   * ACCEPTANCE: the fallback ladder never substitutes another person's
   * likeness. When the hero is entitled to a setting but has no art that can
   * pose for it, the setting is shown with a silhouette and their own name.
   */
  it("falls back to a silhouette rather than borrowing a likeness", () => {
    const noArt = hero({
      availablePoseFamilies: [],
      availableFacings: [],
      displayName: "Marion Ellis",
    });
    const presentation = resolveTitlePresentation({ ...BASE, hero: noArt });
    expect(presentation.kind).toBe("silhouette-in-tableau");
    expect(presentation.heroName).toBe("Marion Ellis");
    expect(presentation.description).toContain("Marion Ellis");
    expect(presentation.description).toContain("outline");
  });

  it("falls all the way to the typographic title when the bank is empty", () => {
    const presentation = resolveTitlePresentation({
      ...BASE,
      hero: null,
      registry: { tableaux: [], neutralBank: [] },
    });
    expect(presentation.kind).toBe("typographic");
    expect(presentation.tableau).toBeNull();
    expect(presentation.scene).toBeNull();
  });

  it("is stable for one hero and one library version", () => {
    const subject = hero({ heroIdentityKey: "stable-hero" });
    const first = resolveTitlePresentation({ ...BASE, hero: subject });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const again = resolveTitlePresentation({ ...BASE, hero: subject });
      expect(again.tableau?.tableauId).toBe(first.tableau?.tableauId);
    }
  });

  /**
   * When the library grows the title may change; the PERSON never does. A
   * pleasant surprise is acceptable, a different character is not.
   */
  it("may change tableau when the library grows, and never changes the person", () => {
    const subject = hero({
      capabilities: ["adult", "office", "legislature"],
      availablePoseFamilies: ["standing-neutral", "seated-at-desk"],
    });
    const first = resolveTitlePresentation({ ...BASE, hero: subject });
    const later = resolveTitlePresentation({
      ...BASE,
      hero: subject,
      assetLibraryVersion: "library-v9",
    });
    expect(later.heroName).toBe(first.heroName);
    expect(later.kind).toBe(first.kind);
  });

  it("writes player-facing copy that says what is on screen, not how it works", () => {
    const jargon = [
      "tableau",
      "asset",
      "tier",
      "registry",
      "capability",
      "capabilities",
      "anchor",
      "raster",
      "fixture",
      "seed",
      "recipe",
      "catalog",
      "fallback",
      "null",
    ];
    for (const subject of [
      null,
      hero(),
      hero({ capabilities: [] }),
      hero({ availablePoseFamilies: [], availableFacings: [] }),
    ]) {
      const presentation = resolveTitlePresentation({
        ...BASE,
        hero: subject,
      });
      const description = presentation.description.toLowerCase();
      for (const word of jargon) {
        expect(
          description,
          `${presentation.kind}: ${description}`,
        ).not.toContain(word);
      }
      expect(presentation.description.endsWith(".")).toBe(true);
    }
  });
});

describe("deterministic tableau selection", () => {
  const candidates = ["a", "b", "c", "d", "e"];

  it("returns the same choice for the same key", () => {
    const first = selectTableauDeterministically(
      candidates,
      "key-1",
      (value) => value,
    );
    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect(
        selectTableauDeterministically(candidates, "key-1", (value) => value),
      ).toBe(first);
    }
  });

  it("does not depend on the order candidates were supplied in", () => {
    const forwards = selectTableauDeterministically(
      candidates,
      "key-2",
      (value) => value,
    );
    const backwards = selectTableauDeterministically(
      [...candidates].reverse(),
      "key-2",
      (value) => value,
    );
    expect(backwards).toBe(forwards);
  });

  it("spreads different keys across the candidates", () => {
    const chosen = new Set(
      Array.from({ length: 60 }, (_, index) =>
        selectTableauDeterministically(
          candidates,
          `key-${index}`,
          (value) => value,
        ),
      ),
    );
    expect(chosen.size).toBeGreaterThan(1);
  });

  it("returns null rather than guessing when there is nothing to pick", () => {
    expect(
      selectTableauDeterministically([], "key", (value) => value),
    ).toBeNull();
  });
});
