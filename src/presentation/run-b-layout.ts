import {
  RUN_A_SCENE_LAYOUT,
  validateRunASceneLayout,
  type SceneRect,
} from "./run-a-layout";
import type { RunBSceneAnchorId } from "./run-b-fixture";

export interface RunBSecondaryPersonLayout {
  readonly measurementConfidence: "visual-estimate";
  readonly deskFootprint: SceneRect;
  readonly chairFootprint: SceneRect;
  readonly personFootprint: SceneRect;
  readonly scenePlacementAnchor: {
    readonly id: RunBSceneAnchorId;
    readonly x: number;
    readonly y: number;
    readonly scale: number;
    readonly compatiblePose: "seated-in-guest-chair";
  };
  readonly occlusion: {
    readonly foregroundObject: "guest-chair";
    readonly hiddenCharacterRegion: "lower-body";
  };
}

export const RUN_B_SECONDARY_PERSON_LAYOUT: RunBSecondaryPersonLayout = {
  measurementConfidence: "visual-estimate",
  deskFootprint: RUN_A_SCENE_LAYOUT.deskFootprint,
  chairFootprint: { x: 8, y: 67, width: 22, height: 24 },
  personFootprint: { x: 14, y: 70, width: 8, height: 8 },
  scenePlacementAnchor: {
    id: "left-guest-chair",
    x: 18,
    y: 74,
    scale: 0.92,
    compatiblePose: "seated-in-guest-chair",
  },
  occlusion: {
    foregroundObject: "guest-chair",
    hiddenCharacterRegion: "lower-body",
  },
};

export function validateRunBSceneLayouts(): readonly string[] {
  const issues = [...validateRunASceneLayout(RUN_A_SCENE_LAYOUT)];
  const secondary = RUN_B_SECONDARY_PERSON_LAYOUT;

  if (
    secondary.scenePlacementAnchor.id ===
    RUN_A_SCENE_LAYOUT.scenePlacementAnchor.id
  ) {
    issues.push("Run B NPCs require separate scene placement anchors.");
  }
  if (
    secondary.scenePlacementAnchor.y < 45 ||
    secondary.scenePlacementAnchor.y > 90
  ) {
    issues.push(
      "The secondary person anchor does not rest on the office floor plane.",
    );
  }
  if (
    secondary.scenePlacementAnchor.scale < 0.85 ||
    secondary.scenePlacementAnchor.scale > 1.15
  ) {
    issues.push(
      "The secondary person scale is inconsistent with the office fixture.",
    );
  }
  if (!contains(secondary.chairFootprint, secondary.personFootprint)) {
    issues.push(
      "The secondary seated person must occupy the guest-chair footprint.",
    );
  }
  if (intersects(secondary.personFootprint, secondary.deskFootprint)) {
    issues.push(
      "The secondary person's physical footprint intersects the desk.",
    );
  }
  if (
    intersects(secondary.personFootprint, RUN_A_SCENE_LAYOUT.personFootprint)
  ) {
    issues.push("The two Run B NPC footprints intersect.");
  }
  if (
    secondary.occlusion.foregroundObject !== "guest-chair" ||
    secondary.occlusion.hiddenCharacterRegion !== "lower-body"
  ) {
    issues.push(
      "The secondary seated pose requires guest-chair lower-body occlusion.",
    );
  }

  return issues;
}

function contains(container: SceneRect, item: SceneRect): boolean {
  return (
    item.x >= container.x &&
    item.y >= container.y &&
    item.x + item.width <= container.x + container.width &&
    item.y + item.height <= container.y + container.height
  );
}

function intersects(first: SceneRect, second: SceneRect): boolean {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
}
