/**
 * The president's day (office play, FEDERAL): the cabinet and its
 * nominations, the budget request, the address to a joint session, the
 * daily brief. Each runs through the engine that owns it: nominations through
 * the appointments engine (the president's reasons rank the candidates, the
 * Senate confirms by its real party makeup), the request through the budgets
 * engine (its proposed budget carries the president's priorities to
 * Congress's vote), the address through the campaigns engine's impressions
 * (each viewer of a national outlet weighs what was said against their own
 * views) and the press wire (every public record is news). Simulate or do:
 * what the player leaves alone, the character does from their own views and
 * standing. Nothing is rolled; nothing names a place.
 */
import type { CoreAPI } from "./types";
import type { ModuleRow } from "./module-data";
import { makeIsoDate } from "./kernel/dates";
import { closenessBetween } from "./closeness";
import { candidateStance } from "./campaign-stances";
import {
  appointerWeighing,
  nominateAndConfirm,
  partySide,
  senateSides,
} from "./appointments";
import { campaignParameter } from "./campaign-views";
import { lawChain } from "./modules/laws";
import { fillInIdentity } from "./state";
import type { CoreState } from "./types";
import { corePlaceByKey } from "./place-lookup";
import { drawOfficialIdentity } from "./officials-identity";
import {
  OFFICIALS_MODULE_ID,
  officialLean,
  type OfficialRow,
} from "./modules/officials";
import {
  BUDGETS_MODULE_ID,
  budgetsOf,
  setBudgetPriorities,
} from "./modules/budgets";
import { CAMPAIGNS_MODULE_ID, touchImpression } from "./modules/campaigns";
import { personLean } from "./campaign-views";
import { agreementWith } from "./modules/views";
import {
  candidateAnswers,
  followersOf,
  interviewQuestions,
  officeholderSpeaker,
  outletsHere,
  type InterviewAnswer,
} from "./modules/press";
import { nationalPanel } from "./modules/macro";
import cabinetData from "./data/office-day/federal-cabinet.json" with { type: "json" };
import {
  OFFICE_DAY_FEDERAL_MODULE_ID,
  addFederalDayPart,
  addFederalWorldPart,
  clearPreparedFederal,
  federalParameter,
  federalSeatOf,
  holdFederal,
  preparedFederal,
  releaseFederal,
} from "./office-day-federal";
import { officeActsOf, officeHost, stopsOf } from "./modules/office-day";
import {
  addDays,
  budgetRequestDate,
  federalHoliday,
  jointAddress,
  nthSitting,
  senateSits,
} from "./office-day-federal-calendar";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";

interface CabinetPost {
  readonly id: string;
  readonly department: string;
  readonly title: string;
  readonly lines: readonly string[];
}
const CABINET = cabinetData as unknown as {
  posts: readonly CabinetPost[];
  confirmation: { body: string; citation: string };
  crises: {
    default: string;
    answeredBy: Readonly<Record<string, string>>;
  };
};

export const CABINET_POSTS: readonly string[] = CABINET.posts.map((p) => p.id);

export interface CabinetRow {
  readonly id: string;
  readonly postId: string;
  readonly holderId: string | null;
  /** The nomination before the Senate, or the last one it decided. */
  readonly status: "vacant" | "nominated" | "confirmed" | "rejected";
  readonly nomineeId: string | null;
  readonly nominatedOn: string | null;
  /** The Senate sitting day its vote falls on. */
  readonly voteOn: string | null;
  readonly yes: number;
  readonly no: number;
  readonly date: string;
}

const cabinetTable = (api: CoreAPI) =>
  api.moduleState(OFFICE_DAY_FEDERAL_MODULE_ID).table("cabinet");

/** The cabinet as it stands: every post, held or vacant (the game opens on Inauguration Day, before any is confirmed). */
export function cabinetOf(api: CoreAPI): readonly CabinetRow[] {
  return CABINET.posts.map(
    (post) =>
      (cabinetTable(api).get(post.id) as unknown as CabinetRow | undefined) ?? {
        id: post.id,
        postId: post.id,
        holderId: null,
        status: "vacant",
        nomineeId: null,
        nominatedOn: null,
        voteOn: null,
        yes: 0,
        no: 0,
        date: api.state.date,
      },
  );
}

const isPresident = (api: CoreAPI, personId: string) =>
  federalSeatOf(api, personId)?.kind === "president";
