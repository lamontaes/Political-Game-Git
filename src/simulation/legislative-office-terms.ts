import { candidacyEligibility } from "./candidacy";
import {
  LATE_TERM_ENTRY,
  lateTermEntryKey,
  lateTermEntryRecorded,
} from "./late-term-entry-events";
import { recordWorldEvent } from "./world";
import { candidacyPackById, candidacyPacks } from "./candidacy-packs";
import { makeIsoDate } from "./dates";
import { addDays } from "./dates";
import {
  electionContestById,
  electionContestResult,
} from "./election-contests";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "./future-transitions";
import { recordWorkStatus } from "./life";
import { endOpeningMemberForWinner } from "./nationwide-world/state-legislature-opening";
import { workStatusAt, workRoleAt } from "./life-queries";
import { stateJurisdictionForKey } from "./life-places";
import { isPersonAliveAt } from "./vitality-integrity";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "./types";

import {
  BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
  blanketLegislativeTermYears,
  KS_TERM_RULE_VERSION,
  KY_TERM_RULE_VERSION,
  NE_TERM_RULE_VERSION,
  REVIEWED_LEGISLATIVE_TERM_PROFILES,
  SUPPORTED_LEGISLATIVE_TERM_RULES,
  type LegislativeTermProfile,
} from "./legislative-term-rules";
import { commencementInYear } from "./nationwide-world/state-executive-term-rules";
import { generalElectionDay } from "./nationwide-world/state-executive-term-rules";
import {
  stateLegislativeSeatCyclePhase,
  stateLegislativeElectionRule,
  type StateLegislativeSeatIdentity,
} from "./nationwide-world/state-legislative-election-calendar";
import {
  stateLegislativeSeatIdentity,
  stateSeatsInDistrict,
} from "./nationwide-world/state-legislature-opening";
import { districtIdentityCatalog } from "../districts/catalog";
import type { ElectionContestRecord } from "./types";

export {
  BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
  KS_TERM_RULE_VERSION,
  KY_TERM_RULE_VERSION,
  NE_TERM_RULE_VERSION,
  SUPPORTED_LEGISLATIVE_TERM_RULES,
};

export const LEGISLATIVE_TERM_ENTRY = "election:legislative-term-entry";
export const LEGISLATIVE_TERM_EXPIRY = "election:legislative-term-expiry";

function datesFromTermProfile(
  rule: LegislativeTermProfile,
  electionDate: IsoDate,
) {
  const startYear = Number(electionDate.slice(0, 4)) + 1;
  return {
    startsAt: commencementInYear(rule.commencement, startYear),
    endsAt: commencementInYear(
      rule.commencement,
      startYear + rule.durationYears,
    ),
    ruleVersion: rule.ruleVersion,
    note:
      rule.sourceStatus === "admitted"
        ? `${rule.sourceNote} First-election dates remain the existing authored game calendar, not admission of a real regular or special election.`
        : `${rule.sourceNote} The official primary rule was reviewed for this bounded runtime profile; the research-only civic-calendar packet has not been admitted and special elections remain separate.`,
    sourceUrl: rule.sourceUrl,
    sourceUrls: [rule.sourceUrl, ...(rule.supportingSourceUrls ?? [])],
    sourceStatus: rule.sourceStatus,
  };
}

/** Admission-gated dates for the existing supported-term capability. */
export function supportedLegislativeTermDates(
  officeKey: string,
  electionDate: IsoDate,
) {
  const rule = SUPPORTED_LEGISLATIVE_TERM_RULES.find((candidate) =>
    candidate.officeKeys.some((key) => key === officeKey),
  );
  return rule ? datesFromTermProfile(rule, electionDate) : null;
}

/**
 * A state legislative office by key, from a compiled pack or from the
 * generated legislature of a state the game has not compiled (Maine, and every
 * other state #283 opened). A town's governing body is not a legislature and
 * is not found here.
 */
