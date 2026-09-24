import { candidacyEligibility } from "../candidacy";
import type { CandidacyBlock } from "../candidacy";
import { makeIsoDate, spokenDate } from "../dates";
import {
  electionContestById,
  electionContestResult,
} from "../election-contests";
import {
  activeElectedExecutiveTermEvidence,
  electedExecutiveTermForRelationship,
  recordedExecutiveQualification,
} from "../executive-work-context";
import {
  planElectedExecutiveOfficeTerm,
  recordElectedExecutiveQualification,
} from "../executive-work-entry";
import { chiefExecutiveJurisdiction } from "./government-jurisdiction";
import { scheduleGoverningTransition } from "../governing/state-governing";
import {
  LATE_TERM_ENTRY,
  lateTermEntryKey,
  lateTermEntryRecorded,
} from "../late-term-entry-events";
import { recordWorkStatus } from "../life";
import { workStatusAt } from "../life-queries";
import { isPersonAliveAt } from "../vitality-integrity";
import type { EntityId, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  admittedRuleField,
  resolveNationwideRuleCapability,
  unadmittedRuleFields,
} from "./rule-capability-port";
import type { RuleFieldKey } from "./rule-capability-port";
import {
  stateExecutiveTermRuleForElectionYear,
  stateExecutiveTermRuleInWorld,
} from "./executive-term-rules-in-world";
import { stateExecutiveIdentityForOfficeKey } from "./state-executive-candidacy-packs";
import type { StateExecutiveIdentity } from "./state-executive-candidacy-packs";
import {
  STATE_EXECUTIVE_GAME_PROFILE_NOTE,
  commencementInYear,
  generalElectionDay,
  isElectionYear,
  termDatesAfterElection,
  termRuleBasis,
  type StateExecutiveTermRule,
  type TermRuleBasis,
} from "./state-executive-term-rules";

/**
 * Ordinary state executive entry after a real contest: result -> dated term ->
 * recorded qualification -> entry on the shared clock, reusing REST37-X's
 * elected executive term chain. No second election engine, no seat on
 * election night, and nothing dated from memory.
 */

const TERM_FIELDS: readonly RuleFieldKey[] = ["term.years", "term.start"];

export type OrdinaryTermDates =
  | {
      readonly kind: "dated";
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
      readonly ruleVersion: string;
      /** "verified" only when every value used is real-world law. */
      readonly basis: TermRuleBasis;
    }
  | {
      readonly kind: "unknown";
      readonly unknownFields: readonly RuleFieldKey[];
    };

function wholeYears(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1
    ? value
    : null;
}

/**
 * When a term won at an election on `electionDate` begins and ends: from
 * RULES-admitted law where it exists, otherwise from the office's verified or
 * disclosed game-profile calendar. Never the result date.
 */
export function ordinaryStateExecutiveTermDates(
  world: World,
  identity: StateExecutiveIdentity,
  electionDate: IsoDate,
): OrdinaryTermDates {
  // A law passed in this World that changed the term outranks what the game
  // read; with none, RULES-admitted law, then the office's own calendar.
  const inWorld = stateExecutiveTermRuleForElectionYear(
    world,
    identity.stateUsps,
    Number(electionDate.slice(0, 4)),
  );
  const admitted =
    inWorld && inWorld.enactedChanges.length > 0
      ? null
      : admittedTermDates(identity, electionDate);
  if (admitted) return admitted;
  const rule = inWorld;
  if (!rule) return { kind: "unknown", unknownFields: TERM_FIELDS };
  return {
    kind: "dated",
    ...termDatesAfterElection(rule, electionDate),
    ruleVersion: rule.ruleVersion,
    basis: termRuleBasis(rule),
  };
}

/**
 * Whether an election on this date is one of the office's regular elections
 * under the rule the World plays by. A contest filed through the ordinary
 * route always is; one recorded before this rule existed may not be.
 */
export function isRegularStateExecutiveElection(
  world: World,
  identity: StateExecutiveIdentity,
  electionDate: IsoDate,
): boolean {
  const rule = stateExecutiveTermRuleForElectionYear(
    world,
    identity.stateUsps,
    Number(electionDate.slice(0, 4)),
  );
  if (!rule) return false;
  const year = Number(electionDate.slice(0, 4));
  return (
    isElectionYear(rule.election, year) &&
    generalElectionDay(rule.election, year) === electionDate
  );
}
/**
 * The same dates from RULES-admitted `term.years` and `term.start` of that
 * office only, or null when RULES admits neither. The first lawful
 * commencement strictly after the election; never the result date.
 */
