import { existsSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import {
  homePlaceFor,
  workplacePlaceFor,
} from "../presentation/place-backdrops";
import {
  backdropStaging,
  spotFigure,
  spotPose,
  spotView,
  type StagingSpot,
} from "../presentation/backdrop-people";
import { engineRecipeFor } from "../presentation/appearance-engine/recipe";
import { placeWear } from "../presentation/dress-code";
import {
  composeEnginePerson,
  mirrorToFace,
  type EngineRecipe,
} from "../presentation/appearance-engine/pack";
import { PEOPLE_PACK } from "../presentation/appearance-engine/runtime";
import type { Raster } from "../presentation/appearance-engine/raster";
import type { CoreState, PersonState } from "../core2/types";
import { coreAPI, fillInPerson } from "../core2/state";
import { residentsRuntime } from "../core2/modules/residents";
import { HOUSING_MODULE_ID, dwellingKind } from "../core2/modules/housing";
import { realLocalities } from "../core2/places";
import type { PlayerPacketV1 } from "../core2/player-v1";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import { wholeFigureFor } from "./whole-figures";

type Person = Parameters<typeof engineRecipeFor>[0];
type Occupation = Parameters<typeof workplacePlaceFor>[0];

const PACK_DIR = new URL("../../art/people-engine/v1/", import.meta.url);
const BACKDROP_DIR = new URL("../../art/backdrops/", import.meta.url);
// The presentation's hasBackdrop reads Vite's file glob; the bench reads the manifest.
const PICTURED = new Set(
  manifest.backdrops
    .filter((row) => row.variant === "midday")
    .map((row) => row.place),
);
export const hasBackdrop = (place: string) => PICTURED.has(place);
const ACTIONS = scenePlaces.actions as Record<string, readonly string[]>;
const ORG_KINDS = scenePlaces.organizationKinds as Record<string, string>;
const ORG_PLACES = scenePlaces.placesWithoutKind as unknown as Record<
  string,
  readonly string[]
>;

/** A classification's own picture for one organization, chosen by its id among the painted ones. */
function classPlace(classification: string, orgId: string): string | null {
  const options = ORG_PLACES[classification]?.filter?.(hasBackdrop) ?? [];
  return options.length ? pickFor(orgId, options) : null;
}

/** The bench's picture of where a person is and who is there with them. */
export interface BenchScene {
  place: string;
  why: string;
  backdrop: { file: string; variant: string; url: string };
  people: BenchScenePerson[];
  /** People who are there but have no spot or no adult artwork yet. */
  unplaced: { personId: string; reason: string }[];
}
export interface BenchScenePerson {
  personId: string;
  name: string;
  spotId: string;
  figure: ReturnType<typeof spotFigure> & {
    mirrored?: boolean;
    shadow?: boolean;
  };
  figureUrl: string;
  /** "whole" for an owner-approved whole figure, "engine" for the layered people engine. */
  art?: "whole" | "engine";
}

export function orgPlace(
  core: CoreState,
  orgId: string | undefined,
): string | null {
  const org = orgId ? core.organizations.get(orgId) : undefined;
  const classification = org?.classification;
  if (!classification) return null;
  const own = classPlace(classification, org.id);
  if (own) return own;
  const kind =
    ORG_KINDS[classification] ??
    classification.slice(classification.indexOf(":") + 1);
  return workplacePlaceFor(null, null, kind);
}

const RESIDENCES = scenePlaces.officialResidences as unknown as Record<
  string,
  Record<"living" | "kitchen" | "bedroom", readonly string[]>
>;
const OFFICE_WORK = scenePlaces.officeWorkplaces as unknown as Record<
  string,
  readonly string[]
>;

/** The kinds of office a person is serving in now (core2-offices-v1 terms). */
function servingOfficeKinds(core: CoreState, personId: string): string[] {
  if (!core.modules.has(OFFICES)) return [];
  const state = coreAPI(core).moduleState(OFFICES);
  return (
    state.table("terms").query("byPerson", [personId]) as unknown as {
      status: string;
      officeId: string;
    }[]
  )
    .filter((term) => term.status === "serving")
    .map(
      (term) =>
        (
          state.table("offices").get(term.officeId) as
            { kind?: string } | undefined
        )?.kind ?? "",
    );
}

const COURTHOUSES = scenePlaces.courthouseByState as unknown as Record<
  string,
  readonly string[]
>;
/** The county courthouse in its state's usual style. */
function courthouseOf(core: CoreState): string | null {
  const state = stateOf(core.placeMetadata?.placeKey ?? "");
  const style = Object.entries(COURTHOUSES).find(
    ([place, states]) =>
      place !== "about" && place !== "default" && states.includes(state),
  )?.[0];
  return (
    [...(style ? [style] : []), ...COURTHOUSES.default!].find(hasBackdrop) ??
    null
  );
}

/** The first painted picture in the first list that has one ('@courthouse' is the state's style). */
function firstPainted(
  core: CoreState,
  lists: readonly (readonly string[] | undefined)[],
) {
  for (const list of lists) {
    const place = list
      ?.map((row) => (row === "@courthouse" ? courthouseOf(core) : row))
      .find((row): row is string => !!row && hasBackdrop(row));
    if (place) return place;
  }
  return null;
}

function workplaceOf(core: CoreState, person: PersonState): string {
  // An officeholder works where the office sits: the president in the Oval
  // Office, a governor in the governor's office.
  const office = firstPainted(
    core,
    servingOfficeKinds(core, person.id).map((kind) => OFFICE_WORK[kind]),
  );
  if (office) return office;
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  if (!job) return "office";
  const org = core.organizations.get(job.organizationId);
  const classification = org?.classification;
  const own = classification ? classPlace(classification, org!.id) : null;
  if (own) return own;
  const kind = classification
    ? (ORG_KINDS[classification] ??
      classification.slice(classification.indexOf(":") + 1))
    : null;
  return workplacePlaceFor(
    (job.occupationClassification ?? null) as Occupation,
    null,
    kind,
  );
}

/** The place's state (USPS code), from the core's place records. */
const states = new Map<string, string>();
function stateOf(placeKey: string): string {
  let usps = states.get(placeKey);
  if (usps === undefined) {
    usps =
      realLocalities()
        .find((row) => row.key === placeKey)
        ?.stateJurisdictionKey?.slice("US-".length) ?? "";
    states.set(placeKey, usps);
  }
  return usps;
}

type Room = "living" | "kitchen" | "bedroom";
type Third = "low" | "middle" | "high";
interface DwellingPictures {
  living: Record<Third, readonly string[]>;
  kitchen: readonly string[];
  bedroom: readonly string[];
}
const DWELLINGS = scenePlaces.dwellingPlaces as unknown as Record<
  string,
  DwellingPictures
>;
const ROOM_BY_HOUR = scenePlaces.homeRoomByHour as {
  fromHour: number;
  room: Room;
}[];
const TEEN_BEDROOM = scenePlaces.teenBedroom;

interface DwellingRow {
  householdId: string;
  tenure?: "own" | "rent";
  kind?: string;
  valueMinor?: number;
  rentMinor?: number;
}

/**
 * Each household's third (low, middle, high) among the town's homes of the
 * same kind and tenure: owners by value, renters by rent (OPUS-WORLD housing).
 * Read once a day.
 */
const thirds = new WeakMap<
  CoreState,
  { date: string; of: Map<string, Third> }
>();
function thirdOf(core: CoreState, householdId: string): Third {
  let cached = thirds.get(core);
  if (!cached || cached.date !== core.date) {
    const of = new Map<string, Third>();
    if (core.modules.has(HOUSING_MODULE_ID)) {
      const groups = new Map<string, DwellingRow[]>();
      for (const row of coreAPI(core)
        .moduleState(HOUSING_MODULE_ID)
        .table("dwellings")
        .rows() as unknown as DwellingRow[]) {
        const key = `${row.kind ?? "house"}:${row.tenure ?? ""}`;
        groups.set(key, [...(groups.get(key) ?? []), row]);
      }
      for (const rows of groups.values()) {
        const amount = (row: DwellingRow) =>
          (row.tenure === "rent" ? row.rentMinor : row.valueMinor) ?? 0;
        rows.sort(
          (a, b) =>
            amount(a) - amount(b) || a.householdId.localeCompare(b.householdId),
        );
        rows.forEach((row, i) =>
          of.set(
            row.householdId,
            i * 3 < rows.length
              ? "low"
              : i * 3 < rows.length * 2
                ? "middle"
                : "high",
          ),
        );
      }
    }
    cached = { date: core.date, of };
    thirds.set(core, cached);
  }
  return cached.of.get(householdId) ?? "middle";
}

/** Which room of the home a person is in at this minute of the day. */
function roomAt(minuteOfDay: number): Room {
  const hour = Math.floor(minuteOfDay / 60);
  let room: Room = "living";
  for (const row of ROOM_BY_HOUR) if (hour >= row.fromHour) room = row.room;
  return room;
}

/** A stable pick from a list by an id, so the same home always looks the same. */
function pickFor(id: string, options: readonly string[]): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return options[hash % options.length]!;
}

