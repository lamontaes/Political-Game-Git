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
    capabilities: ["adult", "residence-known"],
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
    expect(presentation.heroName).toBe("Jeffrey Schneider");
    expect(presentation.scene!.presentationStatus).toBe("production");
    expect(presentation.tableau!.familyId).toBe("apartment-ordinary");
    expect(presentation.heroAnchorId).toBe(presentation.tableau!.heroAnchorId);
  });

  /**
   * THE ANTI-UNIVERSAL-OFFICE ASSERTION.
   *
   * An adult with a saved game used to resolve to the Lexington council staff
   * office — a room with a Fayette County map on its wall — because it was the
   * only tableau in the bank. No capability a title screen can know justifies
   * that room, so it is not in the registry at all, and this walks every
   * reachable title for every capability set a save summary can produce to
   * prove no path reaches it.
   */
  it("never shows jurisdiction-specific office art on the title", () => {
    const capabilitySets = [
      [],
      ["adult"],
      ["residence-known"],
      ["adult", "residence-known"],
      ["adult", "residence-known", "office"],
      ["adult", "residence-known", "office", "legislature"],
    ];
    for (const capabilities of capabilitySets) {
      for (let attempt = 0; attempt < 25; attempt += 1) {
        const presentation = resolveTitlePresentation({
          ...BASE,
          hero: hero({ capabilities, heroIdentityKey: `walk-${attempt}` }),
        });
        expect(presentation.scene?.sceneId ?? "").not.toBe(
          "office-council-staff-fixture",
        );
        for (const tier of presentation.scene?.raster?.ladder.tiers ?? []) {
          expect(tier.path).not.toContain("lexington");
        }
      }
    }
    const noHero = resolveTitlePresentation({ ...BASE, hero: null });
    expect(noHero.scene?.sceneId).not.toBe("office-council-staff-fixture");
  });

  /**
   * The front door is the same room every time. A no-save title that picked a
   * different room per library version would still be deterministic and still
   * be wrong: it is the first thing anyone sees of this game.
   */
  it("shows the same room every time there is no saved game", () => {
    for (const version of ["library-v1", "library-v2", "library-v9"]) {
      const presentation = resolveTitlePresentation({
        ...BASE,
        hero: null,
        assetLibraryVersion: version,
      });
      expect(presentation.tableau!.tableauId).toBe(
        TITLE_TABLEAU_REGISTRY.frontDoorTableauId,
      );
      expect(presentation.scene!.raster).not.toBeNull();
    }
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

  it("opens the hearing room only to a character who sits in a legislature", () => {
    const legislator = hero({
      capabilities: ["adult", "residence-known", "legislature"],
      availablePoseFamilies: ["standing-podium-or-lectern"],
      heroIdentityKey: "legislator-1",
    });
    const presentation = resolveTitlePresentation({
      ...BASE,
      hero: legislator,
    });
    expect(presentation.kind).toBe("hero-in-tableau");
    expect(presentation.tableau!.tableauId).toBe("before-a-hearing");

    // The same person without the legislative capability cannot reach it,
    // however many times the chooser is asked.
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const ordinary = resolveTitlePresentation({
        ...BASE,
        hero: hero({
          availablePoseFamilies: ["standing-podium-or-lectern"],
          heroIdentityKey: `ordinary-${attempt}`,
        }),
      });
      expect(ordinary.tableau!.tableauId).not.toBe("before-a-hearing");
    }
  });

  /**
   * A character is never put at a lectern in front of an audience because the
   * art has a lectern in it. The community hall is banked for its empty state
   * only, and no capability set promotes it into a hero tableau.
   */
  it("keeps the community meeting hall empty of the player", () => {
    for (const capabilities of [
      ["adult", "residence-known"],
      ["adult", "residence-known", "office"],
      ["adult", "residence-known", "office", "legislature"],
    ]) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const presentation = resolveTitlePresentation({
          ...BASE,
          hero: hero({
            capabilities,
            availablePoseFamilies: [
              "standing-neutral",
              "standing-podium-or-lectern",
            ],
            heroIdentityKey: `speaker-${attempt}`,
          }),
        });
        if (presentation.scene?.sceneId === "civic-community-meeting-title") {
          expect(presentation.kind).toBe("neutral-tableau");
        }
      }
    }
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
      capabilities: ["adult", "residence-known", "legislature"],
      availablePoseFamilies: ["standing-neutral", "standing-podium-or-lectern"],
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

  /**
   * Labels are sentence PARTS. The resolver completes them into "<label> with
   * nobody in it." and "<label> with <name> in it.", so a label that already
   * describes the room's state produces "a living room with nobody in it with
   * nobody in it" — which is exactly what the first wired title screen said.
   */
  it("builds copy from labels without saying anything twice", () => {
    const everyTableau = [
      ...TITLE_TABLEAU_REGISTRY.tableaux,
      ...TITLE_TABLEAU_REGISTRY.neutralBank,
    ];
    for (const tableau of everyTableau) {
      expect(tableau.label, tableau.tableauId).not.toMatch(
        /\bwith\b|\bnobody\b|\bempty\b|\bin it\b/i,
      );
    }

    for (const subject of [
      null,
      hero(),
      hero({ capabilities: [] }),
      hero({ availablePoseFamilies: [], availableFacings: [] }),
    ]) {
      const { description } = resolveTitlePresentation({
        ...BASE,
        hero: subject,
      });
      const words = description.toLowerCase().replace(/[.,]/g, "").split(" ");
      for (let index = 0; index + 5 < words.length; index += 1) {
        const phrase = words.slice(index, index + 3).join(" ");
        const next = words.slice(index + 3, index + 6).join(" ");
        expect(next, description).not.toBe(phrase);
      }
    }
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
      hero({ capabilities: ["adult", "residence-known", "legislature"] }),
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