function legislativeOfficeOption(officeKey: string) {
  const rulePackId = officeKey.slice(0, officeKey.lastIndexOf(":"));
  const pack =
    candidacyPacks().find((candidate) =>
      candidate.offices.some((office) => office.officeKey === officeKey),
    ) ?? candidacyPackById(`${rulePackId}:candidacy`);
  return pack?.offices.find((office) => office.officeKey === officeKey) ?? null;
}

/**
 * When a legislative term won on `electionDate` begins and ends: an admitted
 * rule, then a reviewed runtime profile, then the marked blanket rule. Never
 * the result date. `basis` says which.
 */
function preWave2LegislativeTermDates(
  officeKey: string,
  electionDate: IsoDate,
) {
  const supported = supportedLegislativeTermDates(officeKey, electionDate);
  if (supported) return { ...supported, basis: "sourced" as const };
  const reviewed = REVIEWED_LEGISLATIVE_TERM_PROFILES.find((candidate) =>
    candidate.officeKeys.some((key) => key === officeKey),
  );
  if (reviewed)
    return {
      ...datesFromTermProfile(reviewed, electionDate),
      basis: "reviewed-profile" as const,
    };
  const office = legislativeOfficeOption(officeKey);
  if (!office) return null;
  const termYears = office.qualification.termYears;
  const years = blanketLegislativeTermYears(
    officeKey,
    termYears.kind === "known" ? termYears.value : null,
  );
  const startYear = Number(electionDate.slice(0, 4)) + 1;
  return {
    startsAt: makeIsoDate(`${startYear}-01-01`),
    endsAt: makeIsoDate(`${startYear + years}-01-01`),
    ruleVersion: BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
    note: "Blanket rule, not researched for this state: the term begins on January 1 after the election.",
    sourceUrl: "",
    basis: "blanket" as const,
  };
}

export function legislativeTermDates(
  officeKey: string,
  electionDate: IsoDate,
  seatIdentity: StateLegislativeSeatIdentity | null = null,
) {
  if (seatIdentity?.legacyElectionProfile && officeKey.endsWith(":senate"))
    return preWave2LegislativeTermDates(officeKey, electionDate);
  // The previously admitted/reviewed dates remain authoritative for these
  // specific office versions, including terms already saved under them.
  const hasPreviousRule =
    supportedLegislativeTermDates(officeKey, electionDate) !== null ||
    REVIEWED_LEGISLATIVE_TERM_PROFILES.some((row) =>
      row.officeKeys.includes(officeKey),
    );
  const old = hasPreviousRule
    ? preWave2LegislativeTermDates(officeKey, electionDate)
    : null;
  if (old && old.basis !== "blanket") return old;
  const stateUsps = officeKey.match(/^us-([a-z]{2})-/)?.[1]?.toUpperCase();
  if (!stateUsps) return preWave2LegislativeTermDates(officeKey, electionDate);
  const phase = stateLegislativeSeatCyclePhase(
    stateUsps,
    officeKey,
    seatIdentity,
    Number(electionDate.slice(0, 4)),
  );
  if (!phase) return old?.basis === "blanket" ? null : old;
  const { row, termYears } = phase;
  const startYear = Number(electionDate.slice(0, 4)) + 1;
  const commencement = row.commencement;
  const startsAt =
    commencement?.kind === "day-of-election"
      ? electionDate
      : commencement?.kind === "day-after-election"
        ? addDays(electionDate, 1)
        : commencement?.kind === "days-after-election"
          ? addDays(electionDate, commencement.days)
          : commencement
            ? commencementInYear(commencement, startYear)
            : makeIsoDate(`${startYear}-01-01`);
  const endsAt =
    commencement?.kind === "day-of-election"
      ? generalElectionDay(
          stateLegislativeElectionRule(stateUsps),
          startYear - 1 + termYears,
        )
      : commencement?.kind === "day-after-election"
        ? addDays(
            generalElectionDay(
              stateLegislativeElectionRule(stateUsps),
              startYear - 1 + termYears,
            ),
            1,
          )
        : commencement?.kind === "days-after-election"
          ? addDays(
              generalElectionDay(
                stateLegislativeElectionRule(stateUsps),
                startYear - 1 + termYears,
              ),
              commencement.days,
            )
          : commencement
            ? commencementInYear(commencement, startYear + termYears)
            : makeIsoDate(`${startYear + termYears}-01-01`);
  return {
    startsAt,
    endsAt,
    ruleVersion: "state-legislative-chamber-cycles/wave2",
    note:
      row.commencementBasis === "PLACEHOLDER(wave2)"
        ? `Official regular election cohort and term length; PLACEHOLDER(wave2): January 1 commencement is a game assumption. ${row.sourceLocator}`
        : row.sourceLocator,
    sourceUrl: row.sourceUrls[0] ?? "",
    sourceUrls: row.sourceUrls,
    sourceStatus: row.sourceStatus,
    basis: "reviewed-profile" as const,
  };
}

