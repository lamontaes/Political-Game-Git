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
import { evaluateDecision } from "../decisions";
import {
  CONSTITUTIONAL_BAR,
  congressVoters,
  stateVoice,
  type Voter,
} from "../governing/article-v";
import { publicPartyOf } from "../governing/chamber-votes";
import { ensureOfficeholderPrinciples } from "../governing/officeholder-principles";
import { relationshipConsiderations } from "../governing/standing-considerations";
import { currentHistoricalCutoff } from "../queries";
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
  DecisionConsideration,
  EntityId,
  FutureDueItem,
  LegislativeVoteDisposition,
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
 * Members decide (CTO ruling, September 29, 2026: no dice). Each member of
 * Congress votes through the shared decision evaluator: the President's own
 * party is a reason to let them serve on and the other party a reason not
 * to, a recorded relationship with the President counts at its strength, and
 * changing the Constitution is a higher bar than passing a law
 * (`article-v.ts`). Congress proposes when two-thirds of each house would
 * vote yes. Each state legislature ratifies by the same count among the
 * people who speak for it (its seated members, or ESTIMATED, its members of
 * Congress). The cause and the weights are hand-set pending research
 * question `federal-amendment-causes-and-pace`.
 *
 * NOT MODELED, with the blanket rule applied meanwhile:
 * - Any subject but the presidential term limit. It is the one federal rule
 *   the game reads through the rule layer; see `FEDERAL_AMENDABLE_OFFICES`.
 * - An Article V convention called by two-thirds of the states, and
 *   ratification by state conventions. Congress proposes and state
 *   legislatures ratify.
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
  /** A President who has served this many terms is a cause to restore a limit. */
  longTenureTerms: 3,
  /** The limit a restoring proposal sets. */
  restoredLimit: 2,
  /** No extension goes past this many terms. */
  highestExtendedLimit: 4,
  /**
   * A state acts this many days after the proposal, spread by the World's
   * seed from [min, max). Timing only; it decides nothing about the vote.
   */
  stateActionDays: [30, 900],
  /** Years Congress allows for ratification. */
  ratificationYears: 7,
} as const;

const PLACEHOLDER_NOTE = `${FEDERAL_REFORM_PROFILE.id}: a placeholder pending research (federal-amendment-causes-and-pace), not any Congress's record.`;

type ReformDirection = "extend" | "restore";

export interface FederalReformCause {
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
  let next = scheduleNextReview(world, world.currentDate);
  if (hasOpenReform(next))
    return done(next, "An amendment on this is already pending.");
  const cause = federalReformCause(next);
  if (!cause) return done(next, "No cause for an amendment is on the record.");
  const route = constitutionalProposalRuleForWorld(next, {
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    processKind: "federal-amendment",
  });
  if (!route.available) return done(next, route.reason);
  const house = congressVoters(next, "house");
  const senate = congressVoters(next, "senate");
  if (house.length === 0 || senate.length === 0)
    return done(next, "Congress is not seated in this world.");
  next = ensureOfficeholderPrinciples(next, [
    ...house.map((voter) => voter.personId),
    ...senate.map((voter) => voter.personId),
  ]);
  // A member files it only when two-thirds of each house would vote for it:
  // the count, not a draw, decides whether a proposal is made. The same
  // Congress with the same reasons gives the same answer every year.
  const { houses, carries } = termLimitCount(next, year, cause);
  if (!carries)
    return done(
      next,
      `Two-thirds of each house would not propose an amendment on the President's term limit, though ${cause.reason}.`,
    );
  return done(
    proposeAndVote(next, year, cause, houses),
    `Congress considered an amendment on the President's term limit because ${cause.reason}.`,
  );
}

/**
 * How each house would vote on the cause's amendment, member by member, and
 * whether two-thirds of each would vote yes. Pure; members' principles must
 * already be drawn.
 */
export function termLimitCount(
  world: World,
  year: number,
  cause: FederalReformCause,
): {
  readonly houses: readonly {
    readonly bodyKey: "house" | "senate";
    readonly rows: readonly {
      readonly voter: Voter;
      readonly ballot: "yea" | "nay" | "absent";
      readonly reason: string;
    }[];
  }[];
  readonly carries: boolean;
} {
  const key = measureKey(year);
  const ballots = (voters: readonly Voter[]) =>
    voters.map((voter) => ({
      voter,
      ...termLimitBallot(world, `${key}:${voter.memberKey}`, voter, cause),
    }));
  const houses = [
    { bodyKey: "house", rows: ballots(congressVoters(world, "house")) },
    { bodyKey: "senate", rows: ballots(congressVoters(world, "senate")) },
  ] as const;
  const carries = houses.every(({ rows }) => {
    const cast = rows.filter((row) => row.ballot !== "absent");
    return (
      cast.length > 0 &&
      cast.filter((row) => row.ballot === "yea").length * 3 >= cast.length * 2
    );
  });
  return { houses, carries };
}

/**
 * How a member votes on the President's term limit. HAND-SET weights on the
 * shared decision scale: the President's party "strong", a relationship at
 * its recorded strength, the constitutional bar "moderate".
 */
