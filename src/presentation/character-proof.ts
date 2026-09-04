import { createGeneratedWorld } from "../simulation/demo";
import { personName } from "../simulation/people";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, Person, World } from "../simulation/types";
import type { CharacterComponentLibrary } from "./character-components";
import {
  buildCharacterRenderPlan,
  type CharacterRenderPlan,
  type ModularSceneAnchor,
} from "./character-render-plan";
import type { StorageLike } from "./run-a-learning";
import type { SceneCameraPolicy, SceneSize } from "./scene-transform";
import type { RuntimeVisualLibrary } from "./visual-integration";

/**
 * Developer proof: four generated people from one seeded world rendered
 * through the shared modular compositor, plus the first person shown again in
 * a second scene/pose. Presentation-owned; the World is ordinary simulation
 * truth and is never written by the proof.
 */

/**
 * Chosen so the first four generated people recombine shared components with
 * two head families, two hairstyles, two tops, and an optional eyewear layer
 * present on exactly one of them.
 */
export const CHARACTER_PROOF_SEED = "modular-character-proof-2026-09-01-4";

/**
 * Real-asset proof seed: the first four generated people recombine both
 * Political Game body families, three head masters, two Black hairstyles,
 * three tops, and three bottoms from the banked production candidates.
 *
 * The `real` set is a REVIEW surface. Its people are composed from the
 * candidate review library, never from the production catalog, because these
 * parts have deliberately not been promoted — see
 * `CANDIDATE_REVIEW_CHARACTER_LIBRARY`.
 */
export const CHARACTER_PROOF_REAL_SEED = "pg-real-character-proof-2026-09-01-3";

export type CharacterProofSetId = "dev" | "real";

export interface CharacterProofSet {
  readonly id: CharacterProofSetId;
  readonly label: string;
  readonly seed: string;
  /** Catalog generation the proof people are pinned to; null = library current. */
  readonly catalogGeneration: number | null;
}

/**
 * The DEV set stays pinned to generation 1 so the procedural fixtures remain
 * a stable regression surface after real components arrive in generation 2.
 */
export const CHARACTER_PROOF_SETS: Readonly<
  Record<CharacterProofSetId, CharacterProofSet>
> = {
  dev: {
    id: "dev",
    label: "DEV / NON-PRODUCTION fixtures (current catalog)",
    seed: CHARACTER_PROOF_SEED,
    catalogGeneration: null,
  },
  real: {
    id: "real",
    label: "Banked production candidates — NOT in any catalog",
    seed: CHARACTER_PROOF_REAL_SEED,
    catalogGeneration: null,
  },
};

export const CHARACTER_PROOF_SNAPSHOT_STORAGE_KEY =
  "political-game:character-proof:snapshot:v1";

export function characterProofSnapshotKey(setId: CharacterProofSetId): string {
  return setId === "dev"
    ? CHARACTER_PROOF_SNAPSHOT_STORAGE_KEY
    : `political-game:character-proof:${setId}:snapshot:v1`;
}

export interface CharacterProofSceneConfiguration {
  readonly plate: SceneSize;
  readonly camera: SceneCameraPolicy;
  readonly stageAnchors: readonly ModularSceneAnchor[];
  readonly sideAnchor: ModularSceneAnchor;
}

/**
 * Same virtual plate and camera policy as the accepted office so the proof
 * exercises the identical transform path. The stage is a neutral CSS ground
 * with no raster; anchors are visual estimates for this fixture only.
 */
export const CHARACTER_PROOF_SCENE: CharacterProofSceneConfiguration = {
  plate: { width: 1024, height: 572 },
  camera: {
    minimumAspectRatio: 1.5,
    maximumAspectRatio: 12 / 5,
    horizontalFocus: 0.5,
    verticalFocus: 0.75,
  },
  stageAnchors: [
    {
      id: "stage-1",
      xPercent: 16,
      yPercent: 62,
      scale: 1,
      poseFamily: "standing-neutral",
      depth: 2,
      bodyWidthPercent: 20,
    },
    {
      id: "stage-2",
      xPercent: 38.5,
      yPercent: 62,
      scale: 1,
      poseFamily: "standing-neutral",
      depth: 2,
      bodyWidthPercent: 20,
    },
    {
      id: "stage-3",
      xPercent: 61,
      yPercent: 62,
      scale: 1,
      poseFamily: "standing-neutral",
      depth: 2,
      bodyWidthPercent: 20,
    },
    {
      id: "stage-4",
      xPercent: 83.5,
      yPercent: 62,
      scale: 1,
      poseFamily: "standing-neutral",
      depth: 2,
      bodyWidthPercent: 20,
    },
  ],
  sideAnchor: {
    id: "side-seated",
    xPercent: 50,
    yPercent: 66,
    scale: 1,
    poseFamily: "seated-at-desk",
    depth: 2,
    bodyWidthPercent: 22,
  },
};