/** Resolve the recorded district's due seat before a campaign freezes its term. */
export function legislativeTermDatesForContest(
  world: World,
  contest: Pick<ElectionContestRecord, "office" | "electionDate">,
) {
  const officeKey = contest.office.officeKey;
  const binding = contest.office.districtBinding;
  if (!binding) return legislativeTermDates(officeKey, contest.electionDate);
  const pack = candidacyPacks().find((candidate) =>
    candidate.offices.some((office) => office.officeKey === officeKey),
  );
  if (!pack) return legislativeTermDates(officeKey, contest.electionDate);
  const identities = stateSeatsInDistrict(
    world,
    pack.packId,
    officeKey,
    binding.recordId,
  ).map((seat) =>
    stateLegislativeSeatIdentity(world, pack.packId, officeKey, seat.ordinal),
  );
  const sourceDistrict = districtIdentityCatalog().find(
    (district) => district.recordId === binding.recordId,
  );
  if (identities.length === 0 && sourceDistrict)
    identities.push({
      districtCode: sourceDistrict.districtCode,
      slotWithinDistrict: null,
    });
  const timings = identities
    .map((identity) =>
      legislativeTermDates(officeKey, contest.electionDate, identity),
    )
    .filter((timing): timing is NonNullable<typeof timing> => timing !== null);
  if (timings.length === 0) return null;
  return timings.every(
    (timing) =>
      timing.startsAt === timings[0]!.startsAt &&
      timing.endsAt === timings[0]!.endsAt,
  )
    ? timings[0]!
    : null;
}

/** Frozen dates use existing expected work and future-due records; no second office store. */
export function scheduleLegislativeTerm(
  world: World,
  relationshipId: EntityId,
  contestId: EntityId,
) {
  const relationship = world.history.workRelationships.find(
    (r) => r.id === relationshipId,
  );
  const contest = electionContestById(world, contestId);
  const result = electionContestResult(world, contestId);
  const timing = contest && legislativeTermDatesForContest(world, contest);
  if (
    !relationship ||
    !contest ||
    !result ||
    !timing ||
    result.winnerPersonId !== relationship.personId ||
    relationship.startedAt !== timing.startsAt
  )
    throw new Error(
      "Term scheduling requires the recorded winner and supported expected work start.",
    );
  let next = world;
  for (const [phase, dueAt, transitionKey] of [
    ["entry", timing.startsAt, LEGISLATIVE_TERM_ENTRY],
    ["expiry", timing.endsAt, LEGISLATIVE_TERM_EXPIRY],
  ] as const)
    next = scheduleFutureDueItem(next, {
      stableKey: `legislative-term:${contest.id}:${timing.ruleVersion}:${phase}`,
      dueAt,
      transitionKey,
      entityIds: [relationship.id, contest.id, result.id].sort(),
      jurisdictionId: workRoleAt(next, relationship.id)!.locationJurisdictionId,
      provenance: {
        kind: "authored",
        note: timing.sourceUrl
          ? `${timing.note} ${timing.sourceUrl}`
          : timing.note,
      },
    });
  return next;
}

