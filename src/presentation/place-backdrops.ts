import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { activeWorkRelationshipsAt } from "../simulation/life-queries";
import { activeDwellingOccupanciesAt } from "../simulation/resource-queries";
import { householdMembershipsAt } from "../simulation";
import { ELECTION_NIGHT_LOCATION_KEY } from "../simulation/campaign-speeches";
import { backdropUrl } from "./backdrop-urls";
import type {
  DwellingClassification,
  EntityId,
  OccupationClassification,
  SimulationMoment,
  World,
} from "../simulation/types";

/**
 * THE OWNER'S PLACE BACKDROPS: A PICTURE FOR WHERE YOU ARE.
 *
 * Fifty places, each painted at midday and most also in the morning, at night
 * and in the rain (art/backdrops, imported by
 * scripts/art-asset-factory/import-place-backdrops.mjs). Lamontae approved
 * them as placeholders on Sept. 27, 2026.
 *
 * A backdrop is only a picture. It has no marked standing spots and no
 * surfaces, so nobody stands in it and nothing on it can be clicked. A room
 * registered in the scene registry (the living room, the meeting room) always
 * wins; a backdrop fills the places that had no picture at all.
 *
 * Which place, and which light, is decided here and nowhere else.
 */

export type BackdropVariant =
  "midday" | "morning" | "night" | "rain" | "winter";

export interface PlaceBackdrop {
  readonly place: string;
  readonly variant: BackdropVariant;
  readonly url: string;
}

interface BackdropRecord {
  readonly place: string;
  readonly variant: string;
  readonly file: string;
}

const BY_PLACE = new Map<string, Map<string, string>>();
for (const record of manifest.backdrops as readonly BackdropRecord[]) {
  const url = backdropUrl(record.file);
  if (!url) continue;
  const variants = BY_PLACE.get(record.place) ?? new Map<string, string>();
  variants.set(record.variant, url);
  BY_PLACE.set(record.place, variants);
}

/** Every place that has at least its midday picture. */
export function backdropPlaces(): readonly string[] {
  return [...BY_PLACE.keys()].sort();
}

export function hasBackdrop(place: string): boolean {
  return BY_PLACE.get(place)?.has("midday") ?? false;
}

/** The daytime picture, for establishing shots that are not a moment in play. */
export function middayBackdropUrl(place: string): string | null {
  return BY_PLACE.get(place)?.get("midday") ?? null;
}

/** States whose capitol is a tower rather than a dome. */
const TOWER_CAPITOLS: ReadonlySet<string> = new Set(["FL", "LA", "ND", "NE"]);

/**
 * The capitol picture for a state, D.C. or a territory: its own building when
 * that place has a picture (`state-capitol-tx`, `state-capitol-dc`), else the
 * shared tower or dome. D.C.'s is the John A. Wilson Building, where the
 * Council sits.
 */
export function capitolPlaceFor(usps: string | null): string {
  const own = usps ? `state-capitol-${usps.toLowerCase()}` : null;
  if (own && hasBackdrop(own)) return own;
  return usps && TOWER_CAPITOLS.has(usps)
    ? "state-capitol-tower"
    : "state-capitol-dome";
}

/* -------------------------------------------------------------------------- */
/* Light and weather                                                           */
/* -------------------------------------------------------------------------- */

/**
 * PLACEHOLDER(wave2): sunrise and sunset by month, in local minutes, for about
 * 40 degrees north with daylight saving time. Replace with the place's own
 * latitude when the world carries it.
 */
const SUN_BY_MONTH: readonly (readonly [number, number])[] = [
  [440, 1020], // Jan.
  [415, 1055], // Feb.
  [430, 1145], // March
  [390, 1175], // April
  [355, 1205], // May
  [335, 1230], // June
  [345, 1230], // July
  [375, 1200], // Aug.
  [405, 1150], // Sept.
  [435, 1105], // Oct.
  [410, 1010], // Nov.
  [435, 1000], // Dec.
];

/** Three and a half hours after sunrise still reads as morning light. */
const MORNING_MINUTES = 210;

export type DaylightPhase = "morning" | "midday" | "night";

export function daylightPhase(moment: SimulationMoment): DaylightPhase {
  const month = Number(moment.date.slice(5, 7));
  const [sunrise, sunset] = SUN_BY_MONTH[month - 1] ?? [420, 1140];
  const minute = moment.minuteOfDay;
  if (minute < sunrise || minute >= sunset) return "night";
  if (minute < sunrise + MORNING_MINUTES) return "morning";
  return "midday";
}

