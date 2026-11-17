/**
 * What the one who asks the player to endorse them can say about why now,
 * each from a record that holds it (the K1 scene: a long-time volunteer or
 * staffer, or anyone the player knows, asks for the player's word to run on
 * their own; owner, Nov 14: "I've been working for you for a long time and,
 * like, I want to get involved on my own. I'm asking you for an endorsement").
 * The cause is the campaigns engine's `endorsement-asked` record. A fact with
 * no record behind it is left out, so the lines that need it never play:
 *
 * - `years-with-you`: they worked for the player's campaign (the volunteer's
 *   `campaign-volunteer-joined` record) or on their staff (the staff row's
 *   hiring day) for a year or more, said as a span ("two years");
 * - `carries-cause`: the strongest cause they carry (their drives, the one
 *   the candidacy decision weighed as a reason to run), said as the question;
 * - `lost-job`: their newest layoff (the jobs module's change row), with no
 *   job now, said as how long ago;
 * - `ran-before`: they filed in an earlier race (the filings table), said as
 *   how long ago;
 * - `same-party`: they file under the party the player belongs to;
 * - `against-your-ally`: someone the player backs (their yes on the
 *   endorsement row, or an evening on that campaign) stands in the same race,
 *   said by name.
 */
import { ageOnDate, daysBetweenText, makeIsoDate } from "../core2/kernel/dates";
import { partyOf } from "../core2/candidate-pool";
import { DEFAULT_DRIVES_DATA } from "../core2/modules/drives";
import { decisionOf, CANDIDACY_MODULE_ID } from "../core2/modules/candidacy";
import {
  CAMPAIGNS_MODULE_ID,
  ENDORSEMENT_ASKED_EVENT,
  VOLUNTEER_JOINED_EVENT,
  type CampaignRow,
  type EndorsementRow,
} from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type FilingRow,
} from "../core2/modules/elections";
import { STAFF_MODULE_ID, type StafferRow } from "../core2/modules/staff";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { questionSaid } from "../english/question-names";
import type { Fact } from "../english/scene-talk-words";
import { spanSaid } from "../english/span-words";
import { lastLayoff } from "./constituent-help-facts";

/** The situation type that reads these facts. */
export const ENDORSEMENT_ASK_TYPE = "endorsement-ask";

/**
 * The facts for `askerId`, who asks `askedId` (the player) to endorse them.
 * Empty for any other type, or a cause that is not an endorsement ask.
 */
export function endorsementAskFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
  sayPerson: (person: { id: string }) => string,
): Record<string, Fact> {
  if (typeKey !== ENDORSEMENT_ASK_TYPE) return {};
  const cause = core.durableLog.get(causeId);
  if (cause?.kind !== ENDORSEMENT_ASKED_EVENT) return {};
  if (cause.facts?.candidateId !== askerId || cause.facts?.askedId !== askedId)
    return {};
  const asker = core.people.get(askerId);
  const player = core.people.get(askedId);
  if (!asker || !player) return {};
  const api = coreAPI(core as CoreState);
  const facts: Record<string, Fact> = {};
  const today = cause.date;
  const contestId = String(cause.facts?.contestId ?? "");
  const filingId = String(cause.facts?.filingId ?? "");

  // Years on the player's campaign or staff: the earliest day the records
  // show them working for the player.
  const worked: { date: string; id: string }[] = [];
  for (const id of core.logByKind.get(VOLUNTEER_JOINED_EVENT) ?? []) {
    const joined = core.durableLog.get(id);
    if (
      joined?.facts?.volunteerId === askerId &&
      joined.facts?.candidateId === askedId
    )
      worked.push({ date: joined.date, id });
  }
  if (core.modules.has(STAFF_MODULE_ID))
    for (const row of api
      .moduleState(STAFF_MODULE_ID)
      .table("staff")
      .query("byOfficial", [askedId]) as unknown as StafferRow[])
      if (row.personId === askerId)
        worked.push({ date: row.hiredOn, id: row.id });
  const first = worked.sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  )[P.zero];
  if (first && ageOnDate(makeIsoDate(first.date), makeIsoDate(today)) >= P.one)
    facts["years-with-you"] = {
      text: spanSaid(daysBetweenText(first.date, today)),
      sourceRecordIds: [first.id, causeId],
    };

  // The cause they carry: the candidacy decision weighed it as a reason to
  // run, and the drive it came from names the question.
  const decision = contestId
    ? core.modules.has(CANDIDACY_MODULE_ID)
      ? decisionOf(api, contestId, askerId)
      : null
    : null;
  if (decision && (decision.reasons.cause ?? P.zero) > P.zero) {
    const kinds = new Set(
      DEFAULT_DRIVES_DATA.driveKinds
        .filter((kind) => kind.shareable)
        .map((kind) => kind.id),
    );
    const drive = [...asker.drives.values()]
      .filter((row) => row.kind && kinds.has(row.kind))
      .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id))[
      P.zero
    ];
    const said = drive ? questionSaid(drive.topic) : null;
    if (drive && said)
      facts["carries-cause"] = {
        text: said,
        sourceRecordIds: [decision.id, drive.id],
      };
  }

  // A job they lost, and none since.
  const layoff = lastLayoff(core, askerId, today);
  if (layoff && !asker.jobId)
    facts["lost-job"] = {
      text: spanSaid(daysBetweenText(layoff.date, today)),
      sourceRecordIds: [layoff.id, causeId],
    };

  if (!core.modules.has(ELECTIONS_MODULE_ID)) return facts;
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");

  // A race they filed in before this one.
  const before = (
    filings.query("byPerson", [askerId]) as unknown as FilingRow[]
  )
    .filter((row) => row.contestId !== contestId && row.filedOn < today)
    .sort(
      (a, b) => b.filedOn.localeCompare(a.filedOn) || a.id.localeCompare(b.id),
    )[P.zero];
  if (before)
    facts["ran-before"] = {
      text: spanSaid(daysBetweenText(before.filedOn, today)),
      sourceRecordIds: [before.id, causeId],
    };

  // The party they file under, when it is the player's own.
  const own = (filings.get(filingId) as unknown as FilingRow | undefined)
    ?.party;
  const theirs = own ?? partyOf(api, askerId);
  if (theirs && theirs === partyOf(api, askedId))
    facts["same-party"] = {
      text: theirs,
      sourceRecordIds: [filingId, causeId],
    };

  // Someone the player backs who stands in the same race: their yes on the
  // endorsement row, or their own name on that campaign's volunteers or staff.
  if (core.modules.has(CAMPAIGNS_MODULE_ID) && contestId) {
    const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
    for (const rival of ballot(api, contestId).filter(
      (row) => row.personId !== askerId && row.personId !== askedId,
    )) {
      const row = campaigns
        .table("endorsements")
        .get(`endorsement:${rival.id}:${askedId}`) as unknown as
        EndorsementRow | undefined;
      const campaign = campaigns.table("campaigns").get(rival.id) as unknown as
        CampaignRow | undefined;
      const backed =
        row?.answer === "yes"
          ? row.id
          : campaign?.volunteerIds.includes(askedId) ||
              campaign?.staffIds.includes(askedId)
            ? campaign.id
            : null;
      const ally = core.people.get(rival.personId as PersonId);
      if (backed && ally) {
        facts["against-your-ally"] = {
          text: sayPerson(ally),
          sourceRecordIds: [...new Set([backed, rival.id, ally.id])],
        };
        break;
      }
    }
  }
  return facts;
}
