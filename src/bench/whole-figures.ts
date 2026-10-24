// Standing people (owner, Oct 24: "I want the current people completely
// removed from the game ... I just want people to just be standing,
// generated"): one cut-out per person from the Codex people-engine v2 set
// (art/people-engine/v2, #5123), picked from their record (sex, age, role at
// the place), placed on the backdrop's staging spot by depth and turned to face
// the room. The v2 set paints adults only, in six outfits and three builds;
// a child has no figure and is listed as unplaced.
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import {
  BACKDROP_ASPECT,
  type PlaceStaging,
  type StagingSpot,
} from "./staging";
import index from "../../art/people-engine/v2/index.json" with { type: "json" };
import rules from "./data/whole-figures.json" with { type: "json" };
import { orgPlace } from "./scene";
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
  pose: "stand" | "sit";
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
// wrong way (README "Known problems"), are not drawn; nor is the lectern pose.
const PAINTED: Figure[] = (index.figures as unknown as V2Row[])
  .filter(
    (row) =>
      row.prop === "none" &&
      !row.flag &&
      (row.pose === "stand" || row.pose === "sit"),
  )
  .map((row) => ({
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
  }));
/** Looks are chosen from the standing three-quarter views; the front and back views are the same look turned. */
const FIGURES = PAINTED.filter(
  (row) => row.angle === "three-quarter" && row.pose === "stand",
);
const SEATED = PAINTED.filter((row) => row.pose === "sit");

/** The standing looks the creator offers: the same figures the game draws. */
export function lookFigures(): readonly Figure[] {
  return FIGURES;
}
/** A look and build seen from the front, or from behind, where painted. */
function turned(figure: Figure, view: "profile" | "back"): Figure | undefined {
  return PAINTED.find(
    (row) =>
      row.look === figure.look &&
      row.build === figure.build &&
      row.angle === (view === "back" ? "back" : "front") &&
      row.pose === "stand",
  );
}

/** The person's own look and build seated, seen from where they face. */
function seatedFor(
  front: Figure,
  view?: "profile" | "back",
): Figure | undefined {
  const rows = SEATED.filter(
    (row) => row.look === front.look && row.build === front.build,
  );
  return (
    rows.find(
      (row) => row.angle === (view === "back" ? "back" : "three-quarter"),
    ) ??
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
    clipBelowPercent: number | null;
    clipBandEndPercent: number | null;
    mirrored: boolean;
    /** At the feet, as wide as the stance; none where a desk or counter hides the feet. */
    shadow: ContactShadow | null;
  };
}

/** Who is being drawn: their record, and whether they hold office. */
export interface FigurePerson {
  id: string;
  birthDate: string;
  gender?: string;
  official: boolean;
  /** A look the person chose in the creator (the player), worn everywhere. */
  look?: { sex: string; build: string; outfit: string };
}

/**
 * The person's look here (a standing three-quarter figure), or null where
 * none fits (a child: the set paints adults only). Each person has a stable
 * look and build from their id among the looks of their sex dressed for where
 * they are, and takes one that nobody else in the scene wears (`taken`).
 */
