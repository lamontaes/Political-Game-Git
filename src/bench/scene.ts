import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import {
  homePlaceFor,
  workplacePlaceFor,
} from "../presentation/place-backdrops";
import { backdropStaging, type StagingSpot } from "./staging";
import type { CoreState, PersonState } from "../core2/types";
import { coreAPI, fillInPerson } from "../core2/state";
import { residentsRuntime } from "../core2/modules/residents";
import { dwellingKind } from "../core2/modules/housing";
import { realLocalities } from "../core2/places";
import type { PlayerPacketV1 } from "../core2/player-v1";
import scenePlaces from "./data/scene-places.json" with { type: "json" };
import { wholeFigureFor, type WholeFigure } from "./whole-figures";

type Occupation = Parameters<typeof workplacePlaceFor>[0];

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
const ORG_PLACES = scenePlaces.placesWithoutKind as Record<string, string>;

/** The bench's picture of where a person is and who is there with them. */
export interface BenchScene {
  place: string;
  why: string;
  backdrop: { file: string; variant: string; url: string };
  people: BenchScenePerson[];
  /** People who are there but have no spot or no approved figure that fits one. */
  unplaced: { personId: string; reason: string }[];
}
export interface BenchScenePerson {
  personId: string;
  name: string;
  spotId: string;
  figure: WholeFigure["figure"];
  figureUrl: string;
  /** Only owner-approved whole figures are ever drawn (owner, Oct 13). */
  art: "whole";
}

export function orgPlace(
  core: CoreState,
  orgId: string | undefined,
): string | null {
  const org = orgId ? core.organizations.get(orgId) : undefined;
  const classification = org?.classification;
  if (!classification) return null;
  if (ORG_PLACES[classification]) return ORG_PLACES[classification]!;
  const kind =
    ORG_KINDS[classification] ??
    classification.slice(classification.indexOf(":") + 1);
  return workplacePlaceFor(null, null, kind);
}

function workplaceOf(core: CoreState, person: PersonState): string {
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  if (!job) return "office";
  const org = core.organizations.get(job.organizationId);
  const classification = org?.classification;
  if (classification && ORG_PLACES[classification])
    return ORG_PLACES[classification]!;
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

/** The person's home picture, from the kind of dwelling their household lives in (OPUS-WORLD housing). */
const states = new Map<string, string>();
/** The place's state (USPS code), from the core's place records. */
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

export function homeOf(core: CoreState, personId: string): string {
  const household = core.people.get(personId)?.householdId ?? "";
  // A household without a dwelling record reads as a house.
  const kind = (household && dwellingKind(coreAPI(core), household)) || "house";
  const places = scenePlaces.dwellingPlaces as unknown as Record<
    string,
    readonly string[]
  >;
  const state = stateOf(core.placeMetadata?.placeKey ?? "");
  const regional = Object.entries(
    scenePlaces.regionalHouses as unknown as Record<string, readonly string[]>,
  )
    .filter(([place, states]) => place !== "about" && states.includes(state))
    .map(([place]) => place);
  const options = [
    ...(places[kind] ?? []),
    ...(kind === "house" ? regional : []),
  ].filter(hasBackdrop);
  if (!options.length) return homePlaceFor(null);
  // The same home always looks the same: chosen from the household's own id.
  let hash = 0;
  for (const char of household) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return options[hash % options.length]!;
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
): { place: string; why: string; targetId?: string } {
  const person = core.people.get(personId)!;
  const act = doing(core, personId, packet);
  const tries = act ? (ACTIONS[act.actionId] ?? ["@home"]) : ["@home"];
  for (const step of tries) {
    const place =
      step === "@home"
        ? homeOf(core, personId)
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
  return { place: homeOf(core, personId), why: "at home" };
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
  if (place === homeOf(core, personId))
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

/** An official: someone known only by their term, or a resident holding a seat. */
function isOfficial(core: CoreState, id: string): boolean {
  if (!core.people.has(id)) return true;
  const terms = coreAPI(core).moduleState(OFFICES).table("terms");
  return (
    terms.query("byPerson", [id]) as unknown as { status: string }[]
  ).some((row) => row.status === "serving");
}

/**
 * Puts each id on the place's spots: the first on the hero spot, the rest
 * behind. Only approved whole figures are drawn (owner, Oct 13): a person no
 * figure fits on a spot moves to the next spot that one fits, and where none
 * does, nobody is drawn for them.
 */
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
  const free: StagingSpot[] = [hero, ...rest];
  for (const { id, name } of ids) {
    const looks = looksOf(core, id);
    if (!looks) {
      unplaced.push({ personId: id, reason: "no-record" });
      continue;
    }
    const who = {
      id,
      birthDate: looks.birthDate,
      ...(looks.gender ? { gender: looks.gender } : {}),
      official: isOfficial(core, id),
    };
    let placed = false;
    for (const [index, spot] of free.entries()) {
      const whole = wholeFigureFor(core, who, place, stage, spot);
      if (!whole) continue;
      free.splice(index, 1);
      people.push({
        personId: id,
        name,
        spotId: spot.id ?? `${place}:spot:${stage.spots.indexOf(spot)}`,
        figure: whole.figure,
        figureUrl: whole.url,
        art: "whole",
      });
      placed = true;
      break;
    }
    if (!placed)
      unplaced.push({
        personId: id,
        reason: free.length ? "no-whole-figure" : "no-spot",
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

export function backdropPath(file: string): URL {
  if (!/^[a-z0-9-]+__[a-z]+\.jpg$/.test(file))
    throw new Error("Unknown backdrop.");
  return new URL(file, BACKDROP_DIR);
}
