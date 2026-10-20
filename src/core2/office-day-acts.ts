/**
 * Acts of office in the day's choices (office play, OFFICE-LOCAL): office
 * hours with the office's casework, a town hall, an interview and a meeting
 * with a department head. They are offered to the officeholder the player
 * controls, take the hours their row names, and run through the engines
 * that own each act (constituent cases, meetings, the press, relationships).
 *
 * Doing or simulating: the player may prepare what they will say or decide
 * (`prepareAct`); whatever they leave is the character's own, by the same
 * rule those engines use for any official. Other officials keep their
 * background equivalents in those engines (office hours on the cases
 * calendar, town halls from causes, interviews the outlets ask for).
 */
import type {
  ActionDefinition,
  ActOffer,
  CoreAPI,
  CoreData,
  CoreState,
  PersonState,
} from "./types";
import type { ModuleRow } from "./module-data";
import { extendData } from "./data";
import { daysBetween, makeIsoDate } from "./kernel/dates";
import { officeActKits, type OfficeActKit } from "./office-day-registry";
import { snapshotExplicitControlV1 } from "./player-control-state-v1";
import {
  casesFor,
  handleCase,
  ownCaseDecision,
} from "./modules/constituent-cases";
import { holdTownHall } from "./modules/meetings";
import {
  answerInterview,
  candidateAnswers,
  followersOf,
  interviewsFor,
  officeholderSpeaker,
  outletsHere,
  requestInterview,
} from "./modules/press";
import { appoint, appointmentsIn, postsToFill } from "./modules/executive";
import { lawChain } from "./modules/laws";
import { awaitingRibbon, cutRibbon } from "./budgets-projects";
import {
  BUDGETS_MODULE_ID,
  budgetPriorities,
  governments,
  setBudgetPriorities,
} from "./modules/budgets";
import { deliverSpeech } from "./modules/speech";
import { personLean, personStance, questionAxis } from "./campaign-views";
import { POLICY_QUESTIONS } from "./policy-answers";
import {
  learnStake,
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
  offerDeal,
  type BillRow,
} from "./modules/legislature";

export const OFFICE_DUTY = "office-duty";
const DEPARTMENT_HEAD = "department-head";
const TOWN_POST = "town-post";
const COLLEAGUE = "colleague";
const PROJECT = "finished-project";

const act = (
  id: string,
  effortParameter: string,
  actKinds: readonly string[],
  targetKind = OFFICE_DUTY,
): ActionDefinition => ({
  id,
  actKinds,
  goalKinds: ["change-condition"],
  need: "safety",
  effortParameter,
  effectParameter: "one",
  targetKind,
  effect: id,
  emotion: {
    moodMultiplierParameter: "one",
    stressMultiplierParameter: "one",
  },
});

export const OFFICE_ACTS: readonly ActionDefinition[] = [
  act("office-hours", "officeHoursActHours", [
    "engage",
    "cooperate",
    "follow-rules",
  ]),
  act("town-hall", "townHallActHours", ["speak-out", "engage", "take-risk"]),
  act("interview", "interviewActHours", ["speak-out", "take-risk"]),
  act(
    "meet-department-head",
    "meetHeadActHours",
    ["cooperate", "engage"],
    DEPARTMENT_HEAD,
  ),
  act("state-of-the-city", "stateOfCityActHours", [
    "speak-out",
    "engage",
    "take-risk",
  ]),
  act(
    "name-department-head",
    "nameHeadActHours",
    ["cooperate", "follow-rules"],
    TOWN_POST,
  ),
  act("propose-budget", "proposeBudgetActHours", ["follow-rules", "cooperate"]),
  act(
    "talk-to-colleague",
    "colleagueActHours",
    ["cooperate", "engage", "speak-out"],
    COLLEAGUE,
  ),
  act("cut-ribbon", "ribbonActHours", ["engage", "speak-out"], PROJECT),
];

const HOURS = (
  value: number,
  citation: string,
  estimatedFrom: string,
  spread: [number, number],
) => ({ value, tag: "ESTIMATED" as const, citation, estimatedFrom, spread });