export function legislativeTermForRelationship(
  world: World,
  relationshipId: EntityId,
) {
  const entry = world.history.futureDueItems.find(
    (d) =>
      d.transitionKey === LEGISLATIVE_TERM_ENTRY &&
      d.entityIds.includes(relationshipId),
  );
  if (!entry) return null;
  const relationship = world.history.workRelationships.find(
    (r) => r.id === relationshipId,
  );
  const contest = (world.history.electionContests ?? []).find((c) =>
    entry.entityIds.includes(c.id),
  );
  const result = contest && electionContestResult(world, contest.id);
  const campaign = (world.history.campaigns ?? []).find(
    (c) => c.contestId === contest?.id,
  );
  const pack = campaign && candidacyPackById(campaign.candidacyPackId);
  const governing = pack && stateJurisdictionForKey(pack.jurisdictionKey);
  const expiry = world.history.futureDueItems.find(
    (d) =>
      d.transitionKey === LEGISLATIVE_TERM_EXPIRY &&
      d.entityIds.includes(relationshipId),
  );
  // A saved due item freezes the rule that dated its term. Later national
  // profiles must not invalidate that recorded office authority on reload.
  const timing =
    contest &&
    (entry.stableKey.includes(`:${BLANKET_LEGISLATIVE_TERM_RULE_VERSION}:entry`)
      ? preWave2LegislativeTermDates(
          contest.office.officeKey,
          contest.electionDate,
        )
      : legislativeTermDatesForContest(world, contest));
  if (
    !relationship ||
    !contest ||
    !result ||
    !campaign ||
    !pack ||
    !governing ||
    !expiry ||
    !timing ||
    entry.stableKey !==
      `legislative-term:${contest.id}:${timing.ruleVersion}:entry` ||
    expiry.stableKey !==
      `legislative-term:${contest.id}:${timing.ruleVersion}:expiry` ||
    entry.dueAt !== timing.startsAt ||
    expiry.dueAt !== timing.endsAt ||
    relationship.startedAt !== entry.dueAt ||
    relationship.kind !== "employment:legislative-member" ||
    relationship.provenance.kind !== "simulated-event" ||
    relationship.provenance.eventId !== result.outcomeEventId ||
    relationship.personId !== result.winnerPersonId ||
    !entry.entityIds.includes(result.id) ||
    entry.entityIds.length !== 3 ||
    expiry.entityIds.length !== 3 ||
    !expiry.entityIds.includes(result.id) ||
    !expiry.entityIds.includes(contest.id) ||
    workRoleAt(world, relationship.id)?.locationJurisdictionId !==
      governing.id ||
    entry.jurisdictionId !== governing.id ||
    expiry.jurisdictionId !== governing.id ||
    !world.history.organizations.some(
      (o) =>
        o.id === relationship.organizationId &&
        o.stableKey === `legislature:${pack.packId}`,
    )
  )
    return null;
  return {
    relationship,
    contest,
    result,
    campaign,
    pack,
    governing,
    entry,
    expiry,
    startsAt: entry.dueAt,
    endsAt: expiry.dueAt,
    // A missing district never identifies every seat in a chamber as one seat.
    seatKey:
      contest.office.districtBinding?.recordId ??
      contest.office.seatKey ??
      contest.id,
  };
}

