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
  packPeople,
  packPerson,
  type PackFigure,
  type PackPerson,
} from "./people-pack";
import { frontUrl, type Plate, type PlateSpot } from "./mannequin-plates";
import type { Occluder } from "./occluders";

export type AgeBand = "child" | "teen" | "adult" | "older";

/** A person's age band on the game's date. */
export function ageBandOf(core: CoreState, birthDate: string): AgeBand {
  const age = ageOnDate(makeIsoDate(birthDate), makeIsoDate(core.date));
  return age < 13 ? "child" : age < 18 ? "teen" : age < 65 ? "adult" : "older";
}

/**
 * A look chosen in the creator: one of the pack's people, their everyday
 * clothes and their work clothes (people-pack.ts `lookKey` each), and a
 * palette color per part of the everyday clothes.
 */
export interface ChosenLook {
  person: string;
  outfit: string;
  work?: string;
  colors?: Readonly<Record<string, string>>;
}

/** Who is being drawn: their record, and whether they hold office. */
export interface FigurePerson {
  id: string;
  birthDate: string;
  gender?: string;
  official: boolean;
  /** The seed of the person's own appearance record, where they have one. */
  seed?: string;
  /** A look the person chose in the creator (the player), worn everywhere it is painted. */
  look?: ChosenLook;
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

/** The pack's word for a recorded gender. */
const PACK_SEX: Readonly<Record<string, string>> = rules.packSex;

/**
 * Which of the pack's people someone is: the one they chose in the creator,
 * else one of their sex (any, for a gender the pack does not paint) set once
 * from their appearance seed, so the same person is the same everywhere.
 */
export function packPersonOf(who: FigurePerson): PackPerson | null {
  const chosen = who.look && packPerson(who.look.person);
  if (chosen) return chosen;
  const sex = who.gender ? PACK_SEX[who.gender] : undefined;
  const fits = packPeople().filter((row) => !sex || row.sex === sex);
  const from = fits.length ? fits : packPeople();
  if (!from.length) return null;
  return from[mixed(`${who.seed ?? who.id}:person`) % from.length]!;
}

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
  if (who.official && rules.governmentPlaces.includes(place))
    return rules.dressOrder.official;
  const person = core.people.get(who.id);
  const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
  if (job && orgPlace(core, job.organizationId) === place)
    return rules.dressOrder.work;
  return rules.dressOrder.everyday;
}

/**
 * The person's figure in a pose: each dress in turn, and in a dress the look
 * chosen in the creator for that kind of clothes, else their own look (set
 * once from their seed); among
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
  // In each dress, the look chosen in the creator for that kind of clothes
  // (everyday or work) first, then their own look set once from their seed.
  const chosenFor = (dress: string) =>
    !who.look
      ? undefined
      : dress === rules.everydayDress
        ? who.look.outfit
        : who.look.work;
  const groups = dresses.flatMap((dress) => {
    const chosen = chosenFor(dress);
    const picked = chosen
      ? mine.filter(
          (row) =>
            lookKey(row) === chosen &&
            (row.dress === rules.everydayDress) ===
              (dress === rules.everydayDress),
        )
      : [];
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
    return [picked, worn.length ? worn : rows];
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
  const fits = (row: PackFigure) =>
    row.person === person.id && row.pose === spot.pose && propHere(row, place);
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

/** The person standing toward the viewer, as they would be dressed here: their portrait and their face. */
export function portraitFigure(
  core: CoreState,
  who: FigurePerson,
  place: string,
): PackFigure | null {
  if (ageBandOf(core, who.birthDate) === "child") return null;
  const person = packPersonOf(who);
  if (!person) return null;
  // An officeholder's face shows them as they serve, wherever the viewer is.
  const dresses = who.official
    ? rules.dressOrder.official
    : dressesFor(core, who, place);
  return portraitOf(person, who, dresses);
}
/**
 * A figure a portrait may show: standing, holding nothing (owner, Oct 29:
 * nobody sits in the character creator or a profile; "They should all be
 * standing").
 */
export const portraitPose = (row: PackFigure) =>
  row.seat === "none" && !row.prop;
/** A pack person's standing portrait in a look or dress. */
export function portraitOf(
  person: PackPerson,
  who: FigurePerson,
  dresses: readonly string[],
): PackFigure | null {
  return figureIn(
    person,
    who,
    dresses,
    portraitPose,
    (a, b) => turnApart(a.facing, 0) - turnApart(b.facing, 0) || byId(a, b),
  );
}

/**
 * The color each recolorable part is painted: the one chosen in the creator,
 * else one of the person's palette set once from their seed; someone 65 or
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
      const chosen = who.look?.colors?.[part];
      if (chosen && names.includes(chosen)) return [part, chosen];
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