/** The hours each local act takes, and the address's season. */
const LOCAL_PARAMETERS = {
  officeHoursActHours: HOURS(
    2,
    "A local official's office hours: a two-hour block once or twice a month is the common published schedule for council members' constituent hours.",
    "Published council office-hour schedules; two hours is the modal block.",
    [1, 4],
  ),
  townHallActHours: HOURS(
    1.5,
    "A local town hall runs about an hour to ninety minutes (Congressional Management Foundation 2017, 'Citizen-Centric Advocacy'; local forums run the same length).",
    "Typical town hall length.",
    [1, 2.5],
  ),
  interviewActHours: HOURS(
    0.75,
    "A local newspaper or radio interview with an official: about thirty minutes to an hour with travel.",
    "Typical local interview length.",
    [0.5, 1.5],
  ),
  stateOfCityActHours: HOURS(
    1,
    "A mayor's or county executive's annual state of the city or county address runs about forty-five minutes to an hour (published addresses of mid-sized and large cities).",
    "Typical annual address length.",
    [0.5, 1.5],
  ),
  townHallIntervalDays: {
    value: 146,
    tag: "ESTIMATED",
    citation:
      "How often an official holds a town hall: LegiStorm counted 1,626 town halls held by members of Congress in 2022, 1,365 in 2023 and 1,023 in 2024 (https://www.legistorm.com/pro_news/4331/town-halls-climb-to-highest-level-since-2021.html), an average of 1,338 a year across 535 members, 2.5 a member a year, one every 146 days; Clarke and Markovits (2022, https://thelawmakers.org/wp-content/uploads/2022/07/ClarkeMarkovits2022_CEL.pdf) counted over 23,000 from August 2013 to December 2021, about 2,900 a year, 5.4 a member, one every 67 days.",
    estimatedFrom:
      "Members of Congress' town halls per member per year, applied to every local official: no count exists for councils and county boards.",
    spread: [67, 191],
  },
  stateOfCityLastMonth: {
    value: 4,
    tag: "ESTIMATED",
    citation:
      "Mayors and county executives commonly deliver the annual state of the city or county address between January and April (published addresses of U.S. cities; National League of Cities' annual review of mayors' state of the city speeches covers addresses given in the first months of the year).",
    estimatedFrom: "The season most annual addresses fall in.",
    spread: [2, 6],
  },
  ribbonActHours: HOURS(
    1,
    "A ribbon-cutting for a finished public project: a short ceremony with remarks, about an hour with travel.",
    "Typical length of a local ribbon-cutting ceremony.",
    [0.5, 2],
  ),
  proposeBudgetActHours: HOURS(
    2,
    "A mayor or county executive sending the budget to the council or board: the signing and transmittal take about two hours once the departments' requests are in.",
    "Typical transmittal of an executive budget.",
    [1, 6],
  ),
  budgetProposalLeadDays: {
    value: 60,
    tag: "ESTIMATED",
    citation:
      "How long before the fiscal year an executive sends the budget: the Government Finance Officers Association's budget-process practice has the proposal in the legislative body's hands well ahead of adoption, and city and county charters commonly set 60 to 90 days before the year starts.",
    estimatedFrom:
      "Common charter lead times before the fiscal year; no count of every place's charter exists.",
    spread: [30, 120],
  },
  colleagueActHours: HOURS(
    0.5,
    "A member asking a colleague for their vote on a pending bill: a half-hour conversation, by phone or over coffee.",
    "Typical one-on-one conversation about a pending vote.",
    [0.25, 1.5],
  ),
  nameHeadActHours: HOURS(
    1,
    "An appointing official's choice of a department head: interviewing and checking the leading candidates takes about an hour for the final choice.",
    "Typical final interview and decision for a local department head.",
    [0.5, 3],
  ),
  meetHeadActHours: HOURS(
    1,
    "A standing meeting between an elected official and a department head: about an hour.",
    "Typical one-on-one briefing length.",
    [0.5, 2],
  ),
} as unknown as CoreData["parameters"];

