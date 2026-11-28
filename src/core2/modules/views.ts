/**
 * Political views (M1-10), first version on the new core.
 *
 * Each person's opening lean comes from who they are on record: the CES 2024
 * spread for their state and age band, with a share their household holds in
 * common (families and partners lean alike). That is who someone is at the
 * opening, keyed to them and their home, never a choice made in play. How
 * closely they follow politics comes the same way. After the opening, views
 * change only from causes: an event with a topic that reaches the person moves
 * their stance on that topic, less for people who follow politics closely,
 * and each change records its cause. Nothing drifts on a schedule.
 *
 * When someone makes the case to the person (a speech, a hearing statement, a
 * constituent's case, a lobbying visit, a candidate's stated position), the
 * event names the speaker, and how far it moves the listener slides with the
 * speaker's standing with them: how near their views are (whom they trust),
 * how close the two are today, whether they share a party, and how the
 * speaker has voted on the question before. `viewOn` is the person's current
 * view on a question, which every vote reads.
 *
 * Views form when first read, so a person filled in later gets theirs too.
 */
import { isDemoted } from "../counted-groups";
import {
  hasStake,
  LIFE_EVENT_KINDS,
  questionsReading,
  stakeShift,
} from "../life-stake-rule";
import {
  countedLifeStake,
  forgetLife,
  fullLifeStake,
  lifeChangesOf,
  lifeReadPeople,
} from "../life-stakes";

// Screens read a full person's circumstances through the views engine.
export { fullLifeStake };
import { livedQuestion } from "./press";
import { addDays, ageOnDate, daysBetween, makeIsoDate } from "../kernel/dates";
import type { StanceProfile } from "./campaigns";
import {
  groupStance,
  personLean,
  popularity,
  STANCE_LOADINGS,
  personStance,
} from "../campaign-views";
import { feelingBetween } from "../closeness";
import drivesJson from "../data/drives.json" with { type: "json" };
import type {
  CoreAPI,
  CoreEventInput,
  CoreModule,
  CoreState,
  PersonId,
  PersonState,
} from "../types";
import {
  decisionLean,
  decisionTraitWeight,
  reportOutcome,
} from "../trait-decisions";
import { keepsWhy } from "../why-kept";
import { stanceMoved } from "../stance-listeners";
import { VIEWS_KEYS } from "../views-keys";
import { PAST_WORK_SPELL } from "../past-reads";
import { historyOf } from "../past-history";
import {
  countedGroupStance,
  countedStancesOfHousehold,
  liveCountedCrime,
  type CountedCrimeTally,
} from "../counted-news-views";
import { VIEWS_MODULE_ID } from "./views-constants";
import {
  VIEWS_DATA,
  VIEWS_SPEAKER_KEY,
  VIEWS_SPEAKER_LEAN_KEY,
  direction,
  engagementFrom,
  openingLean,
  profileFromAverage,
  stanceAfterCase,
  stancesTable,
  v,
  viewCell,
  viewOf,
  viewsTable,
} from "./views-reads";
export {
  VIEWS_DATA,
  VIEWS_SPEAKER_KEY,
  VIEWS_SPEAKER_LEAN_KEY,
  ageBand,
  countedLean,
  stanceAfterCase,
  stanceRow,
  stancesOf,
  viewCell,
  viewOf,
} from "./views-reads";
export { VIEWS_MODULE_ID };

const DRIVE_MOMENTS = new Set<string>(
  Object.entries(
    (drivesJson as { eventKinds: Record<string, string> }).eventKinds,
  )
    .filter(([key]) => key === "formed" || key === "strengthened")
    .map(([, kind]) => kind),
);
/** Facts by which an event cites a law, a vote or a bill. */
const CITED_RECORDS = ["lawId", "voteId", "billId"] as const;

/** The drives engine's acts (sharing a cause, donating, volunteering, going to an office, ...). */
const DRIVE_ACTS = new Set<string>([
  ...Object.values(
    (drivesJson as { eventKinds: Record<string, string> }).eventKinds,
  ),
  ...((
    drivesJson as { civicActEvents?: readonly { eventKind: string }[] }
  ).civicActEvents?.map((row) => row.eventKind) ?? []),
]);

/** The parties and record engines' tables, read by id (they import this one). */
const PARTIES_STORE = "core2-parties-v1";
const RECORD_STORE = "core2-record-v1";