/**
 * The person's home picture: the room they are in at this minute, in the kind
 * of dwelling their household lives in (OPUS-WORLD housing), as fine as the
 * household's standing among the town's homes of that kind.
 */
export function homeOf(
  core: CoreState,
  personId: string,
  minuteOfDay = 12 * 60,
): string {
  const person = core.people.get(personId);
  const household = person?.householdId ?? "";
  // A household without a dwelling record reads as a house.
  const kind = (household && dwellingKind(coreAPI(core), household)) || "house";
  const pictures = DWELLINGS[kind] ?? DWELLINGS.house!;
  const room = roomAt(minuteOfDay);
  // A sitting president lives in the White House, a governor in the
  // governor's residence, in place of their own dwelling.
  // The residences' own rooms aren't painted yet: the outside of the
  // residence stands in by day and the large house's room at night.
  // stopgapId: SG-LOC-residence-rooms
  const residence = firstPainted(
    core,
    servingOfficeKinds(core, personId).map((kind) => RESIDENCES[kind]?.[room]),
  );
  if (residence) return residence;
  const age = person ? ageOn(person.birthDate, core.date) : 30;
  const living = () => {
    const state = stateOf(core.placeMetadata?.placeKey ?? "");
    const regional = Object.entries(
      scenePlaces.regionalHouses as unknown as Record<
        string,
        readonly string[]
      >,
    )
      .filter(([place, states]) => place !== "about" && states.includes(state))
      .map(([place]) => place);
    return [
      ...pictures.living[thirdOf(core, household)],
      ...(kind === "house" ? regional : []),
    ];
  };
  const tries =
    room === "bedroom"
      ? [
          age >= TEEN_BEDROOM.fromAge && age < TEEN_BEDROOM.underAge
            ? TEEN_BEDROOM.places
            : pictures.bedroom,
          pictures.bedroom,
          living(),
        ]
      : room === "kitchen"
        ? [pictures.kitchen, living()]
        : [living()];
  for (const list of tries) {
    const options = list.filter(hasBackdrop);
    // One picture per room for each household, the bedroom per person.
    if (options.length)
      return pickFor(
        room === "bedroom" ? personId : `${household}:${room}`,
        options,
      );
  }
  return homePlaceFor(null);
}

