/**
 * The other side's answer to a governor's State of the State (owner, Nov 8:
 * "speeches against the governor"). On the day of the address, the state
 * legislator of the other party who leads their side (the minority leader, else
 * the one whose ideal is farthest from the governor's) answers on the first
 * thing the governor asked for that they stand against, by their own record of
 * views (the officials engine's ideal and signature issues). Nothing is rolled:
 * no one of the other party who opposes an ask, no answer. The answer is a
 * public record the news carries, and a case the speech engine puts to the
 * governor, so the pressure is on record the same way a protest's is.
 */
import { placeStateKey } from "../core2/place-map";
import { officialsIn, type OfficialRow } from "../core2/modules/officials";
import { makeCase } from "../core2/modules/speech";
import { P } from "../core2/parameters";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { standsAt } from "./opening-story";

export const ADDRESS_RESPONSE_EVENT = "governor.response";
const CHAMBERS = ["legislature-upper", "legislature-lower"] as const;

/** Who answers: the other party's leader on the floor, else the farthest from the governor's ideal. */
export function responderTo(
  api: ReturnType<typeof coreAPI>,
  stateKey: string,
  governor: OfficialRow,
): OfficialRow | undefined {
  const other = CHAMBERS.flatMap((chamber) =>
    officialsIn(api, `${stateKey}:${chamber}`),
  ).filter(
    (row) =>
      row.party &&
      governor.party &&
      row.party !== governor.party &&
      api.state.people.get(row.id as PersonId)?.alive,
  );
  return other.sort(
    (a, b) =>
      Number(b.leadership === "minority-leader") -
        Number(a.leadership === "minority-leader") ||
      Math.abs(b.ideal - governor.ideal) - Math.abs(a.ideal - governor.ideal) ||
      a.id.localeCompare(b.id),
  )[P.zero];
}

/**
 * Record the answer to today's governor's address, once. `asks` are the
 * questions the governor asked for; the answer is on the first the responder
 * stands against.
 */
export function recordAddressResponse(
  core: CoreState,
  address: {
    readonly id: string;
    readonly speakerId: PersonId;
    readonly asks: readonly string[];
  },
  governor: OfficialRow,
): string | null {
  const api = coreAPI(core);
  const stateKey = placeStateKey(core.placeMetadata.placeKey);
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  if (!stateKey || !player || !address.asks.length) return null;
  const responder = responderTo(api, stateKey, governor);
  if (!responder) return null;
  const stands = standsAt(api, responder, "state", stateKey);
  const against = address.asks.find((question) =>
    stands.some((row) => row.question === question && row.stance < P.zero),
  );
  if (!against) return null;
  const id = `${ADDRESS_RESPONSE_EVENT}:${core.date}`;
  if (core.eventIds.has(id)) return null;
  const household = core.households.get(player.householdId);
  applyCoreEvent(core, {
    id,
    date: core.date as never,
    kind: ADDRESS_RESPONSE_EVENT,
    personIds: [responder.id as PersonId],
    witnessIds: [
      player.id,
      ...(household?.memberIds ?? []).filter(
        (member) => member !== player.id && core.people.has(member),
      ),
    ],
    placeId: player.placeId,
    source: {
      tag: "SOURCED",
      citation:
        "The other party's legislator answers the governor's address on the first ask they stand against, from the officials engine's views.",
      asOf: core.date as never,
    },
    publicRecord: true,
    news: true,
    topic: against,
    facts: {
      addressId: address.id,
      governorId: address.speakerId,
      responderId: responder.id,
      question: against,
      party: responder.party ?? "",
    },
  });
  makeCase(api, {
    id: `case:${id}`,
    speakerId: responder.id as PersonId,
    listenerIds: [address.speakerId],
    placeId: player.placeId,
    topic: against,
    desiredChange: "repeal",
    citation: "The answer to the governor's address.",
  });
  return id;
}