export type CharacterProofWorldSource = "fresh" | "restored-snapshot";

export function createCharacterProofWorld(
  library: CharacterComponentLibrary,
  seed = CHARACTER_PROOF_SEED,
  catalogGeneration: number | null = null,
): World {
  return createGeneratedWorld(seed, {
    appearanceCatalogGeneration: catalogGeneration ?? library.catalogGeneration,
  });
}

export function createCharacterProofSetWorld(
  library: CharacterComponentLibrary,
  set: CharacterProofSet,
): World {
  return createCharacterProofWorld(library, set.seed, set.catalogGeneration);
}

export function saveCharacterProofSnapshot(
  storage: StorageLike,
  world: World,
  setId: CharacterProofSetId = "dev",
): void {
  storage.setItem(characterProofSnapshotKey(setId), serializeWorld(world));
}

export function loadCharacterProofSnapshot(
  storage: StorageLike,
  setId: CharacterProofSetId = "dev",
): World | null {
  const payload = storage.getItem(characterProofSnapshotKey(setId));
  if (!payload) return null;
  try {
    return deserializeWorld(payload);
  } catch {
    return null;
  }
}

export function clearCharacterProofSnapshot(
  storage: { removeItem(key: string): void },
  setId: CharacterProofSetId = "dev",
): void {
  storage.removeItem(characterProofSnapshotKey(setId));
}

export interface CharacterProofCharacter {
  readonly person: Person;
  readonly name: string;
  readonly plan: CharacterRenderPlan;
}

export interface CharacterProofComposition {
  readonly stage: readonly CharacterProofCharacter[];
  readonly side: CharacterProofCharacter;
}

function requireProofPerson(world: World, index: number): Person {
  const personId: EntityId | undefined = world.personOrder[index];
  const person = personId ? world.people[personId] : undefined;
  if (!person?.appearance) {
    throw new Error(`Character proof world is missing person ${index}.`);
  }
  return person;
}

export function composeCharacterProof(
  world: World,
  library: CharacterComponentLibrary,
  visualLibrary: RuntimeVisualLibrary,
  scene: CharacterProofSceneConfiguration = CHARACTER_PROOF_SCENE,
): CharacterProofComposition {
  const stage = scene.stageAnchors.map((anchor, index) => {
    const person = requireProofPerson(world, index);
    return {
      person,
      name: personName(person),
      plan: buildCharacterRenderPlan({
        personId: person.id,
        appearance: person.appearance!,
        anchor,
        plate: scene.plate,
        library,
        visualLibrary,
      }),
    };
  });
  const sidePerson = requireProofPerson(world, 0);
  const side = {
    person: sidePerson,
    name: personName(sidePerson),
    plan: buildCharacterRenderPlan({
      personId: sidePerson.id,
      appearance: sidePerson.appearance!,
      anchor: scene.sideAnchor,
      plate: scene.plate,
      library,
      visualLibrary,
    }),
  };
  return { stage, side };
}

export interface ComponentReuseRow {
  readonly assetId: string;
  readonly kind: string;
  readonly usedBy: readonly string[];
}

/** Which characters share which released components; proves recombination. */
export function summarizeComponentReuse(
  characters: readonly CharacterProofCharacter[],
): readonly ComponentReuseRow[] {
  const rows = new Map<string, { kind: string; usedBy: string[] }>();
  for (const character of characters) {
    for (const layer of character.plan.layers) {
      const row = rows.get(layer.assetId) ?? { kind: layer.kind, usedBy: [] };
      row.usedBy.push(character.plan.anchorId);
      rows.set(layer.assetId, row);
    }
  }
  return [...rows.entries()]
    .map(([assetId, row]) => ({ assetId, kind: row.kind, usedBy: row.usedBy }))
    .sort((a, b) => (a.assetId < b.assetId ? -1 : 1));
}