const mustBePresident = (api: CoreAPI, personId: string) => {
  if (!isPresident(api, personId))
    throw new Error(`${personId} is not the president`);
};

const servedYears = (row: OfficialRow, date: string) =>
  Math.max(
    0,
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${row.serviceStart}T00:00:00Z`)) /
      (365.25 * 86_400_000),
  );

/**
 * Who the president may nominate: the world's full people with a record in
 * public office (the officials engine's state and federal officials, serving
 * or former), living, not already in the cabinet, not the president or vice
 * president. Each with their lean, their years in office as qualification,
 * and whether the president knows them (closeness on record).
 */
export function nominationCandidates(
  api: CoreAPI,
  presidentId: string,
): readonly {
  id: string;
  lean: number;
  qualification: number;
  known: boolean;
}[] {
  const held = nominated(api);
  const vice = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [
        "seat:US:vice-president",
        "serving",
      ]) as unknown as TermRow[]
  )[0]?.personId;
  const years = federalParameter("cabinetQualificationYears");
  return (
    api
      .moduleState(OFFICIALS_MODULE_ID)
      .table("officials")
      .rows() as unknown as OfficialRow[]
  )
    .filter(
      (row) =>
        row.id !== presidentId &&
        !held.has(row.id) &&
        api.state.people.get(row.id)?.alive &&
        row.officeKind !== "president" &&
        row.officeKind !== "vice-president" &&
        row.id !== vice,
    )
    .map((row) => candidateFrom(api, presidentId, row, years))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function candidateFrom(
  api: CoreAPI,
  presidentId: string,
  row: OfficialRow,
  years: number,
) {
  return {
    id: row.id,
    lean: officialLean(row),
    qualification: Math.min(1, servedYears(row, api.state.date) / years),
    known: closenessBetween(api.state, presidentId, row.id) > 0,
  };
}

/**
 * Nominate a cabinet secretary. With `nomineeId` the player chose them;
 * without, the character takes the candidate the appointments engine ranks
 * first by the president's reasons (alignment with the president's side,
 * qualification, knowing them). The nomination goes to the Senate, which
 * votes on it after its committee's hearing, on a later sitting day
 * (`confirmGivenVotes`). A nomination is a public record the press reports.
 */
export function nominate(
  api: CoreAPI,
  presidentId: string,
  postId: string,
  nomineeId?: string,
): string {
  mustBePresident(api, presidentId);
  const post = CABINET.posts.find((p) => p.id === postId);
  if (!post) throw new Error(`No cabinet post ${postId}`);
  const current = cabinetOf(api).find((c) => c.postId === postId)!;
  if (current.status === "nominated" || current.status === "confirmed")
    throw new Error(`${postId} is ${current.status}`);
  const pool = nominationCandidates(api, presidentId);
  const candidates = nomineeId ? pool.filter((c) => c.id === nomineeId) : pool;
  if (!candidates.length) throw new Error(`No one to nominate for ${postId}`);
  const ranked = nominateAndConfirm({
    seatKey: `cabinet:US:${postId}`,
    appointerSide: partySide(federalSeatOf(api, presidentId)?.term.party),
    weighing: appointerWeighing(api.state as CoreState, presidentId),
    candidates,
    confirmingBody: null,
  });
  const chosen = ranked.nomineeId;
  const voteOn = nthSitting(
    "senate",
    api.state.date,
    Math.max(1, federalParameter("confirmationSittingDays")),
  );
  cabinetTable(api).put({
    ...current,
    status: "nominated",
    nomineeId: chosen,
    nominatedOn: api.state.date,
    voteOn,
    yes: 0,
    no: 0,
    date: api.state.date,
  } satisfies CabinetRow as unknown as ModuleRow);
  if (api.state.people.has(chosen))
    api.relationship(
      presidentId,
      chosen,
      "contact",
      federalParameter("nominationCloseness"),
      undefined,
      { cause: "cabinet-nomination", sourceId: `cabinet:US:${postId}` },
    );
  emitCabinet(api, "cabinet-nominated", presidentId, post, chosen, {
    voteOn,
  });
  officeHost.keep(api, {
    personId: presidentId,
    kind: "nominate",
    how: nomineeId ? "did" : "own-choice",
    recordId: `cabinet:US:${postId}:${api.state.date}`,
    position: ranked.reasons[0]?.alignment ?? null,
    detail: `${chosen} (vote ${voteOn}, of ${ranked.reasons.length})`,
  });
  if (!cabinetOf(api).some(open)) releaseFederal(api, NOMINATIONS);
  return chosen;
}

export const NOMINATIONS = "federal-nominations";
const open = (c: CabinetRow) =>
  c.status === "vacant" || c.status === "rejected";

/** Everyone now nominated or serving in the cabinet. */
const nominated = (api: CoreAPI) =>
  new Set(
    cabinetOf(api).flatMap((c) =>
      c.status === "nominated" || c.status === "confirmed"
        ? [c.nomineeId!]
        : [],
    ),
  );

function emitCabinet(
  api: CoreAPI,
  kind: "cabinet-nominated" | "cabinet-confirmed" | "cabinet-rejected",
  presidentId: string,
  post: CabinetPost,
  nomineeId: string,
  facts: Record<string, string>,
): void {
  const day = makeIsoDate(api.state.date);
  api.emit({
    id: `${kind}:${post.id}:${api.state.date}`,
    date: day,
    kind,
    personIds: [presidentId, nomineeId],
    placeId: lawChain(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: CABINET.confirmation.citation,
      asOf: day,
    },
    publicRecord: true,
    news: true,
    facts: { postId: post.id, title: post.title, nomineeId, ...facts },
  });
}

/**
 * The Senate's confirmation votes due today, on a day it sits: each senator
 * weighs the nominee's lean against their own party's side, deferring to the
 * president as far as the appointments engine's tolerance (GOV's
 * `confirmationTolerance`). A majority confirms; a rejection leaves the post
 * vacant for another nomination.
 */
export function confirmGivenVotes(api: CoreAPI, presidentId: string): void {
  const date = api.state.date;
  if (!senateSits(date).sits) return;
  const officials = api.moduleState(OFFICIALS_MODULE_ID).table("officials");
  const years = federalParameter("cabinetQualificationYears");
  for (const row of cabinetOf(api)) {
    if (row.status !== "nominated" || !row.voteOn || row.voteOn > date)
      continue;
    const record = officials.get(row.nomineeId!) as unknown as
      OfficialRow | undefined;
    const nominee = record
      ? candidateFrom(api, presidentId, record, years)
      : undefined;
    const post = CABINET.posts.find((p) => p.id === row.postId)!;
    const vote = nominateAndConfirm({
      seatKey: `cabinet:US:${row.postId}`,
      appointerSide: partySide(federalSeatOf(api, presidentId)?.term.party),
      candidates: nominee ? [nominee] : [],
      confirmingBody: { name: CABINET.confirmation.body, sides: senateSides() },
      tolerance: campaignParameter("confirmationTolerance"),
    });
    const confirmed = vote.confirmation?.confirmed ?? false;
    const decided: CabinetRow = {
      ...row,
      status: confirmed ? "confirmed" : "rejected",
      holderId: confirmed ? row.nomineeId : null,
      yes: vote.confirmation?.yes ?? 0,
      no: vote.confirmation?.no ?? 0,
      date,
    };
    cabinetTable(api).put(decided as unknown as ModuleRow);
    emitCabinet(
      api,
      confirmed ? "cabinet-confirmed" : "cabinet-rejected",
      presidentId,
      post,
      row.nomineeId!,
      { yes: String(decided.yes), no: String(decided.no) },
    );
  }
}

/**
 * The president's budget request to Congress for the next fiscal year
 * (31 U.S.C. sec. 1105(a)). With `changes` the player set them, line by line
 * in minor units; without, each line moves from its enacted level by the
 * president's own view of spending on it (and the secretary's, for a line a
 * confirmed secretary's department spends), up to the request's share of
 * the line. The budgets engine's proposed budget carries the request to
 * Congress, which votes it as a bill.
 */
export function requestBudget(
  api: CoreAPI,
  presidentId: string,
  changes?: Readonly<Record<string, number>>,
): string {
  mustBePresident(api, presidentId);
  if (!api.state.modules.has(BUDGETS_MODULE_ID))
    throw new Error("No budgets engine");
  const latest = budgetsOf(api, "US")
    .slice()
    .sort((a, b) => b.fiscalYear - a.fiscalYear)[0];
  if (!latest) throw new Error("No federal budget in force");
  const party = federalSeatOf(api, presidentId)?.term.party ?? null;
  const share = federalParameter("budgetRequestShift");
  const secretaryWeight = federalParameter("secretaryBudgetWeight");
  const cabinet = cabinetOf(api);
  const stanceOn = (personId: string, line: string) =>
    candidateStance(api, personId, null, `budget-line:${line}`) ?? 0;
  const requested =
    changes ??
    Object.fromEntries(
      Object.entries(latest.spendingMinor).flatMap(([line, amount]) => {
        let want =
          candidateStance(api, presidentId, party, `budget-line:${line}`) ?? 0;
        for (const post of CABINET.posts) {
          const holder = cabinet.find((c) => c.postId === post.id)?.holderId;
          if (holder && post.lines.includes(line))
            want += secretaryWeight * stanceOn(holder, line);
        }
        const delta = Math.round(
          amount * share * Math.max(-1, Math.min(1, want)),
        );
        return delta ? [[line, delta]] : [];
      }),
    );
  setBudgetPriorities(api, {
    governmentId: "US",
    setBy: presidentId,
    changes: requested,
  });
  const day = makeIsoDate(api.state.date);
  api.emit({
    id: `budget-request:US:${api.state.date}`,
    date: day,
    kind: "budget-request",
    personIds: [presidentId],
    placeId: lawChain(api).townPlaceId,
    source: { tag: "SOURCED", citation: "31 U.S.C. sec. 1105(a)", asOf: day },
    publicRecord: true,
    news: true,
    facts: Object.fromEntries(
      Object.entries(requested).map(([line, delta]) => [line, String(delta)]),
    ),
  });
  const id = `budget-request:US:${api.state.date}`;
  officeHost.keep(api, {
    personId: presidentId,
    kind: "budget-request",
    how: changes ? "did" : "own-choice",
    recordId: id,
    position: null,
    // The year after the one in force (the request is for the next fiscal year).
    detail: `${Object.keys(requested).length} lines, net ${Object.values(requested).reduce((a, b) => a + b, 0)}, for the year starting ${Number(latest.startsOn.slice(0, 4)) + 1}${latest.startsOn.slice(4)}`,
  });
  releaseFederal(api, BUDGET_REQUEST);
  return id;
}

export const BUDGET_REQUEST = "federal-budget-request";

/**
 * The address to a joint session (the State of the Union, or a new term's
 * first-year address), on the date the calendar holds. The president speaks
 * to the questions the country's press would ask them (the press engine's
 * questions for the speaker); with `answers` the player chose what to say,
 * without them the character says where they stand. Everyone who follows a
 * national outlet sees it and weighs it against their own views (the
 * campaigns engine's impression of the speaker); the press reports it.
 */
export function deliverAddress(
  api: CoreAPI,
  presidentId: string,
  answers?: readonly InterviewAnswer[],
): string {
  mustBePresident(api, presidentId);
  const speaker = officeholderSpeaker(api, presidentId) ?? {
    personId: presidentId,
    party: null,
    filing: null,
  };
  const questions = interviewQuestions(api, speaker);
  const said = answers ?? candidateAnswers(api, questions, speaker);
  const statements = said.flatMap((a) =>
    a.position === null ? [] : [{ question: a.question, position: a.position }],
  );
  const viewers = [
    ...new Set(
      outletsHere(api)
        .filter((o) => o.tier === "national")
        .flatMap((o) => followersOf(api, o.id)),
    ),
  ].sort();
  let moved = 0;
  if (api.state.modules.has(CAMPAIGNS_MODULE_ID))
    for (const id of viewers) {
      const person = api.state.people.get(id);
      if (!person) continue;
      const cause = touchImpression(api, {
        voterId: id,
        officialId: presidentId,
        act: "speech",
        target: agreementWith(
          api,
          person.id,
          personLean(api.state.people, person, 0),
          statements,
        ),
        weight: federalParameter("addressWeight"),
        rapport: 0,
      });
      if (cause && cause.warmthAfter !== cause.warmthBefore) moved += 1;
    }
  const address = jointAddress(Number(api.state.date.slice(0, 4)));
  const day = makeIsoDate(api.state.date);
  api.emit({
    id: `joint-address:${api.state.date}`,
    date: day,
    kind: "joint-address",
    personIds: [presidentId],
    placeId: lawChain(api).townPlaceId,
    source: { tag: address.tag, citation: address.sourceUrl, asOf: day },
    publicRecord: true,
    news: true,
    facts: Object.fromEntries(
      statements.map((s) => [s.question, String(s.position)]),
    ),
  });
  const id = `joint-address:${api.state.date}`;
  officeHost.keep(api, {
    personId: presidentId,
    kind: "joint-address",
    how: answers ? "did" : "own-choice",
    recordId: id,
    position: null,
    detail: `${address.kind}: ${statements.length} questions, ${viewers.length} viewers, ${moved} moved`,
  });
  releaseFederal(api, JOINT_ADDRESS);
  return id;
}

export const JOINT_ADDRESS = "federal-joint-address";

/**
 * The daily brief: what the president is told each morning, as facts they now
 * know (the national economy's latest month, the cabinet's vacancies). The
 * brief creates no fact in the world; it records what the president learned
 * and from which record, which their later stances can cite.
 */
export function dailyBrief(
  api: CoreAPI,
  presidentId: string,
  how: "did" | "own-choice" = "did",
): string {
  mustBePresident(api, presidentId);
  const day = makeIsoDate(api.state.date);
  const learned: string[] = [];
  const month = nationalPanel(api).months.at(-1);
  if (month)
    for (const [key, value] of [
      ["unemploymentPct", month.unemploymentPct],
      ["inflationPct", month.inflationPct],
      ["policyRatePct", month.policyRatePct],
    ] as const) {
      api.observe(presidentId, {
        key: `brief:${key}`,
        value: String(value),
        learnedAt: day,
        sourceId: month.id,
        access: "told",
      });
      learned.push(month.id);
    }
  const vacant = cabinetOf(api).filter((c) => !c.holderId).length;
  api.observe(presidentId, {
    key: "brief:cabinet-vacancies",
    value: String(vacant),
    learnedAt: day,
    sourceId: `cabinet:US`,
    access: "told",
  });
  // The situation room: each crisis open today, told to the president with
  // the department that answers it.
  const crises = crisesToday(api);
  for (const crisis of crises)
    api.observe(presidentId, {
      key: `brief:crisis:${crisis.recordId}`,
      value: crisis.department,
      learnedAt: day,
      sourceId: crisis.recordId,
      access: "told",
    });
  const id = `daily-brief:US:${api.state.date}`;
  officeHost.keep(api, {
    personId: presidentId,
    kind: "daily-brief",
    how,
    recordId: id,
    position: null,
    detail: `${month?.id ?? "no month"}: unemployment ${month?.unemploymentPct ?? "none"}, inflation ${month?.inflationPct ?? "none"}, ${vacant} cabinet vacancies, ${crises.length} crises in the situation room`,
  });
  return id;
}

const isWeekday = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
};
/** The player gives a duty while they live its day, which the record dates the day before. */
const gave = (api: CoreAPI, personId: string, kind: string, date: string) =>
  officeActsOf(api, personId).some(
    (a) => a.kind === kind && a.date >= addDays(date, -1) && a.date <= date,
  );

/**
 * The president's day, for the president the player controls. The brief comes every working day. A vacant
 * cabinet post holds the player the next morning while nominations stop
 * them (`nomination`); otherwise the character nominates. The morning of the
 * budget request's statutory day and of the joint address, each holds the
 * player when its kind stops them; when the day closes, the character gives
 * what the player did not.
 */
/** The Senate's votes on nominations come on their day whoever the player controls. */
addFederalWorldPart((api) => {
  if (!cabinetOf(api).some((c) => c.status === "nominated")) return;
  const president = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [
        "seat:US:president",
        "serving",
      ]) as unknown as TermRow[]
  )[0]?.personId;
  if (president) confirmGivenVotes(api, president);
});

addFederalDayPart((api, personId) => {
  if (!isPresident(api, personId)) return;
  const date = api.state.date;
  const tomorrow = addDays(date, 1);
  const stops = stopsOf(api, personId);
  if (isWeekday(date) && !federalHoliday(date))
    dailyBrief(api, personId, "own-choice");
  if (cabinetOf(api).some(open)) {
    if (stops.nomination)
      holdFederal(
        api,
        NOMINATIONS,
        "office-day-federal.nomination",
        "cabinet:US",
      );
    else
      for (const post of cabinetOf(api))
        if (open(post)) nominate(api, personId, post.postId);
  }
  const year = (d: string) => Number(d.slice(0, 4));
  if (
    budgetRequestDate(year(date)).date === date &&
    !gave(api, personId, "budget-request", date)
  ) {
    const prepared = preparedFederal(api, personId, BUDGET_REQUEST);
    requestBudget(api, personId, prepared?.changes);
    clearPreparedFederal(api, personId, BUDGET_REQUEST);
  }
  if (
    budgetRequestDate(year(tomorrow)).date === tomorrow &&
    stops["budget-request"]
  )
    holdFederal(api, BUDGET_REQUEST, "office-day-federal.budget-request", "US");
  if (
    jointAddress(year(date)).date === date &&
    !gave(api, personId, "joint-address", date)
  ) {
    const answers = preparedFederal(api, personId, JOINT_ADDRESS)?.answers;
    deliverAddress(
      api,
      personId,
      answers &&
        Object.entries(answers).map(([question, position]) => ({
          question,
          position,
        })),
    );
    clearPreparedFederal(api, personId, JOINT_ADDRESS);
  }
  if (jointAddress(year(tomorrow)).date === tomorrow && stops["joint-address"])
    holdFederal(
      api,
      JOINT_ADDRESS,
      "office-day-federal.joint-address",
      `joint-address:${tomorrow}`,
    );
});

/** The vice president serving today, if the offices engine seats one. */
export function vicePresidentOf(api: CoreAPI): string | null {
  return (
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          "seat:US:vice-president",
          "serving",
        ]) as unknown as TermRow[]
    )[0]?.personId ?? null
  );
}

/**
 * A trip to a town anywhere in the country to meet people (the player picks
 * the town). The traveler, the player or the vice president the president
 * sends, meets a few residents there, filled in as full people from the
 * world's seed and the town (the same people every time), and says where
 * they stand on what the press would ask them; each weighs it against their
 * own views. The trip is a public record the press reports.
 * Stopgap SG-OFFICE-FED-trip-residents: a town other than the player's has
 * no counted population, so the people met are recorded identities of that
 * place with no household, job or records there beyond the meeting.
 */
export function travelToTown(
  api: CoreAPI,
  personId: string,
  placeKey: string,
  options: { readonly sendVicePresident?: boolean } = {},
): string {
  if (!federalSeatOf(api, personId))
    throw new Error(`${personId} holds no federal seat`);
  const traveler = options.sendVicePresident ? vicePresidentOf(api) : personId;
  if (options.sendVicePresident && !isPresident(api, personId))
    throw new Error("Only the president sends the vice president");
  if (!traveler || !api.state.people.has(traveler))
    throw new Error("No one to send");
  const place = corePlaceByKey(placeKey);
  if (!place?.stateJurisdictionKey) throw new Error(`No town ${placeKey}`);
  // stopgapId: SG-OFFICE-FED-trip-residents
  api.stopgap("SG-OFFICE-FED-trip-residents");
  const placeId = place.context.jurisdiction.id;
  const tripId = `trip:${traveler}:${placeKey}:${api.state.date}`;
  const day = makeIsoDate(api.state.date);
  const worldSeed = (api.state as CoreState).seed;
  const speaker = officeholderSpeaker(api, traveler) ?? {
    personId: traveler,
    party: null,
    filing: null,
  };
  const statements = candidateAnswers(
    api,
    interviewQuestions(api, speaker),
    speaker,
  ).flatMap((a) =>
    a.position === null ? [] : [{ question: a.question, position: a.position }],
  );
  const met: string[] = [];
  let moved = 0;
  for (let i = 0; i < federalParameter("peopleMetOnTrip"); i++) {
    const seatKey = `trip:${placeKey}:${api.state.date}:${i}`;
    const drawn = drawOfficialIdentity({
      worldSeed,
      seatKey,
      stateUsps: place.stateJurisdictionKey.slice(3),
      role: "campaign-contact",
      referenceDate: api.state.date,
    });
    const id = `person:trip:${placeKey}:${api.state.date}:${i}`;
    fillInIdentity(api.state as CoreState, {
      id,
      givenName: drawn.givenName,
      familyName: drawn.familyName,
      birthDate: makeIsoDate(drawn.birthDate),
      placeId,
      gender: drawn.gender,
      source: {
        tag: "ESTIMATED",
        citation: `met on ${tripId}`,
        asOf: day,
        estimatedFrom: "world seed and the town (officials-identity)",
      },
    });
    api.meet(traveler, id, {
      placeId,
      sourceId: tripId,
      cause: "trip",
      hours: federalParameter("tripMeetingHours"),
    });
    met.push(id);
    const person = api.state.people.get(id);
    if (person && api.state.modules.has(CAMPAIGNS_MODULE_ID)) {
      const cause = touchImpression(api, {
        voterId: id,
        officialId: traveler,
        act: "speech",
        target: agreementWith(
          api,
          person.id,
          personLean(api.state.people, person, 0),
          statements,
        ),
        weight: federalParameter("tripImpressionWeight"),
        rapport: 0,
      });
      if (cause && cause.warmthAfter !== cause.warmthBefore) moved += 1;
    }
  }
  api.emit({
    id: tripId,
    date: day,
    kind: "official-trip",
    personIds: [traveler, ...met],
    placeId: lawChain(api).townPlaceId,
    source: { tag: "SOURCED", citation: tripId, asOf: day },
    publicRecord: true,
    news: true,
    facts: {
      placeKey,
      town: place.displayName,
      state: place.stateJurisdictionKey,
      travelerId: traveler,
    },
  });
  officeHost.keep(api, {
    personId,
    kind: options.sendVicePresident ? "vice-president-trip" : "trip",
    how: "did",
    recordId: tripId,
    position: null,
    detail: `${placeKey}: ${traveler} met ${met.length}, ${moved} moved`,
  });
  return tripId;
}

/**
 * The orders the president may issue that an engine can carry. None yet.
 * Stopgap SG-OFFICE-FED-presidential-orders: the executive engine's orders
 * read only a state's powers (`orderableBy`), so the president has no order
 * an engine carries until GOV adds the federal ones.
 */
export function presidentialOrders(api: CoreAPI): readonly string[] {
  // stopgapId: SG-OFFICE-FED-presidential-orders
  api.stopgap("SG-OFFICE-FED-presidential-orders");
  return [];
}

/**
 * The convictions a president may pardon: offenses against the United States
 * only (U.S. Const. art. II, sec. 2, cl. 1). None yet.
 * Stopgap SG-OFFICE-FED-pardons: the justice engine tries every crime under
 * the state's law, so there is no federal conviction to pardon until it
 * records which sovereign prosecuted.
 */
export function pardonable(api: CoreAPI): readonly string[] {
  // stopgapId: SG-OFFICE-FED-pardons
  api.stopgap("SG-OFFICE-FED-pardons");
  return [];
}

/** A crisis the situation room is open on: the disaster record, and who answers it. */
export interface Crisis {
  readonly recordId: string;
  readonly title: string;
  readonly incidentType: string;
  readonly began: string;
  /** The cabinet post whose department answers it. */
  readonly postId: string;
  readonly department: string;
  /** The confirmed secretary, where the post is held. */
  readonly secretaryId: string | null;
}

/**
 * The crises that call the president to the situation room today: every
 * disaster record (a FEMA declaration's incident, written by the disasters
 * engine) whose incident began within the days the room stays open on it,
 * with the department that answers it and its secretary. Read at the moment
 * the day opens; it records nothing.
 */
export function crisesToday(api: CoreAPI): readonly Crisis[] {
  const core = api.state as CoreState;
  const open = federalParameter("situationRoomOpenDays");
  const cabinet = cabinetOf(api);
  const out: Crisis[] = [];
  for (const id of core.logByKind.get("hazard.disaster") ?? []) {
    const record = core.durableLog.get(id);
    if (!record || record.date > api.state.date) continue;
    if (
      (Date.parse(`${api.state.date}T00:00:00Z`) -
        Date.parse(`${record.date}T00:00:00Z`)) /
        86_400_000 >=
      open
    )
      continue;
    const type = String(record.facts?.incidentType ?? "");
    const postId = CABINET.crises.answeredBy[type] ?? CABINET.crises.default;
    const post = CABINET.posts.find((row) => row.id === postId)!;
    out.push({
      recordId: id,
      title: String(record.facts?.title ?? ""),
      incidentType: type,
      began: record.date,
      postId,
      department: post.department,
      secretaryId:
        cabinet.find((row) => row.postId === postId)?.holderId ?? null,
    });
  }
  return out.sort((a, b) => a.recordId.localeCompare(b.recordId));
}
