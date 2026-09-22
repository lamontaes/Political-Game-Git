import {
  constitutionalActions,
  constitutionalPosition,
  constitutionalProposalRuleForWorld,
  proposeConstitutionalMeasure,
  recordConstitutionalProposalVote,
  recordStatewideRatification,
  stateAmendmentProfile,
} from "../constitutional-process";
import { addDays, makeIsoDate } from "../dates";
import {
  describeRuleChangeValue,
  type TermLimitRule,
} from "../enacted-rule-changes";
import { scheduleFutureDueItem } from "../future-transitions";
import { dispositionsFromCounts } from "../legislation-scenarios";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { chiefExecutiveJurisdictionId } from "../nationwide-world/government-jurisdiction";
import { checkExecutiveTermLimit } from "../nationwide-world/executive-term-limits";
import { nextFilableStateExecutiveTerm } from "../nationwide-world/state-executive-turnover-calendar";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import {
  currentStateExecutiveHolders,
  ensureStateJurisdiction,
  stateExecutiveOffice,
} from "../nationwide-world/state-executives";

/**
 * CONSTITUTIONAL REFORM — a state's legislature and voters changing the
 * governor's term limit on their own, with no player involved, through the
 * same amendment route a player's proposal takes (`constitutional-process.ts`)
 * and the same enacted-rule layer every reader of the rule consults
 * (`enacted-rule-changes.ts`, `executive-term-limits.ts`).
 *
 * Once a year each governorship the World has materialized is reviewed. A
 * proposal is considered only when a cause is on the record; the legislature
 * votes chamber by chamber under its own amendment threshold; a measure that
 * clears every chamber goes to the voters; a ratified measure changes the
 * limit that the next governor election reads.
 *
 * PLACEHOLDERS, NOT RESEARCH. The owner has ruled out invented depth, so every
 * cause, rate and margin below is a marked stand-in for the answer to
 * `governor-term-limit-amendment-causes` (and, for how often,
 * `constitutional-amendment-frequency`), both filed with the research lane.
 * When the answers come back, they replace `CONSTITUTIONAL_REFORM_PROFILE`
 * and `reformCause`; nothing else here should need to change.
 *
 * NOT MODELLED, with the blanket rule applied meanwhile:
 * - Other subjects of amendment (legislature size, terms, qualifications).
 *   Only the governor's term limit is reviewed.
 * - Initiatives, conventions and commissions. Every proposal is a legislative
 *   referral.
 * - Members' own positions. A chamber's vote is a keyed draw, and members are
 *   recorded by seat with no person named.
 * - Turnout. The statewide result is recorded as shares of 10,000, as
 *   simulated elections are, not as ballots cast.
 * - Which ballot a referred measure goes on. The first November general
 *   election day at least `ballotLeadDays` after the last chamber votes.
 * - Whether a ballot comes before the governor's own election. The ballot is
 *   not re-checked against its cause, and an extension ratified on the day
 *   the barred governor's successor is chosen changes the rule only for later
 *   governors, as a real amendment would.
 * - D.C. and Puerto Rico. D.C. has a charter under the Home Rule Act, not a
 *   state constitution, and Puerto Rico's governor has no term limit; neither
 *   is reviewed.
 * - A governor who is the player. A proposal about the player's own tenure is
 *   left to the player.
 */

export const CONSTITUTIONAL_REFORM_VERSION = "constitutional-reform/v1";
export const CONSTITUTIONAL_REFORM_REVIEW =
  "governing:constitutional-reform-review" as const;
export const CONSTITUTIONAL_REFORM_BALLOT =
  "governing:constitutional-reform-ballot" as const;

