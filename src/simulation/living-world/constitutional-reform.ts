import {
  constitutionalActions,
  constitutionalPosition,
  constitutionalProposalRuleForWorld,
  proposeConstitutionalMeasure,
  recordConstitutionalProposalVote,
  recordStatewideRatification,
  sameRuleChanged,
  stateAmendmentProfile,
} from "../constitutional-process";
import type {
  ConstitutionalMeasureRecord,
  ConstitutionalRuleDelta,
} from "../constitutional-types";
import { addDays, makeIsoDate } from "../dates";
import {
  describeRuleChangeValue,
  type TermLimitRule,
} from "../enacted-rule-changes";
import {
  constitutionalPolicyProvisions,
  stateDecidedPropositions,
} from "../policy-provisions";
import { scheduleFutureDueItem } from "../future-transitions";
import { resolveRequiredVotes } from "../legislature-rules";
import { isEligibleVoterIn } from "../issue-record";
import {
  constitutionalMemberConsiderations,
  memberBallot,
  stateVoice,
  type Voter,
} from "../governing/article-v";
import {
  decideChamberVote,
  stateConstitutionalBody,
  stateConstitutionalRoster,
} from "../governing/chamber-votes";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "../governing/officeholder-principles";
import {
  termLimitBallot,
  termLimitConsiderations,
  type TermLimitHolder,
} from "./federal-reform";
import { writeWithWorldIntegrityOnce } from "../world";
import type {
  DecisionConsideration,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  PrivateBeliefRecord,
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
 * proposal is considered only when a cause is on the record, and made only
 * when the legislature's members, each deciding for their own reasons, would
 * carry it in every chamber under the state's amendment threshold (CTO
 * ruling, September 29, 2026, 1:54 a.m.: no dice). A measure that clears
 * every chamber goes to the voters; a ratified measure changes the limit that
 * the next governor election reads.
 *
 * WHO DECIDES. Each recorded proposal reads the actual saved state chambers,
 * seat tenures and institutions. Missing rosters remain unsupported; Congress
 * cannot stand in. Each actual member decides through decideChamberVote. The
 * older filing preflight still scales the state's member totals before filing;
 * it does not supply the recorded chamber rollcall.
 *
 * WHY THEY DECIDE. On the governor's term limit, a member weighs the
 * governor's party, their relationship with the governor and the bar a
 * constitutional change sets (`termLimitConsiderations`). On a policy, their own
 * principles against the same bar (`memberBallot`). A question the voters
 * turned down at the last general election is a strong reason to leave it.
 *
 * PLACEHOLDERS, NOT RESEARCH. The owner has ruled out invented depth, so every
 * cause, rate and margin below is a marked stand-in for the answer to
 * `governor-term-limit-amendment-causes` (and, for how often,
 * `constitutional-amendment-frequency`), both filed with the research lane.
 * When the answers come back, they replace `CONSTITUTIONAL_REFORM_PROFILE`
 * and `reformCause`; nothing else here should need to change.
 *
 * POLICY AMENDMENTS. The same review also considers writing a policy into
 * the state's constitution, or taking one out (`policy-provisions.ts`,
 * Prohibition's kind). The cause is the members' own principles: of the
 * policies most of them lean toward changing, the one the most lean toward
 * is counted, and proposed if it would carry. The record says "The
 * legislators' own principles" (`reformMeasureCause`). A policy already in
 * force is proposed for repeal, one not in force for adoption. How towns
 * recall their officials is no longer proposed by the world: no principle
 * bears on it, so nothing gives a member a reason.
 *
 * NOT MODELED, with the blanket rule applied meanwhile:
 * - Other subjects of amendment (legislature size, terms, qualifications).
 *   A drawn value for these would be invented; they wait on
 *   `constitutional-amendment-causes-by-subject`.
 * - Outside causes for a policy amendment (a scandal, a court ruling, a
 *   campaign), pending `constitutional-policy-amendments`.
 * - Initiatives, conventions and commissions. Every proposal is a legislative
 *   referral.
 * - Each member's own chamber. Chambers divide as the whole legislature
 *   does, and members are recorded by seat with no person named.
 * - The wider electorate. The statewide yes share is counted from the
 *   recorded views of the eligible voters the World holds
 *   (`recordedBallotTally`); with none on record the ballot is unsupported
 *   and nothing is decided. A term-limit amendment answers no catalog
 *   question, so its ballot stays unsupported until such views exist.
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
  /** A governor who has served this many terms is a cause to restore a limit. */
  longTenureTerms: 3,
  /** The limit a restoring proposal sets. */
  restoredLimit: 2,
  /** No extension goes past this many terms. */
  highestExtendedLimit: 4,
  /** The ballot is at least this many days after the last chamber vote. */
  ballotLeadDays: 90,
} as const;

