import {
  ARTICLE_V_STATE_KEYS,
  constitutionalMemberBody,
  constitutionalActions,
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
import {
  CONSTITUTIONAL_BAR,
  congressVoters,
  constitutionalMemberConsiderations,
  type Voter,
} from "../governing/article-v";
import {
  decideChamberVote,
  publicPartyOf,
  stateConstitutionalRoster,
} from "../governing/chamber-votes";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { stateJurisdictionForKey } from "../life-places";
import { buildLegislativeVoteRecord, tallyDispositions } from "../legislation";
import { resolveRequiredVotes } from "../legislature-rules";
import {
  stateRatificationChambers,
  stateRatificationRule,
} from "../constitutional-ratification-rules";
import type { ConstitutionalRatificationChamberVote } from "../constitutional-types";
import { seatedCongressChamber } from "../governing/congress-chambers";
import { ensureOfficeholderPrinciples } from "../governing/officeholder-principles";
import { relationshipConsiderations } from "../governing/standing-considerations";
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
 * (`article-v.ts`). Congress records its proposal before voting; a rejected
 * proposal remains on the record. Each state legislature ratifies by the same
 * count among the people who speak for it (its seated members, or ESTIMATED, its members of
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
  // Save the proposal before members decide on it. A rejection is an action,
  // recorded by the same constitutional rollcall writer as an approval.
  return done(
    proposeAndVote(next, year, cause),
    `Congress considered an amendment on the President's term limit because ${cause.reason}.`,
  );
}

/**
 * Save a proposal in the returned world before deciding each real chamber.
 * The input world remains unchanged; members' principles must already exist.
 */
export function termLimitCount(
  world: World,
  year: number,
  cause: FederalReformCause,
): {
  readonly world: World;
  readonly measureId: EntityId;
  readonly houses: readonly {
    readonly bodyKey: "house" | "senate";
    readonly rows: readonly {
      readonly voter: Voter;
      readonly ballot: LegislativeVoteDisposition["disposition"];
      readonly reason: string;
    }[];
  }[];
  readonly carries: boolean;
} {
  const next = proposeTermLimitMeasure(world, year, cause);
  const measure = next.history.constitutionalMeasures!.find(
    (row) => row.stableKey === measureKey(year),
  )!;
  const houses = (["house", "senate"] as const).map((bodyKey) => {
    const voters = congressVoters(next, bodyKey);
    const dispositions = decideChamberVote(next, {
      kind: "constitutional",
      stableKey: `${measure.stableKey}:${bodyKey}`,
      constitutionalMeasureId: measure.id,
      bodyKey,
      purpose: "proposal",
      members: (
        seatedCongressChamber(next, bodyKey)?.body.members ?? []
      ).filter((member) => member.personId !== null),
      playerPersonId:
        next.control.kind === "person" ? next.control.personId : null,
      considerationsByMember: new Map(
        voters.map((voter) => [
          voter.memberKey,
          termLimitConsiderations(next, voter, cause),
        ]),
      ),
    });
    return {
      bodyKey,
      rows: dispositions.map((row) => ({
        voter: { memberKey: row.memberKey, personId: row.personId! },
        ballot: row.disposition,
        reason: row.reason ?? "member:no-reason",
      })),
    };
  });
  const carries = houses.every(({ rows }) => {
    const cast = rows.filter((row) => row.ballot !== "absent");
    return (
      cast.length > 0 &&
      cast.filter((row) => row.ballot === "yea").length * 3 >= cast.length * 2
    );
  });
  return { world: next, measureId: measure.id, houses, carries };
}

/**
 * Decide actual state members on a saved Article V proposal. This supplies
 * member ballots, not state approval: ratification thresholds and chamber
 * aggregation require their own sourced binding, not the proposal rule.
 * Missing state institutions or a current subject holder stay unsupported.
 */
export function decideArticleVStateMemberVotes(
  world: World,
  measureId: EntityId,
  jurisdictionId: EntityId,
): {
  readonly world: World;
  readonly chambers: readonly {
    readonly bodyKey: string;
    readonly eligibleMembers: number;
    readonly sourceRecordIds: readonly EntityId[];
    readonly dispositions: readonly LegislativeVoteDisposition[];
  }[];
} | null {
  const measure = world.history.constitutionalMeasures?.find(
    (row) => row.id === measureId,
  );
  const pack = legislativePackForJurisdiction(jurisdictionId);
  const holder = currentPresidentOf(world)?.personId;
  const delta = measure?.ruleDelta;
  if (
    !measure ||
    measure.processKind !== "federal-amendment" ||
    measure.ratificationMode !== "state-legislatures" ||
    constitutionalPosition(world, measureId).phase !== "ratification" ||
    !pack ||
    !ARTICLE_V_STATE_KEYS.includes(pack.jurisdictionKey) ||
    (delta?.kind !== "policy-provision" &&
      (!holder ||
        delta?.kind !== "rule-field" ||
        delta.officeKey !== PRESIDENT_OFFICE_KEY ||
        delta.field !== "executive.term.limit"))
  )
    return null;
  const rosters = pack.chambers.map((body) => ({
    bodyKey: body.chamberKey,
    roster: stateConstitutionalRoster(
      world,
      jurisdictionId,
      body.chamberKey,
      "ratification",
    ),
  }));
  if (!rosters.length || rosters.some(({ roster }) => roster === null))
    return null;
  const next = ensureOfficeholderPrinciples(
    world,
    rosters.flatMap(({ roster }) =>
      roster!.seated.body.members.flatMap((member) =>
        member.personId ? [member.personId] : [],
      ),
    ),
  );
  const cause =
    delta?.kind === "rule-field" && holder
      ? {
          direction:
            delta.applicability?.appliesTo === "immediately"
              ? ("extend" as const)
              : ("restore" as const),
          holderPersonId: holder,
        }
      : null;
  return {
    world: next,
    chambers: rosters.map(({ bodyKey, roster }) => {
      const members = roster!.seated.body.members;
      return {
        bodyKey,
        eligibleMembers: members.filter((member) => member.personId !== null)
          .length,
        sourceRecordIds: [measure.id, ...roster!.sourceRecordIds],
        dispositions: decideChamberVote(next, {
          kind: "constitutional",
          stableKey: `${measure.stableKey}:${jurisdictionId}:${bodyKey}:ratification`,
          constitutionalMeasureId: measure.id,
          ratificationJurisdictionId: jurisdictionId,
          bodyKey,
          purpose: "ratification",
          members,
          playerPersonId:
            next.control.kind === "person" ? next.control.personId : null,
          considerationsByMember: new Map(
            members.flatMap((member) =>
              member.personId
                ? [
                    [
                      member.memberKey,
                      delta?.kind === "policy-provision"
                        ? constitutionalMemberConsiderations(
                            next,
                            member.personId,
                            delta.propositionId,
                            delta.stance === "adopt" ? "yes" : "no",
                          )
                        : termLimitConsiderations(
                            next,
                            {
                              memberKey: member.memberKey,
                              personId: member.personId,
                            },
                            cause!,
                          ),
                    ] as const,
                  ]
                : [],
            ),
          ),
        }),
      };
    }),
  };
}

/** Record the state's actual separate chambers only when all their legal
 * requirements are admitted. A missing rule/body/quorum leaves it pending. */
export function recordArticleVStateMemberVote(
  world: World,
  measureId: EntityId,
  stateKey: string,
): World | null {
  if (
    constitutionalActions(world, measureId).some(
      (row) =>
        row.detail.kind === "state-ratification" &&
        row.detail.stateKey === stateKey,
    )
  )
    return world;
  const bodies = stateRatificationChambers(stateKey);
  const jurisdiction = stateJurisdictionForKey(stateKey);
  if (!bodies || !jurisdiction) return null;
  const prepared = decideArticleVStateMemberVotes(
    world,
    measureId,
    jurisdiction.id,
  );
  if (!prepared || prepared.chambers.length !== bodies.length) return null;
  const votes: ConstitutionalRatificationChamberVote[] = [];
  for (const chamber of prepared.chambers) {
    const rule = stateRatificationRule(stateKey, chamber.bodyKey);
    const organization = prepared.world.history.organizations.find((row) =>
      chamber.sourceRecordIds.includes(row.id),
    );
    const tally = tallyDispositions(chamber.dispositions);
    const present = tally.yea + tally.nay + tally.presentNotVoting;
    // Vacancy semantics beyond the complete actual seating remain unsupported
    // rather than silently borrowing the authorized seat count as a denominator.
    if (
      !bodies.includes(chamber.bodyKey) ||
      !rule ||
      !organization ||
      chamber.dispositions.some((row) => row.personId === null) ||
      present <
        resolveRequiredVotes(rule.quorum, chamber.eligibleMembers).requiredVotes
    )
      return null;
    votes.push({
      bodyKey: chamber.bodyKey,
      organizationId: organization.id,
      sourceRecordIds: chamber.sourceRecordIds,
      vote: buildLegislativeVoteRecord(prepared.world, {
        stableKey: `${measureId}:${stateKey}:${chamber.bodyKey}:ratification`,
        measureId,
        forum: { kind: "chamber", chamberKey: chamber.bodyKey },
        purpose: "constitutional-ratification",
        threshold: rule.threshold,
        eligibleMembers: chamber.eligibleMembers,
        presentMembers: present,
        dispositions: chamber.dispositions,
        provenance: {
          method: "member-decisions",
          note: "Actual state members use the shared chamber vote and sourced ratification rule.",
          sourceEntityIds: [...chamber.sourceRecordIds],
        },
      }),
    });
  }
  return recordArticleVRatification(prepared.world, measureId, {
    kind: "state-ratification",
    stateKey,
    body: "state-legislature",
    approved: votes.every((row) => row.vote.outcome === "passed"),
    authenticationKey: `${measureId}:${stateKey}:${prepared.world.currentDate}`,
    jurisdictionId: jurisdiction.id,
    chamberVotes: votes,
  });
}

/** Whose term limit a member is voting on, for the reasons they write. */
export interface TermLimitHolder {
  /** "President" or "governor", as a sentence names them after "the". */
  readonly title: string;
  readonly decisionType: string;
  /** Stable-key word for the holder's own reasons: "president", "governor". */
  readonly keyWord: string;
}

const PRESIDENT: TermLimitHolder = {
  title: "President",
  decisionType: "governing.presidential-term-limit-vote",
  keyWord: "president",
};

/** Existing term-limit reasons, also used by actual state chamber rollcalls. */
export function termLimitConsiderations(
  world: World,
  voter: Voter,
  cause: {
    readonly direction: "extend" | "restore";
    readonly holderPersonId: EntityId;
  },
  holder: TermLimitHolder = PRESIDENT,
  extra: readonly DecisionConsideration[] = [],
): readonly DecisionConsideration[] {
  // Extending the limit keeps the officeholder eligible; restoring it bars them.
  const forPresident = cause.direction === "extend" ? "vote-yea" : "vote-nay";
  const againstPresident =
    forPresident === "vote-yea" ? "vote-nay" : "vote-yea";
  const party = publicPartyOf(world, voter.personId);
  const presidentParty = publicPartyOf(world, cause.holderPersonId);
  const considerations: DecisionConsideration[] = [
    CONSTITUTIONAL_BAR,
    ...extra,
  ];
  if (party && presidentParty)
    considerations.push({
      stableKey:
        party === presidentParty
          ? `member:${holder.keyWord}s-party`
          : "member:other-party",
      optionKey: party === presidentParty ? forPresident : againstPresident,
      sourceType: `context:${holder.keyWord}s-party`,
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation:
        party === presidentParty
          ? `The ${holder.title} is of the member's own party.`
          : `The ${holder.title} is of the other party.`,
      sourceRefs: [],
    });
  for (const reason of relationshipConsiderations(
    world,
    voter.personId,
    cause.holderPersonId,
    {
      optionKey: forPresident,
      fond: {
        stableKey: `member:${holder.keyWord}-relationship`,
        explanation: `The member thinks well of the ${holder.title}.`,
      },
      strain: {
        stableKey: `member:${holder.keyWord}-strain`,
        explanation: `The member has a strained history with the ${holder.title}.`,
      },
    },
  ))
    considerations.push(
      reason.direction === "opposes"
        ? { ...reason, optionKey: againstPresident, direction: "supports" }
        : reason,
    );
  return considerations;
}

/** Proposes the amendment, records both houses, and dates each state's action. */
function proposeTermLimitMeasure(
  world: World,
  year: number,
  cause: FederalReformCause,
): World {
  const key = measureKey(year);
  const existing = world.history.constitutionalMeasures?.find(
    (row) => row.stableKey === key,
  );
  if (existing) return world;
  return proposeConstitutionalMeasure(world, {
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
}

/** Save the actual proposal, decide through the shared engine, and record its votes. */
export function proposeAndVote(
  world: World,
  year: number,
  cause: FederalReformCause,
): World {
  const existing = world.history.constitutionalMeasures?.find(
    (row) => row.stableKey === measureKey(year),
  );
  if (
    existing &&
    constitutionalPosition(world, existing.id).phase !== "consideration"
  )
    return world;
  const count = termLimitCount(world, year, cause);
  let next = count.world;
  const measureId = count.measureId;
  const key = measureKey(year);
  // A repeated callback cannot append another rollcall or schedule another action.
  if (constitutionalPosition(next, measureId).phase !== "consideration")
    return next;
  for (const house of count.houses) {
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
  const next = recordArticleVStateMemberVote(world, measure.id, stateKey);
  if (!next)
    return done(
      world,
      "The state action remains pending: its actual chambers, quorum or sourced ratification admission are unavailable.",
    );
  const approved = constitutionalPosition(
    next,
    measure.id,
  ).ratifiedStates.includes(stateKey);
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

export function federalReformHandlers() {
  return [
    [FEDERAL_REFORM_REVIEW, federalReformReviewHandler],
    [FEDERAL_REFORM_STATE_ACTION, federalReformStateActionHandler],
  ] as const;
}
