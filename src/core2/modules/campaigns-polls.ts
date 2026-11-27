/**
 * Polls, a race's causes and folding them.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import { residentsRuntime } from "./residents";
import { registerDerivedCache } from "../snapshot";
import { keepsWhy } from "../why-kept";
import { decisionLean, leanedYes } from "../trait-decisions";
import type { CoreAPI, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { addDays, makeIsoDate } from "../kernel/dates";
import { personLean } from "../campaign-views";
import { campaignParameter } from "../campaign-data";
import { ballot, ELECTIONS_MODULE_ID, type FilingRow } from "./elections";
import {
  ageOn,
  campaignFor,
  elections,
  partySide,
  table,
  townRow,
} from "./campaigns-base";
import type { CauseRow, ImpressionRow, PollRow } from "./campaigns-base";
import { spend } from "./campaigns-money";
import { freeMinor } from "./campaigns-petitions";
import { seller } from "./campaigns-work";

/**
 * A poll's 95 percent margin of error on the leader's share, from the
 * Agresti-Coull interval (Agresti and Coull 1998): two more answers for and
 * two against, so a poll where every respondent names the same candidate
 * still has a margin. Null where nobody answered.
 */
export function pollMargin(lead: number, contacted: number): number | null {
  if (contacted <= 0) return null;
  const adjusted = (lead + 2) / (contacted + 4);
  return (
    Math.round(
      1.96 * Math.sqrt((adjusted * (1 - adjusted)) / (contacted + 4)) * 1000,
    ) / 1000
  );
}

/** Someone called for a poll: their age past the response threshold, before personality (older residents answer more). */
export function answerPollReason(
  person: Readonly<Pick<PersonState, "birthDate">>,
  date: string,
): number {
  return (
    (ageOn(person, date) - campaignParameter("doorAnswerPivotAge")) /
      campaignParameter("doorAnswerAgeSpan") -
    campaignParameter("pollAnswerThreshold")
  );
}

/**
 * Commission a poll: the pollster calls adults in the town in a fixed order
 * from the pollster's list (the sampling frame), and records what each said.
 * Someone who has heard of no candidate is undecided; someone who leans
 * toward a candidate but avoids conflict says "no opinion". True support is
 * never reported, only what people said.
 */
type PollFrameEntry = {
  readonly id: string;
  readonly traits: Readonly<Record<string, number>>;
  readonly birthDate: string;
};
/**
 * The counted adults of a town, sorted by id, read once a day for each change
 * to the counts (the store's `version` moves with every change to who is
 * counted or grouped). Whoever was filled in since is dropped when read.
 */
const countedPollFrames = new WeakMap<
  object,
  { key: string; store: object; entries: readonly PollFrameEntry[] }
>();
registerDerivedCache(countedPollFrames);
const byId = (a: PollFrameEntry, b: PollFrameEntry) => a.id.localeCompare(b.id);

/**
 * A poll's frame: the town's full adults and its counted adults, in id order
 * (the order the full list sorted by id gives).
 */
function pollFrame(
  api: CoreAPI,
  town: string,
  date: string,
  adultAge: number,
): PollFrameEntry[] {
  const core = api.state as CoreState;
  const named = [...api.state.people.values()]
    .filter((p) => p.alive && p.placeId === town && ageOn(p, date) >= adultAge)
    .map((p) => ({ id: p.id, traits: p.traits, birthDate: p.birthDate }))
    .sort(byId);
  const rt = residentsRuntime(core);
  if (!rt) return named;
  const store = rt.store;
  const key = `${date}|${town}|${adultAge}|${store.version}`;
  let held = countedPollFrames.get(core);
  if (held?.store !== store || held.key !== key) {
    const entries = [...store.liveHouseholds()]
      .filter((h) => h.placeId === town)
      .flatMap((h) => store.countedMembers(h))
      .filter((m) => ageOn({ birthDate: store.born[m]! }, date) >= adultAge)
      .map((m) => ({
        id: store.ids[m]!,
        traits: store.packedTraits(m),
        birthDate: store.born[m]!,
      }))
      .sort(byId);
    held = { key, store, entries };
    countedPollFrames.set(core, held);
  }
  const counted = held.entries.filter((m) => !api.state.people.has(m.id));
  // Merge the two id-ordered lists.
  const out: PollFrameEntry[] = [];
  let i = 0,
    j = 0;
  while (i < named.length || j < counted.length)
    out.push(
      j >= counted.length ||
        (i < named.length && byId(named[i]!, counted[j]!) <= 0)
        ? named[i++]!
        : counted[j++]!,
    );
  return out;
}

