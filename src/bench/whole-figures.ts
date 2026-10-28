// Standing people: one cut-out per person from the Codex people-engine v2
// set, picked from their record (sex, age and role at the place), placed on
// the backdrop's staging spot by depth and turned to face the room. The set
// paints adults only, in four standing outfits and three builds; a child has no figure
// and is listed as unplaced.
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import {
  BACKDROP_ASPECT,
  type PlaceStaging,
  type StagingSpot,
} from "./staging";
import index from "../../art/people-engine/v2/index.json" with { type: "json" };
import backs from "../../art/people-engine/v2/figures-back.json" with { type: "json" };
import rules from "./data/whole-figures.json" with { type: "json" };
import heads from "./data/figure-heads.json" with { type: "json" };
import poses from "../../art/people-rooms/poses/index.json" with { type: "json" };
import { orgPlace } from "./scene";
import {
  DEFAULT_SKIN,
  GARMENTS,
  GARMENT_SWATCHES,
  hasGarmentMap,
  type FigureColors,
} from "./figure-colors";
import { occluderFor, type Occluder } from "./occluders";
import { faces, hairStyles } from "./figure-hair";
import type { CoreState } from "../core2/types";

export interface Figure {
  /** The figure's file under art/people-engine/v2/. */
  file: string;
  /** One person's look: the same outfit and sex in every pose and build. */
  look: string;
  build: string;
  sex: string;
  ageBand: "child" | "teen" | "adult" | "older";
  outfit: string;
  angle: string;
  pose: "stand" | "sit" | "lectern";
  /** A seated figure's hip line on the cushion, in pixels from the top. */
  seatY?: number;
  /** Which way the figure is painted facing: a front or back view faces the viewer or away. */
  facing: "left" | "right" | "viewer" | "away";
  width: number;
  height: number;
  footY: number;
}

/** Only a figure painted turned to one side is flipped to face someone. */
const flips = (figure: Figure, toward: "left" | "right") =>
  (figure.facing === "left" || figure.facing === "right") &&
  figure.facing !== toward;

interface V2Row {
  file: string;
  pose: string;
  angle: string;
  outfit: string;
  prop: string;
  sex: string;
  build: string;
  ageBand: Figure["ageBand"];
  facing: Figure["facing"];
  width: number;
  height: number;
  footY: number;
  seatY?: number;
  flag?: string;
}
// Figures holding a cup or a tablet, and the six back views painted facing the
// wrong way (README "Known problems"), are not drawn as standing people; the
// lectern pose is drawn only at a picture's podium.
const toFigure = (row: V2Row): Figure => ({
  file: row.file,
  look: `${row.outfit}:${row.sex}`,
  build: row.build,
  sex: row.sex,
  ageBand: row.ageBand,
  outfit: row.outfit,
  angle: row.angle,
  pose: row.pose as Figure["pose"],
  ...(row.seatY !== undefined ? { seatY: row.seatY } : {}),
  facing: row.facing,
  width: row.width,
  height: row.height,
  footY: row.footY,
});
/**
 * Standing people seen from behind, for crowds facing away (the art session's
 * figures-back.json; the same naming and frame as the rest of the set). Their
 * size and foot line are read from the pictures; "plain" is the set's "base".
 */
const BACKS: V2Row[] = (
  backs.figures as unknown as (Omit<V2Row, "facing"> & { facing: number })[]
).map((row) => {
  const png = PNG.sync.read(
    readFileSync(
      new URL(
        `../../art/people-engine/v2/figures/${row.file.split("/").pop()}`,
        import.meta.url,
      ),
    ),
  );
  let foot = png.height - 1;
  const opaque = (y: number) => {
    for (let x = 0; x < png.width; x++)
      if (png.data[(y * png.width + x) * 4 + 3]! > 128) return true;
    return false;
  };
  while (foot > 0 && !opaque(foot)) foot--;
  return {
    ...row,
    outfit: row.outfit === "plain" ? "base" : row.outfit,
    ageBand: "adult",
    facing: "away",
    width: png.width,
    height: png.height,
    footY: foot,
  };
});

