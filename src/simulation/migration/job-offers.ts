/**
 * A job offer elsewhere (A135 follow-up, CTO ruling 7, October 1, 2026).
 *
 * Job offers and transfers are about a fifth of all moves in the Current
 * Population Survey's reasons for moving, and more of the long ones. Until
 * this producer nobody in town was ever offered work anywhere else, so the
 * reason was never read and leaving town stayed far below the survey's rate.
 *
 * On the quarterly migration review, each adult reviewed that quarter weighs
 * whether to look for work outside town, from their own record and with no
 * draw (`evaluateDecision`, randomness "none"):
 *
 * - out of work: a paid job that ended for a reason other than quitting,
 *   retiring or dying, with nothing since, weighing more the longer it lasts;
 * - underemployed: part-time hours only;
 * - their pay against what the town's other earners make;
 * - steady full-time work, which holds them;
 * - their age (early career looks, late career stays);
 * - a profession, whose work is hired across the country;
 * - their taste for risk.
 *
 * Somebody who looks applies where the record names an employer: the state
 * government seated in the state where their closest relative outside town
 * lives (work found through family), and otherwise their own state's. They
 * apply for their own line of work at that state's going rate: their own pay
 * scaled by the two states' median household incomes (Census, CPS ASEC table
 * H-8, 2023). The employer answers the same day through the job market
 * (`offerWorkElsewhere`): an offer when they have done the work before.
 *
 * The offer is a recorded cause (`causes.ts`, `work:job-offer`) and names its
 * place. Whoever leaves for it accepts it and starts there on arrival;
 * whoever stays turns it down.
 *
 * Every weight below is a PLACEHOLDER (research:
 * why-americans-move-causes-and-strengths).
 */

import householdIncome from "../../../data/research/money/state-household-income-cps-2023.json" with { type: "json" };
import { ageOnDate, daysBetween } from "../dates";
import { evaluateDecision, isSelectedDecision } from "../decisions";
import {
  PUBLIC_BODY_ROLE_PLACEHOLDER,
  answerJobOfferAsResident,
  applicationsFor,
  jobOpening,
  latestApplicationStep,
  offerWorkElsewhere,
  startJobAsResident,
} from "../job-market";
import {
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  organizationProfileAt,
  workRelationshipHistoryForPerson,
  workRoleAt,
  workStatusAt,
} from "../life-queries";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { TOWN_JOB_ENDS_NOT_LOST } from "../living-world/town-labor-market";
import { monthlyPayByPerson } from "../living-world/town-rent";
import { personTrait } from "../people-traits";
import { money } from "../resources";
import type {
  DecisionConsideration,
  EntityId,
  IsoDate,
  OccupationClassification,
  World,
} from "../types";
import type { CauseReader } from "./causes";

/** PLACEHOLDER weights, each a strength from 0 to 1 at its fullest. */
export const UNRESEARCHED_JOB_SEARCH = {
  provenance: "unresearched-blanket-rule",
  researchQuestionId: "why-americans-move-causes-and-strengths",
  /** Out of work: the strength on the first day, and the days to its full. */
  outOfWorkStart: 0.4,
  outOfWorkFullDays: 180,
  /** Part-time hours only, below this many a week. */
  partTimeHours: 30,
  partTime: 0.5,
  /** Steady full-time work holds them this much, more as it pays more. */
  steadyWork: 0.5,
  /** Age: looking weighs fully at `youngest`, nothing from `lookUntil`. */
  youngest: 20,
  lookUntil: 35,
  /** Staying weighs from `stayFrom`, fully `staySpan` years later. */
  stayFrom: 45,
  staySpan: 20,
  /** A profession: work hired across the country. */
  profession: 0.25,
  /** Each step of their taste for risk, from -2 to 2. */
  riskPerStep: 0.25,
  /** The offer as a cause to leave: its strength with no raise in pay. */
  offerBase: 0.5,
  /** What holds everyone to the place they live, before anything else. */
  settled: 0.5,
} as const;

const S = UNRESEARCHED_JOB_SEARCH;

const SEARCH_OPTIONS = {
  /** Ties sort by key, so an even weighing keeps the search at home. */
  home: "home-only",
  elsewhere: "search-elsewhere",
} as const;

const INCOME = householdIncome.medianHouseholdIncomeDollarsByState as Readonly<
  Record<string, number>
>;

function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

/** The decision layer's steps for a strength, as `causes.ts` reads them. */
function importance(strength: number) {
  if (strength >= 0.75) return "decisive" as const;
  if (strength >= 0.5) return "strong" as const;
  if (strength >= 0.25) return "moderate" as const;
  if (strength > 0) return "slight" as const;
  return null;
}