export interface PersonView {
  id: PersonId;
  /** -2 (very liberal) to +2 (very conservative). */
  lean: number;
  /** 0 (hardly follows politics) to 1 (follows it most of the time). */
  engagement: number;
  /** "not-sure" when they would not place themselves. */
  label: string;
  /** The records and key cell the opening view came from. */
  basis: string;
  formedAt: string;
  /**
   * How far the person's faith (how important religion is to their group, 0 to
   * 1) and four-year degree (1 or 0) sit from the average of their age band
   * in their state; the stance loadings move each question's opening stance
   * by these. Absent for a child, who has neither on record.
   */
  faithFromAverage?: number;
  collegeFromAverage?: number;
  /** What the person lived through before the start that moved their lean, each with its record (part 14). */
  pastShifts?: readonly PastShift[];
  /** The lean before those shifts, so a shift read again (a parent opened later) replaces the last. */
  leanBeforePast?: number;
}

/**
 * A move of a person's opening lean by an event in their own past (the
 * owner, Nov 12: a father's lost job "could have turned you super MAGA, or
 * it could have turned you liberal"), by the record that holds the event.
 */
export interface PastShift {
  /** The record of the event: a work spell that ended in a layoff. */
  recordId: string;
  /** A parent's job lost while the person was a child, or their own as an adult. */
  kind: "parent-job-lost" | "own-job-lost";
  /** How far it moved the lean, on the views scale (negative is more liberal). */
  change: number;
  /** The parent whose view the person moved toward or away from. */
  parentId?: string;
  /** Toward the parent's view (positive) or away from it (negative), from the person's traits. */
  follow?: number;
  /** For their own layoff: how far their traits lean to blaming outsiders (positive) over leaning on help (negative). */
  blame?: number;
}

export interface Stance {
  id: string;
  personId: PersonId;
  topic: string;
  /** The change the person wants, and how strongly (0 to 1). */
  desiredChange: string;
  strength: number;
  causes: readonly {
    eventId: string;
    date: string;
    change: number;
    /** Who made the case, when someone did. */
    speakerId?: string;
    /** The record (a story heard, a notice) by which they learned of the law, vote or bill the event cites. */
    learnedFrom?: string;
    /** How many events from this same source (speaker and record) have moved the stance, and by how much in all, since the source last went quiet for longer than stanceCauseKeptDays. `eventId`, `date` and `change` are the latest. */
    count?: number;
    total?: number;
  }[];
  /** How many times each speaker has made a case to them: the repeat wear-out reads this, whatever causes are kept. */
  heard?: Readonly<Record<string, number>>;
}

const engagementCells = new WeakMap<object, Map<string, number>>();

/**
 * How closely a counted resident follows politics: the same value their
 * view gets when they are filled in as a full person (their own key spread
 * around the CES cell's average for their state and age), without making
 * them one. Read for counted groups, so the count and the person agree.
 */
export function countedEngagement(
  api: CoreAPI,
  voter: {
    readonly id: PersonId;
    readonly birthDate: string;
    readonly placeId: string;
    readonly traits: PersonState["traits"];
  },
  record?: object,
): number {
  const cache = engagementCells.get(api.state) ?? new Map<string, number>();
  engagementCells.set(api.state, cache);
  const age = ageOnDate(voter.birthDate, api.state.startedAt);
  const key = `${voter.placeId}|${age}`;
  let mean = cache.get(key);
  if (mean === undefined) {
    const person = {
      ...(record ?? {}),
      id: voter.id,
      birthDate: voter.birthDate,
      placeId: voter.placeId,
      traits: voter.traits,
    } as unknown as PersonState;
    const { cell } = viewCell(
      api.state as CoreState,
      person,
      api.state.startedAt,
      api.state.seed,
    );
    mean = cell.engagement ?? VIEWS_KEYS.national.engagement!;
    cache.set(key, mean);
  }
  return engagementFrom(api.state.seed, voter.id, mean);
}

/** A view moved by what its person lived through before the start: the shifts replace any read before. */
function withPastShifts(
  view: PersonView,
  shifts: readonly PastShift[],
): PersonView {
  if (!shifts.length && !view.pastShifts) return view;
  const base = view.leanBeforePast ?? view.lean;
  const lean = Math.min(
    v("leanMax"),
    Math.max(
      v("leanMin"),
      shifts.reduce((sum, row) => sum + row.change, base),
    ),
  );
  return {
    ...view,
    lean,
    label:
      view.label === "not-sure"
        ? view.label
        : VIEWS_DATA.labels[Math.round(lean) - v("leanMin")]!,
    leanBeforePast: base,
    pastShifts: shifts,
  };
}

/** A person's opening lean and how closely they follow politics, full or not (a parent elsewhere or no longer living). */
function leanAndEngagement(
  api: CoreAPI,
  person: PersonState,
): { lean: number; engagement: number } {
  const held = api.state.people.has(person.id) ? viewOf(api, person.id) : null;
  if (held) return held;
  const { lean, cell } = openingLean(
    api.state as CoreState,
    person,
    api.state.startedAt,
    api.state.seed,
  );
  return {
    lean,
    engagement: engagementFrom(
      api.state.seed,
      person.id,
      cell.engagement ?? VIEWS_KEYS.national.engagement!,
    ),
  };
}