const BEDROOMS = new Set(
  Object.values(DWELLINGS).flatMap((row) => row.bedroom ?? []),
);
for (const place of TEEN_BEDROOM.places) BEDROOMS.add(place);
const isBedroom = (place: string) => BEDROOMS.has(place);

/** Every room of the person's home, for telling whether a scene is at home. */
function homeRooms(core: CoreState, personId: string): Set<string> {
  return new Set(
    ROOM_BY_HOUR.map((row) => homeOf(core, personId, row.fromHour * 60)),
  );
}

/** Whole years of age on a date. */
function ageOn(birthDate: string, date: string): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

/** What the person is doing right now, from the open pause or their last act. */
function doing(
  core: CoreState,
  personId: string,
  packet: PlayerPacketV1 | undefined,
): { actionId: string; targetId?: string } | undefined {
  if (packet?.kind === "stop" && packet.stop.work)
    return { actionId: "work-shift" };
  if (packet?.kind === "choice" && packet.choiceKind === "committed")
    return { actionId: "work-shift" };
  const ids = [...(core.logByPerson.get(personId) ?? [])];
  for (let i = ids.length - 1; i >= 0; i--) {
    const row = core.durableLog.get(ids[i]!) as
      | {
          kind: string;
          date: string;
          actorId?: string;
          actionId?: string;
          targetId?: string;
        }
      | undefined;
    if (row?.kind === "person.acted" && row.actorId === personId) {
      if (row.date !== core.date) return undefined;
      return { actionId: row.actionId ?? "", targetId: row.targetId };
    }
  }
  return undefined;
}