export function commissionPoll(
  api: CoreAPI,
  input: { readonly filingId: string; readonly sampleSize: number },
): PollRow {
  const adultAge = api.parameter("votingAge");
  const campaign = campaignFor(api, input.filingId);
  const town = townRow(api).townPlaceId;
  const date = api.state.date;
  const core = api.state as CoreState;
  // The whole town is the frame: full people and the counted residents.
  const frame = pollFrame(api, town, date, adultAge);
  // The pollster is paid per completed interview, from the campaign's money.
  const perInterview = campaignParameter("pollCostPerInterviewMinor");
  // The poll's own set-aside fund pays for it, with what is free.
  const available = core.cashJournal.accounts.get(
    `cash:${campaign.organizationId}:residual`,
  )
    ? freeMinor(campaign) + (campaign.pollFundMinor ?? 0)
    : 0;
  const affordable = Math.min(
    input.sampleSize,
    Math.floor(available / Math.max(1, perInterview)),
  );
  const offset =
    (table(api, "polls").query("byContest", [campaign.contestId]).length *
      input.sampleSize) %
    Math.max(1, frame.length);
  const dialed = [...frame.slice(offset), ...frame.slice(0, offset)];
  // Most people called don't take a poll; who does is who'd answer a stranger.
  const respondents: (typeof frame)[number][] = [];
  for (const person of dialed) {
    if (respondents.length >= affordable) break;
    if (
      leanedYes(
        api.state,
        person,
        "campaigns.answer-poll",
        "answer",
        "no-opinion",
        answerPollReason(person, date),
      )
    )
      respondents.push(person);
  }
  const answers: Record<string, number> = {};
  const lean0 = townRow(api).lean;
  const filings = ballot(api, campaign.contestId);
  for (const person of respondents) {
    const impressions = (
      table(api, "impressions").query("byVoter", [
        person.id,
      ]) as unknown as ImpressionRow[]
    )
      .filter((i) => i.contestId === campaign.contestId && i.heardOf)
      .sort((a, b) => b.warmth - a.warmth);
    const best = impressions[0];
    // Someone no campaign reached names their party's candidate if they
    // hold a party view, else they're undecided.
    const lean = personLean(api.state.people, person, lean0);
    const partyPick =
      Math.abs(lean) >= campaignParameter("pollPartyCue")
        ? filings.find((f) => partySide(f.party ?? null) === Math.sign(lean))
        : undefined;
    const answer =
      best && best.warmth > 0
        ? decisionLean(
            api.state,
            person,
            "campaigns.answer-poll",
            "answer",
            "no-opinion",
          ) < 0
          ? "no-opinion"
          : best.candidateId
        : (partyPick?.personId ?? "undecided");
    answers[answer] = (answers[answer] ?? 0) + 1;
  }
  const n = respondents.length;
  const lead = Math.max(
    0,
    ...Object.entries(answers)
      .filter(([k]) => k !== "undecided" && k !== "no-opinion")
      .map(([, v]) => v),
  );
  const poll: PollRow = {
    id: `poll:${campaign.id}:${date}:${offset}`,
    campaignId: campaign.id,
    contestId: campaign.contestId,
    date,
    contacted: n,
    answers,
    marginOfError: pollMargin(lead, n),
    respondentIds: respondents.map((p) => p.id),
  };
  // An empty poll isn't a poll: nothing is paid or kept.
  if (n === 0) return poll;
  spend(api, input.filingId, {
    kind: "poll",
    sellerId: seller(api, "poll"),
    amountMinor: n * perInterview,
    citation: "Poll interviews at pollCostPerInterviewMinor",
  });
  table(api, "polls").put(poll as unknown as ModuleRow);
  return poll;
}