/** The layoffs among a person's work spells before the start, oldest first, with the day each ended and the day they next started work. */
function layoffsOf(api: CoreAPI, personId: PersonId) {
  // The work spells of the simulated past, from the one history reader.
  const spells = historyOf(
    api.state as CoreState,
    { person: personId },
    { kinds: [PAST_WORK_SPELL], from: "past" },
  )
    .map((event) => ({ id: event.id, facts: event.facts ?? {} }))
    .sort((a, b) =>
      String(a.facts.startedAt).localeCompare(String(b.facts.startedAt)),
    );
  return spells.flatMap((row, index) =>
    row.facts.end === "let-go" && typeof row.facts.endedAt === "string"
      ? [
          {
            recordId: row.id,
            endedAt: row.facts.endedAt,
            nextWork: spells[index + 1]?.facts.startedAt as string | undefined,
          },
        ]
      : [],
  );
}

/**
 * How what a person lived through before the start moved their view (part
 * 14; the owner, Nov 12, either way). Two events are read, each from its
 * work-spell record:
 * - A parent laid off while the person was a child. The person moves toward
 *   that parent's view, or away from it, by their own traits (the shared
 *   decision `views.parent-hardship`); further the more the parent follows
 *   politics, since children take on their parents' views more "if the
 *   family is highly politicized" (Jennings, Stoker and Bowers 2009).
 * - Their own layoff as an adult, which moved them toward more support for
 *   welfare spending, "appreciably larger among Republicans", and "short
 *   lived, dissipating as individuals' employment situations improved"
 *   (Margalit 2013): leftward on average, more for those who lean right,
 *   fading with the years back at work; rightward for someone whose traits
 *   lean to blaming outsiders (the shared decision `views.own-layoff`).
 * Each shift keeps its record, so the view's why names the event.
 */
export function pastViewShifts(
  api: CoreAPI,
  person: PersonState,
  parents: readonly PersonState[],
): PastShift[] {
  const start = api.state.startedAt;
  const born = makeIsoDate(person.birthDate);
  const grown = v("pastFormativeAge");
  const { lean } = openingLean(
    api.state as CoreState,
    person,
    start,
    api.state.seed,
  );
  const shifts: PastShift[] = [];
  for (const parent of parents) {
    const lost = layoffsOf(api, parent.id).find((row) => {
      const age = ageOnDate(born, makeIsoDate(row.endedAt));
      return (
        row.endedAt >= person.birthDate && age < grown && row.endedAt < start
      );
    });
    if (!lost) continue;
    const theirs = leanAndEngagement(api, parent);
    const follow = decisionLean(
      api.state,
      person,
      "views.parent-hardship",
      "follow",
      "turn-away",
    );
    // stopgapId: SG-PEOPLE-past-views-sizes
    api.stopgap("SG-PEOPLE-past-views-sizes");
    shifts.push({
      recordId: lost.recordId,
      kind: "parent-job-lost",
      change:
        v("pastParentHardshipPull") *
        theirs.engagement *
        follow *
        (theirs.lean - lean),
      parentId: parent.id,
      follow,
    });
  }
  const own = layoffsOf(api, person.id)
    .filter(
      (row) =>
        row.endedAt < start &&
        ageOnDate(born, makeIsoDate(row.endedAt)) >= grown,
    )
    .at(-1);
  if (own) {
    const backAt = own.nextWork && own.nextWork < start ? own.nextWork : start;
    const years =
      daysBetween(makeIsoDate(backAt), makeIsoDate(start)) /
      api.parameter("daysPerMeanYear");
    // Which way: on average left, toward more help (Margalit 2013); someone
    // whose traits lean to blaming outsiders and looking out for themselves
    // turns right instead, as trade-hit places did in part (Autor, Dorn,
    // Hanson and Majlesi 2020, "pure rightward shifts in others").
    const blame = decisionLean(
      api.state,
      person,
      "views.own-layoff",
      "blame-outsiders",
      "lean-on-help",
    );
    const way = -v("one") + v("pastOwnLayoffTurnWeight") * blame;
    api.stopgap("SG-PEOPLE-past-views-sizes");
    shifts.push({
      recordId: own.recordId,
      kind: "own-job-lost",
      change:
        v("pastOwnLayoffShift") *
        way *
        Math.exp(-years / v("pastOwnLayoffFadeYears")) *
        (v("one") +
          (v("pastOwnLayoffRightBoost") * Math.max(v("zero"), lean)) /
            v("leanMax")),
      blame,
    });
  }
  return shifts;
}