/** Every value is a placeholder pending the research named above. */
export const CONSTITUTIONAL_REFORM_PROFILE = {
  id: "ocd-constitutional-reform-placeholder/v1",
  /** Month and day of each year's review; legislatures convene early in the year. */
  reviewMonthDay: "02-01",
  /** Chance, per mille, that a qualifying year produces a proposal. */
  proposalPermille: 30,
  /** A governor who has served this many terms is a cause to restore a limit. */
  longTenureTerms: 3,
  /** The limit a restoring proposal sets. */
  restoredLimit: 2,
  /** No extension goes past this many terms. */
  highestExtendedLimit: 4,
  /** Each chamber's yes share, per mille, drawn from [min, max). */
  chamberYesPermille: [450, 800],
  /** The voters' yes share, per mille, by direction. */
  ballotYesPermille: {
    extend: [300, 600],
    restore: [500, 800],
  },
  /** The ballot is at least this many days after the last chamber vote. */
  ballotLeadDays: 90,
} as const;

const PLACEHOLDER_NOTE = `${CONSTITUTIONAL_REFORM_PROFILE.id}: a placeholder pending research (governor-term-limit-amendment-causes), not any state's record.`;

type ReformDirection = "extend" | "restore";

interface ReformCause {
  readonly direction: ReformDirection;
  readonly holderPersonId: EntityId;
  readonly value: TermLimitRule;
  readonly reason: string;
}

function reviewKey(stateUsps: string, year: number): string {
  return `${CONSTITUTIONAL_REFORM_VERSION}:${stateUsps}:${year}:review`;
}

function measureKey(stateUsps: string, year: number): string {
  return `${CONSTITUTIONAL_REFORM_VERSION}:${stateUsps}:${year}`;
}

/** Governorships a review covers: materialized, and a state's. */
// States with an amendment route never change during play, and building a
// generated legislature is not free, so they are found once.
let amendableStates: readonly string[] | null = null;

function reviewedStates(world: World): readonly string[] {
  amendableStates ??= CHIEF_EXECUTIVE_JURISDICTIONS.filter(
    (usps) =>
      stateAmendmentProfile(`US-${usps}`) !== null &&
      stateExecutiveOffice(usps) !== null,
  );
  const organizations = new Set(
    world.history.organizations.map((organization) => organization.stableKey),
  );
  return amendableStates.filter((usps) =>
    organizations.has(stateExecutiveOffice(usps)!.organizationStableKey),
  );
}

function reviewDateFor(year: number): IsoDate {
  return makeIsoDate(`${year}-${CONSTITUTIONAL_REFORM_PROFILE.reviewMonthDay}`);
}

/** Puts the next review after `after` on the calendar, once. */
function scheduleNextReview(
  world: World,
  stateUsps: string,
  after: IsoDate,
): World {
  let year = Number(after.slice(0, 4));
  if (reviewDateFor(year) <= after) year += 1;
  const stableKey = reviewKey(stateUsps, year);
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  const registered = ensureStateJurisdiction(world, stateUsps);
  const stateId = chiefExecutiveJurisdictionId(stateUsps)!;
  return scheduleFutureDueItem(registered, {
    stableKey,
    dueAt: reviewDateFor(year),
    transitionKey: CONSTITUTIONAL_REFORM_REVIEW,
    entityIds: [stateId],
    jurisdictionId: stateId,
    provenance: { kind: "authored", note: PLACEHOLDER_NOTE },
  });
}

/**
 * Called whenever the canonical clock moves, beside the governor calendar.
 * Only writes future due items; never a past record.
 */
export function applyConstitutionalReform(
  before: IsoDate,
  world: World,
): World {
  if (world.currentDate <= before) return world;
  const year = Number(world.currentDate.slice(0, 4));
  const scheduled = new Set(
    world.history.futureDueItems
      .filter((due) => due.transitionKey === CONSTITUTIONAL_REFORM_REVIEW)
      .map((due) => due.stableKey),
  );
  let next = world;
  for (const usps of reviewedStates(world)) {
    // Already on the calendar for this year or next: nothing to write.
    if (
      scheduled.has(reviewKey(usps, year)) &&
      reviewDateFor(year) > world.currentDate
    )
      continue;
    if (scheduled.has(reviewKey(usps, year + 1))) continue;
    next = scheduleNextReview(next, usps, next.currentDate);
  }
  return next;
}