function admittedTermDates(
  identity: StateExecutiveIdentity,
  electionDate: IsoDate,
): OrdinaryTermDates | null {
  const resolution = resolveNationwideRuleCapability({
    scope: { kind: "state", stateUsps: identity.stateUsps },
    officeKey: identity.officeKey,
    action: "enter-office-term",
    onDate: electionDate,
    fields: TERM_FIELDS,
  });
  const unknownFields = unadmittedRuleFields(resolution);
  if (unknownFields.length > 0) return null;
  const years = admittedRuleField(resolution, "term.years")!;
  const start = admittedRuleField(resolution, "term.start")!;
  const duration = wholeYears(years.value);
  const shape =
    start.value !== null && typeof start.value === "object"
      ? (start.value as {
          kind?: unknown;
          referenceStart?: unknown;
          cycleYears?: unknown;
        })
      : null;
  if (duration === null || shape === null) return null;
  const electionYear = Number(electionDate.slice(0, 4));
  let startsAt: string | null = null;
  if (shape.kind === "january-first-following-election") {
    startsAt = `${electionYear + 1}-01-01`;
  } else if (shape.kind === "reference-start") {
    const cycle = wholeYears(shape.cycleYears);
    const reference = shape.referenceStart;
    if (
      cycle !== null &&
      typeof reference === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(reference)
    ) {
      const monthDay = reference.slice(4);
      const referenceYear = Number(reference.slice(0, 4));
      let year =
        referenceYear +
        Math.ceil((electionYear - referenceYear) / cycle) * cycle;
      if (`${year}${monthDay}` <= electionDate) year += cycle;
      startsAt = `${year}${monthDay}`;
    }
  }
  if (startsAt === null) return null;
  const startYear = Number(startsAt.slice(0, 4));
  return {
    kind: "dated",
    startsAt: makeIsoDate(startsAt),
    endsAt: makeIsoDate(`${startYear + duration}${startsAt.slice(4)}`),
    ruleVersion: `${years.ruleVersion}+${start.ruleVersion}`,
    basis: "verified",
  };
}

/**
 * Called when a state executive contest closes. A recorded winner gets a
 * dated expected term only when the office's term facts are admitted and an
 * accepted executive authority pack exists to govern from; otherwise the
 * result stands and no office work is created. Idempotent.
 */
export function planOrdinaryStateExecutiveTerm(
  world: World,
  contestId: EntityId,
): World {
  const contest = electionContestById(world, contestId);
  const result = electionContestResult(world, contestId);
  const identity = contest
    ? stateExecutiveIdentityForOfficeKey(contest.office.officeKey)
    : null;
  if (!contest || !result || !identity) return world;
  // A contest recorded off the office's regular calendar (an older save's
  // synthetic filing horizon) is not silently given a term under a rule it
  // was never run under. Its winner is offered an explicit recovery instead.
  if (!isRegularStateExecutiveElection(world, identity, contest.electionDate))
    return world;
  const dates = ordinaryStateExecutiveTermDates(
    world,
    identity,
    contest.electionDate,
  );
  if (dates.kind !== "dated") return world;
  const planned = planElectedExecutiveOfficeTerm(world, {
    contestId,
    startsAt: dates.startsAt,
    endsAt: dates.endsAt,
    termNote: termNote(identity, dates),
  });
  // Every winner, the player included, qualifies as an ordinary routine when
  // nothing the game admits stands in the way: meeting the office's
  // requirements is checked, not pressed (lamontae, 2026-09-23: "there should
  // be no qualify button"). The oath on the first day is the ceremony.
  const winner = result.winnerPersonId;
  if (routineQualificationBlocks(planned, winner, identity).length > 0)
    return planned;
  return recordElectedExecutiveQualification(planned, {
    contestId,
    personId: winner,
    qualificationNote: ROUTINE_QUALIFICATION_NOTE,
  });
}

const ROUTINE_QUALIFICATION_NOTE =
  "The winner qualified for the dated term in the ordinary course: every candidate qualification the game has admitted for this office was met. Unadmitted legal requirements remain unverified, not waived.";

export const OFF_CYCLE_RECOVERY_VERSION =
  "state-executive-off-cycle-recovery/v1";

