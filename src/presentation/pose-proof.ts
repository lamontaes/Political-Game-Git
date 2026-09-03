import { personName } from "../simulation/people";
import type { Person, World } from "../simulation/types";
import {
  projectCharacterLayers,
  type CharacterComponentKind,
  type CharacterComponentLibrary,
  type CharacterContactPoint,
  type CharacterRecipe,
} from "./character-components";
import { resolvePersonCharacterRecipe } from "./character-render-plan";
import {
  poseControlPlateViewport,
  projectOntoPoseControlPlate,
} from "./pose-control-plate";
import {
  reportPoseCoverage,
  resolvePoseForRequest,
  type PoseArtIndex,
  type PoseCoverageReport,
  type PoseFamilyDefinition,
  type PoseFamilyRegistry,
  type PoseGap,
} from "./pose-families";
import type { RuntimeVisualLibrary } from "./visual-integration";

/**
 * Developer proof for the pose contract.
 *
 * The same people, the same identity recipe, every registered pose family. It
 * answers four questions a reviewer must be able to check by looking:
 *
 * 1. does changing pose leave the person's identity alone;
 * 2. does the body art actually land on the pose family's declared contacts;
 * 3. when a pose has no art, does the surface say exactly what is missing
 *    instead of drawing somebody else's picture;
 * 4. does the structural control plate describe the same posture the composed
 *    body is in.
 *
 * It is composition only: no React, no DOM, no scene. The proof view renders
 * it beside the scene proof, which owns rooms and placement.
 */

export interface PoseProofMarker {
  readonly id: string;
  readonly xPercent: number;
  readonly yPercent: number;
}

export interface PoseProofLayer {
  readonly assetId: string;
  readonly kind: CharacterComponentKind;
  readonly slotId: string;
  readonly layer: number;
  readonly url: string | null;
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
}

export interface PoseProofCell {
  readonly poseFamily: PoseFamilyDefinition;
  /**
   * Aspect ratio (width / height) of the box the body layers and body markers
   * below are expressed in. It is the union of every layer and the body canvas,
   * so a head drawn above the body canvas is inside the box rather than clipped,
   * and a percentage overlay lands exactly where the art does.
   */
  readonly bodyBoxAspectRatio: number;
  /** Aspect ratio of the rendered control plate, including the skull it adds. */
  readonly plateAspectRatio: number;
  /** Ordered by layer ascending; empty when this pose has no art. */
  readonly layers: readonly PoseProofLayer[];
  /** Pelvis root and contacts the RESOLVED BODY declares, in its own canvas. */
  readonly bodyMarkers: readonly PoseProofMarker[];
  /** Contacts the POSE FAMILY declares, projected onto the control plate. */
  readonly plateContactMarkers: readonly PoseProofMarker[];
  /** Every landmark the pose family declares, projected onto its plate. */
  readonly plateLandmarkMarkers: readonly PoseProofMarker[];
  /** Component IDs resolved but not runtime eligible. */
  readonly unreleasedAssetIds: readonly string[];
  /** Required slots this pose could not fill. */
  readonly missingSlotIds: readonly string[];
  /** Why this pose could not be drawn for this person, named. */
  readonly gaps: readonly PoseGap[];
  /**
   * Whether the body art's own contacts agree with the pose family's declared
   * contacts, within the family's tolerance. Null when either side has none.
   */
  readonly contactsAgree: boolean | null;
  /** True when a body resolved and every layer is runtime eligible. */
  readonly drawn: boolean;
  /** The body component actually drawn, or null when none resolved. */
  readonly bodyAssetId: string | null;
  /**
   * True when the resolved body declares no contacts of its own AND its body
   * family is recorded in the registry's legacy exemption. A `contactsAgree`
   * of null is only acceptable in that case; anywhere else it is a contract
   * hole rather than a known compromise.
   */
  readonly bodyIsLegacyContactless: boolean;
}

export interface PoseProofPerson {
  readonly personId: string;
  readonly displayName: string;
  readonly bodyFamily: string;
  readonly headFamily: string;
  readonly complexion: string | null;
  /**
   * Stable identity key. Equal across every cell below, which is the proof
   * that changing pose does not reroll a person.
   */
  readonly identityKey: string;
  readonly cells: readonly PoseProofCell[];
}

export interface PoseProofComposition {
  readonly people: readonly PoseProofPerson[];
  readonly coverage: PoseCoverageReport;
  /** True when every person's identity key is stable across their own cells. */
  readonly identityStable: boolean;
}

function identityKey(recipe: CharacterRecipe): string {
  const slots = Object.keys(recipe.identity.slots)
    .sort()
    .map((slotId) => `${slotId}=${recipe.identity.slots[slotId] ?? "-"}`)
    .join(",");
  return `${recipe.identity.bodyFamily}|${recipe.identity.headFamily}|${recipe.identity.complexion ?? "-"}|${slots}`;
}