/**
 * A look painted turned each way is mirrored on screen to face anyone, so the
 * figure with a garment map (each piece its own color) is drawn first.
 */
function mappedFirst(a: Figure, b: Figure): number {
  return Number(hasGarmentMap(b.file)) - Number(hasGarmentMap(a.file));
}
const PAINTED: Figure[] = [...(index.figures as unknown as V2Row[]), ...BACKS]
  .filter(
    (row) =>
      row.prop === "none" &&
      !row.flag &&
      (row.pose === "stand" || row.pose === "sit"),
  )
  .map(toFigure)
  .sort(mappedFirst);
/** The lectern pose: facing the room, hands forward on the podium the picture has. */
const LECTERNS: Figure[] = (index.figures as unknown as V2Row[])
  .filter((row) => row.prop === "none" && !row.flag && row.pose === "lectern")
  .map(toFigure)
  .sort(mappedFirst);
/** The same person at a lectern: their sex and age band, their outfit and build where painted. */
function lecternFor(front: Figure, band: Figure["ageBand"]): Figure | null {
  const same = LECTERNS.filter(
    (row) => row.sex === front.sex && row.ageBand === band,
  );
  return (
    same.find(
      (row) => row.outfit === front.outfit && row.build === front.build,
    ) ??
    same.find((row) => row.outfit === front.outfit) ??
    same[0] ??
    null
  );
}
/** Looks are chosen from the standing three-quarter views; the front and back views are the same look turned. */
const FIGURES = PAINTED.filter(
  (row) => row.angle === "three-quarter" && row.pose === "stand",
);

/** The standing looks the creator offers: the same figures the game draws. */
export function lookFigures(): readonly Figure[] {
  return FIGURES;
}
/** Which painted angle a spot asks for: a back to the viewer, a face to the viewer, or turned to a side. */
export type View = "back" | "front" | "three-quarter";
export function viewOf(spot: StagingSpot): View {
  return spot.facing === "away"
    ? "back"
    : spot.facing === "viewer"
      ? "front"
      : "three-quarter";
}

/**
 * The person's own look and build in this pose, seen at the spot's angle;
 * where that angle is not painted (the set has no standing back view), the
 * three-quarter view, turned.
 */
function posedFor(
  front: Figure,
  pose: "stand" | "sit",
  view: View,
): Figure | undefined {
  const rows = PAINTED.filter(
    (row) =>
      row.look === front.look && row.build === front.build && row.pose === pose,
  );
  return (
    rows.find((row) => row.angle === view) ??
    rows.find((row) => row.angle === "three-quarter") ??
    rows[0]
  );
}

const SEXES = new Set(FIGURES.map((row) => row.sex));

// Presentation choices for the contact shadow, TUNABLE by eye: the band above
// the foot line read as feet (share of the figure's height), how far the
// shadow reaches past the stance, and how flat the floor makes it.
const FEET_BAND = 0.035;
const SHADOW_SPREAD = 1.3;
const SHADOW_FLATNESS = 0.22;
// A seated figure without a recorded hip line sits at this share of its
// picture's height, and its shadow under the chair is this share of its width.
const SEATED_HIP = 0.6;
const SEATED_SHADOW = 0.9;

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

/** A well-mixed hash, so neighbors with alike ids still get unalike colors. */
function mixed(text: string): number {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return h >>> 0;
}

/** A person's age band on the game's date. */
export function ageBandOf(
  core: CoreState,
  birthDate: string,
): Figure["ageBand"] {
  return ageBand(ageOnDate(makeIsoDate(birthDate), makeIsoDate(core.date)));
}

function ageBand(age: number): Figure["ageBand"] {
  return age < 13 ? "child" : age < 18 ? "teen" : age < 65 ? "adult" : "older";
}

