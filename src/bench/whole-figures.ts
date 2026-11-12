// People drawn in rooms: each person is one of the people pack's painted
// people (people-pack.ts), dressed for where they are, fitted to a mannequin
// plate's spot in that spot's pose (mannequin-plates.ts). Nothing here names a
// pack file: every choice reads the manifest's rows, so more clothes, colors
// or people are drawn with no change here. A figure is never mirrored; the
// pack paints each way a person faces.
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import type { CoreState } from "../core2/types";
import rules from "./data/whole-figures.json" with { type: "json" };
import { orgPlace } from "./scene";
import {
  colorParts,
  figureUrl,
  lookKey,
  packFigures,
  packPerson,
  type PackFigure,
  type PackPerson,
} from "./people-pack";
import {
  bustFor,
  bustOfLook,
  bustPeople,
  bustPerson,
  bustPick,
  type BustDress,
  type BustLook,
  type BustPerson,
  type PersonBust,
} from "./bust";
import { frontUrl, type Plate, type PlateSpot } from "./mannequin-plates";
import { parameter } from "../core2/parameters";
import type { Occluder } from "./occluders";

export type AgeBand = "child" | "teen" | "adult" | "older";

/** A person's age band on the game's date. */
export function ageBandOf(core: CoreState, birthDate: string): AgeBand {
  const age = ageOnDate(makeIsoDate(birthDate), makeIsoDate(core.date));
  return age < 13
    ? "child"
    : age < parameter("votingAge")
      ? "teen"
      : age < 65
        ? "adult"
        : "older";
}

/** Who is being drawn: their record, and whether they hold office. */
export interface FigurePerson {
  id: string;
  birthDate: string;
  gender?: string;
  /** Where the person's family comes from (their record's `looks.origin`). */
  origin?: string;
  official: boolean;
  /** The seed of the person's own appearance record, where they have one. */
  seed?: string;
  /** A look the person chose in the creator (the player): their bust everywhere (bust.ts). */
  look?: BustLook;
}

/** A well-mixed hash, so neighbors with alike ids still differ. */
function mixed(text: string): number {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return h >>> 0;
}

/** Each origin's skin tones in the bust bank, lightest 0 to darkest 2 (a registered stopgap: the bank paints three tones per sex). */
const ORIGIN_TONES: Readonly<Record<string, readonly number[]>> =
  rules.originTones;

/** The bank's word for a recorded gender. */
const PACK_SEX: Readonly<Record<string, string>> = rules.packSex;

/**
 * Which of the bust bank's people someone is: the one they chose in the
 * creator, else one of their sex (any, for a gender the bank does not paint)
 * set once from their appearance seed, so the same person is the same
 * everywhere.
 */
export function bustPersonOf(who: FigurePerson): BustPerson | null {
  const chosen = who.look && bustPerson(who.look.person);
  if (chosen) return chosen;
  const sex = who.gender ? PACK_SEX[who.gender] : undefined;
  const fits = bustPeople().filter((row) => !sex || row.sex === sex);
  // Their family's origin narrows the bank to the skin tones it paints for
  // it, so a family looks related; no origin leaves every person open
  // (SG-PEOPLE-origin-skin-tones).
  // stopgapId: SG-PEOPLE-origin-skin-tones
  const tones = who.origin ? ORIGIN_TONES[who.origin] : undefined;
  const toned = tones
    ? fits
        .filter((row) => tones.includes(Math.min(2, row.tone)))
        .sort((a, b) => a.tone - b.tone || a.id.localeCompare(b.id))
    : fits;
  const from = toned.length ? toned : fits.length ? fits : bustPeople();
  if (!from.length) return null;
  return from[mixed(`${who.seed ?? who.id}:person`) % from.length]!;
}
/** The same person in the full-body pack, for the rooms: one person, one bust, one figure. */
export function packPersonOf(who: FigurePerson): PackPerson | null {
  const person = bustPersonOf(who);
  return (person && packPerson(person.id)) ?? null;
}

// stopgapId: SG-PLAY-people-everyday-falls-back-to-work
/**
 * The dresses someone wears here, most fitting first: an official at a
 * government place a formal look, someone at their own workplace a business
 * one, anyone else everyday clothes (the kit); each falls back to the others
 * where the pack paints no figure in the spot's pose.
 */