function lowestCap(limit: TermLimitRule | null): number | null {
  const caps = [limit?.maxConsecutiveTerms, limit?.maxLifetimeTerms].filter(
    (cap): cap is number => typeof cap === "number",
  );
  return caps.length ? Math.min(...caps) : null;
}

/**
 * The cause on the record for a proposal this year, if any, judged against
 * the limit that governs the next term the sitting governor could seek.
 * Placeholder.
 */
export function reformCause(
  world: World,
  stateUsps: string,
): ReformCause | null {
  const office = stateExecutiveOffice(stateUsps);
  if (!office) return null;
  const holder = currentStateExecutiveHolders(world).find(
    (record) => record.officeKey === office.officeKey,
  );
  if (!holder) return null;
  if (
    world.control.kind === "person" &&
    world.control.personId === holder.personId
  )
    return null;
  const term = nextFilableStateExecutiveTerm(world, stateUsps);
  if (!term) return null;
  const check = checkExecutiveTermLimit(world, {
    stateUsps,
    personId: holder.personId,
    termStartsAt: term.startsAt,
  });
  if (!check) return null;
  const rule = check.limit.limit;
  const allowed = lowestCap(rule);
  const profile = CONSTITUTIONAL_REFORM_PROFILE;
  if (
    check.consecutiveTerms >= profile.longTenureTerms &&
    (allowed === null || allowed > profile.restoredLimit)
  )
    return {
      direction: "restore",
      holderPersonId: holder.personId,
      value: {
        maxConsecutiveTerms: profile.restoredLimit,
        maxLifetimeTerms: null,
        lookbackYears: null,
      },
      reason: `the sitting governor has served ${check.consecutiveTerms} terms in a row`,
    };
  if (
    rule !== null &&
    allowed !== null &&
    check.barredReason !== null &&
    allowed < profile.highestExtendedLimit
  ) {
    // Raise whichever cap bars the governor, by one.
    const consecutiveBars =
      rule.maxConsecutiveTerms !== null &&
      check.consecutiveTerms >= rule.maxConsecutiveTerms;
    return {
      direction: "extend",
      holderPersonId: holder.personId,
      value: consecutiveBars
        ? { ...rule, maxConsecutiveTerms: rule.maxConsecutiveTerms! + 1 }
        : { ...rule, maxLifetimeTerms: rule.maxLifetimeTerms! + 1 },
      reason: "the sitting governor is barred from another term",
    };
  }
  return null;
}

/**
 * Whether any measure on the governor's term limit in this state, the
 * player's included, is still before the legislature or the voters.
 */
function hasOpenReform(world: World, stateUsps: string): boolean {
  const officeKey = stateExecutiveOffice(stateUsps)?.officeKey;
  return (world.history.constitutionalMeasures ?? []).some(
    (measure) =>
      measure.jurisdictionKey === `US-${stateUsps}` &&
      measure.ruleDelta.kind === "rule-field" &&
      measure.ruleDelta.field === "executive.term.limit" &&
      measure.ruleDelta.officeKey === officeKey &&
      ["consideration", "ratification"].includes(
        constitutionalPosition(world, measure.id).phase,
      ),
  );
}

function drawPermille(
  rng: SeededRng,
  [min, max]: readonly [number, number],
): number {
  return rng.integer(min, max);
}