/** Why one person feels as they do about a candidate: every cause still kept as a row, oldest first (a closed race's are folded, `foldClosedRaceCauses`). */
export function causesFor(
  api: CoreAPI,
  voterId: string,
  candidateId: string,
): readonly CauseRow[] {
  return (
    table(api, "causes").query("byVoter", [voterId]) as unknown as CauseRow[]
  )
    .filter((c) => c.candidateId === candidateId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * A closed race's causes, folded for one voter and candidate: what the
 * readers of a candidate's causes add up (each act's reach, the voter's net
 * warmth moved, in the order the causes were kept, and the first door the
 * candidate knocked), so they read the same numbers after the rows are gone.
 */
export interface CauseSummaryRow {
  readonly id: string;
  readonly voterId: string;
  readonly candidateId: string;
  /** The last date folded in. */
  readonly through: string;
  readonly moved: number;
  readonly acts: Readonly<
    Record<string, { reached: number; warmer: number; cooler: number }>
  >;
  /** The first door the candidate knocked on for this voter, if any. */
  readonly firstDoor: string | null;
  /**
   * The same sums for each of the candidate's campaigns, by filing id: the
   * causes dated from the day they filed to that contest's election day,
   * which is the window a race's standing reads (`contestStanding`), so a
   * race's standing reads the same numbers before and after its causes fold.
   */
  readonly byFiling?: Readonly<Record<string, CauseSums>>;
}

/** What a run of folded causes adds up to for one voter. */
export interface CauseSums {
  readonly moved: number;
  readonly acts: Readonly<
    Record<string, { reached: number; warmer: number; cooler: number }>
  >;
}

/** A candidate's campaigns as date windows: announced or filed to election day, by filing id. */
function campaignWindows(
  api: CoreAPI,
  candidateId: string,
): readonly { id: string; from: string; through: string | undefined }[] {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return [];
  const contests = elections(api, "contests");
  return (
    elections(api, "filings").query("byPerson", [
      candidateId,
    ]) as unknown as FilingRow[]
  ).map((filing) => ({
    id: filing.id,
    from: filing.announcedOn ?? filing.filedOn,
    through: (
      contests.get(filing.contestId) as unknown as
        { electionDate?: string } | undefined
    )?.electionDate,
  }));
}

/** A candidate's folded causes, one row a voter. */
export function causeSummariesOf(
  api: CoreAPI,
  candidateId: string,
): readonly CauseSummaryRow[] {
  return table(api, "causeSummaries").query("byCandidate", [
    candidateId,
  ]) as unknown as CauseSummaryRow[];
}

/** One voter's folded causes for a candidate. */
export function causeSummaryOf(
  api: CoreAPI,
  voterId: string,
  candidateId: string,
): CauseSummaryRow | undefined {
  return table(api, "causeSummaries").get(
    `${voterId}|${candidateId}`,
  ) as unknown as CauseSummaryRow | undefined;
}

/**
 * When a race's count is in, its candidates' causes fold into one summary row
 * a voter (owner, Oct 29: "simulations... hundreds of years... still
 * speedy"; core-long-run-tables-grow-with-history).
 */
export function foldClosedRaceCauses(api: CoreAPI, contestId: string): void {
  if (!contestId || !api.state.modules.has(ELECTIONS_MODULE_ID)) return;
  const filings = elections(api, "filings").query("byContest", [
    contestId,
  ]) as unknown as { id: string; personId: string }[];
  foldCauses(api, new Set(filings.map((f) => f.personId)));
  // The player's answers to this race's asks to volunteer stand only for the race: they go with it.
  const asks = table(api, "volunteerAsks");
  for (const filing of filings)
    for (const ask of asks.query("byFiling", [filing.id]) as unknown as {
      id: string;
    }[])
      asks.remove(ask.id);
}

/**
 * A folded cause kept for the trace goes once it is older than
 * `circleActRetentionMonths`, the window the circle's routine acts already
 * keep (`decision-detail.ts`; CTO, Nov 8: a folded cause keeps its own row
 * only for the player's circle and people in focus, and only while someone
 * can ask why). Readers: dev mode's `findRecord` and a fact's `sourceId`
 * lookup in the why view; a fact older than the window names a source the
 * trace no longer finds, as for any circle act past its window. The player's
 * own rows stay. The campaign summary row already counts every folded cause.
 */
export function dropOldFoldedCauses(api: CoreAPI): void {
  const folded = table(api, "foldedCauses");
  const cutoff = new Date(`${api.state.date}T00:00:00Z`);
  cutoff.setUTCMonth(
    cutoff.getUTCMonth() - api.parameter("circleActRetentionMonths"),
  );
  const before = cutoff.toISOString().slice(0, 10);
  const player = api.state.playerId;
  for (const row of folded.rows() as unknown as CauseRow[])
    if (row.date < before && row.voterId !== player) folded.remove(row.id);
}

/**
 * Every seventh day of the month the causes older than the keeping window fold
 * for every candidate with any (an open race's too), so a race's causes do not
 * pile up as rows until its count (Montpelier, Vermont's election year added
 * about 330,000 cause rows a month and ran out of memory at 8 GB before the
 * count; core-speed-large-town-year-heap-nightly). The rows folded are each
 * voter's oldest for the candidate, in the order they were kept, so a summary
 * plus the rows still kept add to the same sums, in the same order, that
 * `contestStanding` reads. An official's service to a resident
 * (`touchImpression`) belongs to no race and folds the same way.
 */
export function foldOldCauses(api: CoreAPI): void {
  const cutoff = addDays(
    makeIsoDate(api.state.date),
    -campaignParameter("causeKeepDays"),
  );
  const old = new Set<string>();
  for (const row of table(api, "causes").rows() as unknown as CauseRow[])
    if (row.date < cutoff) old.add(row.candidateId);
  foldCauses(api, old, cutoff);
}

/**
 * Fold candidates' causes into one summary row a voter. A voter and
 * candidate fold whole, so a summary's sum is the same sum, in the same
 * order, that `contestStanding` reads. The player's own causes stay as rows.
 * A folded cause that a voter's known fact names as its source moves to
 * `foldedCauses`, where the trace still finds it; no other folded cause is
 * read, so none other is kept (CTO, Oct 30 08:15, amending 03:05). A pledge
 * keeps no cause: a closed race's pledges go at its close (`closeRace`), and
 * the warmth those visits moved stays in the summary (governing lead, Nov 1
 * 21:22; CTO's amendment 21:25).
 */
function foldCauses(
  api: CoreAPI,
  candidateIds: Iterable<string>,
  /** Only the causes dated before this day fold; all of them when absent. */
  before?: string,
): void {
  const core = api.state as CoreState;
  const causes = table(api, "causes"),
    summaries = table(api, "causeSummaries"),
    folded = table(api, "foldedCauses");
  // What each voter knows names its sources; the fold writes no knowledge,
  // so a voter's set is read once for all the candidates it folds.
  const sourcesOf = new Map<string, Set<string>>();
  for (const candidateId of candidateIds) {
    if (candidateId === core.playerId) continue;
    const windows = campaignWindows(api, candidateId);
    const byVoter = new Map<string, CauseRow[]>();
    for (const row of causes.query("byCandidate", [
      candidateId,
    ]) as unknown as CauseRow[]) {
      if (before !== undefined && row.date >= before) continue;
      const rows = byVoter.get(row.voterId) ?? [];
      rows.push(row);
      byVoter.set(row.voterId, rows);
    }
    for (const [voterId, rows] of byVoter) {
      const id = `${voterId}|${candidateId}`;
      const before = summaries.get(id) as unknown as
        CauseSummaryRow | undefined;
      let moved = before?.moved ?? 0;
      let firstDoor = before?.firstDoor ?? null;
      const acts: Record<
        string,
        { reached: number; warmer: number; cooler: number }
      > = {};
      for (const [act, count] of Object.entries(before?.acts ?? {}))
        acts[act] = { ...count };
      const byFiling: Record<
        string,
        {
          moved: number;
          acts: Record<
            string,
            { reached: number; warmer: number; cooler: number }
          >;
        }
      > = {};
      for (const [filingId, sums] of Object.entries(before?.byFiling ?? {}))
        byFiling[filingId] = {
          moved: sums.moved,
          acts: Object.fromEntries(
            Object.entries(sums.acts).map(([act, count]) => [
              act,
              { ...count },
            ]),
          ),
        };
      let sources = sourcesOf.get(voterId);
      if (!sources)
        sourcesOf.set(
          voterId,
          (sources = new Set(
            [...(core.knowledgeByPerson.get(voterId)?.values() ?? [])].map(
              (fact) => fact.sourceId,
            ),
          )),
        );
      for (const row of rows) {
        const entry = (acts[row.act] ??= { reached: 0, warmer: 0, cooler: 0 });
        entry.reached += 1;
        if (row.warmthAfter > row.warmthBefore) entry.warmer += 1;
        else if (row.warmthAfter < row.warmthBefore) entry.cooler += 1;
        moved = moved + (row.warmthAfter - row.warmthBefore);
        for (const window of windows) {
          if (
            row.date < window.from ||
            (window.through !== undefined && row.date > window.through)
          )
            continue;
          const sums = (byFiling[window.id] ??= { moved: 0, acts: {} });
          const part = (sums.acts[row.act] ??= {
            reached: 0,
            warmer: 0,
            cooler: 0,
          });
          part.reached += 1;
          if (row.warmthAfter > row.warmthBefore) part.warmer += 1;
          else if (row.warmthAfter < row.warmthBefore) part.cooler += 1;
          sums.moved = sums.moved + (row.warmthAfter - row.warmthBefore);
        }
        if (
          row.act === "door" &&
          row.actorId === candidateId &&
          (firstDoor === null || row.date < firstDoor)
        )
          firstDoor = row.date;
        if (sources.has(row.id) && keepsWhy(core, voterId))
          folded.put(row as unknown as ModuleRow);
        causes.remove(row.id);
      }
      summaries.put({
        id,
        voterId,
        candidateId,
        through: api.state.date,
        moved,
        acts,
        firstDoor,
        byFiling,
      } as unknown as ModuleRow);
    }
  }
}