function dressesFor(
  core: CoreState,
  who: FigurePerson,
  place: string,
): readonly string[] {
  return rules.dressOrder[dressKindFor(core, who, place)];
}
/** How someone is dressed here: as an official at a government place, for their own work at their workplace, or everyday. */
function dressKindFor(
  core: CoreState,
  who: FigurePerson,
  place: string,
): BustDress {
  if (who.official && rules.governmentPlaces.includes(place)) return "official";
  const person = core.people.get(who.id);
  const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
  if (job && orgPlace(core, job.organizationId) === place) return "work";
  return "everyday";
}
/**
 * A person's bust for a menu: the head of their painted person's skin tone,
 * the top they would wear where the viewer is (an officeholder as they
 * serve, wherever the viewer is), and the hair set once from their look or
 * their appearance seed. Null for a child, as a face is.
 */
export function bustOf(
  core: CoreState,
  who: FigurePerson,
  place: string,
): PersonBust | null {
  const band = ageBandOf(core, who.birthDate);
  if (band === "child") return null;
  const dress = who.official ? "official" : dressKindFor(core, who, place);
  // Someone 65 or older has the older face and gray hair.
  const older = band === "older";
  // A look made in the creator names its own pieces.
  if (who.look) return bustOfLook(who.look, dress, older);
  const person = bustPersonOf(who);
  if (!person) return null;
  return bustFor(
    person,
    dress,
    bustPick(`${who.seed ?? who.id}:bust`),
    // A teenager wears no beard.
    band !== "teen",
    older,
  );
}
/** Whether a figure is in the dress someone wears here first, not a fallback. */
export const dressedForPlace = (
  core: CoreState,
  who: FigurePerson,
  place: string,
  figure: PackFigure,
) => figure.dress === dressesFor(core, who, place)[0];

/**
 * The person's figure in a pose: each dress in turn, and in a dress their
 * own look (set once from their seed); among
 * those, the one turned most nearly as the spot faces, then on the same seat.
 */
function figureIn(
  person: PackPerson,
  who: FigurePerson,
  dresses: readonly string[],
  fits: (row: PackFigure) => boolean,
  rank: (a: PackFigure, b: PackFigure) => number,
): PackFigure | null {
  const mine = packFigures().filter(
    (row) => row.person === person.id && fits(row),
  );
  const seed = who.seed ?? who.id;
  // In each dress, their own look set once from their seed.
  const groups = dresses.map((dress) => {
    const rows = mine.filter((row) => row.dress === dress);
    const looks = [
      ...new Set(
        packFigures()
          .filter((row) => row.person === person.id && row.dress === dress)
          .map(lookKey),
      ),
    ].sort();
    const own = looks.length
      ? looks[mixed(`${seed}:${dress}`) % looks.length]
      : undefined;
    const worn = rows.filter((row) => lookKey(row) === own);
    return worn.length ? worn : rows;
  });
  const rows = groups.find((group) => group.length);
  return rows ? [...rows].sort(rank)[0]! : null;
}

/**
 * A figure holding something is drawn only where that thing belongs (owner,
 * Oct 29: phones at a rally or on the street, paper at a hearing or the
 * address desk, pen and paper at a desk; never at home), read from
 * data/whole-figures.json `propPlaces`; one holding nothing goes anywhere.
 */
const PROP_PLACES: Readonly<Record<string, readonly string[]>> =
  rules.propPlaces;
const propHere = (figure: PackFigure, place: string) =>
  !figure.prop || (PROP_PLACES[figure.prop] ?? []).includes(place);

const turnApart = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
const byId = (a: PackFigure, b: PackFigure) => (a.id < b.id ? -1 : 1);

// stopgapId: SG-PLAY-people-pack-six
// stopgapId: SG-PLAY-people-pack-v4-pose-gaps
/** The figure a person takes on a mannequin: the same pose, then the nearest facing, then the same seat; none where the pack paints them no such pose. */
export function figureForSpot(
  core: CoreState,
  who: FigurePerson,
  place: string,
  spot: PlateSpot,
): PackFigure | null {
  if (ageBandOf(core, who.birthDate) === "child") return null;
  const person = packPersonOf(who);
  if (!person) return null;
  // A figure drawn at a desk the drawing leaves out goes only where a desk
  // stands in front of it (the spot's desk edge).
  const fits = (row: PackFigure) =>
    row.person === person.id &&
    row.pose === spot.pose &&
    propHere(row, place) &&
    (!row.needsDesk || spot.deskEdge !== undefined);
  // At a desk, a figure drawn behind a table lies its forearms on the desk as
  // drawn (pack v4 README); where the person has one, only those are taken.
  const behind =
    spot.hands !== undefined &&
    packFigures().some((row) => fits(row) && row.drawnBehindTable);
  return figureIn(
    person,
    who,
    dressesFor(core, who, place),
    (row) => fits(row) && (!behind || !!row.drawnBehindTable),
    (a, b) =>
      turnApart(a.facing, spot.facing) - turnApart(b.facing, spot.facing) ||
      Number(b.seat === spot.seat) - Number(a.seat === spot.seat) ||
      byId(a, b),
  );
}

