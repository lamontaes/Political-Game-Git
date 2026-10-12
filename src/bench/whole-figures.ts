// Whole-figure people (owner, Oct 12): one cut-out image per person, picked
// from their record (sex, age, role at the place), placed on the backdrop's
// staging spot by depth and turned to face the room.
import { existsSync } from "node:fs";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import {
  BACKDROP_ASPECT,
  type PlaceStaging,
  type StagingSpot,
} from "../presentation/backdrop-people";
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
const FIGURES = (manifest.figures as Figure[]).filter(
  (row) =>
    row.angle === "three-quarter" &&
    existsSync(new URL(`../../art/people-whole/${row.file}`, import.meta.url)),
);

// Engineering choices for picking a look, not model values: how far a look's
// drawn age may be from the person's, and a band's middle age when a look
// records none.
const AGE_WINDOW = 12;
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
    shadow: true;
  };
}

/**
 * The person's whole figure on this spot, or null where none fits (a seated
 * spot, or no look for their sex and age), and the people engine draws them.
 */
export function wholeFigureFor(
  core: CoreState,
  person: { id: string; birthDate: string; gender?: string; official: boolean },
  place: string,
  stage: PlaceStaging,
  spot: StagingSpot,
): WholeFigure | null {
  if (spot.pose && spot.pose !== "stand") return null;
  const age = ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.date));
  const band = ageBand(age);
  const outfits = outfitsFor(core, person.id, place, band, person.official);
  const sexOk = (row: Figure) => !person.gender || row.sex === person.gender;
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
  const chosen = builds[hash(`${person.id}:build`) % builds.length]!;
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
  // Turned toward the room: a spot's own facing, else toward the middle.
  const toward =
    spot.facing === "left" || spot.facing === "right"
      ? spot.facing
      : spot.x < 50
        ? "right"
        : "left";
  return {
    file: chosen.file,
    url: `/art/people-whole/${chosen.file}`,
    figure: {
      leftPercent: spot.x - widthPercent / 2,
      topPercent: spot.y - heightPercent * (chosen.footY / chosen.height),
      widthPercent,
      heightPercent,
      clipBelowPercent: spot.clipBelowY ?? null,
      clipBandEndPercent:
        spot.clipBelowY !== undefined && spot.clipBandEndY !== undefined
          ? spot.clipBandEndY
          : null,
      mirrored: chosen.facing !== toward,
      shadow: true,
    },
  };
}
