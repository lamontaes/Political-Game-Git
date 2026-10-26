// "Go to": the town's places from its organizations and the art library,
// who works there, who's there now and what the player can do there.
import { coreAPI, fillInPerson } from "../core2/state";
import { residentsRuntime } from "../core2/modules/residents";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { workSpansOnDateV1 } from "../core2/work-spans-v1";
import { properName } from "../director/words";
import { backdropStaging } from "./staging";
import { backdropFile, hasBackdrop, orgPlace, stagePeople } from "./scene";
import type { PlayerPacketV1 } from "../core2/player-v1";
import type { CoreState } from "../core2/types";

// Engineering page size for the list, not a model value.
const LISTED = 40;

function staffOf(core: CoreState, organizationId: string) {
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

/**
 * The town's and county's own offices, where every adult has civic business
 * on the golden path: records, public meetings, filing to run.
 */
const CIVIC = new Set([
  "service:municipal-government",
  "service:county-government",
  "sector:local-government-office",
]);
/** And the state's offices, where an officeholder's work takes them. */
const STATE_OFFICES = new Set(["sector:state-government-office"]);
/** The age of majority, when civic business (voting, filing) begins. */
const ADULT_AGE = 18;

/** Schools, where a household with a child of school age has business. */
const SCHOOLS = new Set([
  "service:school",
  "service:public-school",
  "service:private-school",
]);
/** Compulsory schooling ends by 18 in most states; high school runs through 18. */
const SCHOOL_AGE_UNDER = 19;

/** Whole years of age on a date. */
function ageOn(birthDate: string, date: string): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

/**
 * The town's pictured places the player has a reason to go: where they,
 * their household or their family work, the schools while someone at home is
 * of school age, where people they know work, where they can do something
 * right now, the town's and county's offices for an adult, and the state's
 * offices while they hold an office. Not every organization with a picture
 * (owner, Oct 13: "Why would you need to visit the market?").
 */
export function townPlaces(
  core: CoreState,
  playerId: string,
  packet?: PlayerPacketV1,
) {
  const player = core.people.get(playerId);
  if (!player) throw new Error("No such person.");
  const offers = packet?.kind === "choice" ? packet.offers : [];
  // Where the player, their household and their family work.
  const household = core.households.get(player.householdId)?.memberIds ?? [
    playerId,
  ];
  const ownWork = new Set(
    [...household, ...player.familyIds]
      .map((id) => core.people.get(id)?.jobId)
      .map((jobId) =>
        jobId ? core.jobs.get(jobId)?.organizationId : undefined,
      )
      .filter((id): id is string => !!id),
  );
  // Where they study: the town's schools while anyone at home is of school age.
  const studying = household.some((id) => {
    const birth = core.people.get(id)?.birthDate;
    return birth !== undefined && ageOn(birth, core.date) < SCHOOL_AGE_UNDER;
  });
  const adult = ageOn(player.birthDate, core.date) >= ADULT_AGE;
  const official = coreAPI(core)
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("byPerson", [playerId])
    .some((row) => (row as { status?: string }).status === "serving");
  return [...core.organizations.values()]
    .filter((org) => org.placeId === player.placeId)
    .flatMap((org) => {
      const place = orgPlace(core, org.id);
      if (!place || !hasBackdrop(place)) return [];
      const { full, counted } = staffOf(core, org.id);
      const known = full.filter((id) => player.knownIds.has(id));
      const actions = offers
        .filter((offer) => offer.targetId === org.id)
        .map((offer) => offer.actionId);
      const reason =
        ownWork.has(org.id) ||
        (studying && SCHOOLS.has(org.classification ?? "")) ||
        known.length > 0 ||
        actions.length > 0 ||
        (adult && CIVIC.has(org.classification ?? "")) ||
        (official && STATE_OFFICES.has(org.classification ?? ""));
      if (!reason) return [];
      return [
        {
          organizationId: org.id,
          name: properName(org.name),
          place,
          staff: full.length + counted.length,
          known: known.map((id) => {
            const row = core.people.get(id)!;
            return { personId: id, name: `${row.givenName} ${row.familyName}` };
          }),
          // What the player can do there right now: the core's own offers.
          actions,
        },
      ];
    })
    .sort(
      (a, b) =>
        b.known.length - a.known.length ||
        b.actions.length - a.actions.length ||
        b.staff - a.staff ||
        a.name.localeCompare(b.name),
    )
    .slice(0, LISTED);
}

/** Who is at work there at this minute, by their own work spans. */
function onShift(
  core: CoreState,
  ids: readonly string[],
  organizationId: string,
  minute: number,
): string[] {
  const api = coreAPI(core);
  return ids.filter((id) => {
    try {
      return workSpansOnDateV1(api, {
        controlledPersonId: id,
        date: core.date,
      }).owners.some(
        (owner) =>
          owner.organizationId === organizationId &&
          owner.spans.some(
            (span) => span.startMinute <= minute && minute < span.endMinute,
          ),
      );
    } catch {
      return false;
    }
  });
}

/** Look in on a place: its picture at this hour and whoever is working there. */
export function visitPlace(
  core: CoreState,
  playerId: string,
  organizationId: string,
  minute: number,
) {
  const org = core.organizations.get(organizationId);
  const place = orgPlace(core, organizationId);
  if (!org || !place || !hasBackdrop(place))
    throw new Error("That place has no picture.");
  const { full, counted } = staffOf(core, organizationId);
  // Two-level world: staff still in the counts are met here, so they are
  // filled in (OPUS-CORE's fillInPerson), up to the room's spots.
  const room = (backdropStaging(place)?.spots.length ?? 1) - 1;
  const met = counted.slice(0, Math.max(room - full.length, 0));
  for (const id of met) fillInPerson(core, id);
  const present = onShift(
    core,
    [...full, ...met.filter((id) => core.people.has(id))],
    organizationId,
    minute,
  ).filter((id) => id !== playerId);
  const ids = [playerId, ...present].map((id) => {
    const row = core.people.get(id)!;
    return {
      id,
      name: `${row.givenName} ${row.familyName}`,
      reason: id === playerId ? ("you" as const) : ("coworker" as const),
    };
  });
  return {
    organizationId,
    name: properName(org.name),
    place,
    backdrop: backdropFile(place, minute),
    names: Object.fromEntries(ids.map((row) => [row.id, row.name])),
    ...stagePeople(core, place, ids),
  };
}
