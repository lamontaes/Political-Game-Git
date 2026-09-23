import {
  ARTICLE_V_STATE_KEYS,
  constitutionalMemberBody,
  constitutionalPosition,
  constitutionalProposalRuleForWorld,
  proposeConstitutionalMeasure,
  recordArticleVRatification,
  recordConstitutionalProposalVote,
} from "../constitutional-process";
import { addDays, makeIsoDate } from "../dates";
import {
  FEDERAL_JURISDICTION_KEY,
  describeRuleChangeValue,
  type TermLimitRule,
} from "../enacted-rule-changes";
import { scheduleFutureDueItem } from "../future-transitions";
import { dispositionsFromCounts } from "../legislation-scenarios";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../national-election-geography";
import { currentPresidentOf } from "../crisis/offices";
import {
  PRESIDENT_OFFICE_KEY,
  hasPresidency,
  presidentialTermBar,
  presidentialTermLimitAt,
  presidentialTermsCounted,
} from "../nationwide-world/presidential-turnover";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";

/**
 * FEDERAL REFORM — Congress proposing, and the states ratifying, an amendment
 * to the United States Constitution with no player involved, through the
 * Article V route in `constitutional-process.ts` and the rule layer every
 * reader of the presidential term limit consults (`enacted-rule-changes.ts`).
 * It is the federal counterpart of `constitutional-reform.ts`.
 *
 * What is law here: two-thirds of the members present in each house propose
 * (Article V; National Prohibition Cases, 253 U.S. 350); the President has no
 * part in it (Hollingsworth v. Virginia, 3 U.S. 378); three-fourths of the
 * states, 38 of 50, ratify, and the District and the territories do not; a
 * ratified amendment is law on the day the last needed state acts.
 *
 * PLACEHOLDERS, NOT RESEARCH. Every cause, rate, margin and delay below is a
 * marked stand-in for research question `federal-amendment-causes-and-pace`.
 * When the answer comes back it replaces `FEDERAL_REFORM_PROFILE` and
 * `federalReformCause`; nothing else here should need to change.
 *
 * NOT MODELED, with the blanket rule applied meanwhile:
 * - Any subject but the presidential term limit. It is the one federal rule
 *   the game reads through the rule layer; see `FEDERAL_AMENDABLE_OFFICES`.
 * - An Article V convention called by two-thirds of the states, and
 *   ratification by state conventions. Congress proposes and state
 *   legislatures ratify.
 * - Members' own positions. Each house's division is a keyed draw, recorded
 *   by seat with no person named, as the state route records its chambers.
 * - A state legislature's own procedure (which chamber, what majority). Each
 *   state's action is recorded once as approved or not.
 * - Rescinding a ratification, and a state acting again after rejecting.
 *   One action per state, as `constitutional-process.ts` enforces.
 * - The ratification deadline. Congress has set seven years on most
 *   amendments since the Eighteenth and it is set here too; states act
 *   inside it.
 * - A President who is the player. A proposal about the player's own tenure
 *   is left to the player.
 */

export const FEDERAL_REFORM_VERSION = "federal-reform/v1";
export const FEDERAL_REFORM_REVIEW = "governing:federal-reform-review" as const;
export const FEDERAL_REFORM_STATE_ACTION =
  "governing:federal-reform-state-action" as const;

/** Every value is a placeholder pending the research named above. */
export const FEDERAL_REFORM_PROFILE = {
  id: "ocd-federal-reform-placeholder/v1",
  /** Month and day of each year's review; Congress convenes in January. */
  reviewMonthDay: "03-01",
  /** Chance, per mille, that a year with a cause produces a proposal. */
  proposalPermille: 30,
  /** A President who has served this many terms is a cause to restore a limit. */
  longTenureTerms: 3,
  /** The limit a restoring proposal sets. */
  restoredLimit: 2,
  /** No extension goes past this many terms. */
  highestExtendedLimit: 4,
  /** Each house's yes share, per mille, drawn from [min, max). */
  houseYesPermille: [500, 800],
  /** Each state legislature's chance, per mille, of ratifying, by direction. */
  stateRatifiesPermille: {
    extend: [300, 700],
    restore: [600, 950],
  },
  /** A state acts this many days after the proposal, drawn from [min, max). */
  stateActionDays: [30, 900],
  /** Years Congress allows for ratification. */
  ratificationYears: 7,
} as const;