/**
 * Writes what a person's past did to their view, forming it if nothing has
 * read it yet (a view forms from the same records whenever it is first
 * read). Read again when a parent's past is opened later, the new shifts
 * replace the old.
 */
export function setPastViewShifts(
  api: CoreAPI,
  personId: PersonId,
  shifts: readonly PastShift[],
): void {
  // A view forms only where the views module keeps it (a small world may run without it).
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return;
  const held = viewOf(api, personId);
  if (!held) return;
  if (JSON.stringify(held.pastShifts ?? []) === JSON.stringify(shifts)) return;
  viewsTable(api).put(
    withPastShifts(held, shifts) as unknown as { id: string },
  );
}

/**
 * A speaker's standing with a listener on a question, 0 to 1: how near their
 * views are (people trust those who think as they do), how close the two are
 * today (less any grudge the listener holds, and never below none), whether
 * they share a party (half for anyone not tied to one), and
 * how the speaker has voted on the question before (half with no record).
 * Each part slides; the weights are the views table's.
 */
/** The lean an event carries for a speaker still in the wider population, if it names one. */
export function speakerLeanOf(event: {
  readonly facts?: Readonly<Record<string, unknown>>;
}): number | undefined {
  const lean = event.facts?.[VIEWS_SPEAKER_LEAN_KEY];
  return typeof lean === "string" &&
    lean !== "" &&
    Number.isFinite(Number(lean))
    ? Number(lean)
    : undefined;
}

export function standingWith(
  api: CoreAPI,
  listener: Pick<PersonView, "id" | "lean">,
  speakerId: string,
  topic: string,
  desiredChange: string,
  countedHearer?: Pick<PersonState, "traits">,
  /** The speaker's lean where they are still in the wider population (no view row of their own). */
  countedSpeakerLean?: number,
  /** A group of hearers' mean closeness to the speaker, in place of one listener's tie (`hearAsGroups`). */
  groupCloseness?: number,
): number {
  const speaker = viewOf(api, speakerId);
  const half = v("one") / v("two");
  const speakerLean = speaker?.lean ?? countedSpeakerLean;
  const nearTrust =
    speakerLean !== undefined
      ? Math.max(
          v("zero"),
          v("one") -
            Math.abs(listener.lean - speakerLean) /
              (v("leanMax") - v("leanMin")),
        )
      : half;
  // How far the listener trusts anyone follows their own traits (generalized
  // trust: agreeableness), at the weight fitted to its study.
  const hearer = countedHearer ?? api.state.people.get(listener.id);
  let trust = nearTrust;
  if (hearer) {
    const lean = decisionLean(
      api.state,
      hearer,
      "views.trust",
      "trust",
      "distrust",
    );
    trust = Math.min(
      v("one"),
      nearTrust *
        Math.exp(decisionTraitWeight(api.state, "views.trust") * lean),
    );
    // The audit's probe (off in play) sees the trust with and without the trait term.
    reportOutcome("views.trust", listener.id, lean, "size", (withTerm) =>
      withTerm ? trust : nearTrust,
    );
  }
  // How the listener feels about the speaker: the one read (the tie row, the
  // hours other engines register for two people with no tie row, such as
  // members who sit together, less the listener's grudge), floored at none so
  // the term stays 0 to 1 inside its fitted weight.
  const closeness =
    groupCloseness ??
    Math.max(v("zero"), feelingBetween(api.state, listener.id, speakerId));
  const partyOf = (id: string) =>
    api.state.modules.has(PARTIES_STORE)
      ? ((
          api.moduleState(PARTIES_STORE).table("ties").get(id) as unknown as
            { partyId: string | null } | undefined
        )?.partyId ?? null)
      : null;
  const mine = partyOf(listener.id);
  const theirs = partyOf(speakerId);
  const party =
    mine && theirs ? (mine === theirs ? v("one") : v("zero")) : half;
  const want = direction(desiredChange);
  const votes = api.state.modules.has(RECORD_STORE)
    ? (
        api
          .moduleState(RECORD_STORE)
          .table("votes")
          .query("byPerson", [speakerId]) as unknown as {
          stance: { question: string; position: number };
        }[]
      ).filter((row) => row.stance.question === topic)
    : [];
  const record =
    votes.length && want !== v("zero")
      ? (v("one") +
          votes.reduce(
            (sum, row) => sum + Math.sign(row.stance.position) * want,
            v("zero"),
          ) /
            votes.length) /
        v("two")
      : half;
  return (
    v("standingTrustWeight") * trust +
    v("standingClosenessWeight") * closeness +
    v("standingPartyWeight") * party +
    v("standingRecordWeight") * record
  );
}

/**
 * How far the person's stance on a policy question has moved since the
 * opening, -1 to 1: positive toward enacting it, negative toward repealing.
 */