/** What someone wears here: an official's outfits at a government place, work clothes at their own workplace, else their age band's everyday clothes. */
function dressFor(
  core: CoreState,
  personId: string,
  place: string,
  band: Figure["ageBand"],
  official: boolean,
): readonly string[] {
  if (official && rules.governmentPlaces.includes(place))
    return rules.officialOutfits;
  const person = core.people.get(personId);
  const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
  if (job && orgPlace(core, job.organizationId) === place)
    return rules.workOutfits;
  return (rules.casualByAge as Record<string, readonly string[]>)[band] ?? [];
}

/** Where the feet are in a figure's picture: the stance's left and right edge, in pixels. */
const stances = new Map<string, { left: number; right: number }>();
function stanceOf(figure: Figure): { left: number; right: number } {
  let stance = stances.get(figure.file);
  if (!stance) {
    const png = PNG.sync.read(
      readFileSync(
        new URL(`../../art/people-engine/v2/${figure.file}`, import.meta.url),
      ),
    );
    // The feet: opaque pixels in the band just above the foot line.
    const band = Math.max(Math.round(png.height * FEET_BAND), 2);
    let left = png.width,
      right = -1;
    for (let y = Math.max(figure.footY - band, 0); y <= figure.footY; y++)
      for (let x = 0; x < png.width; x++)
        if (png.data[(y * png.width + x) * 4 + 3]! > 128) {
          if (x < left) left = x;
          if (x > right) right = x;
        }
    stance = right < left ? { left: 0, right: png.width - 1 } : { left, right };
    stances.set(figure.file, stance);
  }
  return stance;
}

/** A soft contact shadow on the floor, in percent of the picture. */
export interface ContactShadow {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
}

export interface WholeFigure {
  file: string;
  url: string;
  figure: {
    leftPercent: number;
    topPercent: number;
    widthPercent: number;
    heightPercent: number;
    /** What in the painting stands in front of them here, drawn over them; none where nothing does. */
    occluder: Occluder | null;
    mirrored: boolean;
    /** At the feet, as wide as the stance; none where a desk or counter hides the feet. */
    shadow: ContactShadow | null;
  };
}

// How common each skin tone is among the people the world makes, a rough
// ESTIMATE of the United States' spread (source: Census race and ethnicity
// counts, folded into the eight tones; spread about 5 points a tone), so a
// street looks like America and not like an even draw. Registered as
// stopgapId: SG-PLAY-people-skin-tone-weights, until a place's own demographics decide it.
const SKIN_WEIGHTS: Readonly<Record<string, number>> = {
  fair: 12,
  light: 22,
  tan: 22,
  olive: 16,
  brown: 12,
  deep: 9,
  dark: 5,
  ebony: 2,
};

/**
 * The skin and each piece of clothing's color a person wears: the ones they
 * chose in the creator, else ones set once from their own appearance record's seed (their
 * id where the record has none), so the same person is the same color in every
 * scene and neighbors differ.
 */