export function pickLook(
  core: CoreState,
  person: FigurePerson,
  place: string,
  taken: ReadonlySet<string> = new Set(),
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
  if (own && !taken.has(own.look)) return own;
  const outfits = dressFor(core, person.id, place, band, person.official);
  // A person whose sex has no looks painted (nonbinary) may wear any look.
  const sexOk = (row: Figure) =>
    !person.gender || !SEXES.has(person.gender) || row.sex === person.gender;
  const fits = FIGURES.filter((row) => sexOk(row) && !taken.has(row.look));
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

/**
 * The person's whole figure on this spot, or null where none fits (a seated
 * spot, or no look for their sex and age), and nobody is drawn there.
 */
export function wholeFigureFor(
  core: CoreState,
  person: FigurePerson,
  place: string,
  stage: PlaceStaging,
  spot: StagingSpot,
  /** Who they're with: which way to turn, and whether to show their side or back. */
  turn: Turn = {},
  taken?: ReadonlySet<string>,
): WholeFigure | null {
  const front = pickLook(core, person, place, taken);
  if (!front) return null;
  return figureOn(
    front,
    ageBandOf(core, person.birthDate),
    place,
    stage,
    spot,
    turn,
  );
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
  if (spot.pose === "sit") {
    // Seated: the same look on this kind of chair, or nobody here.
    const seated = seatedFor(front, turn.view);
    return seated ? placeSeated(seated, front, band, stage, spot, turn) : null;
  }
  // Standing, leaning on a wall or at a podium: the standing figure.
  const chosen = (turn.view && turned(front, turn.view)) || front;
  const heightPercent =
    personPercent(band, stage, spot) * (chosen.height / chosen.footY);
  const widthPercent =
    (heightPercent * (chosen.width / chosen.height)) / BACKDROP_ASPECT;
  const mirrored = flips(chosen, towardOf(spot, turn));
  const leftPercent = spot.x - widthPercent / 2;
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
  const hidden =
    spot.clipBelowY !== undefined && spot.clipBandEndY === undefined;
  return {
    file: chosen.file,
    url: `/art/people-engine/v2/${chosen.file}`,
    figure: {
      leftPercent,
      topPercent: spot.y - heightPercent * (chosen.footY / chosen.height),
      widthPercent,
      heightPercent,
      clipBelowPercent: spot.clipBelowY ?? null,
      clipBandEndPercent:
        spot.clipBelowY !== undefined && spot.clipBandEndY !== undefined
          ? spot.clipBandEndY
          : null,
      mirrored,
      shadow: hidden
        ? null
        : {
            leftPercent: (feetLeft + feetRight) / 2 - shadowWidth / 2,
            topPercent: spot.y - shadowHeight / 2,
            widthPercent: shadowWidth,
            heightPercent: shadowHeight,
          },
    },
  };
}

type Turn = { toward?: "left" | "right"; view?: "profile" | "back" };

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
  return rules.heightMeters[band] * meters * (spot.y - horizonY);
}

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
 * line on the seat cushion (`seatY`), centered on the seat, cut off below a
 * desk at `clipBelowY`. Its shadow is under the chair, or none where a desk
 * hides the floor.
 */
export function placeSeated(
  seated: Figure,
  standing: Figure,
  band: Figure["ageBand"],
  stage: PlaceStaging,
  spot: StagingSpot,
  turn: Turn = {},
): WholeFigure {
  // Percent of the picture per pixel: the standing look's feet-to-head is the person's height.
  const scale = personPercent(band, stage, spot) / standing.footY;
  const heightPercent = seated.height * scale;
  const widthPercent =
    (heightPercent * (seated.width / seated.height)) / BACKDROP_ASPECT;
  const hip = seated.seatY ?? seated.height * SEATED_HIP;
  const leftPercent = spot.x - widthPercent / 2;
  const shadowWidth = widthPercent * SEATED_SHADOW;
  const shadowHeight = shadowWidth * SHADOW_FLATNESS * BACKDROP_ASPECT;
  const hidden =
    spot.clipBelowY !== undefined && spot.clipBandEndY === undefined;
  return {
    file: seated.file,
    url: `/art/people-engine/v2/${seated.file}`,
    figure: {
      leftPercent,
      topPercent: (spot.seatY ?? spot.y) - hip * scale,
      widthPercent,
      heightPercent,
      clipBelowPercent: spot.clipBelowY ?? null,
      clipBandEndPercent:
        spot.clipBelowY !== undefined && spot.clipBandEndY !== undefined
          ? spot.clipBandEndY
          : null,
      mirrored: flips(seated, towardOf(spot, turn)),
      shadow: hidden
        ? null
        : {
            leftPercent: spot.x - shadowWidth / 2,
            topPercent: spot.y - shadowHeight / 2,
            widthPercent: shadowWidth,
            heightPercent: shadowHeight,
          },
    },
  };
}
