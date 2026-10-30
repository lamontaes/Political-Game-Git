import { servingTermsOf } from "../core2/modules/offices";
import { hash as fnv } from "./appearance";
import { ageOnDate } from "../core2/kernel/dates";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import {
  hasBackdrop,
  homePlaceFor,
  workplacePlaceFor,
} from "./backdrop-places";
import { backdropStaging } from "./staging";
import type { CoreState, PersonState } from "../core2/types";
import { coreAPI, fillInPerson } from "../core2/state";
import { residentsRuntime } from "../core2/modules/residents";
import { HOUSING_MODULE_ID, dwellingKind } from "../core2/modules/housing";
import { realLocalities } from "../core2/places";
import type { PlayerPacketV1 } from "../core2/player-v1";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import figureRules from "./data/whole-figures.json" with { type: "json" };
import {
  ageBandOf,
  drawnUrl,
  figureForSpot,
  fitOn,
  portraitFigure,
  type FigureBox,
  type FigurePerson,
} from "./whole-figures";
import { drawAhead, type PackFigure } from "./people-pack";
import { depthOf, plateFor, type PlateSpot } from "./mannequin-plates";

type Occupation = Parameters<typeof workplacePlaceFor>[0];

const BACKDROP_DIR = new URL("../../art/backdrops/", import.meta.url);
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
  /** People who are there but have no spot or no approved figure that fits one. */
  unplaced: { personId: string; reason: string }[];
}
/**
 * Why a person stands in a room, from the records. Nobody is staged without
 * a recorded reason.
 */
export type StageReason =
  /** The person whose scene it is. */
  | "you"
  /** Lives in the household whose home this is. */
  | "household"
  /** Holds a job at the organization this place belongs to. */
  | "coworker"
  /** The other person in the act the player chose (a talk, a visit). */
  | "act"
  /** The moment the scene plays is about them: they opened it or it names them. */
  | "moment"
  /** The filing office's clerk on record. */
  | "clerk"
  /** A voter the campaign act reached, by its cause record. */
  | "reached"
  /** Holds the office or seat this room is for. */
  | "official"
  /** The person a card or portrait is of. */
  | "subject"
  /** The address or broadcast the scene shows names them. */
  | "named";

export interface BenchScenePerson {
  personId: string;
  name: string;
  reason: StageReason;
  spotId: string;
  figure: FigureBox;
  figureUrl: string;
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
  // Each business its own picture of its kind.
  return pictureFor(core, workplacePlaceFor(null, null, kind), org.id);
}

const RESIDENCES = scenePlaces.officialResidences as unknown as Record<
  string,
  Record<"living" | "kitchen" | "bedroom", readonly string[]>
>;
const OFFICE_WORK = scenePlaces.officeWorkplaces as unknown as Record<
  string,
  readonly string[]
>;

