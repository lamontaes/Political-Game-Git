/**
 * Taking office is an event (owner, Sept 22 and Oct 29: "swearing in needs to
 * be an event ... that's just a scene ... depending on what your office is,
 * you'll give a speech"). The offices engine writes `took-office` when it
 * seats someone; this reads that record for the swearing-in scene
 * (`src/director/data/situation-types.json`, type `swearing-in`): the office
 * and seat it names and who stands in the room (the oath's giver is cast with
 * the other civic roles, `civic-roles.ts`). It writes
 * nothing and holds no sentence: the English engine words every line, and the
 * address an executive office gives afterward is `inaugural-address.ts`.
 */
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { memberKey } from "../core2/modules/legislature";
import { P } from "../core2/parameters";
import data from "./data/swearing-in.json" with { type: "json" };

/** The record the offices engine writes when it seats someone. */
export const TOOK_OFFICE = "took-office";
/** What a swearing-in's endings keep on the scene's reply record. */
export const OATH_KEEPS = "oath";
export const ADDRESS_KEEPS = "address";
/** Why two people first met, on the encounter the oath is. */
const MET_AT_OATH = "swearing-in";

const ADDRESS_KINDS: ReadonlySet<string> = new Set(data.address.kinds);

/** What this reads of an office's row in the offices engine. */
interface OfficeRow {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly level: string;
  readonly jurisdiction: string;
  readonly seats: number;
}
const COLLEAGUES_MAX = data.parameters.colleaguesMax.value;

/** The office a took-office record seats someone in, read from the offices engine's rows. */
export interface SwornOffice {
  readonly seatId: string;
  readonly officeId: string;
  readonly kind: string;
  readonly title: string;
  readonly level: string;
  readonly jurisdiction: string;
  readonly date: string;
  readonly placeId: string;
  /** The contest or race the winner won, where the record cites one. */
  readonly resultId: string | undefined;
  /** Whether the office gives an address when its holder is sworn in. */
  readonly givesAddress: boolean;
}

/**
 * An office's title as it reads inside a sentence: a title written in
 * sentence case ("Council member", "Mayor") is lower case there ("the work of
 * mayor"), one written in title case ("County Commissioner", "U.S. Senator")
 * stays as the office names itself.
 */
export function titleInSentence(title: string): string {
  return /^[A-Z][^A-Z]*$/.test(title)
    ? `${title.charAt(P.zero).toLowerCase()}${title.slice(P.one)}`
    : title;
}

export function swornOffice(
  core: Readonly<CoreState>,
  causeId: string,
): SwornOffice | null {
  const record = core.durableLog.get(causeId);
  const seatId = record?.facts?.seatId;
  if (record?.kind !== TOOK_OFFICE || !seatId) return null;
  const api = coreAPI(core as CoreState);
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return null;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const seat = offices.table("seats").get(seatId) as unknown as
    { readonly officeId: string } | undefined;
  const office = seat
    ? (offices.table("offices").get(seat.officeId) as unknown as
        OfficeRow | undefined)
    : undefined;
  if (!office) return null;
  return {
    seatId,
    officeId: office.id,
    kind: office.kind,
    title: office.title,
    level: office.level,
    jurisdiction: office.jurisdiction,
    date: record.date,
    placeId: record.placeId,
    resultId: record.facts?.resultId,
    givesAddress: ADDRESS_KINDS.has(office.kind),
  };
}

/** The living full person a record id names, never the subject. */
const living =
  (core: Readonly<CoreState>, subjectId: string) =>
  (id: string | null | undefined): PersonId[] =>
    id && id !== subjectId && core.people.get(id as PersonId)?.alive === true
      ? [id as PersonId]
      : [];

/**
 * Whoever held the seat until the day the new holder took it: the term the
 * seat's record ended that day. A named official not yet filled in is known by
 * the id the legislature's rows give them.
 */
export function outgoingHolder(
  core: Readonly<CoreState>,
  sworn: SwornOffice,
  subjectId: string,
): PersonId | null {
  const api = coreAPI(core as CoreState);
  const left = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [sworn.seatId, "ended"]) as unknown as TermRow[]
  )
    .filter((term) => term.endDate === sworn.date)
    .map((term) => memberKey(term))
    .sort();
  return living(core, subjectId)(left[P.zero])[P.zero] ?? null;
}

/**
 * The others in the room: the sitting holders of the government's other
 * offices, a government's smaller offices (a mayor, a lieutenant governor)
 * before its rank and file, closest tie to the one sworn in first, at most
 * the few the player can tell apart.
 */
export function colleagues(
  core: Readonly<CoreState>,
  moment: { readonly personId: string; readonly causeId: string },
  taken: ReadonlySet<PersonId>,
  closest: (ids: PersonId[]) => PersonId[],
): PersonId[] {
  const sworn = swornOffice(core, moment.causeId);
  if (!sworn) return [];
  const api = coreAPI(core as CoreState);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const pick = living(core, moment.personId);
  const bySize = new Map<number, PersonId[]>();
  for (const office of offices
    .table("offices")
    .query("byJurisdiction", [sworn.jurisdiction]) as unknown as OfficeRow[])
    for (const seat of offices
      .table("seats")
      .query("byOffice", [office.id]) as unknown as { id: string }[])
      for (const term of offices
        .table("terms")
        .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[]) {
        const [id] = pick(memberKey(term));
        if (!id || taken.has(id)) continue;
        bySize.set(office.seats, [...(bySize.get(office.seats) ?? []), id]);
      }
  return [...bySize.entries()]
    .sort(([left], [right]) => left - right)
    .flatMap(([, ids]) => closest([...new Set(ids)]))
    .slice(P.zero, COLLEAGUES_MAX);
}

/**
 * The one who gave the oath is met by the one sworn in: they stood face to
 * face and said their names, so the player knows them after (and the journal
 * can say who swore them in). False where they already knew each other.
 */
export function meetOfficiant(
  core: CoreState,
  input: {
    readonly playerId: PersonId;
    readonly officiantId: PersonId;
    readonly causeId: string;
    /** The scene's reply record, which the meeting cites. */
    readonly recordId: string;
    readonly hours: number;
  },
): boolean {
  const sworn = swornOffice(core, input.causeId);
  const player = core.people.get(input.playerId);
  if (!sworn || !player || player.knownIds.has(input.officiantId)) return false;
  return coreAPI(core).meet(input.playerId, input.officiantId, {
    placeId: sworn.placeId,
    sourceId: input.recordId,
    cause: MET_AT_OATH,
    hours: input.hours,
  });
}