/**
 * PLACEHOLDER(wave2): about one day in five is rainy, the same for every
 * place that shares a weather key on a date. There is no weather model yet;
 * when there is, it replaces this and nothing else changes.
 */
const RAIN_DAYS_IN = 5;

export function isRainyDay(weatherKey: string, date: string): boolean {
  let hash = 2166136261;
  for (const character of `${weatherKey}|${date}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash % RAIN_DAYS_IN === 0;
}

/** The picture of `place` for this moment, or null when there is none. */
export function placeBackdrop(
  place: string | null,
  moment: SimulationMoment,
  weatherKey: string,
): PlaceBackdrop | null {
  if (!place) return null;
  const variants = BY_PLACE.get(place);
  const midday = variants?.get("midday");
  if (!variants || !midday) return null;
  const phase = daylightPhase(moment);
  const month = Number(moment.date.slice(5, 7));
  const pick = (variant: BackdropVariant): PlaceBackdrop | null => {
    const url = variants.get(variant);
    return url ? { place, variant, url } : null;
  };
  if (phase === "night")
    return pick("night") ?? { place, variant: "midday", url: midday };
  if (isRainyDay(weatherKey, moment.date)) {
    const rain = pick("rain");
    if (rain) return rain;
  }
  if (month === 12 || month <= 2) {
    const winter = pick("winter");
    if (winter) return winter;
  }
  return pick(phase) ?? { place, variant: "midday", url: midday };
}

/* -------------------------------------------------------------------------- */
/* Which place                                                                 */
/* -------------------------------------------------------------------------- */

/** The kind of home, from the dwelling's recorded building type. */
export function homePlaceFor(
  classification: DwellingClassification | null,
): string {
  switch (classification) {
    case "residential:multi-unit":
    case "residential:apartment":
      return "small-apartment";
    case "residential:mobile-home":
    case "residential:other-mobile":
      return "mobile-home";
    // The town's homes record these kinds (`simulation/living-world/town-homes.ts`).
    case "residential:rowhouse":
      return "rowhouse";
    case "residential:large-house":
      return "large-house";
    case "residential:farmhouse":
      return "rural-farmhouse";
    // A detached or unknown house reads suburban.
    default:
      return "suburban-house";
  }
}

/** The person's current home picture. */
export function homePlaceForPerson(world: World, personId: EntityId): string {
  const dwelling = currentDwelling(world, personId);
  return homePlaceFor(dwelling?.classification ?? null);
}

function currentDwelling(world: World, personId: EntityId) {
  const householdIds = new Set(
    householdMembershipsAt(world, personId).map((entry) => entry.household.id),
  );
  const occupancy = activeDwellingOccupanciesAt(world)
    .filter((record) =>
      record.occupant.kind === "person"
        ? record.occupant.personId === personId
        : householdIds.has(record.occupant.householdId),
    )
    .at(-1);
  if (!occupancy) return null;
  return (
    world.history.dwellings.find(
      (dwelling) => dwelling.id === occupancy.dwellingId,
    ) ?? null
  );
}

/**
 * Where a job is done. O*NET codes go by their major group; the game's own
 * work kinds go by name.
 */
export function workplacePlaceFor(
  classification: OccupationClassification | null,
): string {
  if (!classification) return "office";
  const onet = /^custom:onet-(\d\d)/.exec(classification);
  if (onet) return ONET_MAJOR_GROUP_PLACE[onet[1]!] ?? "office";
  const name = classification.slice(classification.indexOf(":") + 1);
  for (const [pattern, place] of WORK_NAME_PLACE) {
    if (pattern.test(name)) return place;
  }
  return "office";
}

const ONET_MAJOR_GROUP_PLACE: Readonly<Record<string, string>> = {
  "21": "community-room",
  "25": "classroom",
  "29": "hospital-hallway",
  "31": "hospital-hallway",
  "33": "main-street",
  "35": "diner",
  "39": "main-street",
  "41": "store",
  "45": "rural-farmhouse",
  "47": "construction-site",
  "49": "factory-floor",
  "51": "factory-floor",
  "53": "main-street",
};

const WORK_NAME_PLACE: readonly (readonly [RegExp, string])[] = [
  [/cashier|retail|store|stock/, "store"],
  [/teach|school|education/, "classroom"],
  [/college|university/, "college-quad"],
  [/food|server|cook|diner|restaurant/, "diner"],
  [/nurs|hospital|medical|health/, "hospital-hallway"],
  [/carpent|apprentice|construct|electric|plumb/, "construction-site"],
  [/mechanic|factory|production|assembl|machin/, "factory-floor"],
  [/journalis|news|broadcast/, "tv-studio"],
  [/campaign/, "campaign-storefront"],
  [/court|judicial|legal/, "county-courthouse"],
  [/library|community/, "community-room"],
  [/hair|barber|salon/, "main-street"],
];

/**
 * Where the player is on election night: the venue, on the day they gave
 * their victory speech or conceded. The speech event carries the location key.
 * Null on every other day.
 */
export function electionNightLocationKey(
  world: World,
  personId: EntityId,
): string | null {
  const key = `place:${ELECTION_NIGHT_LOCATION_KEY}`;
  const today = world.currentDate;
  return world.history.events.some(
    (event) =>
      event.occurredAt === today &&
      event.tags.includes(key) &&
      event.participants.some(
        (participant) =>
          participant.personId === personId &&
          participant.role === "focus:subject",
      ),
  )
    ? ELECTION_NIGHT_LOCATION_KEY
    : null;
}

/** The person's current workplace picture, or null when they have no job. */
export function workplacePlaceForPerson(
  world: World,
  personId: EntityId,
): string | null {
  const [work] = activeWorkRelationshipsAt(world, personId);
  return work ? workplacePlaceFor(work.role.occupationClassification) : null;
}

/**
 * The picture for a scheduled activity's place, by the location key the
 * activity was written with. Null means this game has no picture for it, and
 * the screen stays as it was.
 */
export function placeForLocationKey(
  world: World,
  personId: EntityId,
  locationKey: string | null,
): string | null {
  if (!locationKey) return null;
  const exact = LOCATION_PLACE[locationKey];
  if (exact === "workplace") return workplacePlaceForPerson(world, personId);
  if (exact === "doors")
    return doorsPlaceFor(homePlaceForPerson(world, personId));
  if (exact === "home") return homePlaceForPerson(world, personId);
  if (exact) return exact;
  const prefix = locationKey.slice(0, locationKey.indexOf(":"));
  if (prefix === "municipal" || prefix === "municipal-notes") {
    if (/county/.test(locationKey)) return "county-commission";
    if (/township|town-board/.test(locationKey))
      return hasBackdrop("township-board")
        ? "township-board"
        : "council-chamber";
  }
  return LOCATION_PREFIX_PLACE[prefix] ?? null;
}

const LOCATION_PLACE: Readonly<Record<string, string>> = {
  home: "home",
  "formative:school-corridor": "classroom",
  "episode:school": "classroom",
  "life-circumstance:covered-shift": "workplace",
  "incident-response:current-office": "workplace",
  "ordinary-life:to-meeting-room": "main-street",
  // The posted public meeting's own plate was retired (FRONTDOOR44).
  "ordinary-life:meeting-room": "public-meeting-room",
  "east-end-community-room": "community-room",
  "office-to-east-end": "main-street",
  "executive-office": "governor-office",
  "executive-work:office": "governor-office",
  "campaign-doors": "doors",
  "campaign-remote-phone": "phone-bank-room",
  "private-field-call": "phone-bank-room",
  "campaign-call-desk": "phone-bank-room",
  "campaign-office": "campaign-storefront",
  "life-favor:proofreading": "diner",
  // Election night, and a town hall a school or civic group hosts.
  "campaign-election-night": "election-night-venue",
  "campaign-life:town-hall-school-gym": "school-gym-town-hall",
};

const LOCATION_PREFIX_PLACE: Readonly<Record<string, string>> = {
  journey: "main-street",
  "judicial-office": "county-courtroom",
  municipal: "council-chamber",
  "municipal-notes": "council-chamber",
};

/** You canvass the kind of street you live on. */
function doorsPlaceFor(homePlace: string): string {
  if (homePlace === "small-apartment" || homePlace === "rowhouse")
    return "door-knocking-urban";
  if (homePlace === "mobile-home" || homePlace === "rural-farmhouse")
    return "door-knocking-rural";
  return "door-knocking-suburban";
}

/** Weather is shared by everyone in the same home jurisdiction. */
export function weatherKeyForPerson(world: World, personId: EntityId): string {
  return (
    currentDwelling(world, personId)?.jurisdictionId ??
    world.currentMoment.timeZone
  );
}

/**
 * The backdrop for a screen that has no registered room: the activity's place
 * if it has one, in the light and weather of this moment.
 */
export function backdropForLocation(
  world: World,
  personId: EntityId,
  locationKey: string | null,
): PlaceBackdrop | null {
  return placeBackdrop(
    placeForLocationKey(world, personId, locationKey),
    world.currentMoment,
    weatherKeyForPerson(world, personId),
  );
}
