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

export interface Figure {
  file: string;
  age?: number;
  look: string;
  build: string;
  sex: string;
  ageBand: "child" | "teen" | "adult" | "older";
  outfit: string;
  /** What the person in the picture is doing (manifest `activity`). */
  activity: string;
  /** The same person painted at other ages share a family (manifest `family`). */
  family?: string;
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
// drawn age may be from the person's (nearest window first), and a band's
// middle age when a look records none.
const AGE_WINDOWS = [6, 12];
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

/** What someone wears here, and whether they're at work: their workplace's or an official's outfits, else everyday clothes. */
function dressFor(
  core: CoreState,
  personId: string,
  place: string,
  band: Figure["ageBand"],
  official: boolean,
): { outfits: readonly string[]; atWork: boolean } {
  if (official && rules.governmentPlaces.includes(place))
    return { outfits: rules.officialOutfits, atWork: true };
  const person = core.people.get(personId);
  const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
  const atWork = Boolean(job && orgPlace(core, job.organizationId) === place);
  const byPlace = (rules.outfitsByPlace as Record<string, string[]>)[place];
  if (atWork && byPlace) return { outfits: byPlace, atWork };
  return { outfits: rules.casualByAge[band], atWork };
}

const SETTINGS = rules.activitySettings as unknown as Record<
  string,
  readonly string[] | undefined
>;
const ACT_ACTIVITIES = rules.actActivities as unknown as Record<
  string,
  readonly string[] | undefined
>;
/** Where a person is, for what they could be doing there: home, outdoors, a store, at work. */
function settingsOf(place: string, atWork: boolean, act?: string): Set<string> {
  const out = new Set<string>();
  if (rules.homePlaces.includes(place)) out.add("home");
  if (rules.storePlaces.includes(place)) out.add("store");
  if (
    rules.outdoorPlaces.includes(place) ||
    rules.outdoorPrefixes.some((prefix) => place.startsWith(prefix))
  )
    out.add("outdoors");
  if (atWork || (act && rules.workActs.includes(act))) out.add("work");
  return out;
}
/** A figure fits a setting when what it's doing is done there (no skateboard indoors). */
function activityFits(row: Figure, settings: Set<string>): boolean {
  const where = SETTINGS[row.activity];
  return !where || where.some((setting) => settings.has(setting));
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

/** Who is being drawn: their record, whether they hold office, and what they're doing now. */
export interface FigurePerson {
  id: string;
  birthDate: string;
  gender?: string;
  official: boolean;
  /** Their current act (`doing()` in scene.ts), if any today. */
  act?: string;
  /** The player keeps one look family as they age. */
  player?: boolean;
}

/**
 * The person's look here (a three-quarter figure), or null where none fits.
 * Identity first: each person has a stable order of looks from their id (the
 * player's look family leads it), and takes the first one that fits their
 * sex, age and what they could be doing here, and that nobody else in the
 * scene wears (`taken`).
 */
export function pickLook(
  core: CoreState,
  person: FigurePerson,
  place: string,
  taken: ReadonlySet<string> = new Set(),
): Figure | null {
  const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date));
  const band = ageBand(age);
  const { outfits, atWork } = dressFor(
    core,
    person.id,
    place,
    band,
    person.official,
  );
  const settings = settingsOf(place, atWork, person.act);
  // A person whose sex has no looks painted (nonbinary) may wear any look.
  const sexOk = (row: Figure) =>
    !person.gender || !SEXES.has(person.gender) || row.sex === person.gender;
  // Children are drawn only as children, adults never as children, and from
  // 18 never as teens (the figure grows up on the birthday).
  const bandOk = (row: Figure) =>
    (row.ageBand === "child") === (band === "child") &&
    !(row.ageBand === "teen" && (band === "adult" || band === "older"));
  const drawnAge = (row: Figure) => row.age ?? AGE_OF[row.ageBand];
  // Nearest in age first: within a few years, then wider (a father is not
  // drawn as a young man while an older look fits).
  const near = (rows: Figure[]) => {
    for (const window of AGE_WINDOWS) {
      const close = rows.filter(
        (row) => Math.abs(drawnAge(row) - age) <= window,
      );
      if (close.length) return close;
    }
    const nearest = Math.min(
      ...rows.map((row) => Math.abs(drawnAge(row) - age)),
    );
    return rows.filter((row) => Math.abs(drawnAge(row) - age) === nearest);
  };
  const fits = FIGURES.filter(
    (row) =>
      sexOk(row) &&
      bandOk(row) &&
      activityFits(row, settings) &&
      !taken.has(row.look),
  );
  const dressed = fits.filter((row) => outfits.includes(row.outfit));
  const pool = dressed.length ? near(dressed) : near(fits);
  if (!pool.length) return null;
  // The player's look family leads, whatever they wear (their identity holds
  // across ages; stopgap SG-PEOPLE-one-look-per-activity).
  const lineage = person.player ? lineageOf(person, fits) : undefined;
  const family = lineage ? fits.filter((row) => row.family === lineage) : [];
  const own = family.length ? near(family) : [];
  const from = own.length ? own : pool;
  // The same person always looks the same: their look and build come from their id.
  const looks = [...new Set(from.map((row) => row.look))].sort();
  const look = looks[hash(`${person.id}:look`) % looks.length]!;
  const builds = [
    ...new Set(from.filter((row) => row.look === look).map((row) => row.build)),
  ].sort();
  const build = builds[hash(`${person.id}:build`) % builds.length]!;
  // Where a look is painted doing several things, what they're doing now picks.
  const variants = from.filter(
    (row) => row.look === look && row.build === build,
  );
  const wanted = (person.act && ACT_ACTIVITIES[person.act]) || [];
  return (
    variants.find((row) => wanted.includes(row.activity)) ??
    variants[hash(`${person.id}:${person.act ?? ""}`) % variants.length]!
  );
}

/**
 * The player's look family: chosen once from their id among the families
 * painted at more than one age (so the teen and the adult are one person),
 * else among all, never from what fits today.
 */
function lineageOf(
  person: FigurePerson,
  fits: readonly Figure[],
): string | undefined {
  const sexOk = (row: Figure) =>
    !person.gender || !SEXES.has(person.gender) || row.sex === person.gender;
  const families = new Map<string, Set<string>>();
  for (const row of FIGURES.filter(sexOk))
    if (row.family)
      families.set(
        row.family,
        (families.get(row.family) ?? new Set()).add(row.ageBand),
      );
  const spanning = [...families]
    .filter(([, bands]) => bands.size > 1)
    .map(([family]) => family)
    .sort();
  const family = spanning.length
    ? spanning[hash(`${person.id}:family`) % spanning.length]
    : undefined;
  return family && fits.some((row) => row.family === family)
    ? family
    : undefined;
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
  turn: { toward?: "left" | "right"; view?: "profile" | "back" } = {},
  taken?: ReadonlySet<string>,
): WholeFigure | null {
  if (spot.pose && spot.pose !== "stand") return null;
  const front = pickLook(core, person, place, taken);
  if (!front) return null;
  const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date));
  return figureOn(front, ageBand(age), stage, spot, turn);
}

/** A chosen look drawn on a standing spot: sized for the person's age and the floor, turned, with its shadow. */
export function figureOn(
  front: Figure,
  band: Figure["ageBand"],
  stage: PlaceStaging,
  spot: StagingSpot,
  turn: { toward?: "left" | "right"; view?: "profile" | "back" } = {},
): WholeFigure | null {
  if (spot.pose && spot.pose !== "stand") return null;
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