/** The local level's acts as one kit for the office-day registry. */
export function localOfficeKit(host: OfficeActHost): OfficeActKit {
  return {
    id: "local",
    acts: OFFICE_ACTS,
    parameters: LOCAL_PARAMETERS,
    providers: officeActProviders(host),
    handlers: officeActHandlers(host) as unknown as OfficeActKit["handlers"],
  };
}

/** The core data with every registered level's acts of office and their parameters. */
export function officeDayData(base: CoreData): CoreData {
  const kits = officeActKits();
  return extendData(base, {
    actions: kits.flatMap((kit) => kit.acts),
    parameters: Object.assign(
      {},
      ...kits.map((kit) => kit.parameters ?? {}),
    ) as CoreData["parameters"],
  });
}

// ---- Who may take them ---------------------------------------------------

/** The person the player controls, for whom the acts are offered. */
const controlled = (api: CoreAPI) =>
  snapshotExplicitControlV1(api.state).personId ??
  (api.state as CoreState).playerId;

export interface OfficeActHost {
  /** The local offices the actor holds now. */
  officesOf(api: CoreAPI, personId: string): readonly string[];
  /** Keep the act on the record, done by the player or the character. */
  keep(
    api: CoreAPI,
    row: {
      personId: string;
      kind: string;
      how: "did" | "own-choice";
      recordId: string;
      position: number | null;
      detail: string;
    },
  ): void;
  /** What the player prepared for an act, if anything. */
  prepared(api: CoreAPI, personId: string, actId: string): Prepared | null;
  /** The prepared content is used once. */
  clearPrepared(api: CoreAPI, personId: string, actId: string): void;
  /** Whether the person already took this act in the year given. */
  given(api: CoreAPI, personId: string, kind: string, year: string): boolean;
  /** The date of the person's latest act of this kind, if any. */
  lastGiven(api: CoreAPI, personId: string, kind: string): string | undefined;
}

export interface Prepared {
  /** Positions by question for a town hall or an interview; null declines. */
  readonly answers?: Readonly<Record<string, number | null>>;
  /** Decisions by case id for office hours. */
  readonly cases?: Readonly<Record<string, "help" | "decline">>;
  /** The state of the city's subject: a policy question and the change the speaker argues for. */
  readonly topic?: {
    readonly question: string;
    readonly desiredChange: "enact" | "repeal";
  };
  /** The outlet the player asks for an interview; left out, the widest-reaching outlet that has not had them on. */
  readonly outletId?: string;
  /** The person the player names to a vacant town post, and the post, in place of the appointer's own first choice. */
  readonly nominee?: { readonly post: string; readonly personId: string };
  /** The spending changes by budget line the executive sends with the budget. */
  readonly budget?: { readonly changes: Readonly<Record<string, number>> };
  /** A deal to offer a colleague, by member, when talking about the player's bill. */
  readonly deals?: Readonly<Record<string, "favor" | "back-their-item">>;
}