/** First Tuesday after the first Monday in November, on or after `from`. */
export function nextGeneralElectionDay(from: IsoDate): IsoDate {
  for (let year = Number(from.slice(0, 4)); ; year += 1) {
    const first = new Date(Date.UTC(year, 10, 1)).getUTCDay();
    const firstMonday = 1 + ((8 - first) % 7);
    const day = makeIsoDate(
      `${year}-11-${String(firstMonday + 1).padStart(2, "0")}`,
    );
    if (day >= from) return day;
  }
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

function stateForDue(due: FutureDueItem) {
  const match = /^constitutional-reform\/v1:([A-Z]{2}):(\d{4})(?::|$)/.exec(
    due.stableKey,
  );
  return match ? { stateUsps: match[1]!, year: Number(match[2]) } : null;
}

/** A year's review: consider a proposal if a cause is on the record. */
export function constitutionalReformReviewHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const found = stateForDue(due);
  if (!found) return done(world, "No state matches this review.");
  const { stateUsps, year } = found;
  const next = scheduleNextReview(world, stateUsps, world.currentDate);
  // The draw comes first: it is independent of the cause, so drawing before
  // looking changes no outcome and spares the lookups in most years.
  const key = measureKey(stateUsps, year);
  const rng = new SeededRng(next.seed).fork(key);
  if (
    rng.fork("propose").integer(0, 1000) >=
    CONSTITUTIONAL_REFORM_PROFILE.proposalPermille
  )
    return done(next, "No amendment was proposed this year.");
  if (hasOpenReform(next, stateUsps))
    return done(next, "An amendment on this is already pending.");
  const cause = reformCause(next, stateUsps);
  if (!cause) return done(next, "No cause for an amendment is on the record.");
  // A route this World cannot use today (California's sourced process before
  // its observation date) is not attempted: a refusal inside a handler would
  // stop the clock.
  const route = constitutionalProposalRuleForWorld(next, {
    jurisdictionId: chiefExecutiveJurisdictionId(stateUsps)!,
    processKind: "state-amendment",
  });
  if (!route.available) return done(next, route.reason);
  return done(
    proposeAndVote(next, stateUsps, year, cause, rng),
    `An amendment on the governor's term limit was proposed because ${cause.reason}.`,
  );
}