/**
 * How a state's pay compares with another's: the ratio of their median
 * household incomes (Census CPS ASEC H-8, 2023). A territory the table does
 * not cover is taken at the same pay: ESTIMATED FROM AVERAGE.
 */
export function statePayRatio(
  toStateKey: string | null | undefined,
  fromStateKey: string | null | undefined,
): number {
  const to = toStateKey ? INCOME[toStateKey] : undefined;
  const from = fromStateKey ? INCOME[fromStateKey] : undefined;
  return to && from ? to / from : 1;
}

/**
 * The state government seated in a state-level place: the government's own
 * organization, else the governor's office, else the legislature. Null when
 * the world records none there.
 */
function stateEmployers(world: World): ReadonlyMap<EntityId, EntityId> {
  const rank = new Map<EntityId, [number, EntityId]>();
  for (const organization of world.history.organizations) {
    const key = organization.stableKey;
    const order = key.startsWith("public-government:")
      ? 0
      : key.startsWith("executive-office:")
        ? 1
        : key.startsWith("legislature:")
          ? 2
          : -1;
    if (order < 0) continue;
    const place = organizationProfileAt(
      world,
      organization.id,
    )?.locationJurisdictionId;
    if (!place || world.jurisdictions[place]?.kind !== "state-placeholder")
      continue;
    const held = rank.get(place);
    if (!held || held[0] > order) rank.set(place, [order, organization.id]);
  }
  return new Map([...rank].map(([place, [, id]]) => [place, id]));
}

/** The state-level place a jurisdiction belongs to, and its state key. */
function stateOf(
  jurisdictionId: EntityId,
): { readonly id: EntityId; readonly key: string } | null {
  const key = lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey;
  const state = key ? stateJurisdictionForKey(key) : null;
  return key && state ? { id: state.id, key } : null;
}

interface WorkFacts {
  /** The line of work they do or last did, with its hours. */
  readonly title: string | null;
  readonly occupation: OccupationClassification | null;
  readonly hours: { minimumHours: number; maximumHours: number } | null;
  /** Their recorded pay a month, in cents; 0 with none. */
  readonly monthlyPay: number;
  readonly working: boolean;
  /** The day a lost job ended, when they have lost one and found none. */
  readonly lostOn: IsoDate | null;
}

function workFacts(
  world: World,
  personId: EntityId,
  pay: ReadonlyMap<EntityId, number>,
): WorkFacts {
  const active = activeWorkRelationshipsAt(world, personId).filter((row) =>
    row.relationship.kind.startsWith("employment:"),
  );
  if (active.length > 0) {
    const main = [...active].sort(
      (a, b) =>
        b.role.timeDemand.expectedWeekly.maximumHours -
          a.role.timeDemand.expectedWeekly.maximumHours ||
        a.relationship.id.localeCompare(b.relationship.id),
    )[0]!;
    return {
      title: main.role.title,
      occupation: main.role.occupationClassification,
      hours: main.role.timeDemand.expectedWeekly,
      monthlyPay: pay.get(personId) ?? 0,
      working: true,
      lostOn: null,
    };
  }
  let last: { at: IsoDate; id: EntityId; lost: boolean } | null = null;
  for (const relationship of workRelationshipHistoryForPerson(
    world,
    personId,
  )) {
    if (!relationship.kind.startsWith("employment:")) continue;
    if (relationship.compensation !== "paid") continue;
    const status = workStatusAt(world, relationship.id);
    if (status?.status !== "ended") continue;
    if (!last || status.effectiveAt > last.at)
      last = {
        at: status.effectiveAt,
        id: relationship.id,
        lost: !TOWN_JOB_ENDS_NOT_LOST.has(status.reason ?? ""),
      };
  }
  const role = last ? workRoleAt(world, last.id) : null;
  return {
    title: role?.title ?? null,
    occupation: role?.occupationClassification ?? null,
    hours: role?.timeDemand.expectedWeekly ?? null,
    monthlyPay: 0,
    working: false,
    lostOn: last?.lost ? last.at : null,
  };
}

/** The middle of the town's earners' monthly pay, or null with none. */
function medianPay(
  pay: ReadonlyMap<EntityId, number>,
  residents: ReadonlySet<EntityId>,
): number | null {
  const values = [...pay]
    .filter(([id, value]) => residents.has(id) && value > 0)
    .map(([, value]) => value)
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 1
    ? values[middle]!
    : (values[middle - 1]! + values[middle]!) / 2;
}

