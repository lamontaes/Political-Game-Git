import { deserializeWorld } from "../simulation";
import type { Person } from "../simulation";
import type {
  BrowserWorldSummary,
  StoredBrowserWorldRecord,
} from "./browser-world-repository";
import type { StoredShellState } from "./browser-shell-state";
import type { ArtPreviewLibraries } from "./art-preview";
import type { PlacedScenePerson } from "./life-scene-people";
import { createPersonRenderSnapshot } from "./person-render-snapshot";
import { composeTitleLectern } from "./title-lectern-pose";
import { TITLE_LECTERN_SCENE } from "./title-lectern-scene";
import { resolvePersonWardrobeContext } from "./person-visual-selection";
import { titleHeroFromSaveSummary, visualLibraryVersion } from "./title-hero";
import {
  resolveTitlePresentation,
  TITLE_TABLEAU_REGISTRY,
  type TitlePresentation,
} from "./title-tableau";
import { SCENE_REGISTRY } from "./scene-registry";
import { PRODUCTION_VISUAL_LIBRARY } from "./visual-integration";

export interface SavedTitleHero {
  readonly presentation: TitlePresentation;
  readonly person: PlacedScenePerson | null;
  readonly refusal: string | null;
}

/** Read-only identity check. Never call store.load: it updates lastPlayedAt. */
export function titlePersonFromRecord(
  summary: BrowserWorldSummary,
  record: StoredBrowserWorldRecord | null,
): Person | null {
  if (
    !record ||
    record.saveId !== summary.saveId ||
    record.metadata.snapshotId !== summary.snapshotId
  )
    return null;
  const world = deserializeWorld(record.payload);
  if (
    world.id !== summary.worldId ||
    world.control.kind !== "person" ||
    world.control.personId !== summary.playerPersonId
  )
    return null;
  return world.people[summary.playerPersonId] ?? null;
}

/** Title staging only. The existing capability policy remains authoritative. */
export function composeSavedTitleHero(
  summary: BrowserWorldSummary | undefined,
  person: Person | null,
  shell: StoredShellState | null,
  libraries: ArtPreviewLibraries | null,
): SavedTitleHero {
  const hero = titleHeroFromSaveSummary(summary);
  const base = {
    assetLibraryVersion: visualLibraryVersion(PRODUCTION_VISUAL_LIBRARY),
    registry: TITLE_TABLEAU_REGISTRY,
    scenes: SCENE_REGISTRY,
  };
  const fallback = (refusal: string | null): SavedTitleHero => ({
    presentation: resolveTitlePresentation({
      ...base,
      hero,
      registry: { ...TITLE_TABLEAU_REGISTRY, tableaux: [] },
    }),
    person: null,
    refusal,
  });
  if (!hero || !summary) return fallback(null);
  if (!libraries) return fallback("private-preview-required");
  if (!person?.appearance || person.id !== summary.playerPersonId)
    return fallback("saved-appearance-unavailable");
  // User-authorized 2026-09-14 interpretation: a labeled nonhistorical portrait.
  // This tag belongs only to title presentation; it proves no public role.
  const tableau = {
    tableauId: "title41-community-portrait",
    familyId: "civic-community-meeting",
    label: "A community hall",
    sceneId: TITLE_LECTERN_SCENE.sceneId,
    heroAnchorId: "title41-speaker",
    requiredPoseFamily: "standing-podium-or-lectern",
    requiredFacing: "three-quarter-right",
    requiredCapabilities: ["adult", "labeled-title-portrait"],
    supportsNoCharacter: false,
    emptyHeroTreatment: "neutral front door",
  };
  try {
    const preference = shell?.personWardrobes?.[person.id];
    const wardrobe = preference
      ? resolvePersonWardrobeContext(person, preference, {
          library: libraries.characters,
          poseFamily: "standing-neutral",
        })
      : undefined;
    const snapshot = createPersonRenderSnapshot({
      personId: person.id,
      appearance: person.appearance,
      wardrobe,
      library: libraries.characters,
    });
    const drawing = composeTitleLectern(
      snapshot.recipeForPose("standing-neutral"),
      person.appearance,
      person.id,
      summary.playerName,
    );
    const requested = resolveTitlePresentation({
      ...base,
      registry: { ...TITLE_TABLEAU_REGISTRY, tableaux: [tableau] },
      scenes: {
        ...SCENE_REGISTRY,
        scenes: new Map([
          ...SCENE_REGISTRY.scenes,
          [TITLE_LECTERN_SCENE.sceneId, TITLE_LECTERN_SCENE],
        ]),
      },
      hero: {
        ...hero,
        capabilities: [...hero.capabilities, "labeled-title-portrait"],
        availablePoseFamilies: drawing ? [tableau.requiredPoseFamily] : [],
        availableFacings: drawing ? [tableau.requiredFacing] : [],
      },
    });
    if (!drawing || requested.kind !== "hero-in-tableau")
      return fallback("unsupported-or-ineligible-lectern-portrait");
    return { presentation: requested, person: drawing, refusal: null };
  } catch (error) {
    return fallback(`unsupported-saved-appearance:${String(error)}`);
  }
}