export function scenePlace(
  core: CoreState,
  personId: string,
  packet?: PlayerPacketV1,
  minuteOfDay = packet?.at.minuteOfDay ?? 12 * 60,
): { place: string; why: string; targetId?: string } {
  const person = core.people.get(personId)!;
  const act = doing(core, personId, packet);
  const tries = act ? (ACTIONS[act.actionId] ?? ["@home"]) : ["@home"];
  for (const step of tries) {
    const place =
      step === "@home"
        ? homeOf(core, personId, minuteOfDay)
        : step === "@workplace"
          ? workplaceOf(core, person)
          : step === "@target"
            ? orgPlace(core, act?.targetId)
            : step;
    if (place && hasBackdrop(place))
      return {
        place,
        why: act ? `${act.actionId}` : "at home",
        ...(act?.targetId ? { targetId: act.targetId } : {}),
      };
  }
  return { place: homeOf(core, personId, minuteOfDay), why: "at home" };
}

export function backdropFile(place: string, minuteOfDay: number) {
  const hour = Math.floor(minuteOfDay / 60);
  let wanted = "midday";
  for (const row of scenePlaces.variantByHour)
    if (hour >= row.fromHour) wanted = row.variant;
  const rows = manifest.backdrops.filter((row) => row.place === place);
  const row =
    rows.find((r) => r.variant === wanted) ??
    rows.find((r) => r.variant === "midday") ??
    rows[0]!;
  return {
    file: row.file,
    variant: row.variant,
    url: `/art/backdrops/${row.file}`,
  };
}

/** Who is there: the household at home, coworkers at work, else the act's other person. */
function presentIds(
  core: CoreState,
  personId: string,
  place: string,
  why: string,
  targetId?: string,
): string[] {
  const person = core.people.get(personId)!;
  const alive = (id: string) => core.people.get(id)?.alive === true;
  if (why === "work-shift" || why === "attend-scheduled-work-date-segment") {
    const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
    if (!job) return [];
    const full = [...core.jobs.values()]
      .filter(
        (row) =>
          row.organizationId === job.organizationId &&
          row.personId !== personId &&
          !row.endsAt,
      )
      .map((row) => row.personId)
      .filter(alive)
      .sort();
    // Two-level world: coworkers still in the counts are met here, so they
    // are filled in (OPUS-CORE's fillInPerson), up to the room's spots.
    const room = (backdropStaging(place)?.spots.length ?? 1) - 1;
    const counted = [...(residentsRuntime(core)?.jobs.values() ?? [])]
      .filter((row) => row.organizationId === job.organizationId)
      .map((row) => row.personId)
      .sort()
      .slice(0, Math.max(room - full.length, 0));
    for (const id of counted) if (!core.people.has(id)) fillInPerson(core, id);
    return [...full, ...counted.filter(alive)];
  }
  if (
    targetId &&
    targetId !== personId &&
    core.people.has(targetId) &&
    alive(targetId)
  )
    return [targetId];
  // At home the household is there, except in someone's own bedroom.
  if (homeRooms(core, personId).has(place) && !isBedroom(place))
    return (core.households.get(person.householdId)?.memberIds ?? [])
      .filter((id) => id !== personId)
      .filter(alive);
  return [];
}