/** The first full term that can still be entered after `onDate`. */
function offCycleRecoveryDates(
  rule: StateExecutiveTermRule,
  onDate: IsoDate,
): { readonly startsAt: IsoDate; readonly endsAt: IsoDate } {
  let startYear = Number(onDate.slice(0, 4));
  if (commencementInYear(rule.commencement, startYear) <= onDate)
    startYear += 1;
  return {
    startsAt: commencementInYear(rule.commencement, startYear),
    endsAt: commencementInYear(rule.commencement, startYear + rule.termYears),
  };
}

function termNote(
  identity: StateExecutiveIdentity,
  dates: Extract<OrdinaryTermDates, { kind: "dated" }>,
): string {
  return dates.basis === "verified"
    ? `Ordinary ${identity.displayName} term dated by verified rule ${dates.ruleVersion}.`
    : `Ordinary ${identity.displayName} term dated by the game's disclosed rule ${dates.ruleVersion}, not by compiled state law. ${STATE_EXECUTIVE_GAME_PROFILE_NOTE}`;
}

/**
 * The explicit recovery for a victory recorded off the regular calendar: the
 * winner takes up the next full term under the rule the World now plays by.
 * The original result, its date and everything after it stay as recorded; a
 * public recovery record says what was done and under which version.
 */