/** Members of each house who vote; Article I sizes, full attendance. */
const HOUSES = [
  { bodyKey: "house", members: 435, label: "House of Representatives" },
  { bodyKey: "senate", members: 100, label: "Senate" },
] as const;

const PLACEHOLDER_NOTE = `${FEDERAL_REFORM_PROFILE.id}: a placeholder pending research (federal-amendment-causes-and-pace), not any Congress's record.`;

type ReformDirection = "extend" | "restore";

interface FederalReformCause {
  readonly direction: ReformDirection;
  readonly holderPersonId: EntityId;
  readonly value: TermLimitRule;
  readonly reason: string;
}

function reviewKey(year: number): string {
  return `${FEDERAL_REFORM_VERSION}:US:${year}:review`;
}

function measureKey(year: number): string {
  return `${FEDERAL_REFORM_VERSION}:US:${year}`;
}

/** The same calendar day `years` later; February 29 falls to February 28. */
function yearsLater(date: IsoDate, years: number): IsoDate {
  const year = Number(date.slice(0, 4)) + years;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const monthDay = date.slice(5) === "02-29" && !leap ? "02-28" : date.slice(5);
  return makeIsoDate(`${year}-${monthDay}`);
}

function reviewDateFor(year: number): IsoDate {
  return makeIsoDate(`${year}-${FEDERAL_REFORM_PROFILE.reviewMonthDay}`);
}

/** Puts the next review after `after` on the calendar, once. */
function scheduleNextReview(world: World, after: IsoDate): World {
  let year = Number(after.slice(0, 4));
  if (reviewDateFor(year) <= after) year += 1;
  const stableKey = reviewKey(year);
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  const registered = ensureNationalElectionJurisdiction(world);
  return scheduleFutureDueItem(registered, {
    stableKey,
    dueAt: reviewDateFor(year),
    transitionKey: FEDERAL_REFORM_REVIEW,
    entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance: { kind: "authored", note: PLACEHOLDER_NOTE },
  });
}

/**
 * Called whenever the canonical clock moves, beside the presidential
 * calendar. Only writes future due items; never a past record.
 */
export function applyFederalReform(before: IsoDate, world: World): World {
  if (world.currentDate <= before || !hasPresidency(world)) return world;
  const year = Number(world.currentDate.slice(0, 4));
  const scheduled = world.history.futureDueItems.some(
    (due) =>
      due.transitionKey === FEDERAL_REFORM_REVIEW &&
      (due.stableKey === reviewKey(year + 1) ||
        (due.stableKey === reviewKey(year) &&
          reviewDateFor(year) > world.currentDate)),
  );
  return scheduled ? world : scheduleNextReview(world, world.currentDate);
}

/** The next presidential term, which a proposal this year is about. */
function nextTermStart(world: World): IsoDate {
  const year = Number(world.currentDate.slice(0, 4));
  const inauguration = Math.ceil(year / 4) * 4 + 1;
  return makeIsoDate(`${inauguration}-01-20`);
}

/**
 * The cause on the record for a proposal this year, if any, judged against
 * the limit that governs the next term the sitting President could seek.
 * Placeholder.
 */
