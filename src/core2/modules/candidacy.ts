/**
 * Who runs for office (M2-04). When a contest opens, each adult it reaches
 * weighs running against staying out through the core's one chooser, from
 * their own record: how closely they follow politics (views), the strongest
 * cause they carry (drives), their temperament, their money against the
 * filing fee, their work hours, their age, how they stand with the
 * incumbent and how many people in town know them. The decision and every
 * reason behind it are kept, so each candidate on a ballot filed through a
 * choice that can be explained. Filing itself is GOV's (`fileCandidacy`).
 *
 * In play (PW-3), the day a local contest's filing window opens every named
 * adult who lives in town weighs it; an officeholder also weighs the seat
 * one level up. Whoever decides to run files with the place's filing office,
 * on a platform from their own views.
 */
import { ageOnDate, makeIsoDate } from "../../simulation/dates";
import { scoreOffers, decisionFromScores } from "../choice";
import rows from "../data/candidacy/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreModule,
  PersonId,
  PersonState,
} from "../types";
import { decisionKinds, decisionLean } from "../trait-decisions";
import { PLATFORM_QUESTIONS, questionAxis } from "../campaign-views";
import { isExplicitlyControlledPersonV1 } from "../player-control-state-v1";
import type { OfficeInput } from "../offices-local";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  filingRulesFor,
  officeFamily,
  requestSignature,
  type ContestRow,
  type FilingRow,
  type OfficeFamily,
} from "./elections";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import { PARTIES_MODULE_ID, partiesHere, partyTie } from "./parties";
import { VIEWS_DATA, VIEWS_MODULE_ID, viewOf } from "./views";

export const CANDIDACY_MODULE_ID = "candidacy";
export const CANDIDACY_PARAMETERS = rows as Readonly<Record<string, Parameter>>;
const STOPGAP = "SG-P15-candidacy-weights";

/** What a person knows about a contest when deciding (GOV's records). */
export interface OpenContest {
  contestId: string;
  officeName: string;
  filingDeadline: string;
  /** The filing fee in minor units; zero where signatures are the route. */
  feeMinor: number;
  /** Who holds the seat now, if anyone (GOV's term record). */
  incumbentId?: PersonId;
  sourceIds: readonly string[];
}

export interface CandidacyDecision {
  id: string;
  personId: PersonId;
  contestId: string;
  date: string;
  run: boolean;
  reasons: Readonly<Record<string, number>>;
  scores: readonly { actionId: string; score: number }[];
  sourceIds: readonly string[];
  /** What came of a decision to run: the filing, or the rules it didn't meet. */
  filing?: {
    readonly status: FilingRow["status"] | "refused";
    readonly filingId: string | null;
    readonly unmet: readonly string[];
  };
}

function c(api: CoreAPI, key: string): number {
  const row = CANDIDACY_PARAMETERS[key];
  if (!row) return api.parameter(key);
  if (row.stopgapId) api.stopgap(row.stopgapId);
  return row.value;
}

