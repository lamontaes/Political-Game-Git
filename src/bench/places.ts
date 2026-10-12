// "Go to": the town's places from its organizations and the art library,
// who works there, who's there now and what the player can do there.
import { coreAPI, fillInPerson } from "../core2/state";
import { residentsRuntime } from "../core2/modules/residents";
import { workSpansOnDateV1 } from "../core2/work-spans-v1";
import { properName } from "../director/words";
import { backdropStaging } from "../presentation/backdrop-people";
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

/** The town's pictured places, the ones the player knows people at first. */
export function townPlaces(
  core: CoreState,
  playerId: string,
  packet?: PlayerPacketV1,
) {
  const player = core.people.get(playerId);
  if (!player) throw new Error("No such person.");
  const offers = packet?.kind === "choice" ? packet.offers : [];
  return [...core.organizations.values()]
    .filter((org) => org.placeId === player.placeId)
    .flatMap((org) => {
      const place = orgPlace(core, org.id);
      if (!place || !hasBackdrop(place)) return [];
      const { full, counted } = staffOf(core, org.id);
      const known = full.filter((id) => player.knownIds.has(id));
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
          actions: offers
            .filter((offer) => offer.targetId === org.id)
            .map((offer) => offer.actionId),
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
    return { id, name: `${row.givenName} ${row.familyName}` };
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