function termLimitBallot(
  world: World,
  stableKey: string,
  voter: Voter,
  cause: FederalReformCause,
): { readonly ballot: "yea" | "nay" | "absent"; readonly reason: string } {
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  if (voter.personId === player)
    return { ballot: "absent", reason: "member:player-not-asked" };
  // Extending the limit keeps the President eligible; restoring it bars them.
  const forPresident = cause.direction === "extend" ? "vote-yea" : "vote-nay";
  const againstPresident =
    forPresident === "vote-yea" ? "vote-nay" : "vote-yea";
  const party = publicPartyOf(world, voter.personId);
  const presidentParty = publicPartyOf(world, cause.holderPersonId);
  const considerations: DecisionConsideration[] = [CONSTITUTIONAL_BAR];
  if (party && presidentParty)
    considerations.push({
      stableKey:
        party === presidentParty
          ? "member:presidents-party"
          : "member:other-party",
      optionKey: party === presidentParty ? forPresident : againstPresident,
      sourceType: "context:presidents-party",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation:
        party === presidentParty
          ? "The President is of the member's own party."
          : "The President is of the other party.",
      sourceRefs: [],
    });
  for (const reason of relationshipConsiderations(
    world,
    voter.personId,
    cause.holderPersonId,
    {
      optionKey: forPresident,
      fond: {
        stableKey: "member:president-relationship",
        explanation: "The member thinks well of the President.",
      },
      strain: {
        stableKey: "member:president-strain",
        explanation: "The member has a strained history with the President.",
      },
    },
  ))
    considerations.push(
      reason.direction === "opposes"
        ? { ...reason, optionKey: againstPresident, direction: "supports" }
        : reason,
    );
  const evaluation = evaluateDecision(world, {
    stableKey,
    decisionType: "governing.presidential-term-limit-vote",
    actorPersonId: voter.personId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:constitutional-amendment",
      key: stableKey,
      entityId: null,
    },
    options: [
      { key: "vote-yea", label: "Vote yes", description: "Propose it." },
      { key: "vote-nay", label: "Vote no", description: "Leave it out." },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  const ballot = evaluation.selectedOptionKey === "vote-yea" ? "yea" : "nay";
  const reason =
    considerations
      .filter((c) => c.optionKey === `vote-${ballot}`)
      .sort((a, b) => weight(b) - weight(a))[0]?.stableKey ??
    "member:no-reason";
  return { ballot, reason };
}

function weight(c: DecisionConsideration): number {
  return (
    { slight: 1, moderate: 2, strong: 4, decisive: 6 }[c.importance] *
    { low: 1, medium: 2, high: 3 }[c.confidence]
  );
}

/** Proposes the amendment, records both houses, and dates each state's action. */
export function proposeAndVote(
  world: World,
  year: number,
  cause: FederalReformCause,
  houses: readonly {
    readonly bodyKey: "house" | "senate";
    readonly rows: readonly {
      readonly voter: Voter;
      readonly ballot: "yea" | "nay" | "absent";
      readonly reason: string;
    }[];
  }[],
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
  for (const house of houses) {
    const dispositions: LegislativeVoteDisposition[] = house.rows.map(
      (row) => ({
        memberKey: row.voter.memberKey,
        personId: row.voter.personId,
        disposition: row.ballot,
        ...(row.ballot === "absent" ? {} : { reason: row.reason }),
      }),
    );
    next = recordConstitutionalProposalVote(
      next,
      measureId,
      house.bodyKey,
      dispositions,
      house.rows.length,
      {
        method: "member-decisions",
        note: "Each member voted by their party, their relationship with the President and the bar of amending the Constitution.",
        sourceEntityIds: [],
      },
    );
    if (constitutionalPosition(next, measureId).phase === "rejected")
      return next;
  }
  const [low, high] = FEDERAL_REFORM_PROFILE.stateActionDays;
  const spread = new SeededRng(next.seed).fork(key);
  for (const stateKey of ARTICLE_V_STATE_KEYS) {
    const days = spread.fork(`state:${stateKey}:day`).integer(low, high);
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
  // The legislature ratifies when a majority of those who speak for it
  // would vote yes, each for their own reasons, as members of Congress did.
  const holder = currentPresidentOf(world)?.personId ?? null;
  const voice = stateVoice(world, stateKey.slice(3));
  let next = ensureOfficeholderPrinciples(world, voice.personIds);
  const cause: FederalReformCause | null =
    holder && delta.kind === "rule-field"
      ? {
          direction,
          holderPersonId: holder,
          value: delta.value as TermLimitRule,
          reason: "",
        }
      : null;
  const cast = cause
    ? voice.personIds
        .map(
          (personId) =>
            termLimitBallot(
              next,
              `${measure.stableKey}:${stateKey}:${personId}`,
              { memberKey: personId, personId },
              cause,
            ).ballot,
        )
        .filter((ballot) => ballot !== "absent")
    : [];
  const approved =
    cast.length > 0 &&
    cast.filter((ballot) => ballot === "yea").length * 2 > cast.length;
  next = recordArticleVRatification(next, measure.id, {
    kind: "state-ratification",
    stateKey,
    body: "state-legislature",
    approved,
    authenticationKey: `${measure.stableKey}:${stateKey}:${next.currentDate}`,
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