/** Each recorded reason for running, as a signed pull. */
export function candidacyReasons(
  api: CoreAPI,
  person: Readonly<PersonState>,
  contest: OpenContest,
): Record<string, number> {
  const zero = api.parameter("zero");
  const one = api.parameter("one");
  const two = api.parameter("two");
  const view = viewOf(api, person.id);
  let cause = zero;
  for (const drive of person.drives.values())
    cause = Math.max(cause, Math.min(one, drive.strength));
  // Every trait, through the shared trait table: how much more the person
  // leans toward running than staying out, about -1..1.
  const temperament = decisionLean(
    api.state,
    person,
    "candidacy.run",
    "candidacy-run",
    "candidacy-stay-out",
  );
  const fee = contest.feeMinor;
  const money = (person.liquidMinor - fee) / (person.liquidMinor + fee + one);
  const job = person.jobId ? api.state.jobs.get(person.jobId) : undefined;
  const hours = job ? job.hoursDaily / c(api, "candidacyFullShiftHours") : zero;
  const age = ageOnDate(
    makeIsoDate(person.birthDate),
    makeIsoDate(api.state.date),
  );
  const distance =
    (age - c(api, "candidacyAgeCenter")) / c(api, "candidacyAgeSpread");
  // How they stand with the incumbent: someone close to the officeholder
  // doesn't run against them; someone at odds with them is drawn to.
  let incumbentTie = zero;
  if (contest.incumbentId && contest.incumbentId !== person.id)
    for (const id of api.state.relationshipsByPerson.get(person.id) ?? []) {
      const row = api.state.relationships.get(id);
      if (
        row &&
        (row.otherId === contest.incumbentId ||
          row.actorId === contest.incumbentId)
      )
        incumbentTie = Math.max(-one, Math.min(one, row.level));
    }
  // Standing in town: how many people know them, against the circle a local
  // campaign starts from.
  const standing = Math.min(
    one,
    person.knownIds.size / c(api, "candidacyStandingCircle"),
  );
  return {
    engagement:
      c(api, "candidacyEngagementWeight") * (view?.engagement ?? zero),
    cause: c(api, "candidacyCauseWeight") * cause,
    temperament: c(api, "candidacyTemperamentWeight") * temperament,
    money:
      c(api, "candidacyMoneyWeight") * Math.max(-one, Math.min(one, money)),
    time: -c(api, "candidacyTimeWeight") * Math.min(one, hours),
    incumbency:
      contest.incumbentId === person.id
        ? c(api, "candidacyIncumbencyWeight")
        : zero,
    incumbentTie: -c(api, "candidacyIncumbentTieWeight") * incumbentTie,
    standing: c(api, "candidacyStandingWeight") * standing,
    age:
      c(api, "candidacyAgeWeight") *
      (two * Math.exp(-distance * distance) - one),
  };
}

function action(id: string, running: boolean): ActionDefinition {
  return {
    id,
    actKinds: decisionKinds("candidacy.run", id),
    goalKinds: [],
    need: "time",
    effortParameter: "zero",
    effectParameter: "one",
    targetKind: "contest",
    effect: "candidacy",
    reasonBindings: [
      {
        id: "circumstances",
        provider: "candidacy-circumstances",
        weightParameter: "one",
        arguments: { running: String(running) },
        stopgapId: STOPGAP,
      },
    ],
  };
}
export const RUN = action("candidacy-run", true);
export const STAY_OUT = action("candidacy-stay-out", false);

const pending = new WeakMap<object, OpenContest>();

function table(api: CoreAPI) {
  return api.moduleState(CANDIDACY_MODULE_ID).table("decisions");
}

/** One person decides whether to run in an open contest; the decision is kept. */
export function decideToRun(
  api: CoreAPI,
  personId: PersonId,
  contest: OpenContest,
): CandidacyDecision | null {
  const person = api.state.people.get(personId);
  if (!person?.alive) return null;
  const id = `${contest.contestId}:${personId}`;
  const held = table(api).get(id) as unknown as CandidacyDecision | undefined;
  if (held) return held;
  pending.set(api.state, contest);
  const offers: ActOffer[] = [STAY_OUT, RUN].map((definition) => ({
    definition,
    targetId: contest.contestId,
    availableHours: api.parameter("hoursPerDay"),
  }));
  const scored = scoreOffers(api.state, personId, offers, {
    needValues: { time: api.parameter("zero") },
  });
  const decision = decisionFromScores(api.state, personId, scored);
  pending.delete(api.state);
  const row: CandidacyDecision = {
    id,
    personId,
    contestId: contest.contestId,
    date: api.state.date,
    run: decision.selected?.definition.id === RUN.id,
    reasons: candidacyReasons(api, person, contest),
    scores: scored.map((entry) => ({
      actionId: entry.offer.definition.id,
      score: entry.score,
    })),
    sourceIds: [...contest.sourceIds, person.id, person.householdId],
  };
  table(api).put(row as unknown as { id: string });
  return row;
}

export function candidatesFor(
  api: CoreAPI,
  contestId: string,
): CandidacyDecision[] {
  return table(api).query("byContestRun", [
    contestId,
    true,
  ]) as unknown as CandidacyDecision[];
}