export function federalReformCause(world: World): FederalReformCause | null {
  const president = currentPresidentOf(world)?.personId ?? null;
  if (!president) return null;
  if (world.control.kind === "person" && world.control.personId === president)
    return null;
  // A player sitting in Congress casts their own vote; no proposal is drawn
  // around them. (No federal seat is playable yet; this holds when one is.)
  if (
    world.control.kind === "person" &&
    constitutionalMemberBody(
      world,
      world.control.personId,
      NATIONAL_ELECTION_JURISDICTION.id,
    ) !== null
  )
    return null;
  const termStartsAt = nextTermStart(world);
  const { limit, countsFrom } = presidentialTermLimitAt(world, termStartsAt);
  const cap = limit?.maxLifetimeTerms ?? null;
  const served = presidentialTermsCounted(world, president, countsFrom);
  const profile = FEDERAL_REFORM_PROFILE;
  if (served >= profile.longTenureTerms && (cap === null || cap > served))
    return {
      direction: "restore",
      holderPersonId: president,
      value: {
        maxConsecutiveTerms: null,
        maxLifetimeTerms: profile.restoredLimit,
        lookbackYears: null,
      },
      reason: `the sitting President has served ${served} terms`,
    };
  if (
    cap !== null &&
    presidentialTermBar(world, president, termStartsAt) !== null &&
    cap < profile.highestExtendedLimit
  )
    return {
      direction: "extend",
      holderPersonId: president,
      value: {
        maxConsecutiveTerms: null,
        maxLifetimeTerms: cap + 1,
        lookbackYears: null,
      },
      reason: "the sitting President is barred from another term",
    };
  return null;
}

/** Whether a proposal on the President's term limit is before Congress or the states. */
function hasOpenReform(world: World): boolean {
  return (world.history.constitutionalMeasures ?? []).some(
    (measure) =>
      measure.jurisdictionKey === FEDERAL_JURISDICTION_KEY &&
      measure.ruleDelta.kind === "rule-field" &&
      measure.ruleDelta.officeKey === PRESIDENT_OFFICE_KEY &&
      ["consideration", "ratification"].includes(
        constitutionalPosition(world, measure.id).phase,
      ),
  );
}

function done(world: World, context: string): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  };
}

function yearForDue(due: FutureDueItem): number | null {
  const match = /^federal-reform\/v1:US:(\d{4})(?::|$)/.exec(due.stableKey);
  return match ? Number(match[1]) : null;
}

/** A year's review: consider a proposal if a cause is on the record. */
export function federalReformReviewHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const year = yearForDue(due);
  if (year === null) return done(world, "No year matches this review.");
  const next = scheduleNextReview(world, world.currentDate);
  // Drawn before looking: independent of the cause, so no outcome changes.
  const rng = new SeededRng(next.seed).fork(measureKey(year));
  if (
    rng.fork("propose").integer(0, 1000) >=
    FEDERAL_REFORM_PROFILE.proposalPermille
  )
    return done(next, "Congress proposed no amendment this year.");
  if (hasOpenReform(next))
    return done(next, "An amendment on this is already pending.");
  const cause = federalReformCause(next);
  if (!cause) return done(next, "No cause for an amendment is on the record.");
  const route = constitutionalProposalRuleForWorld(next, {
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    processKind: "federal-amendment",
  });
  if (!route.available) return done(next, route.reason);
  return done(
    proposeAndVote(next, year, cause, rng),
    `Congress considered an amendment on the President's term limit because ${cause.reason}.`,
  );
}