/** Who a figure is: a resident, or an official known only by their term record. */
interface Looks {
  id: string;
  birthDate: string;
  gender?: string;
  seed?: string;
}
const OFFICES = "core2-offices-v1";
export function looksOf(core: CoreState, id: string): Looks | null {
  const person = core.people.get(id);
  if (person)
    return {
      id: person.id,
      birthDate: person.birthDate,
      ...(person.looks?.gender ? { gender: person.looks.gender } : {}),
      ...(person.looks?.appearanceSeed
        ? { seed: person.looks.appearanceSeed }
        : {}),
    };
  const term = coreAPI(core).moduleState(OFFICES).table("terms").get(id) as
    | {
        identity?: { birthDate: string; gender: string };
      }
    | undefined;
  return term?.identity
    ? { id, birthDate: term.identity.birthDate, gender: term.identity.gender }
    : null;
}

/** Engine recipes are read from the person's own seed and recorded looks. */
function recipeFor(
  core: CoreState,
  id: string,
  spot: StagingSpot,
  place: string,
): EngineRecipe | null {
  const looks = looksOf(core, id);
  if (!looks) return null;
  const base: Person = {
    id: looks.id,
    birthDate: looks.birthDate,
    ...(looks.gender ? { identity: { gender: looks.gender } } : {}),
    ...(looks.seed ? { appearance: { seed: looks.seed } } : {}),
  } as unknown as Person;
  const view = spotView(spot);
  const pose = spotPose(spot, undefined, looks.id, { view });
  // People dress for the place: formal where government is done in
  // public, business in offices, a coat outdoors in the cold months.
  const recipe = engineRecipeFor(base, core.date, PEOPLE_PACK, {
    pose,
    view,
    wear: placeWear(place, core.date),
  });
  if (!recipe) return null;
  if (spot.facing !== "left" && spot.facing !== "right") return recipe;
  return {
    ...recipe,
    mirrored: mirrorToFace(
      PEOPLE_PACK.presentations[recipe.presentation],
      recipe,
      spot.x,
      spot.facing === "left" ? spot.x - 10 : spot.x + 10,
      packFile,
    ),
  };
}

const packFile = (file: string) => existsSync(new URL(file, PACK_DIR));

/** Where the people engine stood in for a whole figure (place:pose), for the log. */
export const wholeFallbacks = new Set<string>();

/** An official: someone known only by their term, or a resident holding a seat. */
function isOfficial(core: CoreState, id: string): boolean {
  if (!core.people.has(id)) return true;
  const terms = coreAPI(core).moduleState(OFFICES).table("terms");
  return (
    terms.query("byPerson", [id]) as unknown as { status: string }[]
  ).some((row) => row.status === "serving");
}

