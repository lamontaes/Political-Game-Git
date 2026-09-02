import { personName } from "../simulation/people";
import type { Person, World } from "../simulation/types";
import type { CharacterComponentLibrary } from "./character-components";
import { createCharacterProofWorld } from "./character-proof";
import {
  composeSceneCharacter,
  type SceneCharacterPresentation,
} from "./scene-composition";
import { sortPlacementsByDepth } from "./scene-placement";
import {
  COMMITTEE_FIXTURE_SCENE_ID,
  OFFICE_FIXTURE_SCENE_ID,
  requireScene,
  requireSceneAnchor,
  SCENE_REGISTRY,
  type RegisteredScene,
} from "./scene-registry";
import type { RuntimeVisualLibrary } from "./visual-integration";

/**
 * Developer proof for the scene and person presentation contract.
 *
 * Two scene purposes, several people, one compositor. The people are ordinary
 * generated people from a seeded world — they are DEV PROOF FIXTURES, not
 * biography — and each card says who is standing where, in what pose, and what
 * about them did not resolve.
 *
 * The two contexts are deliberately different: the office has fixture art and a
 * shallow floor ramp, the committee room has NO art at all and a much deeper
 * one. Between them they exercise seated and standing contacts, named
 * occluders, surface slots, footprint limits, and the honest no-plate path.
 */

export const SCENE_PROOF_SEED = "scene-presentation-proof-2026-09-02";

export interface SceneProofContext {
  readonly scene: RegisteredScene;
  /** Why this room is in the proof, in a sentence a reviewer can check. */
  readonly purpose: string;
  readonly characters: readonly SceneCharacterPresentation[];
}

export interface SceneProofComposition {
  readonly world: World;
  readonly contexts: readonly SceneProofContext[];
}

interface ProofPlacement {
  readonly anchorId: string;
  readonly personIndex: number;
}

const OFFICE_PLACEMENTS: readonly ProofPlacement[] = [
  { anchorId: "primary-desk-chair", personIndex: 0 },
  { anchorId: "left-guest-chair", personIndex: 1 },
  { anchorId: "near-desk-standing", personIndex: 2 },
  { anchorId: "doorway-standing", personIndex: 3 },
];

const COMMITTEE_PLACEMENTS: readonly ProofPlacement[] = [
  { anchorId: "witness-chair", personIndex: 1 },
  { anchorId: "member-seat-left", personIndex: 0 },
  { anchorId: "staff-standing-rear", personIndex: 2 },
];

function requirePerson(world: World, index: number): Person {
  const personId = world.personOrder[index];
  const person = personId ? world.people[personId] : undefined;
  if (!person?.appearance) {
    throw new Error(`Scene proof world is missing person ${index}.`);
  }
  return person;
}

export function createSceneProofWorld(
  library: CharacterComponentLibrary,
  seed = SCENE_PROOF_SEED,
): World {
  return createCharacterProofWorld(library, seed);
}

function composeContext(
  world: World,
  scene: RegisteredScene,
  purpose: string,
  placements: readonly ProofPlacement[],
  library: CharacterComponentLibrary,
  visualLibrary: RuntimeVisualLibrary,
): SceneProofContext {
  const characters = placements.map((placement) => {
    const person = requirePerson(world, placement.personIndex);
    return composeSceneCharacter({
      personId: person.id,
      displayName: personName(person),
      appearance: person.appearance!,
      scene,
      anchor: requireSceneAnchor(scene, placement.anchorId),
      library,
      visualLibrary,
    });
  });

  // Paint order comes from the floor, never from the order above.
  const order = sortPlacementsByDepth(
    characters.map((character) => character.placement),
  ).map((placement) => `${placement.subjectId}:${placement.anchorId}`);
  const sorted = [...characters].sort(
    (a, b) =>
      order.indexOf(`${a.personId}:${a.anchorId}`) -
      order.indexOf(`${b.personId}:${b.anchorId}`),
  );

  return { scene, purpose, characters: sorted };
}

export function composeSceneProof(
  world: World,
  library: CharacterComponentLibrary,
  visualLibrary: RuntimeVisualLibrary,
): SceneProofComposition {
  return {
    world,
    contexts: [
      composeContext(
        world,
        requireScene(SCENE_REGISTRY, OFFICE_FIXTURE_SCENE_ID),
        "An ordinary working office: two seated contacts against a desk, two standing contacts at different depths, and a named desk-front occluder in front of all of them.",
        OFFICE_PLACEMENTS,
        library,
        visualLibrary,
      ),
      composeContext(
        world,
        requireScene(SCENE_REGISTRY, COMMITTEE_FIXTURE_SCENE_ID),
        "A committee room with no plate yet: the same people, the same contracts, a much deeper floor ramp, three surface slots, and an honest empty background instead of a borrowed picture.",
        COMMITTEE_PLACEMENTS,
        library,
        visualLibrary,
      ),
    ],
  };
}