/**
 * The color each recolorable part is painted: one of the person's palette
 * set once from their seed; someone 65 or
 * older has gray hair where the palette has it.
 */
export function colorsFor(
  who: FigurePerson,
  person: PackPerson,
  band: AgeBand,
): Record<string, string> {
  const seed = who.seed ?? who.id;
  return Object.fromEntries(
    colorParts(person).map((part) => {
      const names = Object.keys(person.palettes[part]!);
      if (
        part === "hair" &&
        band === "older" &&
        names.includes(rules.olderHair)
      )
        return [part, rules.olderHair];
      return [part, names[mixed(`${seed}:${part}`) % names.length]!];
    }),
  );
}

/** The figure's picture in the person's colors. */
export function drawnUrl(
  figure: PackFigure,
  who: FigurePerson,
  band: AgeBand,
): string {
  const person = packPerson(figure.person)!;
  return figureUrl(figure, colorsFor(who, person, band));
}

/** A soft contact shadow on the floor, in percent of the picture. */
export interface ContactShadow {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
}
export interface FigureBox {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
  /** The furniture the plate paints in front of the mannequin, drawn back over the person; none where nothing is. */
  occluder: Occluder | null;
  /** Under the feet of someone standing; none for someone seated. */
  shadow: ContactShadow | null;
}

// Presentation, TUNABLE by eye: a standing person's contact shadow is this
// many head widths wide and this flat.
const SHADOW_HEADS = 2;
const SHADOW_FLATNESS = 0.22;

/**
 * The figure fitted to its mannequin (the plate README): scaled so head top
 * to feet (behind a desk, head top to resting hands) is the mannequin's, the
 * head centered on the mannequin's head. In percent of the plate's picture.
 */
export function fitOn(
  figure: PackFigure,
  plate: Plate,
  spot: PlateSpot,
): FigureBox {
  const [width, height] = plate.size;
  // Behind a desk: head top to resting hands where the manifest gives the
  // figure's hands row, else the mannequin's head width; cut off at the hands.
  const desk = spot.hands !== undefined && spot.feet === undefined;
  const scale = !desk
    ? ((spot.feet ?? spot.box[3]) - spot.head.top) /
      (figure.feet.y - figure.head.top)
    : figure.hands !== undefined
      ? (spot.hands! - spot.head.top) / (figure.hands - figure.head.top)
      : spot.head.width / figure.head.width;
  const left = spot.head.x - figure.head.x * scale;
  const top = spot.head.top - figure.head.top * scale;
  const across = (px: number) => (px / width) * 100;
  const down = (px: number) => (px / height) * 100;
  const [x0, y0, x1, y1] = spot.box;
  const shadowWidth = across(figure.head.width * scale * SHADOW_HEADS);
  const shadowHeight = shadowWidth * SHADOW_FLATNESS * (width / height);
  return {
    leftPercent: across(left),
    topPercent: down(top),
    widthPercent: across(figure.size[0] * scale),
    // The box ends at the hands behind a desk; the picture past it is not drawn.
    heightPercent: desk
      ? down(spot.hands! - top)
      : down(figure.size[1] * scale),
    occluder: spot.front
      ? {
          url: frontUrl(spot.front),
          leftPercent: across(x0),
          topPercent: down(y0),
          widthPercent: across(x1 - x0),
          heightPercent: down(y1 - y0),
        }
      : null,
    shadow:
      spot.seat === "none" && spot.feet !== undefined
        ? {
            leftPercent: across(left + figure.feet.x * scale) - shadowWidth / 2,
            topPercent: down(spot.feet) - shadowHeight / 2,
            widthPercent: shadowWidth,
            heightPercent: shadowHeight,
          }
        : null,
  };
}