export function stanceOn(
  api: CoreAPI,
  personId: PersonId,
  question: string,
): number {
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return v("zero");
  const stance = stancesTable(api).get(`${personId}:${question}`) as unknown as
    Stance | undefined;
  return (
    (stance ? direction(stance.desiredChange) * stance.strength : v("zero")) +
    groupShift(api, personId, question)
  );
}

/**
 * The shift a person took as one of a group of like hearers nobody watches
 * (`hearAsGroups`, owner's level of detail, Nov 9): the group's stance on the
 * question, read by the group the person was first heard in. Zero for anyone
 * never heard as a group. One row read for the membership, one for the stance.
 */
export function groupShift(
  api: CoreAPI,
  personId: PersonId,
  question: string,
): number {
  const state = api.moduleState(VIEWS_MODULE_ID);
  const member = state.table("groupHearers").get(personId) as unknown as
    { groupId: string } | undefined;
  if (!member) return v("zero");
  const stance = state
    .table("groupStances")
    .get(`${member.groupId}:${question}`) as unknown as Stance | undefined;
  return stance ? direction(stance.desiredChange) * stance.strength : v("zero");
}

/**
 * How far what the person has heard since the opening has moved their view
 * on a question, on the scale of a view (-1 to 1), positive toward enacting.
 * A state or federal official's position reads this on top of their own
 * stand, the way a town member's view does (`viewOn`).
 */
export function caseShift(
  api: CoreAPI,
  personId: PersonId,
  question: string,
): number {
  return v("stanceViewWeight") * stanceOn(api, personId, question);
}

/**
 * A person's opening stance on a question the survey asked, formed once and
 * kept: what their faith and what their schooling add to where their lean
 * puts them, each with the loading and the distance from the average of their
 * age band that made it. Everything after the opening moves the stance only by
 * a stored cause (`stanceOn`). A question the survey did not ask, or a person
 * with no recorded faith or schooling, has no record and adds nothing.
 */
export interface OpeningRecord {
  readonly id: string;
  readonly personId: PersonId;
  readonly question: string;
  /** What faith and degree add together, on the scale of a view. */
  readonly total: number;
  readonly reasons: readonly {
    readonly kind: "faith" | "degree";
    readonly loading: number;
    readonly fromAverage: number;
    readonly adds: number;
  }[];
}

export function openingRecord(
  api: CoreAPI,
  personId: PersonId,
  question: string,
): OpeningRecord | undefined {
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return undefined;
  const table = api.moduleState(VIEWS_MODULE_ID).table("openings");
  const id = `opening:${personId}:${question}`;
  const held = table.get(id) as unknown as OpeningRecord | undefined;
  if (held) return held;
  const loadings =
    STANCE_LOADINGS[question.replace(/^us-policy-positions:/, "")]?.loadings;
  const view = loadings ? viewOf(api, personId) : null;
  if (!loadings || !view || view.faithFromAverage === undefined)
    return undefined;
  const reasons = [
    {
      kind: "faith" as const,
      loading: loadings.faith.value,
      fromAverage: view.faithFromAverage,
      adds: loadings.faith.value * view.faithFromAverage,
    },
    {
      kind: "degree" as const,
      loading: loadings.college.value,
      fromAverage: view.collegeFromAverage ?? v("zero"),
      adds: loadings.college.value * (view.collegeFromAverage ?? v("zero")),
    },
  ];
  const record: OpeningRecord = {
    id,
    personId,
    question,
    total: reasons.reduce((n, r) => n + r.adds, v("zero")),
    reasons,
  };
  table.put(record as unknown as { id: string });
  return record;
}

/**
 * The person's own stance on a question before what they have heard and
 * before the country's view of it: where their lean puts them on its axis,
 * plus their stored opening record (what their faith and degree add beyond
 * the lean, CES 2020 loadings), plus what their own circumstances add today
 * (`lifeShift`). A candidate's platform stands here (`StanceReader` in
 * `src/core2/campaign-stances.ts`): a platform answers to the candidate's
 * party, record and own life, not to national polls, so rivals of opposite
 * parties stay apart on the questions most people favor.
 */
export function ownOpeningStance(
  api: CoreAPI,
  personId: PersonId,
  question: string,
  lean: number,
): number {
  return (
    personStance(lean, question) +
    (openingRecord(api, personId, question)?.total ?? v("zero")) +
    lifeShift(api, personId, question)
  );
}

/**
 * The person's view of a question before what they have heard: their own
 * opening (`ownOpeningStance`) plus how popular the question is across their
 * world's country (`popularity`, the term a counted voter's stance carries
 * too), so a voter in a race, on a ballot measure and in a poll holds one
 * view.
 */