/** Puts each id on the place's spots: the first on the hero spot, the rest behind. */
export function stagePeople(
  core: CoreState,
  place: string,
  ids: readonly { id: string; name: string }[],
): { people: BenchScenePerson[]; unplaced: BenchScene["unplaced"] } {
  const stage = backdropStaging(place);
  const people: BenchScenePerson[] = [];
  const unplaced: BenchScene["unplaced"] = [];
  if (!stage) return { people, unplaced };
  const hero = stage.spots.find((spot) => spot.hero) ?? stage.spots[0]!;
  // Others stand behind the lead first, nearest first, so the lead stays
  // the largest person in the picture.
  const rest = stage.spots
    .filter((spot) => spot !== hero && spot.pose !== "podium")
    .sort(
      (a, b) =>
        Number(a.y > hero.y) - Number(b.y > hero.y) ||
        (a.y > hero.y ? a.y - b.y : b.y - a.y),
    );
  const spots = [hero, ...rest];
  for (const [index, { id, name }] of ids.entries()) {
    const spot = spots[index];
    if (!spot) {
      unplaced.push({ personId: id, reason: "no-spot" });
      continue;
    }
    const spotId = spot.id ?? `${place}:spot:${stage.spots.indexOf(spot)}`;
    // The whole figure first (owner, Oct 12); the people engine where none fits.
    const looks = looksOf(core, id);
    const whole = looks
      ? wholeFigureFor(
          core,
          {
            id,
            birthDate: looks.birthDate,
            ...(looks.gender ? { gender: looks.gender } : {}),
            official: isOfficial(core, id),
          },
          place,
          stage,
          spot,
        )
      : null;
    if (whole) {
      people.push({
        personId: id,
        name,
        spotId,
        figure: whole.figure,
        figureUrl: whole.url,
        art: "whole",
      });
      continue;
    }
    const fallback = `${place}:${spot.pose ?? "stand"}`;
    if (!wholeFallbacks.has(fallback)) {
      wholeFallbacks.add(fallback);
      console.log(`whole figure: people engine stands in at ${fallback}`);
    }
    const recipe = recipeFor(core, id, spot, place);
    if (!recipe) {
      unplaced.push({ personId: id, reason: "no-adult-artwork" });
      continue;
    }
    people.push({
      personId: id,
      name,
      spotId,
      art: "engine",
      figure: spotFigure(stage, spot, recipe),
      figureUrl: `/api/figure?person=${encodeURIComponent(id)}&place=${encodeURIComponent(place)}&spot=${encodeURIComponent(spotId)}&date=${core.date}`,
    });
  }
  return { people, unplaced };
}

export function benchScene(
  core: CoreState,
  personId: string,
  packet?: PlayerPacketV1,
): BenchScene {
  const { place, why, targetId } = scenePlace(core, personId, packet);
  const minute = packet?.at.minuteOfDay ?? 12 * 60;
  const ids = [personId, ...presentIds(core, personId, place, why, targetId)];
  const { people, unplaced } = stagePeople(
    core,
    place,
    ids.map((id) => {
      const person = core.people.get(id)!;
      return { id, name: `${person.givenName} ${person.familyName}` };
    }),
  );
  return {
    place,
    why,
    backdrop: backdropFile(place, minute),
    people,
    unplaced,
  };
}

const rasters = new Map<string, Raster>();
function packImage(file: string): Raster {
  let raster = rasters.get(file);
  if (!raster) {
    const png = PNG.sync.read(readFileSync(new URL(file, PACK_DIR)));
    raster = {
      width: png.width,
      height: png.height,
      data: new Uint8ClampedArray(png.data),
    };
    rasters.set(file, raster);
  }
  return raster;
}

/** One person drawn for one spot, as a PNG. */
export function figurePng(
  core: CoreState,
  personId: string,
  place: string,
  spotId: string,
): Buffer {
  const stage = backdropStaging(place);
  const spot = stage?.spots.find(
    (row, index) => (row.id ?? `${place}:spot:${index}`) === spotId,
  );
  if (!spot || !looksOf(core, personId))
    throw new Error("Unknown person or spot.");
  const recipe = recipeFor(core, personId, spot, place);
  if (!recipe) throw new Error("No adult artwork for this person yet.");
  const { raster } = composeEnginePerson(
    PEOPLE_PACK,
    packImage,
    recipe,
    packFile,
  );
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data.buffer);
  return PNG.sync.write(png);
}

export function backdropPath(file: string): URL {
  if (!/^[a-z0-9-]+__[a-z]+\.jpg$/.test(file))
    throw new Error("Unknown backdrop.");
  return new URL(file, BACKDROP_DIR);
}