export function colorsFor(
  person: FigurePerson,
  /** The sex of the figure drawn, for the hair styles painted for it. */
  sex?: string,
  band?: Figure["ageBand"],
): FigureColors {
  const seed = person.seed ?? person.id;
  const total = Object.values(SKIN_WEIGHTS).reduce((a, b) => a + b, 0);
  let at = mixed(`${seed}:skin`) % total;
  let skin = DEFAULT_SKIN;
  for (const [id, weight] of Object.entries(SKIN_WEIGHTS)) {
    if (at < weight) {
      skin = id;
      break;
    }
    at -= weight;
  }
  // Each piece of clothing its own color, set once from the person's seed.
  const garments = Object.fromEntries(
    GARMENTS.map((garment) => [
      garment,
      person.look?.[garment] ??
        GARMENT_SWATCHES[garment][
          mixed(`${seed}:${garment}`) % GARMENT_SWATCHES[garment].length
        ]!.id,
    ]),
  );
  // Hair: a style painted for the figure's sex and a color, set once from
  // the seed; older people mostly gray or white.
  const styles = hairStyles(person.look?.sex ?? sex ?? person.gender ?? "");
  const hair =
    person.look?.hair ??
    (styles.length
      ? String(styles[mixed(`${seed}:hair`) % styles.length]!.style)
      : undefined);
  const weights = band === "older" ? HAIR_WEIGHTS_OLDER : HAIR_WEIGHTS;
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  let left = mixed(`${seed}:hair-color`) % sum;
  let hairColor = Object.keys(weights)[0]!;
  for (const [id, weight] of Object.entries(weights)) {
    if (left < weight) {
      hairColor = id;
      break;
    }
    left -= weight;
  }
  // A face painted for the figure's sex, set once from the seed.
  const painted = faces(person.look?.sex ?? sex ?? person.gender ?? "");
  const face =
    person.look?.face ??
    (painted.length
      ? String(painted[mixed(`${seed}:face`) % painted.length]!.face)
      : undefined);
  return {
    skin: person.look?.skin ?? skin,
    ...(face ? { face } : {}),
    ...garments,
    ...(hair ? { hair, hairColor: person.look?.hairColor ?? hairColor } : {}),
  };
}

// How common each hair color is, a rough ESTIMATE for American adults (no
// census counts hair color; spread about 5 points a color), and for people
// 65 and older, most of whom have gone gray or white. Presentation weights,
// registered as stopgapId: SG-PLAY-people-hair-color-weights, until a
// sourced survey replaces them.
const HAIR_WEIGHTS: Readonly<Record<string, number>> = {
  black: 30,
  "dark-brown": 30,
  brown: 18,
  "light-brown": 8,
  blonde: 8,
  auburn: 3,
  strawberry: 3,
};
const HAIR_WEIGHTS_OLDER: Readonly<Record<string, number>> = {
  gray: 45,
  white: 20,
  "dark-brown": 12,
  black: 10,
  brown: 8,
  blonde: 5,
};

/** Who is being drawn: their record, and whether they hold office. */
export interface FigurePerson {
  id: string;
  birthDate: string;
  gender?: string;
  official: boolean;
  /** The seed of the person's own appearance record, where they have one. */
  seed?: string;
  /** A look the person chose in the creator (the player), worn everywhere. */
  look?: {
    sex: string;
    build: string;
    outfit: string;
    skin?: string;
    jacket?: string;
    shirt?: string;
    pants?: string;
    shoes?: string;
    hair?: string;
    hairColor?: string;
    face?: string;
  };
}

/**
 * The person's look here (a standing three-quarter figure), or null where
 * none fits (a child: the set paints adults only). Each person has a stable
 * look and build from their id among the looks of their sex dressed for where
 * they are. Nobody else in the scene changes it: neighbors differ by their own
 * look, build and colors (`colorsFor`), never by being pushed off a look.
 */
export function pickLook(
  core: CoreState,
  person: FigurePerson,
  place: string,
): Figure | null {
  const band = ageBandOf(core, person.birthDate);
  if (band === "child") return null;
  const chosen = person.look;
  const own =
    chosen &&
    FIGURES.find(
      (row) =>
        row.sex === chosen.sex &&
        row.build === chosen.build &&
        row.outfit === chosen.outfit,
    );
  if (own) return own;
  const outfits = dressFor(core, person.id, place, band, person.official);
  // A person whose sex has no looks painted (nonbinary) may wear any look.
  const sexOk = (row: Figure) =>
    !person.gender || !SEXES.has(person.gender) || row.sex === person.gender;
  const fits = FIGURES.filter(sexOk);
  const dressed = fits.filter((row) => outfits.includes(row.outfit));
  const from = dressed.length ? dressed : fits;
  if (!from.length) return null;
  // The same person always looks the same: their look and build come from their id.
  const looks = [...new Set(from.map((row) => row.look))].sort();
  const look = looks[hash(`${person.id}:look`) % looks.length]!;
  const builds = [
    ...new Set(from.filter((row) => row.look === look).map((row) => row.build)),
  ].sort();
  const build = builds[hash(`${person.id}:build`) % builds.length]!;
  return from.find((row) => row.look === look && row.build === build)!;
}

