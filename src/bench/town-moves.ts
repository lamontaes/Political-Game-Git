import { coreAPI } from "../core2/state";
import type { EntityId } from "../core2/kernel/brands";
import { lawChain } from "../core2/modules/laws";
import { MOVED_AWAY_EVENT } from "../core2/modules/moves";
import {
  COUNTED_MOVES_MODULE_ID,
  countedMoves,
} from "../core2/modules/counted-moves";
import { townFacts } from "../core2/law-reach/group-b-people";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import type { CoreState } from "../core2/types";
import { wordMovedAway } from "./archive-words";

/** The town's moved-away records since a date, newest last. */
function departuresSince(core: CoreState, town: string, from: string) {
  return [...(core.logByKind.get(MOVED_AWAY_EVENT) ?? [])]
    .map((id) => core.durableLog.get(id as EntityId))
    .filter(
      (row): row is NonNullable<typeof row> =>
        !!row && row.placeId === town && row.date >= from,
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * The town's size and this calendar year's moves: everyone modeled there
 * now (named and counted), the people who arrived and the people who left,
 * from the counted moves' records and the named residents' moved-away
 * records.
 */
export function townMoves(core: CoreState) {
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const year = core.date.slice(0, 4);
  const from = `${year}-01-01`;
  let arrivals = 0;
  let departures = 0;
  const recordIds: string[] = [];
  if (core.modules.has(COUNTED_MOVES_MODULE_ID))
    for (const move of countedMoves(api)) {
      if (move.date < from) continue;
      if (move.direction === "in" && move.toPlace === town)
        arrivals += move.people;
      else if (move.direction === "out" && move.fromPlace === town)
        departures += move.people;
      else continue;
      recordIds.push(move.id);
    }
  for (const row of departuresSince(core, town, from)) {
    departures += row.personIds?.length ?? 0;
    recordIds.push(row.id);
  }
  return {
    year,
    population: Math.round(townFacts(api, town).modeled),
    arrivals: Math.round(arrivals),
    departures: Math.round(departures),
    recordIds,
  };
}

/**
 * The paper's line for each person the viewer knows who moved away this
 * year, newest first, worded by the English engine from the record.
 */
export function knownDepartures(core: CoreState, viewerId: string) {
  const viewer = core.people.get(viewerId);
  if (!viewer) return [];
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const from = `${core.date.slice(0, 4)}-01-01`;
  return departuresSince(core, town, from)
    .flatMap((row) =>
      (row.personIds ?? [])
        .filter(
          (id) =>
            id !== viewerId &&
            (viewer.knownIds.has(id as never) ||
              viewer.familyIds.has(id as never)),
        )
        .map((id) => {
          const place = row.topic
            ? corePlaceByJurisdictionId(row.topic as EntityId)
            : null;
          const story = wordMovedAway(core, row, id, place?.displayName);
          return (
            story && {
              id: `${row.id}:${id}`,
              recordId: row.id,
              personId: id,
              date: row.date,
              kind: row.kind,
              ...story,
            }
          );
        }),
    )
    .filter((row) => row !== null)
    .reverse();
}
