// Whole-figure people (owner, Oct 12): one cut-out image per person, picked
// from their record (sex, age, role at the place), placed on the backdrop's
// staging spot by depth and turned to face the room.
import { existsSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import {
  BACKDROP_ASPECT,
  type PlaceStaging,
  type StagingSpot,
} from "./staging";
import manifest from "../../art/people-whole/manifest.json" with { type: "json" };
import rules from "./data/whole-figures.json" with { type: "json" };
import { orgPlace } from "./scene";
import type { CoreState } from "../core2/types";

interface Figure {
  file: string;
  age?: number;
  look: string;
  build: string;
  sex: string;
  ageBand: "child" | "teen" | "adult" | "older";
  outfit: string;
  angle: string;
  facing: "left" | "right";
  width: number;
  height: number;
  footY: number;
}
const PAINTED = (manifest.figures as Figure[]).filter((row) =>
  existsSync(new URL(`../../art/people-whole/${row.file}`, import.meta.url)),
);
/** Looks are chosen from the three-quarter views; side and back views are the same look turned. */
const FIGURES = PAINTED.filter((row) => row.angle === "three-quarter");
/** A look and build seen from the side ("profile") or from behind ("back"), where painted. */
function turned(figure: Figure, view: "profile" | "back"): Figure | undefined {
  return PAINTED.find(
    (row) =>
      row.look === figure.look &&
      row.build === figure.build &&
      row.angle === view,
  );
}

const SEXES = new Set(FIGURES.map((row) => row.sex));

// Engineering choices for picking a look, not model values: how far a look's
// drawn age may be from the person's, and a band's middle age when a look
// records none.
const AGE_WINDOW = 12;
// Presentation choices for the contact shadow, TUNABLE by eye: the band above
// the foot line read as feet (share of the figure's height), how far the
// shadow reaches past the stance, and how flat the floor makes it.
const FEET_BAND = 0.035;
const SHADOW_SPREAD = 1.3;
const SHADOW_FLATNESS = 0.22;
const AGE_OF = { child: 8, teen: 15, adult: 40, older: 70 } as const;

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

function ageBand(age: number): Figure["ageBand"] {
  return age < 13 ? "child" : age < 18 ? "teen" : age < 65 ? "adult" : "older";
}

/** What someone wears here: their workplace's or an official's outfits, else everyday clothes. */
function outfitsFor(
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
  const byPlace = (rules.outfitsByPlace as Record<string, string[]>)[place];
  if (job && byPlace && orgPlace(core, job.organizationId) === place)
    return byPlace;
  return rules.casualByAge[band];
}

/** Where the feet are in a figure's picture: the stance's left and right edge, in pixels. */
const stances = new Map<string, { left: number; right: number }>();
function stanceOf(figure: Figure): { left: number; right: number } {
  let stance = stances.get(figure.file);
  if (!stance) {
    const png = PNG.sync.read(
      readFileSync(
        new URL(`../../art/people-whole/${figure.file}`, import.meta.url),
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

/**
 * The person's whole figure on this spot, or null where none fits (a seated
 * spot, or no look for their sex and age), and nobody is drawn there.
 */
export function wholeFigureFor(
  core: CoreState,
  person: { id: string; birthDate: string; gender?: string; official: boolean },
  place: string,
  stage: PlaceStaging,
  spot: StagingSpot,
  /** Who they're with: which way to turn, and whether to show their side or back. */
  turn: { toward?: "left" | "right"; view?: "profile" | "back" } = {},
): WholeFigure | null {
  if (spot.pose && spot.pose !== "stand") return null;
  const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date));
  const band = ageBand(age);
  const outfits = outfitsFor(core, person.id, place, band, person.official);
  // A person whose sex has no looks painted (nonbinary) may wear any look.
  const sexOk = (row: Figure) =>
    !person.gender || !SEXES.has(person.gender) || row.sex === person.gender;
  // Children are drawn only as children, and adults never as children.
  const bandOk = (row: Figure) =>
    (row.ageBand === "child") === (band === "child");
  const near = (rows: Figure[]) => {
    const close = rows.filter(
      (row) => Math.abs((row.age ?? AGE_OF[row.ageBand]) - age) <= AGE_WINDOW,
    );
    if (close.length) return close;
    const nearest = Math.min(
      ...rows.map((row) => Math.abs((row.age ?? AGE_OF[row.ageBand]) - age)),
    );
    return rows.filter(
      (row) => Math.abs((row.age ?? AGE_OF[row.ageBand]) - age) === nearest,
    );
  };
  const dressed = FIGURES.filter(
    (row) => sexOk(row) && bandOk(row) && outfits.includes(row.outfit),
  );
  const pool = dressed.length
    ? near(dressed)
    : near(FIGURES.filter((row) => sexOk(row) && bandOk(row)));
  if (!pool.length) return null;
  // The same person always looks the same: their look and build come from their id.
  const looks = [...new Set(pool.map((row) => row.look))].sort();
  const look = looks[hash(`${person.id}:look`) % looks.length]!;
  const builds = pool.filter((row) => row.look === look);
  const front = builds[hash(`${person.id}:build`) % builds.length]!;
  const chosen = (turn.view && turned(front, turn.view)) || front;
  const meters =
    spot.floorMetersPercent ??
    (spot.floor !== undefined ? stage.floors?.[spot.floor] : undefined) ??
    stage.metersPercent;
  const horizonY = spot.floorHorizonY ?? stage.horizonY;
  const heightPercent =
    rules.heightMeters[band] *
    meters *
    (spot.y - horizonY) *
    (chosen.height / chosen.footY);
  const widthPercent =
    (heightPercent * (chosen.width / chosen.height)) / BACKDROP_ASPECT;
  // Turned toward who they're with; alone, the spot's own facing, else the middle.
  const toward =
    turn.toward ??
    (spot.facing === "left" || spot.facing === "right"
      ? spot.facing
      : spot.x < 50
        ? "right"
        : "left");
  const mirrored = chosen.facing !== toward;
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
    url: `/art/people-whole/${chosen.file}`,
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