/** Proposes the amendment, records both houses, and dates each state's action. */
export function proposeAndVote(
  world: World,
  year: number,
  cause: FederalReformCause,
  rng: SeededRng,
): World {
  const key = measureKey(year);
  let next = proposeConstitutionalMeasure(world, {
    stableKey: key,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    jurisdictionKey: FEDERAL_JURISDICTION_KEY,
    processKind: "federal-amendment",
    designation: `Proposed Amendment to the Constitution (${year})`,
    shortTitle: "The President's term limit",
    text: `No person shall be elected to the office of the President more than ${describeRuleChangeValue(cause.value)}.`,
    textVersion: "v1",
    sponsoringAuthority: "The Congress of the United States",
    sponsorPersonId: null,
    ratificationMode: "state-legislatures",
    deadlineAt: yearsLater(
      world.currentDate,
      FEDERAL_REFORM_PROFILE.ratificationYears,
    ),
    delayedOperativeAt: null,
    ruleDelta: {
      kind: "rule-field",
      officeKey: PRESIDENT_OFFICE_KEY,
      field: "executive.term.limit",
      value: cause.value,
      applicability:
        cause.direction === "extend"
          ? { appliesTo: "immediately", countsPriorService: true }
          : { appliesTo: "terms-beginning-after", countsPriorService: false },
    },
    ordinaryMeasureId: null,
  });
  const measureId = next.history.constitutionalMeasures!.at(-1)!.id;
  for (const house of HOUSES) {
    const members = Array.from({ length: house.members }, (_, index) => ({
      memberKey: `${house.bodyKey}:seat:${index + 1}`,
      name: `Seat ${index + 1}`,
      personId: null,
      caucusLabel: "",
    }));
    const [min, max] = FEDERAL_REFORM_PROFILE.houseYesPermille;
    const share = rng.fork(`vote:${house.bodyKey}`).integer(min, max);
    const yea = Math.round((house.members * share) / 1000);
    next = recordConstitutionalProposalVote(
      next,
      measureId,
      house.bodyKey,
      dispositionsFromCounts(members, { yea, nay: house.members - yea }),
      house.members,
      {
        method: "authored-fixture",
        note: `${PLACEHOLDER_NOTE} Members' own positions are not modeled; the ${house.label}'s division is drawn and members are recorded by seat.`,
        sourceEntityIds: [],
      },
    );
    if (constitutionalPosition(next, measureId).phase === "rejected")
      return next;
  }
  const [low, high] = FEDERAL_REFORM_PROFILE.stateActionDays;
  for (const stateKey of ARTICLE_V_STATE_KEYS) {
    const days = rng.fork(`state:${stateKey}:day`).integer(low, high);
    next = scheduleFutureDueItem(next, {
      stableKey: `${key}:state:${stateKey}`,
      dueAt: addDays(next.currentDate, days),
      transitionKey: FEDERAL_REFORM_STATE_ACTION,
      entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      provenance: { kind: "authored", note: PLACEHOLDER_NOTE },
    });
  }
  return next;
}

/** One state legislature acts on a proposed amendment. */
export function federalReformStateActionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match = /^(federal-reform\/v1:US:\d{4}):state:(US-[A-Z]{2})$/.exec(
    due.stableKey,
  );
  const measure = match
    ? (world.history.constitutionalMeasures ?? []).find(
        (candidate) => candidate.stableKey === match[1],
      )
    : undefined;
  if (!match || !measure)
    return done(world, "No amendment matches this state action.");
  const stateKey = match[2]!;
  const position = constitutionalPosition(world, measure.id);
  if (position.phase !== "ratification")
    return done(world, "The amendment is no longer before the states.");
  const delta = measure.ruleDelta;
  const direction: ReformDirection =
    delta.kind === "rule-field" &&
    delta.applicability?.appliesTo === "immediately"
      ? "extend"
      : "restore";
  const rng = new SeededRng(world.seed).fork(`${measure.stableKey}:states`);
  const [min, max] = FEDERAL_REFORM_PROFILE.stateRatifiesPermille[direction];
  const chance = rng.fork("chance").integer(min, max);
  const approved = rng.fork(stateKey).integer(0, 1000) < chance;
  const next = recordArticleVRatification(world, measure.id, {
    kind: "state-ratification",
    stateKey,
    body: "state-legislature",
    approved,
    authenticationKey: `${measure.stableKey}:${stateKey}:${world.currentDate}`,
  });
  const after = constitutionalPosition(next, measure.id);
  return done(
    next,
    after.phase === "operative" || after.phase === "ratified"
      ? `${stateKey.slice(3)} ratified ${measure.designation}, the ${after.ratifiedStates.length}th state; it is now part of the Constitution.`
      : approved
        ? `${stateKey.slice(3)} ratified ${measure.designation}.`
        : `${stateKey.slice(3)} declined to ratify ${measure.designation}.`,
  );
}

export const FEDERAL_REFORM_HANDLERS = [
  [FEDERAL_REFORM_REVIEW, federalReformReviewHandler],
  [FEDERAL_REFORM_STATE_ACTION, federalReformStateActionHandler],
] as const;