/** One person's recorded decision in one contest, if they made one. */
export function decisionOf(
  api: CoreAPI,
  contestId: string,
  personId: PersonId,
): CandidacyDecision | null {
  if (!api.state.modules.has(CANDIDACY_MODULE_ID)) return null;
  return (
    (table(api).get(`${contestId}:${personId}`) as unknown as
      CandidacyDecision | undefined) ?? null
  );
}

/** A contest whose filing window has opened, and who was asked to weigh it. */
export interface WeighedContest {
  readonly id: string;
  readonly contestId: string;
  readonly date: string;
  readonly askedIds: readonly PersonId[];
  readonly runIds: readonly PersonId[];
}

/** How high an office sits, for "the next seat up". */
const FAMILY_RANK: Readonly<Record<OfficeFamily, number>> = {
  municipalOffice: 0,
  countyOffice: 1,
  stateLegislative: 2,
  usHouse: 3,
  statewideExecutive: 3,
};
/** Local contests: every named adult in town weighs them. */
const LOCAL_RANK = FAMILY_RANK.countyOffice;

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** The day a contest's filing window opens: the record's date, else a window before the deadline. */
export function filingWindowOpens(api: CoreAPI, contest: ContestRow): string {
  return (
    contest.filingOpens ??
    addDays(contest.filingDeadline, -c(api, "candidacyFilingWindowDays"))
  );
}

/** Contests not yet weighed, soonest window first; rebuilt when contests are added. */
const queues = new WeakMap<object, { size: number; queue: ContestRow[] }>();

function dueContests(api: CoreAPI): ContestRow[] {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return [];
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  let held = queues.get(api.state);
  if (!held || held.size !== contests.size) {
    const weighed = api.moduleState(CANDIDACY_MODULE_ID).table("weighed");
    held = {
      size: contests.size,
      queue: (contests.rows() as unknown as ContestRow[])
        .filter(
          (row) => row.filingDeadline >= api.state.date && !weighed.get(row.id),
        )
        .sort(
          (a, b) =>
            filingWindowOpens(api, a).localeCompare(
              filingWindowOpens(api, b),
            ) || a.id.localeCompare(b.id),
        ),
    };
    queues.set(api.state, held);
  }
  const due: ContestRow[] = [];
  while (
    held.queue[0] &&
    filingWindowOpens(api, held.queue[0]) <= api.state.date
  ) {
    const next = held.queue.shift()!;
    if (next.filingDeadline >= api.state.date) due.push(next);
  }
  return due;
}

/** Each serving officeholder who is a person here, with the rank of their highest seat. */
function officeholders(api: CoreAPI): Map<PersonId, number> {
  const held = new Map<PersonId, number>();
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return held;
  const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
  for (const term of api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .rows() as unknown as TermRow[]) {
    if (term.status !== "serving" || !term.personId) continue;
    const office = offices.get(term.officeId) as unknown as
      OfficeInput | undefined;
    if (!office) continue;
    const rank = FAMILY_RANK[officeFamily(office)];
    held.set(term.personId, Math.max(held.get(term.personId) ?? -1, rank));
  }
  return held;
}

/** The questions a runner campaigns on: where their own views are strongest. */
export function platformFromViews(api: CoreAPI, personId: PersonId): string[] {
  if (!api.state.modules.has(VIEWS_MODULE_ID)) return [];
  const view = viewOf(api, personId);
  if (!view) return [];
  const lean = view.lean / VIEWS_DATA.parameters.leanMax!.value;
  return PLATFORM_QUESTIONS.map((question) => ({
    question,
    stance: lean * questionAxis(question),
  }))
    .filter((row) => row.stance !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.stance) - Math.abs(a.stance) ||
        a.question.localeCompare(b.question),
    )
    .slice(0, c(api, "candidacyPlatformQuestions"))
    .map((row) => `${row.question}=${Math.sign(row.stance)}`);
}