/** The kinds of office a person is serving in now. */
function servingOfficeKinds(core: CoreState, personId: string): string[] {
  const state = core.modules.has(OFFICES)
    ? coreAPI(core).moduleState(OFFICES)
    : null;
  return servingTermsOf(coreAPI(core), personId).map(
    (term) =>
      (
        state?.table("offices").get(term.officeId) as
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
  // Each employer its own picture of its kind.
  return pictureFor(
    core,
    workplacePlaceFor(
      (job.occupationClassification ?? null) as Occupation,
      null,
      kind,
    ),
    job.organizationId,
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
  { date: string; of: Map<string, Third>; renters: Set<string> }
>();
function thirdOf(core: CoreState, householdId: string): Third {
  let cached = thirds.get(core);
  if (!cached || cached.date !== core.date) {
    const of = new Map<string, Third>();
    const renters = new Set<string>();
    if (core.modules.has(HOUSING_MODULE_ID)) {
      const groups = new Map<string, DwellingRow[]>();
      for (const row of coreAPI(core)
        .moduleState(HOUSING_MODULE_ID)
        .table("dwellings")
        .rows() as unknown as DwellingRow[]) {
        const key = `${row.kind ?? "house"}:${row.tenure ?? ""}`;
        if (row.tenure === "rent") renters.add(row.householdId);
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
    cached = { date: core.date, of, renters };
    thirds.set(core, cached);
  }
  return cached.of.get(householdId) ?? "middle";
}

const CONDITION = scenePlaces.roomCondition;

/**
 * How kept a household's rooms look, most wanted first, from its records: a
 * renter in the town's cheapest third of rents lives with the landlord's
 * neglect (rundown); a household in the top third with few enough people
 * keeps the room as painted (no condition); every other home is lived-in.
 * stopgapId: SG-PLAY-room-condition-rule
 */
export function roomCondition(core: CoreState, personId: string): string[] {
  const household = core.people.get(personId)?.householdId;
  if (!household) return [];
  const third = thirdOf(core, household);
  const renting = thirds.get(core)?.renters.has(household) ?? false;
  if (third === "low" && renting) return ["rundown", "lived-in"];
  const members = core.households.get(household)?.memberIds.length ?? 1;
  if (third === "high" && members <= CONDITION.tidyAtMostMembers) return [];
  return ["lived-in"];
}

const REGIONS = scenePlaces.regionalVariants as unknown as Record<
  string,
  readonly string[]
>;
/** The town's regional rebuilds of a place (region-new-england, region-alaska), from its state. stopgapId: SG-PLAY-region-states */
function regionVariants(core: CoreState): string[] {
  const state = stateOf(core.placeMetadata?.placeKey ?? "");
  return Object.entries(REGIONS)
    .filter(
      ([variant, states]) => variant !== "about" && states.includes(state),
    )
    .map(([variant]) => variant);
}

/**
 * The picture for a place in this world: the town's regional rebuild of it
 * where one is painted, and at the person's home, the household's condition.
 */
export function backdropFor(
  core: CoreState,
  place: string,
  minuteOfDay: number,
  personId?: string,
) {
  return backdropFile(place, minuteOfDay, [
    ...(personId && homeRooms(core, personId).has(place)
      ? homeCondition(core, personId)
      : []),
    ...regionVariants(core),
  ]);
}

/**
 * The one condition every room of a home is shown in: the most wanted of the
 * household's conditions that each of its rooms is painted in, so the living
 * room and the kitchen of one dwelling match (owner, Oct 28 sitting: a
 * run-down living room beside a clean kitchen). With none painted for every
 * room, every room is shown as painted.
 */
function homeCondition(core: CoreState, personId: string): string[] {
  const rooms = [...homeRooms(core, personId)];
  const shared = roomCondition(core, personId).find((condition) =>
    rooms.every((room) =>
      manifest.backdrops.some(
        (row) => row.place === room && row.variant === condition,
      ),
    ),
  );
  return shared ? [shared] : [];
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
  const hash = fnv(id);
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
  const age = person ? ageOnDate(person.birthDate, core.date) : 30;
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

/** What the person is doing right now, from the open pause or their last act. */
function doing(
  core: CoreState,
  personId: string,
  packet: PlayerPacketV1 | undefined,
): { actionId: string; targetId?: string } | undefined {
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
  atHome = false,
): { place: string; why: string; targetId?: string } {
  const person = core.people.get(personId)!;
  // The opening's day ends at home after the address (owner, Oct 14, 2026).
  const act = atHome ? undefined : doing(core, personId, packet);
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
        place: pictureFor(core, place, act?.targetId ?? step, minuteOfDay),
        why: act ? `${act.actionId}` : "at home",
        ...(act?.targetId ? { targetId: act.targetId } : {}),
      };
  }
  return { place: homeOf(core, personId, minuteOfDay), why: "at home" };
}

/** The light a picture is painted in at this minute of the day (morning, midday, night). */
function lightAt(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60);
  let wanted = "midday";
  for (const row of scenePlaces.variantByHour)
    if (hour >= row.fromHour) wanted = row.variant;
  return wanted;
}

const FAMILIES = new Map<string, readonly string[]>();
for (const family of scenePlaces.pictureFamilies.families)
  for (const place of family) FAMILIES.set(place, family);
const LIGHTS = new Map<string, Set<string>>();
for (const row of manifest.backdrops) {
  if (!LIGHTS.has(row.place)) LIGHTS.set(row.place, new Set());
  LIGHTS.get(row.place)!.add(row.variant);
}

/**
 * The picture for a place a scene names: any picture of its family
 * (data/scene-places.json pictureFamilies), chosen for this town and this
 * business or situation (`key`) so the same place looks the same every time
 * and two towns differ. At an hour whose light the town's choice is not
 * painted in, the next of the family in the town's order that is.
 */
export function pictureFor(
  core: CoreState,
  place: string,
  key: string,
  minuteOfDay?: number,
): string {
  const family = FAMILIES.get(place)?.filter(hasBackdrop);
  if (!family?.length) return place;
  const town = core.placeMetadata?.placeKey ?? "";
  const first = family.indexOf(pickFor(`${town}:${key}:${family[0]}`, family));
  const order = [...family.slice(first), ...family.slice(0, first)];
  if (minuteOfDay === undefined) return order[0]!;
  const light = lightAt(minuteOfDay);
  return order.find((row) => LIGHTS.get(row)?.has(light)) ?? order[0]!;
}

export function backdropFile(
  place: string,
  minuteOfDay: number,
  /** Conditions the room may be painted in (lived-in, rundown), most wanted first. */
  conditions: readonly string[] = [],
) {
  const wanted = lightAt(minuteOfDay);
  const rows = manifest.backdrops.filter((row) => row.place === place);
  // A condition is painted in midday light: by another light the room is
  // shown in that light when it has one, in its condition when it doesn't.
  const condition =
    wanted === "midday" || !rows.some((r) => r.variant === wanted)
      ? conditions
          .map((c) => rows.find((r) => r.variant === c))
          .find((r) => r !== undefined)
      : undefined;
  const row =
    condition ??
    rows.find((r) => r.variant === wanted) ??
    rows.find((r) => r.variant === "midday") ??
    rows[0]!;
  return {
    file: row.file,
    variant: row.variant,
    url: `/art/backdrops/${row.file}`,
  };
}

/**
 * Who works at an organization: its full people with an open job (living,
 * sorted) and the counted residents still in the counts whose job is there,
 * not filled in yet. The one reader of a workplace's staff for scenes and
 * the town's places.
 */
export function staffOf(core: CoreState, organizationId: string) {
  const full = [...core.jobs.values()]
    .filter((row) => row.organizationId === organizationId && !row.endsAt)
    .map((row) => row.personId)
    .filter((id) => core.people.get(id)?.alive);
  const counted = [...(residentsRuntime(core)?.jobs.values() ?? [])]
    .filter((row) => row.organizationId === organizationId)
    .map((row) => row.personId)
    .filter((id) => !core.people.has(id));
  return { full: full.sort(), counted: counted.sort() };
}

/** Who is there: the household at home, coworkers at work, else the act's other person. */
export function presentIds(
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
    const staff = staffOf(core, job.organizationId);
    const full = staff.full.filter((id) => id !== personId);
    // Two-level world: coworkers still in the counts are met here, so they
    // are filled in (OPUS-CORE's fillInPerson), up to the room's spots.
    const room = (backdropStaging(place)?.spots.length ?? 1) - 1;
    const counted = staff.counted.slice(0, Math.max(room - full.length, 0));
    for (const id of counted) fillInPerson(core, id);
    return [...full, ...counted.filter(alive)];
  }
  // A bedroom is someone's own room: nobody is drawn in it unless the records
  // put them there, and an act's target is not placed by the room's picture.
  if (isBedroom(place)) return [];
  if (
    targetId &&
    targetId !== personId &&
    core.people.has(targetId) &&
    alive(targetId)
  )
    return [targetId];
  // At home the household is there.
  if (homeRooms(core, personId).has(place))
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
  /** The seed of the person's appearance record, when it holds one. */
  seed?: string;
  /** The look chosen in the creator (the player), when there is one. */
  look?: FigurePerson["look"];
}
/** A look saved by the creator, or none where the record holds no readable one. */
function chosenLook(text: string | undefined): FigurePerson["look"] {
  if (!text) return undefined;
  try {
    const record = JSON.parse(text) as Record<string, unknown>;
    const { person, outfit, work, colors } = record;
    return typeof person === "string" && typeof outfit === "string"
      ? {
          person,
          outfit,
          ...(typeof work === "string" ? { work } : {}),
          ...(colors && typeof colors === "object"
            ? {
                colors: Object.fromEntries(
                  Object.entries(colors).filter(
                    (row): row is [string, string] =>
                      typeof row[1] === "string",
                  ),
                ),
              }
            : {}),
        }
      : undefined;
  } catch {
    return undefined;
  }
}
const OFFICES = "core2-offices-v1";
/** Which seats a room keeps for each kind of office (data/whole-figures.json). */
const SEAT_ROLES = figureRules.seatRoles as unknown as Readonly<
  Record<string, readonly string[]>
>;
export function looksOf(core: CoreState, id: string): Looks | null {
  const person = core.people.get(id);
  if (person) {
    const look = chosenLook(person.looks?.recipe);
    return {
      id: person.id,
      birthDate: person.birthDate,
      ...(person.looks?.gender ? { gender: person.looks.gender } : {}),
      ...(person.looks?.appearanceSeed
        ? { seed: person.looks.appearanceSeed }
        : {}),
      ...(look ? { look } : {}),
    };
  }
  const term = coreAPI(core).moduleState(OFFICES).table("terms").get(id) as
    | {
        identity?: { birthDate: string; gender: string };
      }
    | undefined;
  return term?.identity
    ? { id, birthDate: term.identity.birthDate, gender: term.identity.gender }
    : null;
}

/** An official: someone known only by their term, or a resident holding a seat. */
function isOfficial(core: CoreState, id: string): boolean {
  return !core.people.has(id) || servingTermsOf(coreAPI(core), id).length > 0;
}

/** The kinds of office someone serves in: by their own term, or by the person's serving terms. */
function officeKinds(core: CoreState, id: string): string[] {
  if (!core.modules.has(OFFICES)) return [];
  const state = coreAPI(core).moduleState(OFFICES);
  const own = state.table("terms").get(id) as { officeId: string } | undefined;
  if (!own) return servingOfficeKinds(core, id);
  const office = state.table("offices").get(own.officeId) as
    { kind: string } | undefined;
  return office ? [office.kind] : [];
}

/** The place a backdrop file paints (`<place>__<variant>.jpg`). */
export const placeOfBackdrop = (file: string) => file.split("__")[0]!;

/**
 * Puts each id on the mannequins of the picture's plate (mannequin-plates.ts):
 * a seat kept for an office to its holder, the speaker on the address or
 * lectern mannequin, everyone else on the first free mannequin whose pose
 * the pack paints them in. A picture with no plate draws nobody (owner,
 * Oct 28 and 29); a person with no figure for any free mannequin is not drawn.
 */
export function stagePeople(
  core: CoreState,
  /** The backdrop file the scene shows: people are fitted to its own plate. */
  backdropFile: string,
  ids: readonly { id: string; name: string; reason: StageReason }[],
  /** Whose speech it is: at the address desk or lectern, where the plate has one. */
  speaker?: string,
  /**
   * The scene's occasion from the director (address, signing, meeting,
   * visit, briefing, debate, ceremony; agreed with Words, Oct 29): it decides
   * whether an office holder sits, stands or takes a podium. Absent, the
   * data's default (seated; owner, Oct 29: "sitting is the idea right now").
   */
  occasion?: string,
): { people: BenchScenePerson[]; unplaced: BenchScene["unplaced"] } {
  const place = placeOfBackdrop(backdropFile);
  const posture = POSTURES[occasion ?? ""] ?? OCCASIONS.default;
  const plate = plateFor(backdropFile);
  const people: BenchScenePerson[] = [];
  const unplaced: BenchScene["unplaced"] = [];
  if (!plate) {
    for (const { id, reason } of ids)
      unplaced.push({
        personId: id,
        reason: reason ? "no-plate" : "no-reason",
      });
    return { people, unplaced };
  }
  const free = [...plate.spots];
  // The seats kept for an office whose holder is here: nobody else takes them.
  const held = new Set(
    ids.flatMap(({ id }) =>
      officeKinds(core, id).flatMap((kind) => SEAT_ROLES[kind] ?? []),
    ),
  );
  const placed: {
    id: string;
    name: string;
    reason: StageReason;
    who: Who;
    figure: PackFigure;
    spot: PlateSpot;
  }[] = [];
  for (const { id, name, reason } of ids) {
    if (!reason) {
      unplaced.push({ personId: id, reason: "no-reason" });
      continue;
    }
    const looks = looksOf(core, id);
    if (!looks) {
      unplaced.push({ personId: id, reason: "no-record" });
      continue;
    }
    const who = whoOf(core, id, looks);
    const kept = officeKinds(core, id).flatMap(
      (kind) => SEAT_ROLES[kind] ?? [],
    );
    // An office holder takes the spot the occasion's posture calls for: the
    // spot kept for their office in that posture, else one in that posture
    // anywhere in the room (owner, Oct 29: no rule ties an office holder to
    // one spot or posture). Then the speaker's desk or lectern for the
    // speaker, then any free mannequin; a kept spot whose holder is here
    // stays free for them, and one whose holder is away is anyone's last.
    const own = (spot: PlateSpot) => !!spot.role && kept.includes(spot.role);
    const open = (spot: PlateSpot) => !spot.role || !held.has(spot.role);
    const posed = kept.length
      ? [
          ...free.filter((spot) => own(spot) && inPosture(spot, posture)),
          ...free.filter(
            (spot) => !own(spot) && open(spot) && inPosture(spot, posture),
          ),
          // A podium occasion in a room with no lectern: standing.
          ...(posture === "podium"
            ? free.filter((spot) => open(spot) && inPosture(spot, "standing"))
            : []),
        ]
      : [];
    const order = [
      ...posed,
      ...free.filter(own),
      ...(id === speaker
        ? free.filter((spot) => SPEAKING.has(spot.pose) && open(spot))
        : []),
      ...free.filter((spot) => !spot.role),
      ...free.filter((spot) => spot.role && !own(spot) && open(spot)),
    ];
    const found = order
      .map((spot) => ({ spot, figure: figureForSpot(core, who, place, spot) }))
      .find((row) => row.figure);
    if (!found) {
      unplaced.push({
        personId: id,
        reason: free.length ? "no-figure" : "no-spot",
      });
      continue;
    }
    free.splice(free.indexOf(found.spot), 1);
    placed.push({
      id,
      name,
      reason,
      who,
      figure: found.figure!,
      spot: found.spot,
    });
  }
  // Drawn far to near, so nearer people overlap farther ones.
  const depth = depthOf;
  const order = [...placed].sort((a, b) => depth(a.spot) - depth(b.spot));
  for (const { id, name, reason, who, figure, spot } of order)
    people.push({
      personId: id,
      name,
      reason,
      spotId: spot.id,
      figure: fitOn(figure, plate, spot),
      figureUrl: drawnUrl(figure, who, ageBandOf(core, who.birthDate)),
    });
  return { people, unplaced };
}
/** How each occasion places an office holder (data/whole-figures.json `occasions`). */
const OCCASIONS = figureRules.occasions;
const POSTURES: Readonly<Record<string, string>> = OCCASIONS.postures;
/** Whether a spot is in a posture: seated on any seat, at a lectern, or standing. */
function inPosture(spot: PlateSpot, posture: string): boolean {
  if (posture === "seated") return spot.seat !== "none";
  if (posture === "podium") return spot.pose === "lectern";
  return spot.seat === "none" && spot.pose !== "lectern";
}
/** The poses a speaker takes: behind the address desk or at a lectern. */
const SPEAKING = new Set(["address", "lectern"]);

type Who = FigurePerson;
/** A person as the figures read them: age, sex, seed, chosen look and office. */
function whoOf(core: CoreState, id: string, looks: Looks): Who {
  return {
    id,
    birthDate: looks.birthDate,
    ...(looks.gender ? { gender: looks.gender } : {}),
    official: isOfficial(core, id),
    // The world's seed with their appearance record's seed (their id where
    // they have none): the same person looks the same all through one world
    // and differs between worlds, even an official whose appearance seed is
    // drawn from their office's term id, the same in every world.
    seed: `${core.seed}:${looks.seed ?? id}`,
    ...(looks.look ? { look: looks.look } : {}),
  };
}

/** A person's face for a map or list: their own figure in their own colors, and where its head is. */
export interface PersonFace {
  url: string;
  /** The head in the figure's pixels: top, middle and width. */
  head: readonly [number, number, number];
  width: number;
  height: number;
}
/** A figure's face: the figure itself, cropped by the screen to its own head box. */
export function faceOfFigure(figure: PackFigure, url: string): PersonFace {
  return {
    url,
    head: [figure.head.top, figure.head.x, figure.head.width],
    width: figure.size[0],
    height: figure.size[1],
  };
}
/** The person standing as they are dressed in `place`, cropped to their head; null for a child. */
export function faceOf(
  core: CoreState,
  id: string,
  place: string,
): PersonFace | null {
  const looks = looksOf(core, id);
  if (!looks) return null;
  const who = whoOf(core, id, looks);
  const figure = portraitFigure(core, who, place);
  if (!figure) return null;
  const url = drawnUrl(figure, who, ageBandOf(core, who.birthDate));
  drawAhead(url);
  return faceOfFigure(figure, url);
}

export function benchScene(
  core: CoreState,
  personId: string,
  packet?: PlayerPacketV1,
  /** The opening day: home after the address, by rule (owner, Oct 14, 2026). */
  openingEvening?: number,
): BenchScene {
  const minute = packet?.at.minuteOfDay ?? openingEvening ?? 12 * 60;
  const { place, why, targetId } = scenePlace(
    core,
    personId,
    packet,
    minute,
    openingEvening !== undefined,
  );
  const working =
    why === "work-shift" || why === "attend-scheduled-work-date-segment";
  const ids = [personId, ...presentIds(core, personId, place, why, targetId)];
  const backdrop = backdropFor(core, place, minute, personId);
  const { people, unplaced } = stagePeople(
    core,
    backdrop.file,
    ids.map((id) => {
      const person = core.people.get(id)!;
      // The same reasons presentIds draws them by.
      const reason: StageReason =
        id === personId
          ? "you"
          : working
            ? "coworker"
            : id === targetId
              ? "act"
              : "household";
      return { id, name: `${person.givenName} ${person.familyName}`, reason };
    }),
  );
  return {
    place,
    why,
    backdrop,
    people,
    unplaced,
  };
}

export function backdropPath(file: string): URL {
  if (!/^[a-z0-9-]+__[a-z-]+\.jpg$/.test(file))
    throw new Error("Unknown backdrop.");
  return new URL(file, BACKDROP_DIR);
}