/** Evidence consumed by S's reader; a terminal campaign alone grants nothing. */
export function activeLegislativeTermEvidence(
  world: World,
  relationshipId: EntityId,
) {
  const term = legislativeTermForRelationship(world, relationshipId);
  if (
    !term ||
    world.currentDate < term.startsAt ||
    world.currentDate >= term.endsAt ||
    workStatusAt(world, relationshipId)?.status !== "active" ||
    !isPersonAliveAt(world, term.relationship.personId, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    return null;
  const entered =
    world.history.futureDueItemStates.some(
      (s) => s.dueItemId === term.entry.id && s.status === "resolved",
    ) || lateTermEntryRecorded(world, relationshipId);
  return entered ? term : null;
}

function legacyExpiryStableKey(contestId: EntityId, ruleVersion: string) {
  return `legislative-term:${contestId}:${ruleVersion}:legacy-expiry`;
}

/**
 * A seat won before every state's legislative terms were dated: an
 * `employment:legislative-member` relationship written by a recorded win,
 * seated on the result date, with no term entry. Its term is the one the
 * office's rule gives for the contest it was won in. The expiry, once the
 * migration has scheduled it, is an ordinary future-due item.
 */
export function legacyLegislativeSeat(world: World, relationshipId: EntityId) {
  const relationship = world.history.workRelationships.find(
    (r) => r.id === relationshipId,
  );
  if (
    !relationship ||
    relationship.kind !== "employment:legislative-member" ||
    relationship.provenance.kind !== "simulated-event" ||
    world.history.futureDueItems.some(
      (d) =>
        d.transitionKey === LEGISLATIVE_TERM_ENTRY &&
        d.entityIds.includes(relationshipId),
    )
  )
    return null;
  const eventId = relationship.provenance.eventId;
  const result = (world.history.electionContestResults ?? []).find(
    (r) =>
      r.outcomeEventId === eventId &&
      r.winnerPersonId === relationship.personId,
  );
  const contest = result && electionContestById(world, result.contestId);
  const timing =
    contest &&
    preWave2LegislativeTermDates(
      contest.office.officeKey,
      contest.electionDate,
    );
  const governingId = workRoleAt(world, relationshipId)?.locationJurisdictionId;
  if (!result || !contest || !timing || !governingId) return null;
  const expiryStableKey = legacyExpiryStableKey(contest.id, timing.ruleVersion);
  return {
    relationship,
    contest,
    result,
    timing,
    governingId,
    expiryStableKey,
    expiry:
      world.history.futureDueItems.find(
        (d) =>
          d.stableKey === expiryStableKey &&
          d.transitionKey === LEGISLATIVE_TERM_EXPIRY &&
          d.entityIds.includes(relationshipId),
      ) ?? null,
    endsAt: timing.endsAt,
    seatKey:
      contest.office.districtBinding?.recordId ??
      contest.office.seatKey ??
      contest.id,
  };
}

/**
 * Older saves seated a legislator outside Kentucky with no term, so the seat
 * never ended. Each such active seat is given the end its office's rule
 * dates: an expiry on that date when it is still ahead, or, when the date has
 * already passed, an end today rather than a rewritten past. Append-only, and
 * a second pass finds nothing left to do.
 */
export function migrateLegacyLegislativeSeats(world: World): World {
  let next = world;
  for (const relationship of world.history.workRelationships) {
    if (relationship.kind !== "employment:legislative-member") continue;
    const seat = legacyLegislativeSeat(next, relationship.id);
    const status = seat && workStatusAt(next, relationship.id);
    if (!seat || seat.expiry || status?.status !== "active") continue;
    if (seat.endsAt > next.currentDate) {
      next = scheduleFutureDueItem(next, {
        stableKey: seat.expiryStableKey,
        dueAt: seat.endsAt,
        transitionKey: LEGISLATIVE_TERM_EXPIRY,
        entityIds: [relationship.id, seat.contest.id, seat.result.id].sort(),
        jurisdictionId: seat.governingId,
        provenance: {
          kind: "authored",
          note: `A seat recorded before its term was dated. ${seat.timing.note}`,
        },
      });
    } else {
      next = recordWorkStatus(next, {
        stableKey: `${seat.expiryStableKey}:ended`,
        workRelationshipId: relationship.id,
        effectiveAt: next.currentDate,
        status: "ended",
        reason:
          "The term this seat was won for had already run out; it was still recorded as held, so it ends now.",
        provenance: {
          kind: "simulated-event",
          eventId: seat.result.outcomeEventId,
        },
        supersedesStatusId: status.id,
      });
    }
  }
  return next;
}

function blocked(world: World, reason: string): FutureTransitionHandlerResult {
  return {
    world,
    status: "blocked",
    reasonKey: "election:legislative-term-unavailable",
    context: reason,
    outcomeEventId: null,
  };
}

/**
 * Seats a recorded winner in their term: the same eligibility re-read on the
 * day, the same-seat predecessor ended, and the seat made active. Returns the
 * reason instead when the winner cannot enter. Shared by the term's own entry
 * and by a late entry for a save whose entry was refused by a defect since
 * fixed.
 */
function enterLegislativeSeat(
  world: World,
  input: {
    readonly term: NonNullable<
      ReturnType<typeof legislativeTermForRelationship>
    >;
    readonly status: NonNullable<ReturnType<typeof workStatusAt>>;
    readonly stableKey: string;
    readonly effectiveAt: IsoDate;
  },
): World | string {
  const { term, status, stableKey, effectiveAt } = input;
  let next = world;
  if (status.status !== "expected")
    return "This office entry has ended or changed; it cannot be reactivated.";
  const qualification = candidacyEligibility(world, {
    personId: term.relationship.personId,
    jurisdictionId: term.contest.jurisdictionId,
    officeKey: term.contest.office.officeKey,
    districtBinding: term.contest.office.districtBinding,
    alreadyACandidate: false,
  });
  if (
    !qualification.eligible ||
    !isPersonAliveAt(world, term.relationship.personId, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    return (
      qualification.blocks.map((b) => b.reason).join(" ") ||
      "The recorded winner is not alive for entry."
    );
  // Only a proven same seat is replaced. Other independent offices remain
  // S-scoped. A member holds one seat in a chamber, so the seat this winner
  // already holds in it is the one the new term continues, even when neither
  // filing named a district and each contest is its own seat key.
  for (const old of world.history.workRelationships) {
    const dated = legislativeTermForRelationship(next, old.id);
    const legacySeat = dated ? null : legacyLegislativeSeat(next, old.id);
    const prior = dated
      ? {
          officeKey: dated.contest.office.officeKey,
          governingId: dated.governing.id,
          seatKey: dated.seatKey,
          startsAt: dated.startsAt,
        }
      : legacySeat && {
          officeKey: legacySeat.contest.office.officeKey,
          governingId: legacySeat.governingId,
          seatKey: legacySeat.seatKey,
          startsAt: legacySeat.relationship.startedAt,
        };
    const priorStatus = workStatusAt(next, old.id);
    if (
      old.id === term.relationship.id ||
      !prior ||
      prior.officeKey !== term.contest.office.officeKey ||
      prior.governingId !== term.governing.id ||
      (prior.seatKey !== term.seatKey &&
        old.personId !== term.relationship.personId) ||
      prior.startsAt > term.startsAt ||
      !priorStatus ||
      priorStatus.status === "ended" ||
      priorStatus.status === "expected"
    )
      continue;
    next = recordWorkStatus(next, {
      stableKey: `${stableKey}:replace:${old.id}`,
      workRelationshipId: old.id,
      effectiveAt,
      status: "ended",
      reason: "The recorded successor entered this same seat.",
      provenance: {
        kind: "simulated-event",
        eventId: term.result.outcomeEventId,
      },
      supersedesStatusId: priorStatus.id,
    });
  }
  // A chamber the game seated at its opening gives up the district's seat.
  next = endOpeningMemberForWinner(next, {
    candidacyPackId: term.campaign.candidacyPackId,
    winnerWorkRelationshipId: term.relationship.id,
    effectiveAt,
    outcomeEventId: term.result.outcomeEventId,
  });
  next = recordWorkStatus(next, {
    stableKey: `${stableKey}:active`,
    workRelationshipId: term.relationship.id,
    effectiveAt,
    status: "active",
    reason:
      "Supported dated term entry; the recorded winner's qualification is checked separately from the result.",
    provenance: {
      kind: "simulated-event",
      eventId: term.result.outcomeEventId,
    },
    supersedesStatusId: status.id,
  });
  return next;
}

export function legislativeTermTransitionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const relationship = world.history.workRelationships.find((r) =>
    due.entityIds.includes(r.id),
  );
  const term =
    relationship && legislativeTermForRelationship(world, relationship.id);
  const legacy =
    !term &&
    relationship &&
    due.transitionKey === LEGISLATIVE_TERM_EXPIRY &&
    legacyLegislativeSeat(world, relationship.id);
  if (legacy && legacy.expiry?.id === due.id) {
    const status = workStatusAt(world, legacy.relationship.id);
    if (!status) return blocked(world, "The office work is missing.");
    return {
      world:
        status.status === "ended"
          ? world
          : recordWorkStatus(world, {
              stableKey: `${due.stableKey}:ended`,
              workRelationshipId: legacy.relationship.id,
              effectiveAt: due.dueAt,
              status: "ended",
              reason: "The term expired; historical office work remains.",
              provenance: {
                kind: "simulated-event",
                eventId: legacy.result.outcomeEventId,
              },
              supersedesStatusId: status.id,
            }),
      status: "resolved",
      reasonKey: null,
      context: "Recorded term expired.",
      outcomeEventId: null,
    };
  }
  if (!term || (due.id !== term.entry.id && due.id !== term.expiry.id))
    return blocked(
      world,
      "No reconciled dated winning-office chain supports this transition.",
    );
  const status = workStatusAt(world, term.relationship.id);
  if (!status) return blocked(world, "The expected office work is missing.");
  let next = world;
  if (due.transitionKey === LEGISLATIVE_TERM_ENTRY) {
    const entered = enterLegislativeSeat(world, {
      term,
      status,
      stableKey: due.stableKey,
      effectiveAt: due.dueAt,
    });
    if (typeof entered === "string") return blocked(world, entered);
    next = entered;
  } else if (due.transitionKey === LEGISLATIVE_TERM_EXPIRY) {
    if (status.status !== "ended")
      next = recordWorkStatus(next, {
        stableKey: `${due.stableKey}:ended`,
        workRelationshipId: relationship!.id,
        effectiveAt: due.dueAt,
        status: "ended",
        reason: "The supported term expired; historical office work remains.",
        provenance: {
          kind: "simulated-event",
          eventId: term.result.outcomeEventId,
        },
        supersedesStatusId: status.id,
      });
  } else return blocked(world, "This is not a legislative term transition.");
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context:
      due.transitionKey === LEGISLATIVE_TERM_ENTRY
        ? "Recorded winner entered the supported term."
        : "Recorded term expired.",
    outcomeEventId: null,
  };
}

/** Lazy creation keeps cold browser imports independent of writer initialization. */
export function createLegislativeTermTransitionRegistry() {
  return createFutureTransitionHandlerRegistry([
    [LEGISLATIVE_TERM_ENTRY, legislativeTermTransitionHandler],
    [LEGISLATIVE_TERM_EXPIRY, legislativeTermTransitionHandler],
  ]);
}

/**
 * Seats a winner whose term has begun but whose entry on its first day was
 * refused, when nothing refuses them now. The refusals this repairs were
 * defects (a first-time member's own seat counted against a term limit), so a
 * save stuck behind one is seated from today rather than left holding an
 * office it can never take. Returns the World unchanged when there is nothing
 * to repair or the winner still cannot enter.
 */
export function enterLegislativeTermLate(
  world: World,
  relationshipId: EntityId,
): World {
  const term = legislativeTermForRelationship(world, relationshipId);
  const status = workStatusAt(world, relationshipId);
  if (
    !term ||
    !status ||
    status.status !== "expected" ||
    world.currentDate < term.startsAt ||
    world.currentDate >= term.endsAt ||
    lateTermEntryRecorded(world, relationshipId)
  )
    return world;
  const entryState = world.history.futureDueItemStates
    .filter((state) => state.dueItemId === term.entry.id)
    .at(-1);
  if (entryState?.status !== "blocked") return world;
  const key = lateTermEntryKey(relationshipId);
  const entered = enterLegislativeSeat(world, {
    term,
    status,
    stableKey: key,
    effectiveAt: world.currentDate,
  });
  if (typeof entered === "string") return world;
  const summary = `Took up the seat after the term began; its first-day entry had been refused (${entryState.context ?? "no reason recorded"}).`;
  return recordWorldEvent(entered, {
    stableKey: key,
    type: LATE_TERM_ENTRY,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: term.governing.id,
    involvedEntityIds: [
      term.relationship.personId,
      relationshipId,
      term.contest.id,
    ],
    participants: [
      {
        personId: term.relationship.personId,
        role: "focus:officeholder",
        detail: summary,
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["late-term-entry", "legislative"],
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
