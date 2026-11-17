/**
 * What a mentor's advice may say, from the records behind its two causes
 * (Story lead, Nov 17, the mentor's advice rewritten): each fact is read from
 * the one record that holds it and set only where that record holds it, cited
 * to that record, so a line that needs a fact the world does not hold never
 * plays (an effect is a read, not a record).
 *
 * A party's mentor (`party-mentor`), from the `party-asked` record the
 * circumstance stands on and the party's mentors record:
 * - `chair`: the chair who asked, by full name.
 * - `files-by`: the filing deadline the ask names, said as a day ahead.
 * - `seat-open` / `seat-held` / `seat-mine`: the seat's serving term, by the
 *   weighing's own incumbent read (`contestIncumbent`), `seat-mine` where the
 *   mentor holds it; `holder` names a holder who is neither the mentor nor the
 *   player, and `holder-same-party` / `holder-other-party` compare the term's
 *   party with the party that asked.
 * - `chance-good` / `chance-thin`: the player's own read of their chance, by
 *   the weighing's one rule (`ownChanceIn`), against the director's TUNABLE
 *   rows `directorMentorChanceGood` and `directorMentorChanceThin`; never said
 *   as a figure.
 * - `ran-before`, `won-before`, `lost-before`: the player's earlier filings and
 *   the counts of their races.
 * - `mentor-office` and `mentor-since`: the seat the mentor serves now and how
 *   long, from their serving term; `mentor-lost-once`: a race of theirs the
 *   count shows they lost.
 * - `said-yes`, `said-no`, `said-not-now`, `undecided`: the player's answer in
 *   the ask's own scene, by the party's own reading of it (`partyAskAnswer`).
 *
 * A coworker who took a new hire under their wing (`work-mentor`), from the
 * `work.mentorship-formed` record:
 * - `employer`: the employer the record names; `job`: the hire's job title.
 * - `mentor-years`: how long the mentor has held their own job there, from the
 *   day they started it where a record holds that day.
 * - `pay-low`: the hire's pay below the middle of what the others with the
 *   same title there are paid (the jobs engine's staff); never the amount.
 * - `nights`: the hire's work calendar has a shift that runs past midnight.
 */
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import {
  PARTY_ASKED_EVENT,
  contestIncumbent,
  ownChanceIn,
  partyAskAnswer,
} from "../core2/modules/candidacy";
import {
  JOBS_MODULE_ID,
  OUTSIDE_MARKET_KIND,
  currentJobs,
} from "../core2/modules/jobs";
import { OFFICES_MODULE_ID, servingTermsOf } from "../core2/modules/offices";
import { WORK_MENTORSHIP } from "../core2/modules/partnerships";
import { VOTING_MODULE_ID, resultOf } from "../core2/modules/voting";
import { heldSinceRecord } from "../core2/past-module";
import { officeInSentence } from "../core2/person-work";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, JobInput, PersonId } from "../core2/types";
import { daysBetweenText } from "../core2/kernel/dates";
import { dayAhead } from "../english/day-words";
import { employerSaid, jobSaid, memberOfBody } from "../english/journal-words";
import { sayableJobTitle } from "../english/said-as";
import type { Fact } from "../english/scene-talk-words";
import { spanSaid } from "../english/span-words";
import { DEFAULT_DIRECTOR_DATA } from "./ledger";
import { businessNameSaid } from "./words";

/** The situation type that reads these facts. */
export const MENTOR_ADVICE_TYPE = "advice";

export interface MentorAdviceInput {
  /** The cause record: a party's ask, or a coworker's mentorship. */
  readonly causeId: string;
  /** The mentor, who gives the advice. */
  readonly mentorId: PersonId;
  /** The one who is advised: the player. */
  readonly askedId: PersonId;
}

export function mentorAdviceFacts(
  core: Readonly<CoreState>,
  input: MentorAdviceInput,
): Record<string, Fact> {
  const record = core.durableLog.get(input.causeId);
  if (record?.kind === PARTY_ASKED_EVENT) return partyFacts(core, input);
  if (record?.kind === WORK_MENTORSHIP) return workFacts(core, input);
  return {};
}

const fact = (text: string, ids: readonly string[]): Fact => ({
  text,
  sourceRecordIds: ids,
});

