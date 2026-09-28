import type { EnvironmentSceneSpec } from "../environment/environment-scene-spec";
import { RESIDENCE_LARGE_HOUSE_WAVE2_SCENES } from "../environment/scenes/residence-large-house-wave2";
import { RESIDENCE_MOBILE_HOME_WAVE2_SCENES } from "../environment/scenes/residence-mobile-home-wave2";
import { RESIDENCE_ROWHOUSE_WAVE2_SCENES } from "../environment/scenes/residence-rowhouse-wave2";
import { RESIDENCE_RURAL_FARMHOUSE_WAVE2_SCENES } from "../environment/scenes/residence-rural-farmhouse-wave2";
import { RESIDENCE_SMALL_APARTMENT_WAVE2_SCENES } from "../environment/scenes/residence-small-apartment-wave2";
import { RESIDENCE_SUBURBAN_HOUSE_WAVE2_SCENES } from "../environment/scenes/residence-suburban-house-wave2";
import { backdropUrl } from "./backdrop-urls";
import type { RuntimeVisualAsset } from "./visual-integration";

/**
 * THE SIX KINDS OF HOME, EACH IN ITS OWN LIGHT.
 *
 * The art team marked the TV, the tabletop and a standing spot on 25 home
 * pictures (six kinds of home, in morning, midday, night and rain, plus one
 * winter farmhouse). Lamontae approved the pictures as placeholders on
 * Sept. 27, so they register here as production rooms, and the player's home
 * is chosen by the kind of dwelling they live in and the time of day
 * (life-scene.ts).
 *
 * The papers on the table: none of the 25 marks them, but every one marks
 * its tabletop, so the papers slot is placed on the middle of that tabletop.
 * The TV: only the suburban house and the mobile home show one; the others
 * have none, and no TV is invented for them.
 */

const WAVE2_HOMES: readonly EnvironmentSceneSpec[] = [
  ...RESIDENCE_SMALL_APARTMENT_WAVE2_SCENES,
  ...RESIDENCE_ROWHOUSE_WAVE2_SCENES,
  ...RESIDENCE_SUBURBAN_HOUSE_WAVE2_SCENES,
  ...RESIDENCE_LARGE_HOUSE_WAVE2_SCENES,
  ...RESIDENCE_MOBILE_HOME_WAVE2_SCENES,
  ...RESIDENCE_RURAL_FARMHOUSE_WAVE2_SCENES,
];

interface Dimension {
  readonly value: number;
}

function tabletopRect(spec: EnvironmentSceneSpec) {
  const table = (spec.fixed_furniture ?? []).find(
    (item) => (item as { type?: string }).type === "tabletop-plane",
  ) as { dimensions?: Record<string, Dimension> } | undefined;
  const dims = table?.dimensions;
  if (!dims) return null;
  const xs = [1, 2, 3, 4]
    .map((n) => dims[`vertex_${n}_x`]?.value)
    .filter((v): v is number => typeof v === "number");
  const ys = [1, 2, 3, 4]
    .map((n) => dims[`vertex_${n}_y`]?.value)
    .filter((v): v is number => typeof v === "number");
  if (xs.length < 3 || ys.length < 3 || !spec.plate) return null;
  const { width, height } = spec.plate;
  return {
    left: (Math.min(...xs) / width) * 100,
    right: (Math.max(...xs) / width) * 100,
    top: (Math.min(...ys) / height) * 100,
    bottom: (Math.max(...ys) / height) * 100,
  };
}

/** A papers slot on the middle of the marked tabletop. */
function withPapersSlot(spec: EnvironmentSceneSpec): EnvironmentSceneSpec {
  const slots = spec.surface_slots ?? [];
  if (slots.some((slot) => slot.slot_id === "coffee-table-papers")) return spec;
  const table = tabletopRect(spec);
  if (!table) return spec;
  // The registry's legibility floor for a document is 5% x 3% of the plate.
  // A table too narrow to hold readable papers keeps its painted surface.
  const tableWidth = table.right - table.left;
  if (tableWidth < 5) return spec;
  const width = Math.min(10, Math.max(5, tableWidth * 0.6));
  const height = Math.max(3, (table.bottom - table.top) * 0.8);
  const centerX = (table.left + table.right) / 2;
  const centerY = (table.top + table.bottom) / 2;
  return {
    ...spec,
    surface_slots: [
      ...slots,
      {
        slot_id: "coffee-table-papers",
        kind: "desk-document",
        rect_percent: {
          x_percent: Number((centerX - width / 2).toFixed(2)),
          y_percent: Number((centerY - height / 2).toFixed(2)),
          width_percent: Number(width.toFixed(2)),
          height_percent: Number(height.toFixed(2)),
        },
        z_order: 6,
        allowed_content_classes: ["document-body"],
        information_access: "personal-household",
        fallback_decoration: "the tabletop painted into the plate",
      },
    ],
  } as EnvironmentSceneSpec;
}