export function recoverOffCycleStateExecutiveTerm(
  world: World,
  personId: EntityId,
): World {
  const status = stateExecutiveEntryStatus(world, personId);
  if (status.kind !== "won-off-cycle")
    throw new Error("There is no off-calendar victory to recover.");
  const contest = electionContestById(world, status.contestId)!;
  const identity = stateExecutiveIdentityForOfficeKey(
    contest.office.officeKey,
  )!;
  const rule = stateExecutiveTermRuleInWorld(
    world,
    identity.stateUsps,
    world.currentDate,
  )!;
  const planned = planElectedExecutiveOfficeTerm(world, {
    contestId: contest.id,
    startsAt: status.recovery.startsAt,
    endsAt: status.recovery.endsAt,
    termNote: `${OFF_CYCLE_RECOVERY_VERSION}: the player chose to take up the next full term after a victory recorded on ${contest.electionDate}. ${rule.ruleVersion}.`,
  });
  const jurisdiction = chiefExecutiveJurisdiction(identity.stateUsps)!;
  return recordWorldEvent(planned, {
    stableKey: `${OFF_CYCLE_RECOVERY_VERSION}:${contest.id}`,
    type: "governing.term-recovery",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [personId, contest.id],
    participants: [
      {
        personId,
        role: "focus:officeholder",
        detail: `Takes up the term beginning ${status.recovery.startsAt}.`,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [OFF_CYCLE_RECOVERY_VERSION, `office:${identity.officeKey}`],
    summary: `The winner of the ${contest.electionDate} contest for ${identity.displayName} will take office on ${status.recovery.startsAt}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: "Take up the next full term",
      motivation: null,
      immediateReaction: null,
    },
  });
}

function executiveSeatFor(world: World, contestId: EntityId) {
  const contest = electionContestById(world, contestId);
  if (!contest) return null;
  return (
    world.history.workRelationships.find(
      (relationship) =>
        relationship.stableKey === `${contest.stableKey}:executive-seat`,
    ) ?? null
  );
}

export type StateExecutiveEntryStatus =
  | { readonly kind: "none" }
  | { readonly kind: "pending-election"; readonly contestId: EntityId }
  | {
      readonly kind: "lost";
      readonly contestId: EntityId;
      readonly winnerPersonId: EntityId;
    }
  | {
      readonly kind: "won-term-unavailable";
      readonly contestId: EntityId;
      readonly reason: string;
      readonly missing: readonly string[];
    }
  | {
      /**
       * Won at an election recorded off the office's regular calendar, before
       * that calendar existed in the game. The result stands; taking office is
       * an explicit, versioned recovery the player chooses.
       */
      readonly kind: "won-off-cycle";
      readonly contestId: EntityId;
      readonly electionDate: IsoDate;
      readonly reason: string;
      readonly recovery: {
        readonly version: typeof OFF_CYCLE_RECOVERY_VERSION;
        readonly startsAt: IsoDate;
        readonly endsAt: IsoDate;
        readonly basis: TermRuleBasis;
      };
    }
  | {
      readonly kind: "awaiting-qualification";
      readonly contestId: EntityId;
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
      readonly qualificationBlocks: readonly CandidacyBlock[];
    }
  | {
      readonly kind: "qualified-awaiting-entry";
      readonly contestId: EntityId;
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
    }
  | {
      readonly kind: "in-office";
      readonly contestId: EntityId;
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
    }
  | {
      readonly kind: "term-over-or-not-entered";
      readonly contestId: EntityId;
      readonly startsAt: IsoDate;
      readonly endsAt: IsoDate;
    };

/** Qualification is what RULES admits about the person on that day, not a win. */
function qualificationBlocksFor(
  world: World,
  personId: EntityId,
  identity: StateExecutiveIdentity,
): readonly CandidacyBlock[] {
  const jurisdiction = chiefExecutiveJurisdiction(identity.stateUsps);
  if (!jurisdiction) return [];
  return candidacyEligibility(world, {
    personId,
    jurisdictionId: jurisdiction.id,
    officeKey: identity.officeKey,
    alreadyACandidate: false,
  }).blocks;
}

/**
 * What stops a non-player winner in the ordinary course: a requirement the
 * game can actually test and that fails. A requirement the game does not
 * record for anyone (an elector or citizenship clause) stays unverified, as
 * the qualification note says, rather than leaving the office unfilled; and a
 * person whose recorded home is the state itself does live in the state.
 */
function routineQualificationBlocks(
  world: World,
  personId: EntityId,
  identity: StateExecutiveIdentity,
): readonly CandidacyBlock[] {
  const stateId = chiefExecutiveJurisdiction(identity.stateUsps)?.id;
  const livesInState = world.people[personId]?.homeJurisdictionId === stateId;
  return qualificationBlocksFor(world, personId, identity).filter(
    (block) =>
      block.kind !== "unproved-sourced-qualification" &&
      block.kind !== "unproved-district-residence" &&
      !(block.kind === "lives-elsewhere" && livesInState),
  );
}

/** The most recent state executive contest this person stood in, and where it stands. */
export function stateExecutiveEntryStatus(
  world: World,
  personId: EntityId,
): StateExecutiveEntryStatus {
  const contest = [...(world.history.electionContests ?? [])]
    .reverse()
    .find(
      (candidate) =>
        candidate.candidatePersonIds.includes(personId) &&
        stateExecutiveIdentityForOfficeKey(candidate.office.officeKey) !== null,
    );
  if (!contest) return { kind: "none" };
  const identity = stateExecutiveIdentityForOfficeKey(
    contest.office.officeKey,
  )!;
  const result = electionContestResult(world, contest.id);
  if (!result) return { kind: "pending-election", contestId: contest.id };
  if (result.winnerPersonId !== personId)
    return {
      kind: "lost",
      contestId: contest.id,
      winnerPersonId: result.winnerPersonId,
    };
  const seat = executiveSeatFor(world, contest.id);
  const term = seat && electedExecutiveTermForRelationship(world, seat.id);
  if (!seat || !term) {
    const rule = stateExecutiveTermRuleInWorld(
      world,
      identity.stateUsps,
      world.currentDate,
    );
    if (
      rule &&
      !isRegularStateExecutiveElection(world, identity, contest.electionDate)
    ) {
      const recovery = offCycleRecoveryDates(rule, world.currentDate);
      return {
        kind: "won-off-cycle",
        contestId: contest.id,
        electionDate: contest.electionDate,
        reason: `This victory came on ${spokenDate(contest.electionDate)}, before the ${identity.displayName} was elected on a regular calendar. The result stands. You can take up a full term that begins on ${spokenDate(recovery.startsAt)}.`,
        recovery: {
          version: OFF_CYCLE_RECOVERY_VERSION,
          ...recovery,
          basis: termRuleBasis(rule),
        },
      };
    }
    const dates = ordinaryStateExecutiveTermDates(
      world,
      identity,
      contest.electionDate,
    );
    return {
      kind: "won-term-unavailable",
      contestId: contest.id,
      reason: `The result stands, but when a term of the ${identity.displayName} begins is not yet known.`,
      missing: dates.kind === "unknown" ? dates.unknownFields : ["term.start"],
    };
  }
  const dated = {
    contestId: contest.id,
    startsAt: term.startsAt,
    endsAt: term.endsAt,
  };
  if (activeElectedExecutiveTermEvidence(world, seat.id))
    return { kind: "in-office", ...dated };
  // Once the start date has passed without entry (no recorded qualification,
  // or the winner could not enter), the term is not taken up late.
  if (world.currentDate >= term.startsAt)
    return { kind: "term-over-or-not-entered", ...dated };
  if (!recordedExecutiveQualification(world, seat.id))
    return {
      kind: "awaiting-qualification",
      ...dated,
      qualificationBlocks: qualificationBlocksFor(world, personId, identity),
    };
  return { kind: "qualified-awaiting-entry", ...dated };
}

/**
 * The winner qualifies for the dated term: the same RULES eligibility read at
 * filing is re-read on the day, and any block refuses without changing the
 * World. A recorded result alone never qualifies anyone.
 */
export function qualifyForStateExecutiveTerm(
  world: World,
  personId: EntityId,
): World {
  const status = stateExecutiveEntryStatus(world, personId);
  if (status.kind === "qualified-awaiting-entry") return world;
  if (status.kind !== "awaiting-qualification")
    throw new Error("There is no planned state executive term to qualify for.");
  if (status.qualificationBlocks.length > 0)
    throw new Error(status.qualificationBlocks[0]!.reason);
  if (world.currentDate >= status.startsAt)
    throw new Error(
      "The term has already begun without a recorded qualification.",
    );
  return recordElectedExecutiveQualification(world, {
    contestId: status.contestId,
    personId,
    qualificationNote:
      "The winner qualified for the dated term: every candidate qualification the game has admitted for this office was met on this day. Unadmitted legal requirements remain unverified, not waived.",
  });
}

/**
 * Brings a won state executive term up to the rule that there is no Qualify
 * step. A save planned before that rule holds a player's term with no recorded
 * qualification: before the term begins it is qualified now, the way any
 * winner is; after it has begun, a term lost only because the old step was
 * never pressed is taken up from today. A requirement the game can test and
 * that fails still refuses, and the World is returned unchanged.
 */
export function settleStateExecutiveQualification(
  world: World,
  personId: EntityId,
): World {
  const status = stateExecutiveEntryStatus(world, personId);
  if (
    status.kind !== "awaiting-qualification" &&
    status.kind !== "term-over-or-not-entered"
  )
    return world;
  const contest = electionContestById(world, status.contestId);
  const identity =
    contest && stateExecutiveIdentityForOfficeKey(contest.office.officeKey);
  const seat = executiveSeatFor(world, status.contestId);
  const term = seat && electedExecutiveTermForRelationship(world, seat.id);
  if (!identity || !seat || !term) return world;
  if (world.currentDate >= term.endsAt) return world;
  if (routineQualificationBlocks(world, personId, identity).length > 0)
    return world;
  let next = recordElectedExecutiveQualification(world, {
    contestId: status.contestId,
    personId,
    qualificationNote: ROUTINE_QUALIFICATION_NOTE,
    stableKeySuffix: ":settled",
  });
  if (status.kind === "awaiting-qualification") return next;
  const workStatus = workStatusAt(next, seat.id);
  if (
    workStatus?.status !== "expected" ||
    lateTermEntryRecorded(next, seat.id) ||
    !isPersonAliveAt(next, personId, {
      asOfDate: next.currentDate,
      historySequenceExclusive: next.history.nextSequence,
    })
  )
    return next;
  const key = lateTermEntryKey(seat.id);
  next = recordWorkStatus(next, {
    stableKey: `${key}:active`,
    workRelationshipId: seat.id,
    effectiveAt: next.currentDate,
    status: "active",
    reason:
      "Late entry: the term's first day passed behind a qualification step the game no longer has.",
    provenance: {
      kind: "simulated-event",
      eventId: term.result.outcomeEventId,
    },
    supersedesStatusId: workStatus.id,
  });
  next = scheduleGoverningTransition(next, {
    relationshipId: seat.id,
    entryDate: next.currentDate,
    jurisdictionId: term.governing.id,
  });
  const summary = `Took up the office of ${identity.title} after the term began; its first-day entry had waited on a qualification step the game no longer has.`;
  return recordWorldEvent(next, {
    stableKey: key,
    type: LATE_TERM_ENTRY,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: term.governing.id,
    involvedEntityIds: [personId, seat.id, status.contestId],
    participants: [{ personId, role: "focus:officeholder", detail: summary }],
    personFactConstraints: [],
    visibility: "private",
    tags: ["late-term-entry", "executive"],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