interface Pose {
  id: string;
  file: string;
  scene: string;
  pose: string;
  sex: string;
  build: string;
  width: number;
  height: number;
  boxInScene: [number, number, number, number];
  sceneSize: [number, number];
  head: { top: number; x: number; width: number };
}
const POSES = poses.figures as unknown as readonly Pose[];
/** The spot kinds a pose fits: a lectern pose at a podium, sitting on a seat, standing or walking on a standing spot. */
const POSE_FITS: Readonly<Record<string, string>> = {
  lectern: "podium",
  sit: "sit",
  stand: "stand",
  walk: "stand",
};

/**
 * The pose painted at this spot's furniture for this look (art/people-rooms/
 * poses: a person turned to the crowd at a lectern, writing at a desk, leaning
 * on a counter), or null. A pose belongs to the room it was cut from and to
 * the spot whose head is where the pose's head is; it is taken by a person of
 * the pose's sex, the same build first, and among several by their look.
 */
// stopgapId: SG-PLAY-pose-body
function poseFor(place: string, spot: StagingSpot, front: Figure): Pose | null {
  if (!spot.head) return null;
  const reach = rules.poseReach;
  const here = POSES.filter((pose) => {
    if (pose.scene !== place || POSE_FITS[pose.pose] !== (spot.pose ?? "stand"))
      return false;
    if ((pose.sex === "f" ? "female" : "male") !== front.sex) return false;
    const [width, height] = pose.sceneSize;
    const x = ((pose.boxInScene[0] + pose.head.x) / width) * 100;
    const y = ((pose.boxInScene[1] + pose.head.top) / height) * 100;
    return (
      Math.abs(x - spot.head!.x) <= reach.across &&
      Math.abs(y - spot.head!.top) <= reach.down
    );
  });
  if (!here.length) return null;
  const built = here.filter((pose) => pose.build === front.build);
  const from = built.length ? built : here;
  return from[hash(`${front.file}:${spot.id ?? ""}`) % from.length]!;
}

/** A pose drawn where it was painted: its own box in its room, the furniture's cut kept, no shadow under a desk or lectern. */
function posed(pose: Pose): WholeFigure {
  const [width, height] = pose.sceneSize;
  return {
    file: pose.id,
    url: `/art/people-engine/v2/figures/${pose.id}.png`,
    figure: {
      leftPercent: (pose.boxInScene[0] / width) * 100,
      topPercent: (pose.boxInScene[1] / height) * 100,
      widthPercent: (pose.width / width) * 100,
      heightPercent: (pose.height / height) * 100,
      occluder: null,
      mirrored: false,
      shadow: null,
    },
  };
}