function proposeAndVote(
  world: World,
  stateUsps: string,
  year: number,
  cause: ReformCause,
  rng: SeededRng,
): World {
  const profile = stateAmendmentProfile(`US-${stateUsps}`)!;
  const office = stateExecutiveOffice(stateUsps)!;
  const stateId = chiefExecutiveJurisdictionId(stateUsps)!;
  const stateName = world.jurisdictions[stateId]?.name ?? stateUsps;
  const key = measureKey(stateUsps, year);
  let next = proposeConstitutionalMeasure(world, {
    stableKey: key,
    jurisdictionId: stateId,
    jurisdictionKey: `US-${stateUsps}`,
    processKind: "state-amendment",
    designation: `Proposed Amendment (${year})`,
    shortTitle: "The governor's term limit",
    text: `The Governor of ${stateName} may serve no more than ${describeRuleChangeValue(cause.value)}.`,
    textVersion: "v1",
    sponsoringAuthority: `The ${stateName} Legislature`,
    sponsorPersonId: null,
    ratificationMode: "statewide-electors",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: {
      kind: "rule-field",
      officeKey: office.officeKey,
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
  for (const body of profile.bodies) {
    const members = Array.from({ length: body.members }, (_, index) => ({
      memberKey: `${body.bodyKey}:seat:${index + 1}`,
      name: `Seat ${index + 1}`,
      personId: null,
      caucusLabel: "",
    }));
    const share = drawPermille(
      rng.fork(`vote:${body.bodyKey}`),
      CONSTITUTIONAL_REFORM_PROFILE.chamberYesPermille,
    );
    const yea = Math.round((body.members * share) / 1000);
    next = recordConstitutionalProposalVote(
      next,
      measureId,
      body.bodyKey,
      dispositionsFromCounts(members, { yea, nay: body.members - yea }),
      body.members,
      {
        method: "authored-fixture",
        note: `${PLACEHOLDER_NOTE} Members' own positions are not modelled; the chamber's division is drawn and members are recorded by seat.`,
        sourceEntityIds: [],
      },
    );
    if (constitutionalPosition(next, measureId).phase === "rejected")
      return next;
  }
  const electionDay = nextGeneralElectionDay(
    addDays(next.currentDate, CONSTITUTIONAL_REFORM_PROFILE.ballotLeadDays),
  );
  return scheduleFutureDueItem(next, {
    stableKey: `${key}:ballot:${electionDay.slice(0, 4)}`,
    dueAt: electionDay,
    transitionKey: CONSTITUTIONAL_REFORM_BALLOT,
    entityIds: [stateId],
    jurisdictionId: stateId,
    provenance: { kind: "authored", note: PLACEHOLDER_NOTE },
  });
}

/** Election day: the voters decide a referred amendment. */
export function constitutionalReformBallotHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const found = stateForDue(due);
  const measure = (world.history.constitutionalMeasures ?? []).find(
    (candidate) => due.stableKey.startsWith(`${candidate.stableKey}:ballot:`),
  );
  if (!found || !measure)
    return done(world, "No amendment matches this ballot.");
  if (constitutionalPosition(world, measure.id).phase !== "ratification")
    return done(world, "The amendment is no longer before the voters.");
  const delta = measure.ruleDelta;
  const direction: ReformDirection =
    delta.kind === "rule-field" &&
    delta.applicability?.appliesTo === "immediately"
      ? "extend"
      : "restore";
  const yesPermille = drawPermille(
    new SeededRng(world.seed).fork(`${measure.stableKey}:ballot`),
    CONSTITUTIONAL_REFORM_PROFILE.ballotYesPermille[direction],
  );
  // Shares of 10,000, not ballots: turnout is not modelled.
  const yes = yesPermille * 10;
  // Two measures changing the same rule cannot both pass at one election
  // until reconciliation is modelled; if another already has, this one goes
  // to the next general election instead of stopping the clock.
  const conflicting = (world.history.constitutionalMeasures ?? []).some(
    (other) =>
      other.id !== measure.id &&
      other.jurisdictionKey === measure.jurisdictionKey &&
      other.ruleDelta.kind === "rule-field" &&
      delta.kind === "rule-field" &&
      other.ruleDelta.field === delta.field &&
      other.ruleDelta.officeKey === delta.officeKey &&
      constitutionalActions(world, other.id).some(
        (action) =>
          action.detail.kind === "statewide-vote" &&
          action.detail.electionAt === world.currentDate &&
          action.detail.yes > action.detail.no,
      ),
  );
  if (conflicting && yes > 5_000) {
    const nextDay = nextGeneralElectionDay(addDays(world.currentDate, 1));
    return done(
      scheduleFutureDueItem(world, {
        stableKey: `${measure.stableKey}:ballot:${nextDay.slice(0, 4)}`,
        dueAt: nextDay,
        transitionKey: CONSTITUTIONAL_REFORM_BALLOT,
        entityIds: due.entityIds,
        jurisdictionId: due.jurisdictionId,
        provenance: { kind: "authored", note: PLACEHOLDER_NOTE },
      }),
      `${measure.designation} moved to the next general election; another measure on the same rule passed today.`,
    );
  }
  const next = recordStatewideRatification(world, measure.id, {
    kind: "statewide-vote",
    yes,
    no: 10_000 - yes,
    electionAt: world.currentDate,
    statementFiledAt: world.currentDate,
  });
  return done(
    next,
    yes > 5_000
      ? `The voters ratified ${measure.designation}.`
      : `The voters rejected ${measure.designation}.`,
  );
}

export const CONSTITUTIONAL_REFORM_HANDLERS = [
  [CONSTITUTIONAL_REFORM_REVIEW, constitutionalReformReviewHandler],
  [CONSTITUTIONAL_REFORM_BALLOT, constitutionalReformBallotHandler],
] as const;