export function openingStance(
  api: CoreAPI,
  personId: PersonId,
  question: string,
  lean: number,
): number {
  return (
    ownOpeningStance(api, personId, question, lean) +
    popularity(question, api.state.seed)
  );
}

/**
 * What a full person's own circumstances add to their stance on a question
 * today (`src/core2/life-stakes.ts`): read from their records each day, so the stance
 * moves when their life does. Zero for a question no recorded circumstance
 * bears on.
 */
export function lifeShift(
  api: CoreAPI,
  personId: PersonId,
  question: string,
): number {
  if (!hasStake(question)) return v("zero");
  const person = api.state.people.get(personId);
  return person
    ? stakeShift(fullLifeStake(api.state as CoreState, person), question)
    : v("zero");
}

/**
 * The person's current view on a policy question, -1 to 1: where their
 * opening lean (`lean`, the campaigns engine's, -1 to 1) puts them on the
 * question's axis, what their faith, degree and own circumstances add
 * (`openingStance`), plus how far what they have heard since has moved them.
 */
export function viewOn(
  api: CoreAPI,
  personId: PersonId,
  question: string,
  lean: number,
): number {
  return Math.max(
    -v("one"),
    Math.min(
      v("one"),
      openingStance(api, personId, question, lean) +
        v("stanceViewWeight") * stanceOn(api, personId, question),
    ),
  );
}

const profiles = new WeakMap<object, Map<PersonId, StanceProfile>>();

/**
 * A counted resident's faith and degree against the average of their age band
 * in their state: the profile they will have when filled in, kept for the
 * world. A counted resident has no past facts, so the world's seed gives the
 * same profile the person will have once met (`profileFor` depends on nobody
 * else, and `viewOf` reads it the same way).
 */
export function countedStanceProfile(
  api: CoreAPI,
  voter: Pick<PersonState, "id" | "householdId" | "birthDate" | "placeId">,
): StanceProfile {
  const held = profiles.get(api.state) ?? new Map();
  profiles.set(api.state, held);
  let kept = held.get(voter.id);
  if (!kept) {
    const id = voter.id;
    kept = {
      ...profileFromAverage(
        api.state as CoreState,
        voter,
        api.state.startedAt,
        api.state.seed,
      ),
      seed: api.state.seed,
      // What their group has heard or lived since, read as a full person's
      // own stance is in `viewOn` (src/core2/counted-news-views.ts).
      heard: (question: string) => {
        const row = countedGroupStance(api, id, question);
        return row
          ? v("stanceViewWeight") * direction(row.desiredChange) * row.strength
          : v("zero");
      },
    };
    held.set(voter.id, kept);
  }
  // Their circumstances are read again as their household's record changes.
  const life = countedLifeStake(api.state as CoreState, voter.id);
  return life ? { ...kept, life } : kept;
}

/**
 * A counted resident's view of one question, -1 to 1: the same read a full
 * person's view is made from (their lean on the town's scale, the question's
 * popularity, their life's stake), without making them a full person (one
 * model, two tiers). `town` is the town's own lean.
 */
export function countedViewOn(
  api: CoreAPI,
  voter: Pick<
    PersonState,
    "id" | "traits" | "householdId" | "birthDate" | "placeId"
  >,
  question: string,
  town: number,
): number {
  return groupStance(
    personLean(api.state.people, voter, town),
    question,
    countedStanceProfile(api, voter),
  );
}

/**
 * A counted group's view of one question, -1 to 1, read as a full person's
 * `viewOn` is: where the group's mean lean puts it on the question's axis,
 * the question's popularity, and how far what the group has heard or lived
 * since has moved it (`heard`, its row in countedStances).
 */
export function countedGroupViewOn(
  api: CoreAPI,
  lean: number,
  question: string,
  heard: Stance | undefined,
): number {
  return Math.max(
    -v("one"),
    Math.min(
      v("one"),
      personStance(lean, question) +
        popularity(question, api.state.seed) +
        v("stanceViewWeight") *
          (heard ? direction(heard.desiredChange) * heard.strength : v("zero")),
    ),
  );
}

/**
 * How much a person agrees with a platform, -1 to 1: the mean, over its
 * stated positions, of their current view times the position (the same rule a counted
 * voter's group is read by, `groupAgreement`).
 */
export function agreementWith(
  api: CoreAPI,
  personId: PersonId,
  lean: number,
  platform: readonly { question: string; position: number }[],
): number {
  if (!platform.length) return v("zero");
  let sum = v("zero");
  for (const stance of platform)
    sum += viewOn(api, personId, stance.question, lean) * stance.position;
  return Math.max(-v("one"), Math.min(v("one"), sum / platform.length));
}

// Engines that act on the day a stance moves carry the listener on their module
// (`stanceListener`); `stanceMoved` (../stance-listeners) tells each installed one.
export { VIEWS_KEYS };