/** A chosen look drawn on a standing spot: sized for the person's age and the floor, turned, with its shadow. */
export function figureOn(
  front: Figure,
  band: Figure["ageBand"],
  place: string,
  stage: PlaceStaging,
  spot: StagingSpot,
  turn: Turn = {},
): WholeFigure | null {
  // Where a pose is painted at this spot's furniture, the person in that pose.
  const pose = band !== "child" ? poseFor(place, spot, front) : null;
  if (pose) return posed(pose);
  if (spot.pose === "sit") {
    // Seated: the same look on this kind of chair, or nobody here.
    const seated = posedFor(front, "sit", viewOf(spot));
    return seated
      ? placeSeated(seated, front, band, place, stage, spot, turn)
      : null;
  }
  // At a podium, the lectern pose where one is painted for this person;
  // standing or leaning on a wall, the standing figure.
  const lectern = spot.pose === "podium" ? lecternFor(front, band) : null;
  const chosen = lectern ?? posedFor(front, "stand", viewOf(spot)) ?? front;
  const mirrored = flips(chosen, towardOf(spot, turn));
  const onHead = headBox(chosen, spot, mirrored);
  const heightPercent =
    onHead?.heightPercent ??
    personPercent(band, stage, spot) * (chosen.height / chosen.footY);
  const widthPercent =
    onHead?.widthPercent ??
    (heightPercent * (chosen.width / chosen.height)) / BACKDROP_ASPECT;
  const leftPercent =
    onHead?.leftPercent ?? inFrame(spot.x - widthPercent / 2, widthPercent);
  // The shadow sits on the foot point, under the feet as drawn (mirrored
  // with the figure), unless a desk or counter hides the feet.
  const stance = stanceOf(chosen);
  const toPercent = (pixel: number) =>
    leftPercent +
    widthPercent *
      ((mirrored ? chosen.width - 1 - pixel : pixel) / chosen.width);
  const feetLeft = Math.min(toPercent(stance.left), toPercent(stance.right));
  const feetRight = Math.max(toPercent(stance.left), toPercent(stance.right));
  const shadowWidth =
    Math.max(feetRight - feetLeft, widthPercent * 0.3) * SHADOW_SPREAD;
  const shadowHeight = shadowWidth * SHADOW_FLATNESS * BACKDROP_ASPECT;
  const hidden = spot.behindY !== undefined;
  return {
    file: chosen.file,
    url: `/art/people-engine/v2/${chosen.file}`,
    figure: {
      leftPercent,
      topPercent:
        onHead?.topPercent ??
        spot.y - heightPercent * (chosen.footY / chosen.height),
      widthPercent,
      heightPercent,
      occluder: occluderFor(place, spotIdOf(place, stage, spot)),
      mirrored,
      shadow: hidden
        ? null
        : {
            leftPercent: (feetLeft + feetRight) / 2 - shadowWidth / 2,
            // On a plate's spot, under the feet as drawn.
            topPercent:
              (onHead
                ? onHead.topPercent +
                  (onHead.heightPercent * chosen.footY) / chosen.height
                : spot.y) -
              shadowHeight / 2,
            widthPercent: shadowWidth,
            heightPercent: shadowHeight,
          },
    },
  };
}

/** Which side a figure painted turned to one side faces: toward who they're with. */
type Turn = { toward?: "left" | "right" };

/** A spot's id: its own, else its place and index (as the staging file numbers them). */
export const spotIdOf = (
  place: string,
  stage: PlaceStaging,
  spot: StagingSpot,
) => spot.id ?? `${place}:spot:${stage.spots.indexOf(spot)}`;

/** How tall the person stands at this spot, in percent of the picture: their age band's height on the spot's floor. */
function personPercent(
  band: Figure["ageBand"],
  stage: PlaceStaging,
  spot: StagingSpot,
): number {
  const meters =
    spot.floorMetersPercent ??
    (spot.floor !== undefined ? stage.floors?.[spot.floor] : undefined) ??
    stage.metersPercent;
  const horizonY = spot.floorHorizonY ?? stage.horizonY;
  // The one framing rule: a close-up room never puts the head above the frame.
  return Math.min(
    rules.heightMeters[band] * meters * (spot.y - horizonY),
    spot.y - HEADROOM,
  );
}

/**
 * On a spot measured from a mannequin plate, the figure as the plate's
 * mannequin: scaled so its head is the mannequin's head width, its head top
 * and middle on the mannequin's (art/people-rooms/README.md). Elsewhere null,
 * and the floor's scale places it.
 */
