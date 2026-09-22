/** Build-time exercise of the same selectors mounted in ordinary player UI.
 * This describes configured consumers, never what a particular saved person
 * wears, and never promotes a candidate or writes a World. */
import { SCENE_REGISTRY, DOMESTIC_SCENE_IDS } from "./scene-registry";
import { SCENE_VENUES } from "./scene-venues";
import { TITLE_TABLEAU_REGISTRY } from "./title-tableau";
import { PRODUCTION_VISUAL_LIBRARY } from "./visual-integration";
import { artPreviewLibraries } from "./art-preview";
import { listPersonVisualSelections } from "./person-visual-selection";
import { componentsAtGeneration } from "./character-components";
import { buildCharacterRenderPlan } from "./character-render-plan";
import {
  defaultPreparedMaterial,
  preparedFamily,
} from "./engine-people29-data";
import {
  findCompleteOutfit,
  resolveCompleteOutfit,
  OUTFIT_KINDS,
} from "./complete-outfit";
import type { PersonAppearance } from "../simulation/types";

export interface ConfiguredArtConsumer {
  readonly assetId: string;
  readonly labels: readonly string[];
  readonly eligible: readonly string[];
  readonly hash?: string;
  readonly path?: string;
}

export function configuredArtConsumers(privateReview: boolean) {
  const consumers: ConfiguredArtConsumer[] = [];
  const gaps: string[] = [];
  const scenes = new Map<string, Set<string>>();
  const addScene = (id: string, label: string) => {
    const scene = SCENE_REGISTRY.scenes.get(id);
    if (!scene?.raster || !PRODUCTION_VISUAL_LIBRARY.has(scene.raster.assetId))
      return;
    const labels = scenes.get(id) ?? new Set<string>();
    labels.add(label);
    scenes.set(id, labels);
  };
  for (const id of DOMESTIC_SCENE_IDS) addScene(id, "Home · room backdrop");
  for (const venue of SCENE_VENUES)
    if (venue.sceneId && !venue.isJourney)
      addScene(venue.sceneId, "Scheduled activity · room backdrop");
  for (const tableau of [
    ...TITLE_TABLEAU_REGISTRY.tableaux,
    ...TITLE_TABLEAU_REGISTRY.neutralBank,
  ])
    addScene(tableau.sceneId, "Title screen · room backdrop");
  for (const [id, labels] of scenes) {
    const scene = SCENE_REGISTRY.scenes.get(id)!;
    consumers.push({
      assetId: scene.raster!.assetId,
      labels: [...labels].map((label) => `${label} · ${scene.label}`),
      eligible: [],
    });
    for (const occluder of scene.occluders)
      if (occluder.assetId && PRODUCTION_VISUAL_LIBRARY.has(occluder.assetId))
        consumers.push({
          assetId: occluder.assetId,
          labels: [`Room foreground · ${scene.label}`],
          eligible: [],
        });
  }
  if (!privateReview)
    return { consumers, gaps, generation: null, completePlans: 0 };
  const libraries = artPreviewLibraries("candidate-review");
  if (!libraries || libraries.unavailableReason)
    throw new Error(
      "Cannot verify configured character consumers without the private character library.",
    );
  const { characters: library, visuals } = libraries;
  const generation = library.catalogGeneration;
  const base: PersonAppearance = {
    seed: "compiled-consumer-audit",
    recipeVersion: "appearance-recipe-v2",
    catalogGeneration: generation,
  };
  const context = { library, poseFamily: "standing-neutral" };
  const available = componentsAtGeneration(library, generation);
  // The fresh-life constructor selects the latest prepared body generation.
  // Narrow before calling the real dependent choice resolver; historical
  // catalog bodies are not a reason to enumerate their cross-product.
  const bodies = available.filter(
    (part) =>
      part.definition.kind === "body" &&
      part.definition.pose_family === "standing-neutral" &&
      preparedFamily(part.definition.family),
  );
  // No prepared body at all means this checkout has no private candidate pack
  // to compose from — the ordinary case on a public runner, which is forbidden
  // to contain one. That is an absence of material, not a failed verification,
  // and the two must not share an outcome: reporting it as a failure made the
  // art-review build red everywhere the pack is missing, which is everywhere
  // except the owner's Mac. Where a pack IS present, a composition that cannot
  // be completed still throws below, because there the material exists and the
  // renderer's inability to use it is exactly what this audit is for.
  if (!bodies.length) {
    gaps.push(
      "No prepared standing body in the candidate library: this checkout has no private character pack, so no creator composition was verified here.",
    );
    return { consumers, gaps, generation, completePlans: 0 };
  }
  // Math.max of an empty list is -Infinity, which would match no generation and
  // leave every later step silently empty rather than saying why.
  const newestBodyGeneration = Math.max(
    ...bodies.map((part) => part.definition.catalog_generation),
  );
  const bodyFamilies = [
    ...new Set(
      bodies
        .filter(
          (part) => part.definition.catalog_generation === newestBodyGeneration,
        )
        .map((part) => part.definition.family),
    ),
  ];
  const choices = bodyFamilies.flatMap((bodyFamily) =>
    listPersonVisualSelections({
      ...context,
      appearance: base,
      selectionFilter: { bodyFamily },
    }),
  );
  const wardrobeChecked = new Set<string>();
  const usage = new Map<
    string,
    { labels: Set<string>; eligible: Set<string> }
  >();
  let completePlans = 0;
  for (const choice of choices) {
    const family = preparedFamily(choice.selection.bodyFamily);
    // The mounted prepared-body creator does not offer the legacy baked bodies.
    if (!family) continue;
    const appearance: PersonAppearance = {
      ...base,
      selection: choice.selection,
      material: defaultPreparedMaterial(family, generation),
    };
    const outfit = findCompleteOutfit({ appearance, ...context });
    if (!outfit.ok) {
      gaps.push(
        `No complete creator outfit: ${choice.selection.bodyFamily}/${choice.selection.headFamily}/${choice.selection.hairFamily ?? "none"}`,
      );
      continue;
    }
    const outfits = [outfit.families];
    // One complete body/head/hair composition proves each wardrobe part's
    // configured consumer. Other identity choices still pass a full renderer.
    if (!wardrobeChecked.has(choice.selection.bodyFamily)) {
      wardrobeChecked.add(choice.selection.bodyFamily);
      for (const kind of OUTFIT_KINDS) {
        const candidates = available.filter(
          (part) =>
            part.definition.kind === kind &&
            part.definition.pose_family === context.poseFamily &&
            !part.definition.render_piece_of &&
            (!part.definition.compatible_body_families ||
              part.definition.compatible_body_families.includes(
                choice.selection.bodyFamily,
              )),
        );
        for (const selected of new Set(
          candidates.map((part) => part.definition.family),
        )) {
          if (selected === outfit.families[kind]) continue;
          const changed = { ...outfit.families, [kind]: selected };
          if (
            resolveCompleteOutfit({ appearance, ...context, families: changed })
              .ok
          )
            outfits.push(changed);
        }
      }
    }
    for (const families of outfits) {
      const drawn = buildCharacterRenderPlan({
        personId: "presentation:compiled-consumer-audit",
        appearance: {
          ...appearance,
          outfit: { version: "complete-outfit-v1", families },
        },
        library,
        visualLibrary: visuals,
        plate: { width: 600, height: 1200 },
        anchor: {
          id: "creator-preview",
          xPercent: 50,
          yPercent: 50,
          scale: 1,
          poseFamily: "standing-neutral",
          depth: 1,
          bodyWidthPercent: 90,
        },
      });
      if (
        !drawn.complete ||
        drawn.layers.some(
          (layer) =>
            !layer.url || library.components.get(layer.assetId)?.fixture,
        )
      )
        continue;
      completePlans++;
      for (const layer of drawn.layers) {
        const row = usage.get(layer.assetId) ?? {
          labels: new Set<string>(),
          eligible: new Set<string>(),
        };
        const slot = layer.kind.replace(/-/g, " ");
        row.labels.add(`Character creator · ${slot}`);
        // SavedPersonFigure uses this exact same standing plan in People and
        // the opening. This is a configured slot, not a claim of NPC clothing.
        row.labels.add(`People and opening figures · ${slot}`);
        row.eligible.add(
          `${family.geometry.presentation} ${family.bodyType.endsWith("heavy") ? "fuller" : family.bodyType.endsWith("lean") ? "slim" : "balanced"} · standing`,
        );
        usage.set(layer.assetId, row);
      }
    }
  }
  if (!completePlans)
    throw new Error(
      "No complete configured creator compositions could be verified.",
    );
  for (const [assetId, value] of usage)
    consumers.push({
      assetId,
      labels: [...value.labels],
      eligible: [...value.eligible],
    });
  return { consumers, gaps, generation, completePlans };
}
