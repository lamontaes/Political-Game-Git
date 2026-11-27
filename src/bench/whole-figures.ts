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
import { originShares } from "../core2/opening-origin";
import { packPerson, type PackPerson } from "./people-pack";
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

import { parameter } from "../core2/parameters";

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

/** Each origin's skin tones in the bust bank, lightest 0 to darkest 2 (a registered stopgap: the bank's six shades per sex fall into thirds). */
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
/** A bank person's skin tone as the origins name them, lightest 0 to darkest 2. */
export function toneOf(person: BustPerson): number {
  return Math.min(2, Math.floor((person.tone * 3) / person.tones));
}

/**
 * The family origin a chosen bank person belongs to: the drawn one where its
 * tones include theirs, else of the origins whose tones do, the one with the
 * largest share of the state's adults (originShares). No dice.
 */
export function originForChosen(
  personId: string,
  drawn: string | undefined,
  stateKey: string,
): string | undefined {
  const person = bustPerson(personId);
  if (!person) return undefined;
  const tone = toneOf(person);
  if (drawn && ORIGIN_TONES[drawn]?.includes(tone)) return drawn;
  return (
    [...originShares(stateKey)]
      .filter(([origin]) => ORIGIN_TONES[origin]?.includes(tone))
      .sort((a, b) => b[1] - a[1])[0]?.[0] ??
    Object.keys(ORIGIN_TONES).find((origin) =>
      ORIGIN_TONES[origin]!.includes(tone),
    )
  );
}

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
        .filter((row) => tones.includes(toneOf(row)))
        .sort((a, b) => a.tone - b.tone || a.id.localeCompare(b.id))
    : fits;
  const from = toned.length ? toned : fits.length ? fits : bustPeople();
  if (!from.length) return null;
  return from[mixed(`${who.seed ?? who.id}:person`) % from.length]!;
}
/** The same person in the full-body pack, for the rooms: one person, one bust, one figure. */
export function packPersonOf(who: FigurePerson): PackPerson | null {
  const person = bustPersonOf(who);
  if (!person) return null;
  // The pack paints three skins, one per skin third; a shade it lacks is drawn as the pack's person of the same sex and skin third.
  return (
    packPerson(person.id) ??
    bustPeople()
      .filter(
        (row) =>
          row.sex === person.sex &&
          toneOf(row) === toneOf(person) &&
          packPerson(row.id),
      )
      .map((row) => packPerson(row.id)!)[0] ??
    null
  );
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
