/**
 * What an accusation's lines may lean on beyond the cast (Story lead, Nov 17,
 * the accusation rewrite). Each fact is read from the one record that holds
 * it and set only where that record holds it (an effect is a read, not a
 * record), so a line that needs it plays only where it is true. The crime is
 * the corruption engine's row the complaint or the printed story names
 * (`crimeId`); nothing here is a second record of it.
 *
 * - `took-it`: the crime row says the bribe was taken and the player is a
 *   party to it. A denial is then a lie, and the confession is offered.
 * - `complaint-of`: what the complaint went to the prosecutor about, as a
 *   thing a person says ("the payment on the road repair contract").
 * - `bill`, `contract`, `wanted`: the vote or the award the bribe asked for,
 *   and whichever of the two it is.
 * - `source`: who told the accuser, from the corruption engine's
 *   `crime.told` record, when the complaint rests on being told; with
 *   `knows-truth` where that person was a party to the bribe, so a denial
 *   can be shown false from their word. A printed story is the paper trail:
 *   it holds `knows-truth` too, with no `source`.
 * - `in-chamber`: the bill is still before a body the player and the accuser
 *   both sit on, so the scene is the minutes before a vote.
 *
 * A read that would need a record the world does not keep is left out, and
 * the lines that need it never play. When the bribe's reads (bribe-facts.ts,
 * #9953) land, the two readers of the crime row unite in one file.
 */
import {
  JUSTICE_MODULE_ID,
  crimeRecord,
  wantedFacts,
} from "../core2/modules/justice";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  chambersOf,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { contractSaid } from "../english/contract-words";

/** The situation type that reads these facts. */
export const ACCUSATION_TYPE = "accusation";

/** The corruption engine's record that a party told someone of a bribe. */
const CRIME_TOLD = "crime.told";

/** What an accusation's reads are read against. */
export interface AccusationReadsInput {
  /** The complaint's accusation record, or the printed story's read record. */
  readonly causeId: string;
  /** The corruption engine's crime the record names. */
  readonly crimeId?: string;
  /** The justice engine's complaint, where the cause is one. */
  readonly complaintId?: string;
  /** The player: the one accused. */
  readonly playerId: PersonId;
  /** The one who made the complaint or read the story. */
  readonly accuserId: PersonId;
  /** Names a person the way the scene's other lines do. */
  readonly sayPerson: (person: { id: string }) => string;
  /** The bill as the scene says it (its `bill` fact), where there is one. */
  readonly billSaid?: string;
}

/** The bill a bribe asked a vote on, as the crime row names it, or nothing. */
export function accusedBillId(
  core: Readonly<CoreState>,
  crimeId: string | undefined,
): string | undefined {
  if (!crimeId || !core.modules.has(LEGISLATURE_MODULE_ID)) return undefined;
  const crime = crimeRecord(coreAPI(core as CoreState), crimeId);
  if (!crime || wantedFacts(crime.subjectId).favor !== "vote") return undefined;
  return billOf(coreAPI(core as CoreState), crime.subjectId)
    ? crime.subjectId
    : undefined;
}

export function accusationReads(
  core: Readonly<CoreState>,
  input: AccusationReadsInput,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const api = coreAPI(core as CoreState);
  const { causeId, playerId, accuserId } = input;
  const fact = (text: string, ids: readonly string[]): Fact => ({
    text,
    sourceRecordIds: ids,
  });
  const crime = input.crimeId ? crimeRecord(api, input.crimeId) : undefined;
  if (!crime) return facts;
  const cited = [causeId, crime.id];
  const party = crime.offererId === playerId || crime.officialId === playerId;
  const took = crime.taken && party;
  if (took) facts["took-it"] = fact("yes", cited);
  // The thing the bribe asked: a vote on a bill, or an award.
  const wanted = wantedFacts(crime.subjectId);
  const bill =
    wanted.favor === "vote" && core.modules.has(LEGISLATURE_MODULE_ID)
      ? billOf(api, crime.subjectId)
      : undefined;
  const contract =
    wanted.favor === "contract"
      ? contractSaid(wanted.contractLine ?? "")
      : undefined;
  if (contract) facts.contract = fact(contract, [...cited, crime.subjectId]);
  // What the complaint is about, said the way the matter is named.
  const thing = bill ? input.billSaid : contract;
  if (thing) facts.wanted = fact(thing, [...cited, crime.subjectId]);
  if (input.complaintId && thing)
    facts["complaint-of"] = fact(`the payment on ${thing}`, [
      ...cited,
      input.complaintId,
    ]);
  // Who told the accuser, when the complaint rests on being told.
  const complaint = input.complaintId
    ? (api
        .moduleState(JUSTICE_MODULE_ID)
        .table("complaints")
        .get(input.complaintId) as unknown as { basis?: string } | undefined)
    : undefined;
  if (complaint?.basis === "told") {
    for (const id of core.logByKind.get(CRIME_TOLD) ?? []) {
      const told = core.durableLog.get(id);
      const teller = told?.witnessIds?.[P.zero];
      if (
        !told ||
        told.personIds[P.zero] !== accuserId ||
        !(`crime:${crime.id}` in (told.facts ?? {})) ||
        !teller ||
        teller === playerId
      )
        continue;
      const person = core.people.get(teller as PersonId);
      if (!person) continue;
      const ids = [...cited, told.id, teller];
      facts.source = fact(input.sayPerson(person), ids);
      // A party to the bribe told it: their word contradicts a denial.
      if (took) facts["knows-truth"] = fact("yes", ids);
      break;
    }
  }
  // A printed story is the paper trail itself.
  if (took && !facts["knows-truth"] && !input.complaintId)
    facts["knows-truth"] = fact("yes", cited);
  // The vote is minutes away, in a body both of them sit on.
  if (bill?.status === "drafted") {
    const body = chambersOf(api, bill).find((chamber) =>
      [playerId, accuserId].every((id) =>
        members(api, chamber).some((term) => memberKey(term) === id),
      ),
    );
    if (body) facts["in-chamber"] = fact("yes", [...cited, bill.id, body]);
  }
  return facts;
}