function partyFacts(
  core: Readonly<CoreState>,
  { causeId, mentorId, askedId }: MentorAdviceInput,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const api = coreAPI(core as CoreState);
  const said = (core.durableLog.get(causeId)?.facts ?? {}) as Readonly<
    Record<string, string>
  >;
  const contestId = said.contestId ?? "";
  const cited = [causeId, contestId];
  const chair = said.chairId
    ? core.people.get(said.chairId as PersonId)
    : undefined;
  // People are named plainly, by full name: a first mention would add who
  // they are as an appositive ("Sandra Owens, who lives in Dyer,"), which a
  // question that ends on the name cannot carry (the door's rival, Nov 17).
  if (chair && chair.id !== askedId)
    facts.chair = fact(`${chair.givenName} ${chair.familyName}`, [
      causeId,
      chair.id,
    ]);
  const filesBy = said.filingDeadline
    ? dayAhead(said.filingDeadline, core.date)
    : null;
  if (filesBy) facts["files-by"] = fact(filesBy, cited);
  // The player's answer in the ask's own scene.
  const answer = partyAskAnswer(api, causeId, askedId);
  const answered = answer
    ? {
        yes: "said-yes",
        no: "said-no",
        "not-now": "said-not-now",
      }[answer.answer]
    : "undecided";
  facts[answered] = fact("yes", [
    causeId,
    ...(answer ? [answer.recordId] : []),
  ]);
  const contest =
    contestId && core.modules.has(ELECTIONS_MODULE_ID)
      ? (api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .get(contestId) as unknown as ContestRow | undefined)
      : undefined;
  if (contest && core.modules.has(OFFICES_MODULE_ID)) {
    // The seat as the weighing reads it: served by someone, or open.
    const term = contestIncumbent(api, contest);
    if (!term) facts["seat-open"] = fact("yes", cited);
    else if (term.personId === mentorId)
      // The seat the party asked about is the mentor's own.
      facts["seat-mine"] = fact("yes", [...cited, term.id]);
    else {
      const termCited = [...cited, term.id];
      facts["seat-held"] = fact("yes", termCited);
      const holder = term.personId
        ? core.people.get(term.personId as PersonId)
        : undefined;
      if (holder && holder.id !== askedId)
        facts.holder = fact(`${holder.givenName} ${holder.familyName}`, [
          ...termCited,
          holder.id,
        ]);
      if (term.party && said.party)
        facts[
          term.party.toLowerCase() === said.party.toLowerCase()
            ? "holder-same-party"
            : "holder-other-party"
        ] = fact("yes", termCited);
    }
    // The player's own read of their chance, said as a feeling.
    const chance = ownChanceIn(api, askedId, contest.id);
    const rows = DEFAULT_DIRECTOR_DATA.parameters;
    if (chance !== null && chance >= rows.directorMentorChanceGood!.value)
      facts["chance-good"] = fact("yes", [...cited, askedId]);
    else if (chance !== null && chance < rows.directorMentorChanceThin!.value)
      facts["chance-thin"] = fact("yes", [...cited, askedId]);
  }
  // The player's own races before this one, and how the counts went.
  Object.assign(facts, racesOf(core, askedId, contestId, "", "before"));
  // The mentor's own seat, how long they have served it, and a race of
  // theirs they lost.
  const term = servingTermsOf(api, mentorId)[P.zero];
  const seat = term
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .get(term.officeId) as unknown as
        | { title?: string; seats?: number; bodyName?: string | null }
        | undefined)
    : undefined;
  // The seat as its holder is called ("magistrate", "mayor", "state
  // senator"): a member's own name where the body is named for its members,
  // else the office's title in a sentence, without a district in brackets.
  const title = seat?.title?.replace(/\s*\([^)]*\)/g, "").trim();
  const office = title
    ? (((seat?.seats ?? P.one) > P.one ? memberOfBody(seat?.bodyName) : null) ??
      officeInSentence(title))
    : null;
  if (term && office) {
    facts["mentor-office"] = fact(office, [term.id, term.officeId]);
    const since = term.serviceStart ?? term.startDate;
    const days = daysBetweenText(since, core.date);
    if (days > P.zero) facts["mentor-since"] = fact(spanSaid(days), [term.id]);
  }
  const theirs = racesOf(core, mentorId, contestId, "mentor-", "once");
  if (theirs["mentor-lost-once"])
    facts["mentor-lost-once"] = theirs["mentor-lost-once"];
  return facts;
}

/**
 * A person's races other than `contestId` that the count has decided: `ran-`,
 * `won-` and `lost-` with the suffix (`before`, `once`), each cited to the
 * filing and the result.
 */
