export type RunAPose = "seated-at-desk";

export interface RunAScenePlacementAnchor {
  readonly id: "primary-desk-chair";
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly compatiblePoses: readonly RunAPose[];
}

export interface RunACharacterConfiguration {
  readonly pose: RunAPose;
}

export interface SceneRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RunASceneLayout {
  readonly deskFootprint: SceneRect;
  readonly chairFootprint: SceneRect;
  readonly personFootprint: SceneRect;
  readonly scenePlacementAnchor: RunAScenePlacementAnchor;
  readonly characterConfiguration: RunACharacterConfiguration;
  readonly occlusion: {
    readonly foregroundObject: "desk";
    readonly hiddenCharacterRegion: "lower-body";
  };
}

export const RUN_A_SCENE_LAYOUT: RunASceneLayout = {
  deskFootprint: { x: 50, y: 66, width: 36, height: 17 },
  chairFootprint: { x: 64, y: 56, width: 13, height: 9 },
  personFootprint: { x: 68, y: 59, width: 5, height: 4 },
  scenePlacementAnchor: {
    id: "primary-desk-chair",
    x: 70.5,
    y: 63,
    scale: 1,
    compatiblePoses: ["seated-at-desk"],
  },
  characterConfiguration: {
    pose: "seated-at-desk",
  },
  occlusion: {
    foregroundObject: "desk",
    hiddenCharacterRegion: "lower-body",
  },
};

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

export function validateRunASceneLayout(
  layout: RunASceneLayout,
): readonly string[] {
  const issues: string[] = [];
  const { scenePlacementAnchor, characterConfiguration } = layout;

  if (
    !scenePlacementAnchor.compatiblePoses.includes(characterConfiguration.pose)
  ) {
    issues.push("The selected pose is not compatible with the scene anchor.");
  }
  if (scenePlacementAnchor.x < 0 || scenePlacementAnchor.x > 100) {
    issues.push("The person anchor falls outside the scene width.");
  }
  if (scenePlacementAnchor.y < 45 || scenePlacementAnchor.y > 90) {
    issues.push("The person anchor does not rest on the office floor plane.");
  }
  if (scenePlacementAnchor.scale < 0.85 || scenePlacementAnchor.scale > 1.15) {
    issues.push("The person scale is inconsistent with the office fixture.");
  }
  if (!contains(layout.chairFootprint, layout.personFootprint)) {
    issues.push("A seated person must occupy the chair footprint.");
  }
  if (intersects(layout.personFootprint, layout.deskFootprint)) {
    issues.push("The person's physical footprint intersects the desk.");
  }
  if (
    layout.occlusion.foregroundObject !== "desk" ||
    layout.occlusion.hiddenCharacterRegion !== "lower-body"
  ) {
    issues.push("The seated pose requires lower-body desk occlusion.");
  }

  return issues;
}