function agree(
  a: CharacterContactPoint | undefined,
  b: CharacterContactPoint | undefined,
  tolerance: number,
): boolean | null {
  if (a === undefined || b === undefined) return null;
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

function composeCell(
  appearance: Person["appearance"],
  poseFamily: PoseFamilyDefinition,
  bodyFamily: string,
  library: CharacterComponentLibrary,
  visualLibrary: RuntimeVisualLibrary,
  registry: PoseFamilyRegistry,
  art: PoseArtIndex,
): PoseProofCell {
  const plateContactMarkers: PoseProofMarker[] = [];
  for (const key of ["seatedPelvis", "leftFoot", "rightFoot"] as const) {
    const point = poseFamily.contacts[key];
    if (!point) continue;
    plateContactMarkers.push({
      id: key,
      ...projectOntoPoseControlPlate(poseFamily, point),
    });
  }
  const plateLandmarkMarkers = Object.keys(poseFamily.landmarks)
    .sort()
    .map((id) => ({
      id,
      ...projectOntoPoseControlPlate(poseFamily, poseFamily.landmarks[id]!),
    }));

  // The proof asks for exactly this pose, so the resolver's answer is the
  // honest availability check rather than a scene's preference order.
  const resolution = resolvePoseForRequest(
    {
      anchorId: `pose-proof:${poseFamily.pose_family_id}`,
      permittedPoseFamilies: [poseFamily.pose_family_id],
      permittedFacings: [poseFamily.facing],
      hasSeatContact: poseFamily.posture_class === "seated",
      bodyFamily,
    },
    registry,
    art,
  );

  const plateViewport = poseControlPlateViewport(poseFamily);
  const plateAspectRatio = plateViewport.width / plateViewport.viewHeight;

  const empty = {
    poseFamily,
    bodyBoxAspectRatio:
      poseFamily.nominal_canvas.width / poseFamily.nominal_canvas.height,
    plateAspectRatio,
    layers: [] as readonly PoseProofLayer[],
    bodyMarkers: [] as readonly PoseProofMarker[],
    plateContactMarkers,
    plateLandmarkMarkers,
    unreleasedAssetIds: [] as readonly string[],
    missingSlotIds: [] as readonly string[],
    gaps: resolution.gaps,
    contactsAgree: null,
    drawn: false,
    bodyAssetId: null,
    bodyIsLegacyContactless: false,
  } satisfies PoseProofCell;

  if (!appearance || resolution.poseFamily === null) return empty;

  const recipe = resolvePersonCharacterRecipe(
    appearance,
    poseFamily.pose_family_id,
    library,
  );
  const projected = projectCharacterLayers(recipe, library);
  if (!projected) return { ...empty, gaps: resolution.gaps };

  const bodyEntry = recipe.context.components.find(
    (component) => component.kind === "body",
  );
  const body = bodyEntry ? library.components.get(bodyEntry.assetId) : undefined;

  // The union of the body canvas and every layer, padded, so a head drawn
  // above the body canvas is inside the box instead of being clipped away.
  const PADDING = 0.02;
  const boxLeft =
    Math.min(0, ...projected.layers.map((layer) => layer.left)) - PADDING;
  const boxTop =
    Math.min(0, ...projected.layers.map((layer) => layer.top)) - PADDING;
  const boxRight =
    Math.max(1, ...projected.layers.map((layer) => layer.left + layer.width)) +
    PADDING;
  const boxBottom =
    Math.max(1, ...projected.layers.map((layer) => layer.top + layer.height)) +
    PADDING;
  const boxWidth = boxRight - boxLeft;
  const boxHeight = boxBottom - boxTop;
  const toBoxX = (value: number) => ((value - boxLeft) / boxWidth) * 100;
  const toBoxY = (value: number) => ((value - boxTop) / boxHeight) * 100;
  const bodyBoxAspectRatio =
    (boxWidth * projected.bodyCanvas.width) /
    (boxHeight * projected.bodyCanvas.height);

  const unreleasedAssetIds: string[] = [];
  const layers: PoseProofLayer[] = projected.layers.map((layer) => {
    const asset = layer.released ? visualLibrary.get(layer.assetId) : undefined;
    if (!asset) unreleasedAssetIds.push(layer.assetId);
    return {
      assetId: layer.assetId,
      kind: layer.kind,
      slotId: layer.slotId,
      layer: layer.layer,
      url: asset?.url ?? null,
      leftPercent: toBoxX(layer.left),
      topPercent: toBoxY(layer.top),
      widthPercent: (layer.width / boxWidth) * 100,
      heightPercent: (layer.height / boxHeight) * 100,
    };
  });

  const bodyMarkers: PoseProofMarker[] = [
    {
      id: "pelvis-hip-center",
      xPercent: toBoxX(projected.root.x),
      yPercent: toBoxY(projected.root.y),
    },
  ];
  const bodyContacts = body?.definition.contacts;
  for (const key of ["seatedPelvis", "leftFoot", "rightFoot"] as const) {
    const point = bodyContacts?.[key];
    if (!point) continue;
    bodyMarkers.push({
      id: key,
      xPercent: toBoxX(point.x),
      yPercent: toBoxY(point.y),
    });
  }
  for (const anchor of body?.definition.attachment_anchors ?? []) {
    bodyMarkers.push({
      id: `anchor:${anchor.id}`,
      xPercent: toBoxX(anchor.x),
      yPercent: toBoxY(anchor.y),
    });
  }

  const verdicts = (["seatedPelvis", "leftFoot", "rightFoot"] as const)
    .map((key) =>
      agree(
        bodyContacts?.[key],
        poseFamily.contacts[key],
        poseFamily.contact_tolerance,
      ),
    )
    .filter((value): value is boolean => value !== null);

  const missingSlotIds = recipe.context.diagnostics
    .filter((diagnostic) => diagnostic.code === "required-slot-empty")
    .map((diagnostic) => diagnostic.slotId);

  return {
    poseFamily,
    bodyBoxAspectRatio,
    plateAspectRatio,
    layers,
    bodyMarkers,
    plateContactMarkers,
    plateLandmarkMarkers,
    unreleasedAssetIds,
    missingSlotIds,
    gaps: resolution.gaps,
    contactsAgree: verdicts.length === 0 ? null : verdicts.every(Boolean),
    drawn: unreleasedAssetIds.length === 0 && layers.length > 0,
    bodyAssetId: body?.assetId ?? null,
    bodyIsLegacyContactless:
      bodyContacts === undefined &&
      body !== undefined &&
      registry.legacyContactlessBodyFamilies.has(body.definition.family),
  };
}

/**
 * Composes the pose proof for the first people of a world.
 *
 * People are chosen to span body families where the library allows it, because
 * the pose contract's whole point is that one pose family serves several
 * bodies. When the library only has one body family the proof says so by
 * showing one, rather than pretending.
 */
export function composePoseProof(
  world: World,
  library: CharacterComponentLibrary,
  visualLibrary: RuntimeVisualLibrary,
  registry: PoseFamilyRegistry,
  art: PoseArtIndex,
  maximumPeople = 2,
): PoseProofComposition {
  const families = [...registry.families.values()].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority < b.priority ? -1 : 1;
    return a.pose_family_id < b.pose_family_id ? -1 : 1;
  });

  const chosen: Person[] = [];
  const seenBodyFamilies = new Set<string>();
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person?.appearance) continue;
    const probe = resolvePersonCharacterRecipe(
      person.appearance,
      families[0]!.pose_family_id,
      library,
    );
    if (seenBodyFamilies.has(probe.identity.bodyFamily)) continue;
    seenBodyFamilies.add(probe.identity.bodyFamily);
    chosen.push(person);
    if (chosen.length >= maximumPeople) break;
  }
  if (chosen.length === 0) {
    for (const personId of world.personOrder.slice(0, maximumPeople)) {
      const person = world.people[personId];
      if (person?.appearance) chosen.push(person);
    }
  }

  const people = chosen.map((person) => {
    const probe = resolvePersonCharacterRecipe(
      person.appearance!,
      families[0]!.pose_family_id,
      library,
    );
    const cells = families.map((poseFamily) =>
      composeCell(
        person.appearance,
        poseFamily,
        probe.identity.bodyFamily,
        library,
        visualLibrary,
        registry,
        art,
      ),
    );
    return {
      personId: person.id,
      displayName: personName(person),
      bodyFamily: probe.identity.bodyFamily,
      headFamily: probe.identity.headFamily,
      complexion: probe.identity.complexion ?? null,
      identityKey: identityKey(probe),
      cells,
    } satisfies PoseProofPerson;
  });

  // Identity stability is measured, not asserted: every pose that resolved a
  // body is re-read and its identity compared with the probe's.
  const identityStable = people.every((person) => {
    const source = world.people[person.personId];
    if (!source?.appearance) return false;
    return person.cells.every((cell) => {
      if (!cell.drawn) return true;
      const recipe = resolvePersonCharacterRecipe(
        source.appearance!,
        cell.poseFamily.pose_family_id,
        library,
      );
      return identityKey(recipe) === person.identityKey;
    });
  });

  return { people, coverage: reportPoseCoverage(registry, art), identityStable };
}