export function officeActProviders(host: OfficeActHost) {
  const holds = (api: CoreAPI, actor: Readonly<PersonState>) =>
    actor.id === controlled(api) && host.officesOf(api, actor.id).length > 0;
  return {
    [OFFICE_DUTY]: (
      api: CoreAPI,
      actor: Readonly<PersonState>,
      action: ActionDefinition,
    ): ActOffer[] =>
      holds(api, actor) &&
      (action.id !== "state-of-the-city" || addressDue(api, host, actor.id)) &&
      (action.id !== "town-hall" || townHallDue(api, host, actor.id)) &&
      (action.id !== "propose-budget" ||
        budgetProposalDue(api, host, actor.id) !== null)
        ? [
            {
              definition: action,
              targetId: host.officesOf(api, actor.id)[0]!,
              availableHours: api.parameter(action.effortParameter),
            },
          ]
        : [],
    [DEPARTMENT_HEAD]: (
      api: CoreAPI,
      actor: Readonly<PersonState>,
      action: ActionDefinition,
    ): ActOffer[] =>
      holds(api, actor)
        ? appointmentsIn(api, lawChain(api).townPlaceId)
            .filter(
              (row) =>
                row.holderId !== actor.id &&
                api.state.people.get(row.holderId)?.alive,
            )
            .map((row) => ({
              definition: action,
              targetId: row.holderId,
              availableHours: api.parameter(action.effortParameter),
            }))
        : [],
    // Each town post the actor appoints that nobody holds yet.
    [TOWN_POST]: (
      api: CoreAPI,
      actor: Readonly<PersonState>,
      action: ActionDefinition,
    ): ActOffer[] =>
      holds(api, actor)
        ? postsToFill(api, actor.id).map((post) => ({
            definition: action,
            targetId: post.key,
            availableHours: api.parameter(action.effortParameter),
          }))
        : [],
    // Each finished public project of the government the actor leads that nobody has opened.
    [PROJECT]: (
      api: CoreAPI,
      actor: Readonly<PersonState>,
      action: ActionDefinition,
    ): ActOffer[] => {
      if (!holds(api, actor)) return [];
      const gov = executiveGovernment(api, host, actor.id);
      return gov
        ? awaitingRibbon(api, gov.id).map((row) => ({
            definition: action,
            targetId: row.id,
            availableHours: api.parameter(action.effortParameter),
          }))
        : [];
    },
    // Each fellow member of a body where the actor's own bill waits for a vote.
    [COLLEAGUE]: (
      api: CoreAPI,
      actor: Readonly<PersonState>,
      action: ActionDefinition,
    ): ActOffer[] => {
      if (!holds(api, actor)) return [];
      const others = new Set<string>();
      for (const bill of pendingBillsOf(api, actor.id))
        for (const term of members(api, bill.bodyOfficeId)) {
          const key = memberKey(term);
          if (key !== actor.id) others.add(key);
        }
      return [...others].sort().map((targetId) => ({
        definition: action,
        targetId,
        availableHours: api.parameter(action.effortParameter),
      }));
    },
  };
}

/** The executives who give an annual address. */
const EXECUTIVE_KINDS = new Set(["mayor", "county-executive"]);

/** The government a mayor or county executive leads, from the level of their office. */
function executiveGovernment(
  api: CoreAPI,
  host: OfficeActHost,
  personId: string,
) {
  const offices = api.moduleState("core2-offices-v1").table("offices");
  for (const id of host.officesOf(api, personId)) {
    const office = offices.get(id) as unknown as
      { kind: string; level: string } | undefined;
    if (!office || !EXECUTIVE_KINDS.has(office.kind)) continue;
    const gov = governments(api).find((g) => g.level === office.level);
    if (gov) return gov;
  }
  return undefined;
}

/** A mayor or county executive in the address's season who has not given it this year. */
function addressDue(
  api: CoreAPI,
  host: OfficeActHost,
  personId: string,
): boolean {
  if (
    Number(api.state.date.slice(5, 7)) > api.parameter("stateOfCityLastMonth")
  )
    return false;
  const offices = api.moduleState("core2-offices-v1").table("offices");
  const executive = host
    .officesOf(api, personId)
    .some((id) =>
      EXECUTIVE_KINDS.has(
        (offices.get(id) as unknown as { kind: string } | undefined)?.kind ??
          "",
      ),
    );
  return (
    executive &&
    !host.given(api, personId, "state-of-the-city", api.state.date.slice(0, 4))
  );
}

/**
 * The government whose budget a mayor or county executive sends, while the
 * season is open: within the lead time before its fiscal year starts, with no
 * proposal from them in that year. Null when it is not their season.
 */