function racesOf(
  core: Readonly<CoreState>,
  personId: string,
  contestId: string,
  prefix: string,
  suffix: string,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  if (!core.modules.has(ELECTIONS_MODULE_ID)) return facts;
  const api = coreAPI(core as CoreState);
  const filings = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .query("byPerson", [personId]) as unknown as FilingRow[]
  ).filter((row) => row.contestId !== contestId && row.filedOn < core.date);
  for (const filing of filings) {
    facts[`${prefix}ran-${suffix}`] ??= fact("yes", [filing.id]);
    const result = core.modules.has(VOTING_MODULE_ID)
      ? resultOf(api, filing.contestId)
      : null;
    if (!result || result.date > core.date) continue;
    const won = result.winnerId === personId;
    facts[`${prefix}${won ? "won" : "lost"}-${suffix}`] ??= fact("yes", [
      filing.id,
      result.id,
    ]);
  }
  return facts;
}

function workFacts(
  core: Readonly<CoreState>,
  { causeId, mentorId, askedId }: MentorAdviceInput,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const said = (core.durableLog.get(causeId)?.facts ?? {}) as Readonly<
    Record<string, string>
  >;
  const org = said.organizationId
    ? core.organizations.get(said.organizationId)
    : undefined;
  // Work out of town is kept against a stand-in for the outside market, not
  // an employer anyone works beside: no employer to name, no scene.
  if (!org || org.kind === OUTSIDE_MARKET_KIND) return facts;
  facts.employer = fact(employerSaid(businessNameSaid(org), org), [
    causeId,
    org.id,
  ]);
  // The hire's own job there, by its title.
  const hire = core.people.get(askedId);
  const job = hire?.jobId ? core.jobs.get(hire.jobId) : undefined;
  const mine = job && job.organizationId === org.id && !job.endsAt ? job : null;
  if (mine && sayableJobTitle(mine.title))
    facts.job = fact(jobSaid(mine.title), [causeId, mine.id]);
  // How long the mentor has held their own job there, where a record holds
  // the day they started it (a job of the opening keeps it in the past
  // record; a job taken in play, in its work commitment).
  const mentor = core.people.get(mentorId);
  const theirs = mentor?.jobId ? core.jobs.get(mentor.jobId) : undefined;
  if (theirs && theirs.organizationId === org.id && !theirs.endsAt) {
    const before = heldSinceRecord(core as CoreState, mentorId, theirs.id);
    const commitment = commitmentOf(core, mentorId, theirs.id);
    const since = before
      ? String(before.facts.startedAt ?? "")
      : (commitment?.heldSince ?? "");
    const days = since ? daysBetweenText(since, core.date) : P.zero;
    if (days > P.zero)
      facts["mentor-years"] = fact(spanSaid(days), [
        causeId,
        theirs.id,
        before?.id ?? commitment!.id,
      ]);
  }
  if (mine && core.modules.has(JOBS_MODULE_ID)) {
    // Paid below the middle of what the others with the same title there
    // earn (the jobs engine's staff, full and counted alike).
    const hourly = (row: JobInput) =>
      row.hourlyMinor ??
      row.wageDailyMinor / Math.max(row.hoursDaily, Number.EPSILON);
    const others = currentJobs(coreAPI(core as CoreState), org.id)
      .filter((row) => row.id !== mine.id && row.title === mine.title)
      .map(hourly)
      .sort((a, b) => a - b);
    const middle = others.length
      ? others[Math.floor(others.length / P.two)]!
      : null;
    if (middle !== null && hourly(mine) < middle)
      facts["pay-low"] = fact("yes", [causeId, mine.id, org.id]);
    // A shift that runs past midnight on the hire's work calendar.
    const calendar = commitmentOf(core, askedId, mine.id);
    const day = P.hoursPerDay * P.minutesPerHour;
    if (calendar?.slots.some((slot) => slot.startMinute + slot.minutes > day))
      facts.nights = fact("yes", [causeId, calendar.id]);
  }
  return facts;
}

/** The work commitment that schedules a person's job. */
function commitmentOf(
  core: Readonly<CoreState>,
  personId: string,
  jobId: string,
) {
  for (const id of core.work.commitmentsByPerson.get(personId as PersonId) ??
    []) {
    const row = core.work.commitments.get(id);
    if (row?.jobId === jobId && !row.endsAt) return row;
  }
  return undefined;
}
