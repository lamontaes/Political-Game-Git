/**
 * Taking office is an event (owner, Sept 22 and Oct 29: "swearing in needs to
 * be an event ... that's just a scene ... depending on what your office is,
 * you'll give a speech"). The offices engine writes `took-office` when it
 * seats someone; this reads that record for the swearing-in scene
 * (`src/director/data/situation-types.json`, type `swearing-in`): the office
 * and seat it names, who gives the oath and who stands in the room. It writes
 * nothing and holds no sentence: the English engine words every line, and the
 * address an executive office gives afterward is `inaugural-address.ts`.
 */
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import type { OfficeInput } from "../core2/offices-local";
import { ELECTIONS_MODULE_ID } from "../core2/modules/elections";
import { filingClerkFor, localClerkFor } from "../core2/modules/filing-clerk";
import {
  LEADERSHIP_MODULE_ID,
  presidingOfficer,
} from "../core2/modules/leadership";
import { memberKey } from "../core2/modules/legislature";
import { legislativeLeaders } from "../core2/office-day-state";
import { P } from "../core2/parameters";
import { markWordsStopgap } from "./stopgaps";
import data from "./data/swearing-in.json" with { type: "json" };

/** The record the offices engine writes when it seats someone. */
export const TOOK_OFFICE = "took-office";

const ADDRESS_KINDS: ReadonlySet<string> = new Set(data.address.kinds);
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
        OfficeInput | undefined)
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
 * Who gives the oath, from the records and never invented (the world keeps no
 * judges yet, SG-WORDS-swearing-in-no-court): the clerk who took the winner's
 * filing, else the clerk of the government the office belongs to, else the
 * holder who left the seat that day, else the body's presiding officer (the
 * legislature's leaders for a statewide office). Nobody on record, and the
 * role stays unfilled and the scene is not staged.
 */
export function oathGiver(
  core: Readonly<CoreState>,
  moment: { readonly personId: string; readonly causeId: string },
): PersonId[] {
  const sworn = swornOffice(core, moment.causeId);
  if (!sworn) return [];
  const api = coreAPI(core as CoreState);
  const pick = living(core, moment.personId);
  // The clerk is the oath's usual giver in a town or a county; at the state
  // and federal level a court's officer would be, and the world keeps none.
  const clerical = sworn.level !== "state" && sworn.level !== "federal";
  const filed =
    sworn.resultId && api.state.modules.has(ELECTIONS_MODULE_ID)
      ? filingClerkFor(api, sworn.resultId)
      : null;
  const government =
    sworn.level === "county"
      ? localClerkFor(api, "countyOffice")
      : sworn.level === "city" || sworn.level === "township"
        ? localClerkFor(api, "municipalOffice")
        : null;
  const clerk = pick((filed ?? government)?.personId);
  if (clerk.length) {
    if (!clerical) markWordsStopgap("SG-WORDS-swearing-in-no-court");
    return clerk;
  }
  markWordsStopgap("SG-WORDS-swearing-in-no-court");
  const outgoing = outgoingHolder(core, sworn, moment.personId);
  if (outgoing) return [outgoing];
  const presiding = api.state.modules.has(LEADERSHIP_MODULE_ID)
    ? presidingOfficer(api, sworn.officeId)
    : null;
  return pick(
    presiding ?? legislativeLeaders(api, sworn.jurisdiction)[P.zero],
  );
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
    .query("byJurisdiction", [sworn.jurisdiction]) as unknown as OfficeInput[])
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