/** One heard case, applied by the same rule to a person or a counted group. */
export interface HeardCase {
  readonly view: Pick<PersonView, "id" | "engagement">;
  readonly hearer?: Pick<PersonState, "traits">;
  readonly prior?: Stance;
  readonly event: Pick<CoreEventInput, "id" | "date">;
  readonly topic: string;
  readonly desiredChange: string;
  readonly size: number;
  readonly nearness: number;
  readonly speakerId?: string;
  readonly learnedFrom?: string;
  readonly keepCauses: boolean;
  /** Counted audience mass / represented population; full readers use one. */
  readonly exposure?: number;
}

/**
 * Tell a full person's stance that their life changed: each question a
 * changed circumstance bears on moved for them today, so the engines that act
 * on the day a stance moves (`stance-listeners`) act on it.
 */
function tellLifeChange(api: CoreAPI, personId: PersonId): void {
  const core = api.state as CoreState;
  const person = core.people.get(personId);
  if (!person || !person.alive || isDemoted(person)) {
    forgetLife(core, personId);
    return;
  }
  if (!viewOf(api, personId)) return;
  for (const question of questionsReading(lifeChangesOf(core, person)))
    stanceMoved(api, personId, question);
}

/** A life event names its people; a birth or a home bought or lost changes their whole household's circumstances. */
function tellLifeEvent(api: CoreAPI, event: CoreEventInput): void {
  const core = api.state as CoreState;
  const told = new Set<PersonId>();
  for (const id of event.personIds) {
    const person = core.people.get(id);
    for (const member of core.households.get(person?.householdId ?? "")
      ?.memberIds ?? [id])
      told.add(member as PersonId);
  }
  for (const id of told) tellLifeChange(api, id);
}

const LIFE_REVIEW = "views-life-review";
const reviewing = new WeakSet<CoreState>();

/** The first of next month, when everyone whose circumstances were read is read again. */
function scheduleLifeReview(api: CoreAPI): void {
  const core = api.state as CoreState;
  const next =
    addDays(
      makeIsoDate(`${core.date.slice(0, "YYYY-MM".length)}-01`),
      32,
    ).slice(0, "YYYY-MM".length) + "-01";
  const calendar = api.moduleCalendar(VIEWS_MODULE_ID);
  const key = `life-review:${next}`;
  reviewing.add(core);
  if (calendar.get(key)) return;
  calendar.schedule({
    key,
    date: next,
    kind: LIFE_REVIEW,
    source: {
      tag: "SOURCED",
      asOf: core.date,
      citation:
        "The views engine reads again, each month, the circumstances of every full person it has read (src/core2/data/views/stakes.json, lifeEvents).",
    },
    sourceRecordIds: ["views:life-stakes"],
  });
}

