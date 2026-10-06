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
 * Somebody who looks applies to a private employer the place really has
 * (`employers-elsewhere.ts`, CTO ruling 23(b)): in the town where their
 * closest relative outside town lives (work found through family), and
 * otherwise their state's largest town; the kind of business there that fits
 * them best, at the place's published wage for the work. The employer is
 * written when the offer needs it and answers the same day through the job
 * market (`offerWorkElsewhere`): an offer when they have done the work before
 * or it needs no credential or experience.
 *
 * The offer is a recorded cause (`causes.ts`, `work:job-offer`) and names its
 * place. Whoever leaves for it accepts it and starts there on arrival;
 * whoever stays turns it down.
 *
 * ESTIMATED FROM AVERAGE: the weights below are calibrated together against
 * the national 2023 CPS ASEC migration tables. A new job or job transfer is
 * 13.2 percent of movers' reasons, about a fifth with the other work reasons,
 * at a national mover rate near 8 to 10 percent; the resulting check is that
 * about 1.5 to 2 percent of adults move for an offer in a year. The basis is
 * the survey average across the 50 states and D.C.; Puerto Rico and the four
 * smaller territories use that national average until a comparable local
 * reasons table is recorded. The check never decides one person's outcome.
 */

import { ageOnDate, daysBetween } from "../dates";
import { evaluateDecision, isSelectedDecision } from "../decisions";
import {
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
  workRelationshipHistoryForPerson,
  workRoleAt,
  workStatusAt,
} from "../life-queries";
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
import { FULL_TIME } from "../local-economy";
import type { CauseReader } from "./causes";
import {
  bestEmployerFor,
  ensureEmployerElsewhere,
  NO_CREDENTIAL_OCCUPATIONS,
  PAY_ESTIMATE_SPREAD,
  placeToLookFor,
} from "./employers-elsewhere";

/** Estimated weights, each a strength from 0 to 1 at its fullest. */
export const ESTIMATED_JOB_SEARCH = {
  provenance: "estimated-from-national-average",
  researchQuestionId: "why-americans-move-causes-and-strengths",
  /** Out of work: the strength on the first day, and the days to its full. */
  outOfWorkStart: 0.4,
  outOfWorkFullDays: 180,
  /** Part-time hours only, below this many a week. */
  partTimeHours: 30,
  /** The hours a week a full-time wage is read at. */
  fullTimeHours: 40,
  partTime: 0.5,
  /** Steady full-time work holds them this much, more as it pays more. */
  steadyWork: 0.5,
  /**
   * Age: looking weighs fully at `youngest`, nothing from `lookUntil`. Moved
   * from 35 to 37 when offers came to pay the place's own wage for the work
   * rather than the former clerk stand-in (CTO ruling 23(b)), to hold the total.
   */
  youngest: 20,
  lookUntil: 37,
  /** Staying weighs from `stayFrom`, fully `staySpan` years later. */
  stayFrom: 45,
  staySpan: 20,
  /** A profession: work hired across the country. */
  profession: 0.25,
  /** Each step of their taste for risk, from -2 to 2. */
  riskPerStep: 0.25,
  /**
   * The offer as a cause to leave: its strength with no raise in pay. Lowered
   * from 0.5 with `settledConfidence` (CTO ruling 23) so that about 1.5 to 2
   * percent of adults move for an offer in a year.
   */
  offerBase: 0.25,
  /** What holds everyone to the place they live, before anything else. */
  settled: 0.75,
  settledConfidence: "high",
} as const;

const S = ESTIMATED_JOB_SEARCH;

const SEARCH_OPTIONS = {
  /** Ties sort by key, so an even weighing keeps the search at home. */
  home: "home-only",
  elsewhere: "search-elsewhere",
} as const;

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

interface WorkFacts {
  /** The line of work they do or last did, with its hours. */
  readonly title: string | null;
  readonly occupation: OccupationClassification | null;
  readonly hours: { minimumHours: number; maximumHours: number } | null;
  /**
   * Their recorded pay a month, in cents: 0 out of work, null when they work
   * but their pay is not on record (unknown is not zero).
   */
  readonly monthlyPay: number | null;
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
      monthlyPay: pay.get(personId) ?? null,
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
    confidence: "medium" | "high" = "medium",
  ) => {
    const size = importance(strength);
    if (!size) return;
    considerations.push({
      stableKey: `${stableKey}:${key}`,
      optionKey: option,
      sourceType: `context:${key}`,
      direction: "supports",
      importance: size,
      confidence,
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
  if (facts.working && townMedianPay && facts.monthlyPay !== null) {
    // Their pay at full-time hours, so short hours are read once, above,
    // and not again as low pay.
    const hours = facts.hours?.maximumHours ?? S.fullTimeHours;
    const share =
      (facts.monthlyPay * Math.max(1, S.fullTimeHours / Math.max(1, hours))) /
      townMedianPay;
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
  // The life they have is a fact, not a guess about somewhere else, so it is
  // weighed with more certainty than anything pulling them away (CTO ruling
  // 23 calibration; see the check in `job-offers.test.ts`).
  add(
    "settled",
    SEARCH_OPTIONS.home,
    S.settled,
    "Their life is here.",
    S.settledConfidence,
  );
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
  const pay = monthlyPayByPerson(world, world.currentDate);
  const residents = new Set(
    world.personOrder.filter(
      (id) => world.people[id]!.homeJurisdictionId === town,
    ),
  );
  const townMedian = medianPay(pay, residents);
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
    // Where family lives, else the largest town in their state; there, the
    // employer that fits them best (`employers-elsewhere.ts`).
    const kin = reader().closestKinElsewhere(personId, town);
    const place = placeToLookFor(town, kin?.placeId ?? null);
    if (!place) continue;
    const offer = bestEmployerFor(next, personId, facts.occupation, place);
    if (!offer) continue;
    const employer = ensureEmployerElsewhere(next, place, offer);
    next = employer.world;
    const offered = offerWorkElsewhere(next, {
      personId,
      organizationId: employer.organizationId,
      jurisdictionId: offer.placeId,
      title: offer.kind.workerTitle,
      occupationClassification: offer.kind.workerOccupation,
      pay: { basis: "hourly", amount: money(offer.hourlyMinor, "USD") },
      // The full-time hours the place's businesses hire for.
      weeklyHours: FULL_TIME.expectedWeekly,
      note:
        offer.payBasis === "published"
          ? "The place's published wage for the occupation (BLS OEWS, May 2025) at their years in the line of work."
          : `ESTIMATED FROM AVERAGE: BLS publishes no wage there, so the national median for the occupation (BLS OEWS, May 2025), with ${Math.round(100 * PAY_ESTIMATE_SPREAD)} percent spread for each world.`,
      round,
      needsNoExperience: NO_CREDENTIAL_OCCUPATIONS.has(
        offer.kind.workerOccupation,
      ),
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