/**
 * How people are sized in each kind of home, measured from its own picture
 * (Sept. 27, Claude CTO): gray bare bodies were stood on the marked spots and
 * checked against the room's doors, windows, sofas, counters and tables, the
 * way the canonical living room was staged. The four lights of one home are
 * one painting and share its numbers; different homes never share them.
 *
 * `standingHeight` is a standing adult's height at the marked floor line
 * (y 86.6%) as a percent of the plate's height. `far` is a farther floor line
 * with the adult's height there. The body width follows from the height:
 * height = width x plate aspect x 2.55 (life-scene-people.ts).
 */
const HOME_CALIBRATION: Readonly<
  Record<string, { standingHeight: number; far: readonly [number, number] }>
> = {
  // Front figures against the sofa and armchair; far figure below the window head.
  "residence-small-apartment": { standingHeight: 67, far: [58, 38] },
  // High ceilings; far figure against the coffee table and the tall windows.
  "residence-rowhouse": { standingHeight: 64, far: [62, 40] },
  // Front figures against the bar stools; far figure smaller than the back window.
  "residence-suburban-house": { standingHeight: 66, far: [60, 34] },
  // A large room reads smaller; far figure against the fireplace and table.
  "residence-large-house": { standingHeight: 62, far: [62, 40] },
  // Low ceiling and a tight room; far figure below the back door's head.
  "residence-mobile-home": { standingHeight: 68, far: [55, 27] },
  // Far figure below the back door's head; front figures against the counter.
  "residence-rural-farmhouse": { standingHeight: 63, far: [58, 33] },
};

const NEAR_FLOOR_Y = 86.6;
const STANDING_HEIGHT_RATIO = 2.55;

function calibrated(spec: EnvironmentSceneSpec): EnvironmentSceneSpec {
  const measured = spec.family_id
    ? HOME_CALIBRATION[spec.family_id]
    : undefined;
  if (!measured || !spec.plate) return spec;
  const aspect = spec.plate.width / spec.plate.height;
  const [farY, farHeight] = measured.far;
  return {
    ...spec,
    floor_calibration: {
      near: { floor_y_percent: NEAR_FLOOR_Y, scale: 1 },
      far: {
        floor_y_percent: farY,
        scale: Number((farHeight / measured.standingHeight).toFixed(3)),
      },
    },
    standard_body_width_percent: Number(
      (measured.standingHeight / (aspect * STANDING_HEIGHT_RATIO)).toFixed(2),
    ),
  };
}

/** The 25 home scenes as production rooms, measured, each with a papers slot. */
export const HOME_SCENE_SPECS: readonly EnvironmentSceneSpec[] =
  WAVE2_HOMES.map((spec) =>
    withPapersSlot(calibrated({ ...spec, presentation_status: "production" })),
  );

/** The id of the home scene for a kind of home in a light, if one exists. */
export function homeSceneId(place: string, variant: string): string | null {
  const id = `residence-${place}-${variant}-wave2`;
  return HOME_SCENE_SPECS.some((spec) => spec.scene_id === id) ? id : null;
}

/** The home pictures as runtime visual assets, so rooms can paint them. */
export function homeVisualAssets(): readonly RuntimeVisualAsset[] {
  return HOME_SCENE_SPECS.flatMap((spec) => {
    const tier = spec.raster?.tiers?.[0];
    if (!spec.raster || !tier) return [];
    const file = tier.path.slice(tier.path.lastIndexOf("/") + 1);
    const url = backdropUrl(file);
    if (!url) return [];
    return [
      {
        assetId: spec.raster.asset_id,
        finalPath: tier.path,
        hash: tier.hash,
        url,
        tierLadder: null,
        tierUrls: new Map([[tier.width, url]]),
      },
    ];
  });
}