/** File for a runner: fee from their own cash where they have it, else signatures from people who know them. */
function fileFor(
  api: CoreAPI,
  person: Readonly<PersonState>,
  contest: ContestRow,
  partisan: boolean,
): NonNullable<CandidacyDecision["filing"]> {
  let party: string | null = null;
  if (partisan && api.state.modules.has(PARTIES_MODULE_ID)) {
    const tie = partyTie(api, person.id);
    party =
      partiesHere(api).find((row) => row.id === tie?.partyId)?.name ?? null;
  }
  const rules = filingRulesFor(api, contest, party ? "party" : "independent");
  const fee = rules.feeMinor ?? 0;
  const result = fileCandidacy(api, {
    personId: person.id,
    contestId: contest.id,
    platform: platformFromViews(api, person.id),
    payFee: fee > 0 && person.liquidMinor >= fee,
    party,
  });
  if (result.status === "refused")
    return {
      status: "refused",
      filingId: null,
      unmet: result.unmet.map((row) => row.rule),
    };
  if (result.status === "gathering-signatures")
    for (const id of [...person.knownIds].sort()) {
      requestSignature(api, result.filing.id, id);
      if (filingStatus(api, result.filing.id) === "on-ballot") break;
    }
  return {
    status: filingStatus(api, result.filing.id),
    filingId: result.filing.id,
    unmet: [],
  };
}

function filingStatus(api: CoreAPI, filingId: string): FilingRow["status"] {
  return (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .get(filingId) as unknown as FilingRow
  ).status;
}

/**
 * A contest's filing window opens: every named adult who lives in town
 * weighs a local seat; an officeholder weighs the seat one level above their
 * own; the incumbent weighs keeping theirs. Each decision is kept, and each
 * runner files.
 */
export function weighContest(
  api: CoreAPI,
  contest: ContestRow,
): WeighedContest {
  const town = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("town")
    .get("town") as unknown as { townPlaceId: string };
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  const incumbentId =
    incumbent?.status === "serving"
      ? (incumbent.personId ?? undefined)
      : undefined;
  const rank = FAMILY_RANK[contest.family];
  const holders = officeholders(api);
  const rules = filingRulesFor(api, contest, "party");
  const date = api.state.date;
  const asked: PersonId[] = [];
  const running: PersonId[] = [];
  const people = [...api.state.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town.townPlaceId &&
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(date)) >=
          rules.minimumAge &&
        !isExplicitlyControlledPersonV1(api.state, p.id) &&
        (p.id === incumbentId ||
          rank <= LOCAL_RANK ||
          holders.get(p.id) === rank - 1),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const open: OpenContest = {
    contestId: contest.id,
    officeName: contest.title,
    filingDeadline: rules.deadline ?? contest.filingDeadline,
    feeMinor: rules.feeMinor ?? 0,
    ...(incumbentId ? { incumbentId } : {}),
    sourceIds: [contest.id, ...(incumbent ? [incumbent.id] : [])],
  };
  for (const person of people) {
    const decision = decideToRun(api, person.id, open);
    if (!decision) continue;
    asked.push(person.id);
    if (!decision.run) continue;
    running.push(person.id);
    const filing = fileFor(api, person, contest, Boolean(incumbent?.party));
    table(api).put({ ...decision, filing } as unknown as { id: string });
  }
  const row: WeighedContest = {
    id: contest.id,
    contestId: contest.id,
    date,
    askedIds: asked,
    runIds: running,
  };
  api
    .moduleState(CANDIDACY_MODULE_ID)
    .table("weighed")
    .put(row as unknown as { id: string });
  return row;
}

export const candidacyModule: CoreModule = {
  id: CANDIDACY_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      decisions: {
        indexes: { byContestRun: { fields: ["contestId", "run"] } },
      },
      weighed: {},
    },
  },
  onDay: (api) => {
    for (const contest of dueContests(api)) weighContest(api, contest);
  },
  reasonProviders: {
    "candidacy-circumstances": (api, actor, offer, binding) => {
      const contest = pending.get(api.state);
      if (!contest || contest.contestId !== offer.targetId) return undefined;
      return {
        value:
          binding.arguments?.running === "true"
            ? Object.values(candidacyReasons(api, actor, contest)).reduce(
                (sum, value) => sum + value,
                api.parameter("zero"),
              )
            : c(api, "candidacyStayOutPull"),
        sourceIds: [...contest.sourceIds, actor.id],
      };
    },
  },
};