const PLACEHOLDER_NOTE = `${CONSTITUTIONAL_REFORM_PROFILE.id}: a placeholder pending research (governor-term-limit-amendment-causes), not any state's record.`;

type ReformDirection = "extend" | "restore" | "background";

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

/** A policy amendment the world proposed by a draw, before this reading. */
const BACKGROUND_SUFFIX = ":background";
/** A policy amendment the legislators' own principles carried. */
const PRINCIPLES_SUFFIX = ":principles";

function principlesMeasureKey(stateUsps: string, year: number): string {
  return `${measureKey(stateUsps, year)}${PRINCIPLES_SUFFIX}`;
}

function isPolicyReform(stableKey: string): boolean {
  return (
    stableKey.endsWith(BACKGROUND_SUFFIX) ||
    stableKey.endsWith(PRINCIPLES_SUFFIX)
  );
}

/**
 * Why the world proposed this amendment, in plain words, for a measure this
 * review proposed; null for anyone else's measure.
 */
export function reformMeasureCause(
  measure: Pick<ConstitutionalMeasureRecord, "stableKey">,
): string | null {
  if (!measure.stableKey.startsWith(`${CONSTITUTIONAL_REFORM_VERSION}:`))
    return null;
  return measure.stableKey.endsWith(PRINCIPLES_SUFFIX)
    ? "The legislators' own principles"
    : measure.stableKey.endsWith(BACKGROUND_SUFFIX)
      ? "No recorded cause"
      : "The sitting governor's tenure";
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
 * Whether any measure changing the same rule in this state, the player's
 * included, is still before the legislature or the voters.
 */
function hasOpenMeasureOn(
  world: World,
  stateUsps: string,
  delta: ConstitutionalRuleDelta,
): boolean {
  return (world.history.constitutionalMeasures ?? []).some(
    (measure) =>
      measure.jurisdictionKey === `US-${stateUsps}` &&
      sameRuleChanged(measure.ruleDelta, delta) &&
      ["consideration", "ratification"].includes(
        constitutionalPosition(world, measure.id).phase,
      ),
  );
}

function hasOpenReform(world: World, stateUsps: string): boolean {
  const officeKey = stateExecutiveOffice(stateUsps)?.officeKey;
  if (!officeKey) return false;
  return hasOpenMeasureOn(world, stateUsps, {
    kind: "rule-field",
    officeKey,
    field: "executive.term.limit",
    value: null,
  });
}

/** What a proposed amendment says and changes. */
interface AmendmentSpec {
  readonly key: string;
  readonly shortTitle: string;
  readonly text: string;
  readonly ruleDelta: ConstitutionalRuleDelta;
}

/** One member's vote on a proposed amendment, with its weightiest reason. */
interface MemberVote {
  readonly personId: EntityId;
  readonly ballot: "yea" | "nay" | "absent";
  readonly reason: string;
}

/**
 * How the state's legislature would divide on an amendment, chamber by
 * chamber, and whether it carries every chamber under the state's own
 * proposal threshold. Each chamber divides as the members who speak for the
 * legislature did, scaled to its seats.
 */
interface LegislatureCount {
  readonly estimated: boolean;
  readonly members: readonly MemberVote[];
  readonly bodies: readonly {
    readonly bodyKey: string;
    readonly seats: number;
    readonly yea: number;
  }[];
  readonly carries: boolean;
}

function countLegislature(
  stateUsps: string,
  estimated: boolean,
  members: readonly MemberVote[],
): LegislatureCount {
  const profile = stateAmendmentProfile(`US-${stateUsps}`)!;
  const cast = members.filter((member) => member.ballot !== "absent");
  const yes = cast.filter((member) => member.ballot === "yea").length;
  const bodies = profile.bodies.map((body) => ({
    bodyKey: body.bodyKey,
    seats: body.members,
    yea: cast.length ? Math.round((body.members * yes) / cast.length) : 0,
  }));
  return {
    estimated,
    members,
    bodies,
    carries:
      cast.length > 0 &&
      bodies.every(
        (body) =>
          body.yea >=
          resolveRequiredVotes(profile.base, body.seats).requiredVotes,
      ),
  };
}

/** The members who speak for the legislature, principles drawn. */
function legislatureVoice(
  world: World,
  stateUsps: string,
): {
  readonly world: World;
  readonly voters: readonly Voter[];
  readonly estimated: boolean;
} {
  const voice = stateVoice(world, stateUsps);
  return {
    world: ensureOfficeholderPrinciples(world, voice.personIds),
    voters: voice.personIds.map((personId) => ({
      memberKey: personId,
      personId,
    })),
    estimated: voice.estimated,
  };
}

/**
 * Whether the state's voters turned down an amendment on this rule at the
 * last general election before today: a strong reason for a member not to
 * send it back to them at once.
 */
function votersJustRejected(
  world: World,
  stateUsps: string,
  delta: ConstitutionalRuleDelta,
): boolean {
  const year = Number(world.currentDate.slice(0, 4));
  const lastElection = [year, year - 1]
    .map((y) => nextGeneralElectionDay(makeIsoDate(`${y}-01-01`)))
    .find((day) => day < world.currentDate);
  if (!lastElection) return false;
  return (world.history.constitutionalMeasures ?? []).some(
    (measure) =>
      measure.jurisdictionKey === `US-${stateUsps}` &&
      sameRuleChanged(measure.ruleDelta, delta) &&
      constitutionalActions(world, measure.id).some(
        (action) =>
          action.detail.kind === "statewide-vote" &&
          action.detail.electionAt === lastElection &&
          action.detail.yes <= action.detail.no,
      ),
  );
}

/** The voters' recent answer, as a reason a member weighs. */
function rejectionReasons(rejected: boolean): DecisionConsideration[] {
  return rejected
    ? [
        {
          stableKey: "member:voters-just-rejected",
          optionKey: "vote-nay",
          sourceType: "context:statewide-vote",
          direction: "supports",
          importance: "strong",
          confidence: "high",
          explanation:
            "The state's voters turned this down at the last general election.",
          sourceRefs: [],
        },
      ]
    : [];
}

const GOVERNOR: TermLimitHolder = {
  title: "governor",
  decisionType: "governing.governor-term-limit-vote",
  keyWord: "governor",
};

/**
 * The policy amendment the members' own principles would carry this year,
 * if any: of the state-decided policies most of them lean toward changing,
 * the one the most lean toward, counted member by member.
 */
function principlesAmendment(
  world: World,
  stateUsps: string,
  year: number,
  voters: readonly Voter[],
  estimated: boolean,
): { readonly spec: AmendmentSpec; readonly count: LegislatureCount } | null {
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  const counted = voters.filter((voter) => voter.personId !== player);
  if (counted.length === 0) return null;
  const inForce = constitutionalPolicyProvisions(world, stateUsps);
  let best: {
    readonly propositionId: EntityId;
    readonly answer: "yes" | "no";
    readonly leaning: number;
  } | null = null;
  for (const proposition of stateDecidedPropositions(world)) {
    const answer =
      inForce.find((row) => row.propositionId === proposition.id)?.stance ===
      "adopt"
        ? "no"
        : "yes";
    const leaning = counted.filter((voter) => {
      const score = principledLeaning(
        world,
        voter.personId,
        proposition.id,
      ).score;
      return answer === "yes" ? score > 0 : score < 0;
    }).length;
    if (leaning * 2 <= counted.length) continue;
    if (!best || leaning > best.leaning)
      best = { propositionId: proposition.id, answer, leaning };
  }
  if (!best) return null;
  const proposition = world.policyCatalog.propositions[best.propositionId]!;
  const stateName =
    world.jurisdictions[chiefExecutiveJurisdictionId(stateUsps)!]?.name ??
    stateUsps;
  const stance = best.answer === "yes" ? "adopt" : "repeal";
  const spec: AmendmentSpec = {
    key: principlesMeasureKey(stateUsps, year),
    shortTitle: proposition.name,
    text:
      stance === "adopt"
        ? `"${proposition.name}" becomes part of the Constitution of ${stateName}.`
        : `The provision "${proposition.name}" is removed from the Constitution of ${stateName}.`,
    ruleDelta: {
      kind: "policy-provision",
      propositionId: proposition.id,
      stance,
    },
  };
  const rejected = votersJustRejected(world, stateUsps, spec.ruleDelta);
  const members = voters.map((voter): MemberVote => {
    if (voter.personId === player)
      return {
        personId: voter.personId,
        ballot: "absent",
        reason: "member:player-not-asked",
      };
    return {
      personId: voter.personId,
      ...memberBallot(
        world,
        `${spec.key}:${voter.memberKey}`,
        voter.personId,
        proposition.id,
        best.answer,
        rejectionReasons(rejected),
      ),
    };
  });
  return { spec, count: countLegislature(stateUsps, estimated, members) };
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
  // A route this World cannot use today (California's sourced process before
  // its observation date) is not attempted: a refusal inside a handler would
  // stop the clock.
  const routeOpen = () =>
    constitutionalProposalRuleForWorld(next, {
      jurisdictionId: chiefExecutiveJurisdictionId(stateUsps)!,
      processKind: "state-amendment",
    });
  // The legislators' principles are drawn once, and kept whatever the
  // review finds: a review that proposes nothing still leaves them on the
  // record, so next year's review reads them instead of drawing again.
  const voiced = legislatureVoice(next, stateUsps).world;
  const termLimit = reviewTermLimit(voiced, stateUsps, year, routeOpen);
  if (typeof termLimit !== "string") return termLimit;
  const background = reviewBackground(voiced, stateUsps, year, routeOpen);
  return typeof background === "string"
    ? done(voiced, `${termLimit} ${background}`)
    : background;
}

type RouteCheck = () =>
  | { readonly available: true }
  | { readonly available: false; readonly reason: string };

/**
 * The governor's term limit: a proposal only with a cause on the record, and
 * only when the legislature's members would carry it.
 */
function reviewTermLimit(
  world: World,
  stateUsps: string,
  year: number,
  routeOpen: RouteCheck,
): FutureTransitionHandlerResult | string {
  if (hasOpenReform(world, stateUsps))
    return "An amendment on this is already pending.";
  const cause = reformCause(world, stateUsps);
  if (!cause) return "No cause for an amendment is on the record.";
  const route = routeOpen();
  if (!route.available) return route.reason;
  const office = stateExecutiveOffice(stateUsps)!;
  const stateName =
    world.jurisdictions[chiefExecutiveJurisdictionId(stateUsps)!]?.name ??
    stateUsps;
  const key = measureKey(stateUsps, year);
  const spec: AmendmentSpec = {
    key,
    shortTitle: "The governor's term limit",
    text: `The Governor of ${stateName} may serve no more than ${describeRuleChangeValue(cause.value)}.`,
    ruleDelta: {
      kind: "rule-field",
      officeKey: office.officeKey,
      field: "executive.term.limit",
      value: cause.value,
      applicability:
        cause.direction === "extend"
          ? { appliesTo: "immediately", countsPriorService: true }
          : {
              appliesTo: "terms-beginning-after",
              countsPriorService: false,
            },
    },
  };
  const voice = legislatureVoice(world, stateUsps);
  const jurisdictionId = chiefExecutiveJurisdictionId(stateUsps);
  const profile = stateAmendmentProfile(`US-${stateUsps}`);
  if (
    voice.estimated ||
    !jurisdictionId ||
    !profile ||
    profile.bodies.some(
      (body) =>
        !stateConstitutionalRoster(voice.world, jurisdictionId, body.bodyKey),
    )
  )
    return "The actual state chambers, seat tenures or institution bindings are missing; no governor term-limit rollcall can be recorded.";
  if (voice.voters.length === 0)
    return "Nobody speaks for the legislature in this world.";
  const extra = rejectionReasons(
    votersJustRejected(voice.world, stateUsps, spec.ruleDelta),
  );
  const direction = cause.direction === "restore" ? "restore" : "extend";
  const count = countLegislature(
    stateUsps,
    voice.estimated,
    voice.voters.map((voter) => ({
      personId: voter.personId,
      ...termLimitBallot(
        voice.world,
        `${key}:${voter.memberKey}`,
        voter,
        { direction, holderPersonId: cause.holderPersonId },
        GOVERNOR,
        extra,
      ),
    })),
  );
  // Filed only when it would carry: the count, not a draw, decides whether a
  // proposal is made. The same legislature gives the same answer each year.
  if (!count.carries)
    return `The legislature would not carry an amendment on the governor's term limit, though ${cause.reason}.`;
  return done(
    proposeAndVote(voice.world, stateUsps, year, spec, cause),
    `An amendment on the governor's term limit was proposed because ${cause.reason}.`,
  );
}

/** A policy amendment the members' own principles would carry. */
function reviewBackground(
  world: World,
  stateUsps: string,
  year: number,
  routeOpen: RouteCheck,
): FutureTransitionHandlerResult | string {
  const voice = legislatureVoice(world, stateUsps);
  if (voice.estimated)
    return "The actual state legislature is not seated; a congressional delegation cannot cast its constitutional votes.";
  const profile = stateAmendmentProfile(`US-${stateUsps}`);
  const jurisdictionId = chiefExecutiveJurisdictionId(stateUsps);
  if (
    !profile ||
    !jurisdictionId ||
    profile.bodies.some(
      (body) =>
        !stateConstitutionalRoster(voice.world, jurisdictionId, body.bodyKey),
    )
  )
    return "The actual state chamber, seat tenure or institution binding is missing; no constitutional vote can be recorded.";
  const found = principlesAmendment(
    voice.world,
    stateUsps,
    year,
    voice.voters,
    voice.estimated,
  );
  if (!found) return "No policy has most of the legislature behind a change.";
  const { spec, count } = found;
  if (hasOpenMeasureOn(voice.world, stateUsps, spec.ruleDelta))
    return `An amendment on ${spec.shortTitle.toLowerCase()} is already pending.`;
  if (!count.carries)
    return `The legislature would not carry an amendment on ${spec.shortTitle.toLowerCase()}.`;
  const route = routeOpen();
  if (!route.available) return route.reason;
  return done(
    proposeAndVote(voice.world, stateUsps, year, spec),
    `An amendment on ${spec.shortTitle.toLowerCase()} was proposed, from the legislators' own principles.`,
  );
}

/** Record an already saved policy proposal with its actual state members. */
export function recordStatePolicyProposalVotes(
  world: World,
  measureId: EntityId,
): World {
  const measure = world.history.constitutionalMeasures?.find(
    (row) => row.id === measureId,
  );
  if (
    !measure ||
    measure.processKind !== "state-amendment" ||
    measure.ruleDelta.kind !== "policy-provision"
  )
    throw new Error(
      "State policy ballots require an actual saved state policy proposal.",
    );
  const delta = measure.ruleDelta;
  const extra = rejectionReasons(
    votersJustRejected(world, measure.jurisdictionKey.slice(3), delta),
  );
  return recordStateProposalVotes(world, measure, (at, personId) =>
    constitutionalMemberConsiderations(
      at,
      personId,
      delta.propositionId,
      delta.stance === "adopt" ? "yes" : "no",
      extra,
    ),
  );
}

/** An actual saved governor term-limit proposal, with the caller's unchanged cause. */
export function recordStateGovernorTermLimitProposalVotes(
  world: World,
  measureId: EntityId,
  cause: ReformCause,
): World {
  const measure = world.history.constitutionalMeasures?.find(
    (row) => row.id === measureId,
  );
  const office =
    measure && stateExecutiveOffice(measure.jurisdictionKey.slice(3));
  const holder =
    office &&
    currentStateExecutiveHolders(world).find(
      (row) => row.officeKey === office.officeKey,
    );
  const delta = measure?.ruleDelta;
  if (
    !measure ||
    measure.processKind !== "state-amendment" ||
    !office ||
    !holder ||
    holder.personId !== cause.holderPersonId ||
    delta?.kind !== "rule-field" ||
    delta.officeKey !== office.officeKey ||
    delta.field !== "executive.term.limit" ||
    cause.direction === "background" ||
    typeof delta.value !== "object" ||
    delta.value === null ||
    !("maxConsecutiveTerms" in delta.value) ||
    delta.value.maxConsecutiveTerms !== cause.value.maxConsecutiveTerms ||
    !("maxLifetimeTerms" in delta.value) ||
    delta.value.maxLifetimeTerms !== cause.value.maxLifetimeTerms ||
    !("lookbackYears" in delta.value) ||
    delta.value.lookbackYears !== cause.value.lookbackYears
  )
    throw new Error(
      "Governor term-limit ballots require their actual saved state proposal, officeholder and matching cause terms.",
    );
  const extra = rejectionReasons(
    votersJustRejected(world, holder.stateUsps, delta),
  );
  const ballotCause = {
    direction: cause.direction,
    holderPersonId: cause.holderPersonId,
  };
  return recordStateProposalVotes(
    world,
    measure,
    (at, personId) =>
      termLimitConsiderations(
        at,
        { personId, memberKey: personId },
        ballotCause,
        GOVERNOR,
        extra,
      ),
    [holder.termId],
  );
}

/** Validate all actual bodies, then write each chamber through the same survivor. */
function recordStateProposalVotes(
  world: World,
  measure: ConstitutionalMeasureRecord,
  considerations: (
    world: World,
    personId: EntityId,
  ) => readonly DecisionConsideration[],
  causeRecordIds: readonly EntityId[] = [],
): World {
  const profile = stateAmendmentProfile(measure.jurisdictionKey);
  if (!profile)
    throw new Error("The state constitutional body profile is missing.");
  const bodies = profile.bodies.map((body) => ({
    body,
    ...stateConstitutionalBody(world, measure.id, body.bodyKey),
  }));
  let next = world;
  for (const { body, seated, sourceRecordIds, profileBasis } of bodies) {
    if (
      constitutionalActions(next, measure.id).some(
        (action) =>
          action.detail.kind === "proposal-vote" &&
          action.detail.bodyKey === body.bodyKey,
      )
    )
      continue;
    if (constitutionalPosition(next, measure.id).phase !== "consideration")
      return next;
    const dispositions = decideChamberVote(next, {
      kind: "constitutional",
      stableKey: measure.stableKey,
      constitutionalMeasureId: measure.id,
      bodyKey: body.bodyKey,
      purpose: "proposal",
      members: seated.body.members,
      playerPersonId:
        next.control.kind === "person" ? next.control.personId : null,
      considerationsByMember: new Map(
        seated.body.members
          .filter((member) => member.personId !== null)
          .map((member) => [
            member.memberKey,
            considerations(next, member.personId!),
          ]),
      ),
    });
    next = recordConstitutionalProposalVote(
      next,
      measure.id,
      body.bodyKey,
      dispositions,
      seated.seats,
      {
        method: "member-decisions",
        note: `Actual saved state members decided through the shared chamber vote; constitutional profile basis: ${profileBasis}. No delegation or synthetic seats were used.`,
        sourceEntityIds: [...sourceRecordIds, ...causeRecordIds],
      },
    );
  }
  return next;
}

function proposeAndVote(
  world: World,
  stateUsps: string,
  year: number,
  spec: AmendmentSpec,
  cause?: ReformCause,
): World {
  // The proposal, each chamber's vote and the ballot are checked once
  // together, against the World before the proposal.
  return writeWithWorldIntegrityOnce(world, () =>
    proposeAndVoteUnchecked(world, stateUsps, year, spec, cause),
  );
}

function proposeAndVoteUnchecked(
  world: World,
  stateUsps: string,
  year: number,
  spec: AmendmentSpec,
  cause?: ReformCause,
): World {
  const stateId = chiefExecutiveJurisdictionId(stateUsps)!;
  const stateName = world.jurisdictions[stateId]?.name ?? stateUsps;
  const key = spec.key;
  const policy = isPolicyReform(key);
  let next = proposeConstitutionalMeasure(world, {
    stableKey: key,
    jurisdictionId: stateId,
    jurisdictionKey: `US-${stateUsps}`,
    processKind: "state-amendment",
    // A second amendment in one state and year needs its own designation.
    designation: policy
      ? `Proposed Amendment (${year}): ${spec.shortTitle}`
      : `Proposed Amendment (${year})`,
    shortTitle: spec.shortTitle,
    text: spec.text,
    textVersion: "v1",
    sponsoringAuthority: `The ${stateName} Legislature`,
    sponsorPersonId: null,
    ratificationMode: "statewide-electors",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: spec.ruleDelta,
    ordinaryMeasureId: null,
  });
  const measureId = next.history.constitutionalMeasures!.at(-1)!.id;
  if (policy) {
    next = recordStatePolicyProposalVotes(next, measureId);
    if (constitutionalPosition(next, measureId).phase === "rejected")
      return next;
  } else {
    if (!cause)
      throw new Error(
        "A governor term-limit proposal requires its existing cause.",
      );
    next = recordStateGovernorTermLimitProposalVotes(next, measureId, cause);
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

/**
 * The state's voters, each by their own recorded view. A voter is a person
 * eligible to vote in the state on election day (age, alive, residence) who
 * holds a saved private belief, formed through the one belief pipeline, on
 * the question the amendment writes in or takes out: support or opposition
 * becomes a yes or a no. A voter with no view, or an undecided one, casts no
 * counted ballot. The controlled person casts their own vote, so they are not
 * counted here. Null where nobody counts: a term-limit amendment answers no
 * catalog question, so no view on it can be on record yet.
 */
export function recordedBallotTally(
  world: World,
  measure: ConstitutionalMeasureRecord,
): {
  readonly yes: number;
  readonly no: number;
  readonly beliefIds: readonly EntityId[];
} | null {
  const delta = measure.ruleDelta;
  if (delta.kind !== "policy-provision") return null;
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  const latest = new Map<EntityId, PrivateBeliefRecord>();
  for (const belief of world.history.privateBeliefs) {
    if (
      belief.propositionId !== delta.propositionId ||
      belief.personId === player ||
      belief.formedAt > world.currentDate
    )
      continue;
    const prior = latest.get(belief.personId);
    if (!prior || prior.sequence < belief.sequence)
      latest.set(belief.personId, belief);
  }
  let yes = 0;
  let no = 0;
  const beliefIds: EntityId[] = [];
  for (const [personId, belief] of [...latest].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (belief.position !== "support" && belief.position !== "oppose") continue;
    if (
      !isEligibleVoterIn(
        world,
        personId,
        measure.jurisdictionId,
        world.currentDate,
      )
    )
      continue;
    // Adopting writes the policy in; repealing takes it out.
    const favors =
      (belief.position === "support") === (delta.stance === "adopt");
    if (favors) yes += 1;
    else no += 1;
    beliefIds.push(belief.id);
  }
  return yes + no === 0 ? null : { yes, no, beliefIds };
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
  // The voters decide from their own recorded views. With none on record the
  // result is unsupported: nothing is drawn and the measure stays before the
  // voters, unratified and unrejected.
  const tally = recordedBallotTally(world, measure);
  if (!tally)
    return done(
      world,
      `Unsupported: no eligible voter holds a recorded view on ${measure.designation}, so no result is recorded.`,
    );
  // Shares of 10,000 among voters holding a view, not ballots: turnout is
  // not modeled. A tie is not a majority, so it fails.
  const yes = Math.round((tally.yes * 10_000) / (tally.yes + tally.no));
  // Two measures changing the same rule cannot both pass at one election
  // until reconciliation is modeled; if another already has, this one goes
  // to the next general election instead of stopping the clock.
  const conflicting = (world.history.constitutionalMeasures ?? []).some(
    (other) =>
      other.id !== measure.id &&
      other.jurisdictionKey === measure.jurisdictionKey &&
      sameRuleChanged(other.ruleDelta, delta) &&
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