export function budgetProposalDue(
  api: CoreAPI,
  host: OfficeActHost,
  personId: string,
): { governmentId: string; fiscalYearStarts: string } | null {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return null;
  const offices = api.moduleState("core2-offices-v1").table("offices");
  const kind = host
    .officesOf(api, personId)
    .map(
      (id) =>
        (offices.get(id) as unknown as { kind: string } | undefined)?.kind ??
        "",
    )
    .find((k) => EXECUTIVE_KINDS.has(k));
  if (!kind) return null;
  const level = kind === "mayor" ? "city" : "county";
  const gov = governments(api).find((g) => g.level === level);
  if (!gov) return null;
  const year = Number(api.state.date.slice(0, 4));
  const starts =
    `${year}-${gov.fiscalYearStart}` > api.state.date
      ? `${year}-${gov.fiscalYearStart}`
      : `${year + 1}-${gov.fiscalYearStart}`;
  const days = daysBetween(makeIsoDate(api.state.date), makeIsoDate(starts));
  if (days <= 0 || days > api.parameter("budgetProposalLeadDays")) return null;
  // Sent already this season (the lead time is the season's length).
  const last = host.lastGiven(api, personId, "propose-budget");
  if (
    last &&
    daysBetween(makeIsoDate(last), makeIsoDate(api.state.date)) <=
      api.parameter("budgetProposalLeadDays")
  )
    return null;
  if (budgetPriorities(api, gov.id)?.setBy === personId) return null;
  return { governmentId: gov.id, fiscalYearStarts: starts };
}

/** A town hall is held on a cadence: not again until the interval has passed since the official's last. */
export function townHallDue(
  api: CoreAPI,
  host: OfficeActHost,
  personId: string,
): boolean {
  const last = host.lastGiven(api, personId, "town-hall");
  return (
    !last ||
    daysBetween(makeIsoDate(last), makeIsoDate(api.state.date)) >=
      api.parameter("townHallIntervalDays")
  );
}