/** Whether one resident looks for work outside town, from their record. */
export function decideToSearchElsewhere(
  world: World,
  personId: EntityId,
  stableKey: string,
  facts: WorkFacts,
  townMedianPay: number | null,
): boolean {
  const considerations: DecisionConsideration[] = [];
  const add = (
    key: string,
    option: string,
    strength: number,
    explanation: string,
  ) => {
    const size = importance(strength);
    if (!size) return;
    considerations.push({
      stableKey: `${stableKey}:${key}`,
      optionKey: option,
      sourceType: `context:${key}`,
      direction: "supports",
      importance: size,
      confidence: "medium",
      explanation,
      sourceRefs: [],
    });
  };
  const today = world.currentDate;
  if (facts.lostOn)
    add(
      "out-of-work",
      SEARCH_OPTIONS.elsewhere,
      S.outOfWorkStart +
        ((1 - S.outOfWorkStart) * daysBetween(facts.lostOn, today)) /
          S.outOfWorkFullDays,
      "They lost their job and have found nothing in town.",
    );
  if (
    facts.working &&
    facts.hours &&
    facts.hours.maximumHours < S.partTimeHours
  )
    add(
      "underemployed",
      SEARCH_OPTIONS.elsewhere,
      S.partTime,
      "They want more hours than their work gives them.",
    );
  if (facts.working && townMedianPay) {
    const share = facts.monthlyPay / townMedianPay;
    add(
      "low-pay",
      SEARCH_OPTIONS.elsewhere,
      1 - share,
      "They earn less than most workers in town.",
    );
    if (facts.hours && facts.hours.maximumHours >= S.partTimeHours)
      add(
        "steady-work",
        SEARCH_OPTIONS.home,
        S.steadyWork + (1 - S.steadyWork) * clamp01(share - 1),
        "Their full-time work pays enough to stay.",
      );
  }
  // Most people never look beyond where they live: the life they have here.
  add("settled", SEARCH_OPTIONS.home, S.settled, "Their life is here.");
  const age = ageOnDate(world.people[personId]!.birthDate, today);
  add(
    "early-career",
    SEARCH_OPTIONS.elsewhere,
    clamp01((S.lookUntil - age) / (S.lookUntil - S.youngest)),
    "They are early in their working life.",
  );
  add(
    "late-career",
    SEARCH_OPTIONS.home,
    clamp01((age - S.stayFrom) / S.staySpan),
    "They are settled in their working life.",
  );
  if (facts.occupation?.startsWith("profession:"))
    add(
      "profession",
      SEARCH_OPTIONS.elsewhere,
      S.profession,
      "Their field hires across the country.",
    );
  const risk = personTrait(world, personId, "risk").value;
  add(
    "risk",
    risk > 0 ? SEARCH_OPTIONS.elsewhere : SEARCH_OPTIONS.home,
    S.riskPerStep * Math.abs(risk),
    risk > 0
      ? "They will take a chance on somewhere new."
      : "They would rather keep what they know.",
  );
  const evaluation = evaluateDecision(world, {
    stableKey,
    decisionType: "migration.search-elsewhere",
    actorPersonId: personId,
    cutoff: {
      asOfDate: today,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:work", key: "search-elsewhere", entityId: null },
    options: [
      {
        key: SEARCH_OPTIONS.home,
        label: "Look in town",
        description: "Look for work only in town, if at all.",
      },
      {
        key: SEARCH_OPTIONS.elsewhere,
        label: "Look elsewhere",
        description: "Apply for work outside town.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  return (
    isSelectedDecision(evaluation) &&
    evaluation.selectedOptionKey === SEARCH_OPTIONS.elsewhere
  );
}

/**
 * This quarter's searches for work elsewhere among `reviewed`, the adults
 * reviewed this quarter. Writes each search, application and answer through
 * the job market; returns the world unchanged when nobody looks.
 */
export function reviewJobSearchElsewhere(
  world: World,
  town: EntityId,
  round: string,
  reviewed: readonly EntityId[],
  reader: () => CauseReader,
): World {
  const home = stateOf(town);
  if (!home) return world;
  const pay = monthlyPayByPerson(world, world.currentDate);
  const residents = new Set(
    world.personOrder.filter(
      (id) => world.people[id]!.homeJurisdictionId === town,
    ),
  );
  const townMedian = medianPay(pay, residents);
  let employers: ReadonlyMap<EntityId, EntityId> | null = null;
  let next = world;
  for (const personId of reviewed) {
    if (next.control.kind === "person" && next.control.personId === personId)
      continue;
    const age = ageOnDate(next.people[personId]!.birthDate, next.currentDate);
    if (age < 18 || age > 66) continue;
    if (activeEducationEnrollmentsAt(next, personId).length > 0) continue;
    if (openOfferElsewhere(next, personId, town, () => pay)) continue;
    const facts = workFacts(next, personId, pay);
    if (!facts.working && !facts.lostOn) continue;
    if (
      !decideToSearchElsewhere(
        next,
        personId,
        `migration-job-search:${round}:${personId}`,
        facts,
        townMedian,
      )
    )
      continue;
    employers ??= stateEmployers(next);
    // Where family lives, else their own state.
    const kin = reader().closestKinElsewhere(personId, town);
    const kinState = kin ? stateOf(kin.placeId) : null;
    const target =
      kinState && employers.has(kinState.id)
        ? kinState
        : employers.has(home.id)
          ? home
          : null;
    if (!target) continue;
    const ratio = statePayRatio(target.key, home.key);
    const role = facts.title
      ? {
          title: facts.title,
          occupation: facts.occupation,
          hours: facts.hours ?? { minimumHours: 37, maximumHours: 40 },
          annualMinor: Math.round(facts.monthlyPay * 12 * ratio),
        }
      : null;
    const known = role && role.annualMinor > 0;
    const clerk = PUBLIC_BODY_ROLE_PLACEHOLDER;
    const hours = known ? role.hours : clerk.weeklyHours;
    const annual = known
      ? role.annualMinor
      : Math.round(
          clerk.hourlyMinor *
            52 *
            ((clerk.weeklyHours.minimumHours + clerk.weeklyHours.maximumHours) /
              2) *
            ratio,
        );
    const salaried = known && !!role.occupation?.startsWith("profession:");
    const offered = offerWorkElsewhere(next, {
      personId,
      organizationId: employers.get(target.id)!,
      jurisdictionId: target.id,
      title: known ? role.title : clerk.title,
      occupationClassification: known
        ? role.occupation
        : clerk.occupationClassification,
      pay: salaried
        ? { basis: "annual-salary", amount: money(annual, "USD") }
        : {
            basis: "hourly",
            amount: money(Math.round(annual / 52 / hours.maximumHours), "USD"),
          },
      weeklyHours: hours,
      note: known
        ? "Their own line of work, at their own pay scaled by the two states' median household incomes (Census CPS ASEC table H-8, 2023)."
        : `The placeholder public-body role (research: ${clerk.researchQuestionId}), scaled by the two states' median household incomes.`,
      round,
    });
    if (offered.ok) next = offered.world;
  }
  return next;
}

/** An offer of work outside town still waiting for this person's answer. */
export interface OfferElsewhere {
  readonly applicationId: EntityId;
  readonly placeId: EntityId;
  /** The `job-market.offered` event. */
  readonly eventId: EntityId;
  /** The offered pay a year against their own, less one. */
  readonly raise: number;
  readonly employer: EntityId;
  readonly title: string;
}

export function openOfferElsewhere(
  world: World,
  personId: EntityId,
  town: EntityId,
  pay: () => ReadonlyMap<EntityId, number> = () =>
    monthlyPayByPerson(world, world.currentDate),
): OfferElsewhere | null {
  for (const application of [...applicationsFor(world, personId)].reverse()) {
    const opening = jobOpening(world, application.openingId);
    if (!opening || opening.jurisdictionId === town) continue;
    if (!opening.stableKey.startsWith("job-opening:elsewhere:")) continue;
    const latest = latestApplicationStep(world, application.id);
    if (latest?.kind !== "offered" || !latest.eventId) continue;
    if (latest.replyBy! < world.currentDate) continue;
    const yearly =
      opening.pay.basis === "annual-salary"
        ? opening.pay.amount.minorUnits
        : opening.pay.amount.minorUnits *
          (latest.agreedWeeklyHours ?? opening.weeklyHours.maximumHours) *
          52;
    const own = (pay().get(personId) ?? 0) * 12;
    return {
      applicationId: application.id,
      placeId: opening.jurisdictionId,
      eventId: latest.eventId,
      // Somebody out of work gains the whole pay; somebody working whose pay
      // is not on record gains nothing that can be read: unknown is not zero.
      raise:
        own > 0
          ? yearly / own - 1
          : activeWorkRelationshipsAt(world, personId).some((row) =>
                row.relationship.kind.startsWith("employment:"),
              )
            ? 0
            : 1,
      employer: opening.organizationId,
      title: opening.title,
    };
  }
  return null;
}

/** The offer as a cause's strength: firm with no raise, full with one. */
export function offerStrength(offer: OfferElsewhere): number {
  return clamp01(S.offerBase + offer.raise);
}

/**
 * The resident's answer: whoever moved for the offer accepts it and starts
 * there; whoever stayed turns it down.
 */
export function answerOfferElsewhere(
  world: World,
  applicationId: EntityId,
  moved: boolean,
): World {
  const answered = answerJobOfferAsResident(world, applicationId, moved);
  if (!answered.ok || !moved) return answered.ok ? answered.world : world;
  const started = startJobAsResident(answered.world, applicationId);
  return started.ok ? started.world : answered.world;
}