function headBox(figure: Figure, spot: StagingSpot, mirrored: boolean) {
  const head =
    HEADS[
      figure.file
        .split("/")
        .pop()!
        .replace(/\.png$/, "")
    ];
  if (!spot.head || !head) return null;
  const [top, middle, width] = head;
  // Pixels of the picture per pixel of the figure.
  const scale = (spot.head.width * PICTURE_WIDTH) / 100 / width;
  const across = (pixels: number) => ((pixels * scale) / PICTURE_WIDTH) * 100;
  const down = (pixels: number) => ((pixels * scale) / PICTURE_HEIGHT) * 100;
  return {
    leftPercent:
      spot.head.x - across(mirrored ? figure.width - 1 - middle : middle),
    topPercent: spot.head.top - down(top),
    widthPercent: across(figure.width),
    heightPercent: down(figure.height),
  };
}
const HEADS = heads.heads as unknown as Readonly<
  Record<string, readonly [number, number, number]>
>;
/** Where a figure's head is drawn, in its own pixels: top, middle and width; null where it is not measured. */
export function headOf(
  figure: Figure,
): readonly [number, number, number] | null {
  return (
    HEADS[
      figure.file
        .split("/")
        .pop()!
        .replace(/\.png$/, "")
    ] ?? null
  );
}
const PICTURE_WIDTH = 1672;
const PICTURE_HEIGHT = 941;

/** Percent of the picture kept above a standing head (presentation, TUNABLE by eye). */
const HEADROOM = 5;
/** Percent of the picture kept beside a figure at either side (presentation, TUNABLE by eye). */
export const SIDE_ROOM = 4;
/** A figure's left edge, moved in from the picture's sides where its spot would crowd it. */
const inFrame = (left: number, width: number) =>
  Math.max(SIDE_ROOM, Math.min(left, 100 - width - SIDE_ROOM));

/** Turned toward who they're with; alone, the spot's own facing, else the middle. */
function towardOf(spot: StagingSpot, turn: Turn): "left" | "right" {
  return (
    turn.toward ??
    (spot.facing === "left" || spot.facing === "right"
      ? spot.facing
      : spot.x < 50
        ? "right"
        : "left")
  );
}

/**
 * A seated figure on a seat: painted at its standing look's scale, its hip
 * line on the seat cushion (`seatY`), centered on the seat, with whatever
 * the painting has in front of the seat drawn over it. Its shadow is under
 * the chair, or none where a desk hides the floor.
 */
export function placeSeated(
  seated: Figure,
  standing: Figure,
  band: Figure["ageBand"],
  place: string,
  stage: PlaceStaging,
  spot: StagingSpot,
  turn: Turn = {},
): WholeFigure {
  // Percent of the picture per pixel: the standing look's feet-to-head is the person's height.
  const scale = personPercent(band, stage, spot) / standing.footY;
  const mirrored = flips(seated, towardOf(spot, turn));
  const onHead = headBox(seated, spot, mirrored);
  const heightPercent = onHead?.heightPercent ?? seated.height * scale;
  const widthPercent =
    onHead?.widthPercent ??
    (heightPercent * (seated.width / seated.height)) / BACKDROP_ASPECT;
  const hip = seated.seatY ?? seated.height * SEATED_HIP;
  const leftPercent =
    onHead?.leftPercent ?? inFrame(spot.x - widthPercent / 2, widthPercent);
  const shadowWidth = widthPercent * SEATED_SHADOW;
  const shadowHeight = shadowWidth * SHADOW_FLATNESS * BACKDROP_ASPECT;
  const hidden = spot.behindY !== undefined;
  return {
    file: seated.file,
    url: `/art/people-engine/v2/${seated.file}`,
    figure: {
      leftPercent,
      topPercent: onHead?.topPercent ?? (spot.seatY ?? spot.y) - hip * scale,
      widthPercent,
      heightPercent,
      occluder: occluderFor(place, spotIdOf(place, stage, spot)),
      mirrored,
      shadow: hidden
        ? null
        : {
            leftPercent: leftPercent + widthPercent / 2 - shadowWidth / 2,
            topPercent: spot.y - shadowHeight / 2,
            widthPercent: shadowWidth,
            heightPercent: shadowHeight,
          },
    },
  };
}
