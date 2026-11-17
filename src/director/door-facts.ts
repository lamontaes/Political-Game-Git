/**
 * What a door's words can lean on beyond the knock itself (Story lead,
 * Nov 17, the door rewrite): each fact is read from the one record that holds
 * it and set only where that record holds it (an effect is a read, not a
 * record). The door scene's own packet (`purpose-scene.ts`, the door block)
 * calls this once, beside the facts it already sets from the knock, the
 * petition and the resident's views.
 *
 * - `signed` / `would-not-sign`: the petition record's answer for this
 *   resident (`knockFacts`, from `petitionAtDoor`). The resident's agree or
 *   decline is placed by it, never chosen again in words.
 * - `rival`: the other candidate in the contest, by the scene's way of saying
 *   a person, set only where a filing besides the player's stands in it;
 *   `rival-signed` too where this resident's name is on that filing's petition.
 * - `stand`, `stand-with`, `stand-apart`: the player's own stand on the
 *   question the resident raised (`view-question`), from the views engine, said
 *   as a verb phrase after "I'd"; set only where the player holds a view on it.
 * - `voted-last` / `sat-out-last`: the resident's own ballot in the last
 *   election this office was on, from the voting engine's ballot rows; set only
 *   where such a ballot is on record.
 */
import {
  ELECTIONS_MODULE_ID,
  petitionOf,
  petitionSignerIds,
} from "../core2/modules/elections";
import { VOTING_MODULE_ID, ballotOf } from "../core2/modules/voting";
import { VIEWS_MODULE_ID, viewOf, viewOn } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { questionSide } from "../english/question-names";
import type { Fact } from "../english/scene-talk-words";

interface FilingLike {
  readonly id: string;
  readonly personId: string;
  readonly contestId: string;
  readonly status: string;
}

export interface DoorReadsInput {
  /** The campaign door's cause record. */
  readonly causeId: string;
  readonly residentId: PersonId;
  /** The player: the one at the door. */
  readonly playerId: PersonId;
  readonly contestId: string;
  /** The player's filing in the contest, where one is on record. */
  readonly filingId?: string;
  /** Whether the door asks for a signature (the petition circulates). */
  readonly signature: boolean;
  /** The knock's own facts (`knockFacts`): `petition` and `signed` as strings. */
  readonly knock: Readonly<Record<string, string>>;
  /** The resident's strongest question, from `doorViewFacts`, and the side they hold. */
  readonly viewQuestion?: string;
  readonly viewSide?: "for" | "against";
}

export function doorReads(
  core: Readonly<CoreState>,
  input: DoorReadsInput,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const api = coreAPI(core as CoreState);
  const fact = (text: string, ids: readonly string[]): Fact => ({
    text,
    sourceRecordIds: ids,
  });
  const { causeId, residentId, playerId, contestId } = input;
  if (core.modules.has(ELECTIONS_MODULE_ID)) {
    const elections = api.moduleState(ELECTIONS_MODULE_ID);
    // The petition's answer, from the record the campaign engine wrote.
    if (input.signature && input.knock.petition === "true" && input.filingId) {
      const petition = petitionOf(api, input.filingId);
      if (petition)
        facts[input.knock.signed === "true" ? "signed" : "would-not-sign"] =
          fact("yes", [causeId, petition.id]);
    }
    // The other candidate in the race, the first by filing id.
    const rival = (
      elections
        .table("filings")
        .query("byContest", [contestId]) as unknown as FilingLike[]
    )
      .filter(
        (row) =>
          row.personId !== playerId &&
          row.status !== "withdrawn" &&
          row.status !== "short",
      )
      .sort((a, b) => a.id.localeCompare(b.id))[P.zero];
    const person = rival ? core.people.get(rival.personId as PersonId) : null;
    if (rival && person) {
      // Said as the plain full name: a first mention would add the rival's
      // office as an appositive, which a question about them does not carry.
      facts.rival = fact(`${person.givenName} ${person.familyName}`, [
        contestId,
        rival.id,
        person.id,
      ]);
      if (
        petitionOf(api, rival.id) &&
        petitionSignerIds(api, rival.id).has(residentId)
      )
        facts["rival-signed"] = fact("yes", [rival.id, `petition:${rival.id}`]);
    }
    // The resident's ballot in the last election this office was on.
    if (core.modules.has(VOTING_MODULE_ID)) {
      const contest = elections.table("contests").get(contestId) as unknown as
        { officeId: string } | undefined;
      const last = contest
        ? (
            elections
              .table("contests")
              .query("byOffice", [contest.officeId]) as unknown as {
              id: string;
              electionDate: string;
            }[]
          )
            .filter(
              (row) => row.id !== contestId && row.electionDate < core.date,
            )
            .sort((a, b) => b.electionDate.localeCompare(a.electionDate))
            .map((row) => ({ row, ballot: ballotOf(api, row.id, residentId) }))
            .find((held) => held.ballot)
        : undefined;
      if (last?.ballot)
        facts[last.ballot.voted ? "voted-last" : "sat-out-last"] = fact("yes", [
          last.ballot.id,
          last.row.id,
        ]);
    }
  }
  // The player's own stand on the question the resident raised.
  if (core.modules.has(VIEWS_MODULE_ID) && input.viewQuestion) {
    const held = viewOf(api, playerId);
    const view = held
      ? viewOn(api, playerId, input.viewQuestion, held.lean)
      : P.zero;
    const said = view
      ? questionSide(input.viewQuestion, view > P.zero ? "for" : "against")
      : null;
    if (said) {
      const ids = [causeId, playerId, input.viewQuestion];
      facts.stand = fact(said, ids);
      const side = view > P.zero ? "for" : "against";
      if (input.viewSide)
        facts[input.viewSide === side ? "stand-with" : "stand-apart"] = fact(
          "yes",
          ids,
        );
    }
  }
  return facts;
}
