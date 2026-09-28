import { describe, expect, it } from "vitest";
import type { BrowserWorldSummary } from "./browser-world-repository";
import type { EngineRecipe } from "./appearance-engine/pack";
import { SCENE_REGISTRY } from "./scene-registry";
import { titleEngineHero } from "./title-engine-hero";
import { titleHeroFromSaveSummary } from "./title-hero";
import {
  resolveTitlePresentation,
  TITLE_TABLEAU_REGISTRY,
} from "./title-tableau";

const look = (outfit: string): EngineRecipe => ({
  presentation: "feminine",
  build: "average",
  shade: 4,
  face: "50s-03",
  hair: "wavy-bob",
  hairColor: "gray",
  outfit,
});

function summary(
  overrides: Partial<BrowserWorldSummary> = {},
): BrowserWorldSummary {
  return {
    saveId: "save-1",
    worldId: "world-1",
    snapshotId: "snapshot-1",
    snapshotFormatVersion: 1,
    worldSchemaVersion: 1,
    worldGeneratorVersion: "test",
    playerPersonId: "person_title_hero",
    playerName: "Dawn Willard",
    playerAge: 52,
    residence: { jurisdictionId: "us-ky-lexington", name: "Lexington" },
    currentMoment: {
      day: 0,
      minute: 0,
    } as unknown as BrowserWorldSummary["currentMoment"],
    actionSequence: 0,
    createdAt: "2026-01-05T00:00:00.000Z",
    savedAt: "2026-01-05T00:00:00.000Z",
    lastPlayedAt: "2026-01-05T00:00:00.000Z",
    ...overrides,
  } as BrowserWorldSummary;
}

const presentationFor = (save: BrowserWorldSummary) =>
  resolveTitlePresentation({
    hero: titleHeroFromSaveSummary(save),
    assetLibraryVersion: "test",
    registry: TITLE_TABLEAU_REGISTRY,
    scenes: SCENE_REGISTRY,
  });

describe("the title's hero, drawn by the people engine", () => {
  it("stands the returning player in a civic room, dressed for it, feet on the floor line", () => {
    const save = summary({
      playerLooks: {
        casual: look("cardigan-jeans"),
        business: look("blouse-skirt"),
        formal: look("skirt-suit"),
      },
    });
    const presentation = presentationFor(save);
    expect(presentation.kind).toBe("hero-in-tableau");
    const hero = titleEngineHero(presentation, save)!;
    expect(hero).not.toBeNull();
    expect(hero.anchorId).toBe(presentation.heroAnchorId);
    // The title is civic (Lamontae, Sept. 27): she speaks at a hearing, and
    // a hearing room is a formal place.
    expect(presentation.scene?.sceneId).toBe("civic-hearing-room-production");
    expect(hero.engine?.outfit).toBe("skirt-suit");
    const anchor = presentation.scene!.anchors.get(hero.anchorId)!;
    expect(hero.topPercent + hero.heightPercent).toBeCloseTo(
      anchor.contactFloorYPercent,
      6,
    );
    expect(hero.leftPercent + hero.widthPercent / 2).toBeCloseTo(
      anchor.xPercent,
      6,
    );
  });

  it("keeps the old outline when the save carries no look", () => {
    const save = summary();
    const presentation = presentationFor(save);
    expect(presentation.kind).toBe("silhouette-in-tableau");
    expect(titleEngineHero(presentation, save)).toBeNull();
  });
});