export const viewsModule: CoreModule = {
  id: VIEWS_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      people: {},
      countedStances: { indexes: { byGroup: { fields: ["groupId"] } } },
      /** Groups of like full hearers nobody watches, and their member counts (`hearAsGroups`). */
      hearerGroups: {},
      /** Which hearer group each unwatched full person was first heard in. */
      groupHearers: { indexes: { byGroup: { fields: ["groupId"] } } },
      /** Each hearer group's stance by topic: the mean of its members' shifts. */
      groupStances: { indexes: { byGroup: { fields: ["groupId"] } } },
      openings: { indexes: { byPerson: { fields: ["personId"] } } },
      stances: {
        indexes: {
          byPerson: { fields: ["personId"] },
          byTopic: { fields: ["topic"] },
        },
      },
    },
  },
  // A household filled in from the counts brings what its group heard or
  // lived: each adult starts from the group's stance rows, the mean they held
  // while counted, and moves on their own from there.
  onFillIn(api, { householdId, memberIds }) {
    const rows = countedStancesOfHousehold(api, householdId);
    if (!rows.length) return;
    const adult = api.parameter("votingAge");
    const table = stancesTable(api);
    for (const personId of memberIds) {
      const person = api.state.people.get(personId as PersonId);
      if (!person || ageOnDate(person.birthDate, api.state.date) < adult)
        continue;
      for (const row of rows) {
        const id = `${personId}:${row.topic}`;
        if (table.get(id)) continue;
        table.putOwned({
          id,
          personId,
          topic: row.topic,
          desiredChange: row.desiredChange,
          strength: row.strength,
          causes: row.causes,
        } as unknown as { id: string });
        stanceMoved(api, personId as PersonId, row.topic);
      }
    }
  },
  onCalendarWork(api, work) {
    if (work.kind !== LIFE_REVIEW) return;
    for (const id of lifeReadPeople(api.state as CoreState))
      tellLifeChange(api, id as PersonId);
    scheduleLifeReview(api);
  },
  eventKinds: ["*"],
  onEvent(api, event, learnedBy) {
    if (!reviewing.has(api.state as CoreState)) scheduleLifeReview(api);
    if (LIFE_EVENT_KINDS.has(event.kind)) tellLifeEvent(api, event);
    // Only an event with a topic and a wanted change carries a stance, or a
    // condition someone lives (their household burglarized): that argues no
    // change, so each person it happened to takes it as a reason for the
    // side their own view already holds on the question it ties to, as a
    // reader of a story about it does; someone who only hears of it does not
    // live it. A drive forming or growing restates a change the event behind
    // it already made, so it moves nothing again.
    const lived = event.desiredChange ? null : livedQuestion(event.kind);
    const topic = lived ?? event.topic;
    if (!topic || (!event.desiredChange && !lived)) return;
    if (DRIVE_MOMENTS.has(event.kind)) return;
    const impulse =
      Math.abs(event.moodImpulse ?? v("zero")) +
      Math.max(v("zero"), event.stressImpulse ?? v("zero"));
    const size = impulse > v("zero") ? impulse : v("one");
    for (const personId of learnedBy) {
      // Someone back in the counts holds no stance of their own while
      // counted (two-level rule, Oct 11): their group's record speaks for
      // them, and meeting them again fills them in from it. Writing theirs
      // left more stance rows for them than for full people by year 3
      // (Montpelier, Vermont, Nov 9: 21,093 against 12,880).
      const hearer = api.state.people.get(personId);
      if (hearer && isDemoted(hearer)) continue;
      const view = viewOf(api, personId);
      if (!view) continue;
      let desiredChange = event.desiredChange;
      if (lived) {
        // A counted group lives its victimizations through its tally row
        // (`liveCountedCrime` in src/core2/counted-news-views.ts).
        if (!event.personIds.includes(personId)) continue;
        const current = viewOn(api, personId, lived, view.lean);
        if (current === v("zero")) continue;
        desiredChange = current > v("zero") ? "enact" : "repeal";
      }
      if (!desiredChange) continue;
      const id = `${personId}:${topic}`;
      const prior = stancesTable(api).get(id) as unknown as Stance | undefined;
      // A case made by a speaker moves the listener by the speaker's
      // standing with them: the speaker the event names, or for someone who
      // only witnessed it, the person whose act it was (a cause shared with
      // them). An event about the person themselves reaches them in full.
      // A person's own act for their cause is their drive at work (the drives
      // engine strengthens it); it moves only those it reaches.
      if (DRIVE_ACTS.has(event.kind) && event.personIds.includes(personId))
        continue;
      const speakerId =
        event.facts?.[VIEWS_SPEAKER_KEY] ??
        (event.personIds.includes(personId) ? undefined : event.personIds[0]);
      if (speakerId === personId) continue;
      // Knowing is a read (owner, Oct 14, 2026): an event citing a law, a
      // vote or a bill moves a stance only for someone who learned of it,
      // from the case made to them or from a record they hold (a story they
      // heard, a notice), and the stance cites how they learned.
      const received = event.facts?.learnedFrom;
      const learnedFrom =
        typeof received === "string" && api.knows(personId, received)
          ? received
          : undefined;
      if (
        CITED_RECORDS.some((key) => event.facts?.[key] !== undefined) &&
        !speakerId &&
        !(learnedFrom && api.knows(personId, learnedFrom))
      )
        continue;
      const nearness = speakerId
        ? standingWith(
            api,
            view,
            speakerId,
            topic,
            desiredChange,
            undefined,
            speakerLeanOf(event),
          )
        : v("one");
      const stance = stanceAfterCase(api, {
        view,
        hearer: api.state.people.get(personId),
        prior,
        event,
        topic,
        desiredChange,
        size,
        nearness,
        speakerId,
        learnedFrom,
        keepCauses: keepsWhy(api.state as CoreState, personId),
      });
      if (!stance) continue;
      // Built fresh here and never touched again: frozen in place, not copied.
      stancesTable(api).putOwned(stance as unknown as { id: string });
      stanceMoved(api, personId, topic);
    }
  },
};

export {
  countedNewsGroups,
  countedNewsConcern,
  hearCountedNews,
  type CountedNewsAudience,
} from "../counted-news-views";

/**
 * A counted group lives the victimizations the crime engine tallied for it
 * (`liveCountedCrime` in src/core2/counted-news-views.ts), on the question
 * the full victim's record of that kind ties to.
 */
export function liveCountedCrimeTally(
  api: CoreAPI,
  eventKind: string,
  tally: Omit<CountedCrimeTally, "question">,
): void {
  const question = livedQuestion(eventKind);
  if (question) liveCountedCrime(api, { ...tally, question });
}
