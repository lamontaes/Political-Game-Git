export type RunAPose = "seated-at-desk";

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
  readonly personAnchor: {
    readonly x: number;
    readonly y: number;
    readonly scale: number;
    readonly pose: RunAPose;
    readonly compatiblePoses: readonly RunAPose[];
  };
  readonly occlusion: {
    readonly foregroundObject: "desk";
    readonly hiddenCharacterRegion: "lower-body";
  };
}

export const RUN_A_SCENE_LAYOUT: RunASceneLayout = {
  deskFootprint: { x: 50, y: 66, width: 36, height: 17 },
  chairFootprint: { x: 64, y: 56, width: 13, height: 9 },
  personFootprint: { x: 68, y: 59, width: 5, height: 4 },
  personAnchor: {
    x: 70.5,
    y: 63,
    scale: 1,
    pose: "seated-at-desk",
    compatiblePoses: ["seated-at-desk"],
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
  const { personAnchor } = layout;

  if (!personAnchor.compatiblePoses.includes(personAnchor.pose)) {
    issues.push("The selected pose is not compatible with the scene anchor.");
  }
  if (personAnchor.x < 0 || personAnchor.x > 100) {
    issues.push("The person anchor falls outside the scene width.");
  }
  if (personAnchor.y < 45 || personAnchor.y > 90) {
    issues.push("The person anchor does not rest on the office floor plane.");
  }
  if (personAnchor.scale < 0.85 || personAnchor.scale > 1.15) {
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