/** The actor's own bills drafted and waiting for a vote. */
function pendingBillsOf(api: CoreAPI, personId: string): BillRow[] {
  return (
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as BillRow[]
  )
    .filter((b) => b.sponsorId === personId && b.status === "drafted")
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ---- What they do --------------------------------------------------------

export function officeActHandlers(host: OfficeActHost) {
  return {
    /**
     * The office's open cases are decided: the player's prepared decisions,
     * else the character's own sense of duty, the rule every office uses
     * for a case nobody decided (the cases engine's `ownCaseDecision`).
     */
    "office-hours": (api: CoreAPI, actorId: string) => {
      const prepared = host.prepared(api, actorId, "office-hours");
      for (const row of casesFor(api, actorId)) {
        if (row.status !== "open") continue;
        const chosen = prepared?.cases?.[row.id];
        let decision = chosen;
        let duty: number | null = null;
        if (!decision) {
          const own = ownCaseDecision(api, actorId);
          duty = own.duty;
          decision = own.decision;
        }
        handleCase(api, row.id, decision);
        host.keep(api, {
          personId: actorId,
          kind: "case",
          how: chosen ? "did" : "own-choice",
          recordId: row.id,
          position: duty,
          detail: decision,
        });
      }
      host.clearPrepared(api, actorId, "office-hours");
    },
    /** A town hall: the host answers as prepared, or from their own view. */
    "town-hall": (api: CoreAPI, actorId: string) => {
      const prepared = host.prepared(api, actorId, "town-hall");
      const row = holdTownHall(api, {
        hostId: actorId,
        ...(prepared?.answers ? { answers: prepared.answers } : {}),
      });
      host.keep(api, {
        personId: actorId,
        kind: "town-hall",
        how: prepared?.answers ? "did" : "own-choice",
        recordId: row.id,
        position: null,
        detail: `${row.attendeeIds.length} came; ${row.questions.length} questions`,
      });
      host.clearPrepared(api, actorId, "town-hall");
    },
    /**
     * An interview with the outlet that reaches the most people here among
     * those that have not had the official on yet. The
     * outlet decides whether it has room and interest; the answers are the
     * player's where prepared, else the official's own positions.
     */
    interview: (api: CoreAPI, actorId: string) => {
      // The outlets that have not had them on yet, widest reach first.
      const had = new Set(
        interviewsFor(api, actorId).map((row) => row.outletId),
      );
      const prepared = host.prepared(api, actorId, "interview");
      const open = [...outletsHere(api)].filter((o) => !had.has(o.id));
      // The player's pick where they made one; else the character's.
      const outlet =
        open.find((o) => o.id === prepared?.outletId) ??
        open
          .map((o) => ({ o, reach: followersOf(api, o.id).length }))
          .sort((a, b) => b.reach - a.reach || a.o.id.localeCompare(b.o.id))[0]
          ?.o;
      if (!outlet) return;
      const asked = requestInterview(api, {
        outletId: outlet.id,
        personId: actorId,
      });
      if (asked.status !== "invited") {
        host.keep(api, {
          personId: actorId,
          kind: "interview",
          how: prepared ? "did" : "own-choice",
          recordId: asked.id,
          position: null,
          detail: `declined: ${asked.reason ?? "no reason"}`,
        });
        return;
      }
      const speaker = officeholderSpeaker(api, actorId) ?? {
        personId: actorId,
        party: null,
        filing: null,
      };
      const own = candidateAnswers(api, asked.questions, speaker);
      const answers = own.map((a) =>
        prepared?.answers && a.question in prepared.answers
          ? {
              question: a.question,
              position: prepared.answers[a.question] ?? null,
            }
          : a,
      );
      const done = answerInterview(api, asked.id, answers);
      host.keep(api, {
        personId: actorId,
        kind: "interview",
        how: prepared?.answers ? "did" : "own-choice",
        recordId: done.id,
        position: null,
        detail: `${outlet.id}: ${done.status}`,
      });
      host.clearPrepared(api, actorId, "interview");
    },
    /**
     * A conversation with a colleague about the actor's pending bills: the
     * actor learns where they stand and why, and offers the deal they
     * prepared, if any; the colleague decides it from their own position.
     */
    "talk-to-colleague": (api: CoreAPI, actorId: string, offer: ActOffer) => {
      const deal = host.prepared(api, actorId, "talk-to-colleague")?.deals?.[
        offer.targetId
      ];
      for (const bill of pendingBillsOf(api, actorId)) {
        if (
          !members(api, bill.bodyOfficeId).some(
            (t) => memberKey(t) === offer.targetId,
          )
        )
          continue;
        const position = learnStake(
          api,
          bill.id,
          offer.targetId,
          "conversation",
        );
        const dealt = deal
          ? offerDeal(api, {
              billId: bill.id,
              memberId: offer.targetId,
              kind: deal,
            })
          : null;
        host.keep(api, {
          personId: actorId,
          kind: "talk-to-colleague",
          how: "did",
          recordId: `${bill.id}|${offer.targetId}`,
          position: dealt ? dealt.after.total : position.total,
          detail: dealt
            ? `${deal}: ${dealt.accepted ? "accepted" : "declined"}`
            : "asked",
        });
      }
    },
    /**
     * The annual address: the speaker argues for the change prepared, else
     * for their own strongest view, to everyone who follows the town's
     * outlets; each listener weighs it by the speech engine's own rule.
     */
    "state-of-the-city": (api: CoreAPI, actorId: string) => {
      const prepared = host.prepared(api, actorId, "state-of-the-city");
      const person = api.state.people.get(actorId);
      if (!person) return;
      let topic = prepared?.topic;
      let strength: number | null = null;
      if (!topic) {
        const lean = personLean(api.state.people, person, 0);
        const best = Object.keys(POLICY_QUESTIONS)
          .filter((q) => questionAxis(q) !== 0)
          .map((q) => ({ q, s: personStance(lean, q) }))
          .sort(
            (a, b) => Math.abs(b.s) - Math.abs(a.s) || a.q.localeCompare(b.q),
          )[0];
        if (!best || best.s === 0) return;
        strength = best.s;
        topic = {
          question: best.q,
          desiredChange: best.s > 0 ? "enact" : "repeal",
        };
      }
      const audience = new Set<string>();
      for (const outlet of outletsHere(api))
        for (const id of followersOf(api, outlet.id))
          if (id !== actorId) audience.add(id);
      const id = `state-of-the-city:${actorId}:${api.state.date}`;
      deliverSpeech(api, {
        id,
        speakerId: actorId,
        placeId: lawChain(api).townPlaceId,
        topic: topic.question,
        desiredChange: topic.desiredChange,
        audienceIds: [...audience].sort(),
      });
      host.keep(api, {
        personId: actorId,
        kind: "state-of-the-city",
        how: prepared?.topic ? "did" : "own-choice",
        recordId: id,
        position: strength,
        detail: `${topic.desiredChange} ${topic.question}; ${audience.size} heard it`,
      });
      host.clearPrepared(api, actorId, "state-of-the-city");
    },
    /**
     * The executive sends the budget in its season: the player's changes by
     * line where they made them, else the executive's own priorities by the
     * budgets engine's rule (their lean on each line), which the council or
     * board reads when it votes the budget at the year's start.
     */
    "propose-budget": (api: CoreAPI, actorId: string) => {
      const due = budgetProposalDue(api, host, actorId);
      if (!due) return;
      const prepared = host.prepared(api, actorId, "propose-budget");
      if (prepared?.budget)
        setBudgetPriorities(api, {
          governmentId: due.governmentId,
          setBy: actorId,
          changes: prepared.budget.changes,
        });
      host.keep(api, {
        personId: actorId,
        kind: "propose-budget",
        how: prepared?.budget ? "did" : "own-choice",
        recordId: prepared?.budget
          ? `priorities:${due.governmentId}`
          : `priorities:${due.governmentId}:executive-rule`,
        position: null,
        detail: `${due.governmentId} budget for the year starting ${due.fiscalYearStarts}`,
      });
      host.clearPrepared(api, actorId, "propose-budget");
    },
    /**
     * The appointing official fills a vacant town post: the candidate their
     * own reasons rank first, confirmed by the council where the form asks it.
     */
    "name-department-head": (
      api: CoreAPI,
      actorId: string,
      offer: ActOffer,
    ) => {
      // The player's pick where they made one for this post; else the
      // candidate the official's own reasons rank first.
      const prepared = host.prepared(api, actorId, "name-department-head");
      const picked =
        prepared?.nominee?.post === offer.targetId
          ? prepared.nominee.personId
          : undefined;
      const row = appoint(api, {
        post: offer.targetId,
        ...(picked ? { personId: picked } : {}),
      });
      host.clearPrepared(api, actorId, "name-department-head");
      host.keep(api, {
        personId: actorId,
        kind: "name-department-head",
        how: picked ? "did" : "own-choice",
        recordId: row?.id ?? `appointment:town:${offer.targetId}`,
        position: null,
        detail: row
          ? `${row.holderId}${row.confirmation ? `; ${row.confirmation.yes} to ${row.confirmation.no}` : ""}`
          : "no candidate confirmed",
      });
    },
    /** The ribbon on a finished project is cut by the executive who leads the government that paid for it. */
    "cut-ribbon": (api: CoreAPI, actorId: string, offer: ActOffer) => {
      const row = cutRibbon(api, offer.targetId, actorId);
      host.keep(api, {
        personId: actorId,
        kind: "cut-ribbon",
        how: "did",
        recordId: offer.targetId,
        position: null,
        detail: row
          ? `${row.line} project, ${row.contractorIds.length} contractors`
          : "already opened",
      });
    },
    /** An hour with a department head: they come to know each other. */
    "meet-department-head": (
      api: CoreAPI,
      actorId: string,
      offer: ActOffer,
    ) => {
      const hours = api.parameter("meetHeadActHours");
      api.relationship(actorId, offer.targetId, "contact", hours);
      host.keep(api, {
        personId: actorId,
        kind: "meet-department-head",
        how: "did",
        recordId: offer.targetId,
        position: null,
        detail: `${hours} hours`,
      });
    },
  };
}

export type { ModuleRow };
