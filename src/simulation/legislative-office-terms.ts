import { candidacyEligibility } from "./candidacy";
import { candidacyPackById } from "./candidacy-packs";
import { makeIsoDate } from "./dates";
import {
  electionContestById,
  electionContestResult,
} from "./election-contests";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "./future-transitions";
import { recordWorkStatus } from "./life";
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
  KY_TERM_RULE_VERSION,
  SUPPORTED_LEGISLATIVE_TERM_RULES,
} from "./legislative-term-rules";

export { KY_TERM_RULE_VERSION, SUPPORTED_LEGISLATIVE_TERM_RULES };

export const LEGISLATIVE_TERM_ENTRY = "election:legislative-term-entry";
export const LEGISLATIVE_TERM_EXPIRY = "election:legislative-term-expiry";

/** Date precision only. The bounded first-election calendar remains authored. */
export function supportedLegislativeTermDates(
  officeKey: string,
  electionDate: IsoDate,
) {
  const rule = SUPPORTED_LEGISLATIVE_TERM_RULES.find((candidate) =>
    candidate.officeKeys.some((key) => key === officeKey),
  );
  if (!rule) return null;
  const startYear = Number(electionDate.slice(0, 4)) + 1;
  return {
    startsAt: makeIsoDate(`${startYear}-01-01`),
    endsAt: makeIsoDate(`${startYear + rule.durationYears}-01-01`),
    ruleVersion: rule.ruleVersion,
    note: `${rule.sourceNote} First-election dates remain the existing authored game calendar, not admission of a real regular or special election.`,
    sourceUrl: rule.sourceUrl,
  };
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
  const timing =
    contest &&
    supportedLegislativeTermDates(
      contest.office.officeKey,
      contest.electionDate,
    );
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
        note: `${timing.note} ${timing.sourceUrl}`,
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
  const timing =
    contest &&
    supportedLegislativeTermDates(
      contest.office.officeKey,
      contest.electionDate,
    );
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
  const entered = world.history.futureDueItemStates.some(
    (s) => s.dueItemId === term.entry.id && s.status === "resolved",
  );
  return entered ? term : null;
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

export function legislativeTermTransitionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const relationship = world.history.workRelationships.find((r) =>
    due.entityIds.includes(r.id),
  );
  const term =
    relationship && legislativeTermForRelationship(world, relationship.id);
  if (!term || (due.id !== term.entry.id && due.id !== term.expiry.id))
    return blocked(
      world,
      "No reconciled dated winning-office chain supports this transition.",
    );
  const status = workStatusAt(world, term.relationship.id);
  if (!status) return blocked(world, "The expected office work is missing.");
  let next = world;
  if (due.transitionKey === LEGISLATIVE_TERM_ENTRY) {
    if (status.status !== "expected")
      return blocked(
        world,
        "This office entry has ended or changed; it cannot be reactivated.",
      );
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
      return blocked(
        world,
        qualification.blocks.map((b) => b.reason).join(" ") ||
          "The recorded winner is not alive for entry.",
      );
    // Only a proven same seat is replaced. Other independent offices remain S-scoped.
    for (const old of world.history.workRelationships) {
      const prior = legislativeTermForRelationship(next, old.id);
      const priorStatus = workStatusAt(next, old.id);
      if (
        old.id === relationship!.id ||
        !prior ||
        prior.contest.office.officeKey !== term.contest.office.officeKey ||
        prior.governing.id !== term.governing.id ||
        prior.seatKey !== term.seatKey ||
        prior.startsAt > term.startsAt ||
        !priorStatus ||
        priorStatus.status === "ended" ||
        priorStatus.status === "expected"
      )
        continue;
      next = recordWorkStatus(next, {
        stableKey: `${due.stableKey}:replace:${old.id}`,
        workRelationshipId: old.id,
        effectiveAt: due.dueAt,
        status: "ended",
        reason: "The recorded successor entered this same seat.",
        provenance: {
          kind: "simulated-event",
          eventId: term.result.outcomeEventId,
        },
        supersedesStatusId: priorStatus.id,
      });
    }
    next = recordWorkStatus(next, {
      stableKey: `${due.stableKey}:active`,
      workRelationshipId: relationship!.id,
      effectiveAt: due.dueAt,
      status: "active",
      reason:
        "Supported dated term entry; the recorded winner's qualification is checked separately from the result.",
      provenance: {
        kind: "simulated-event",
        eventId: term.result.outcomeEventId,
      },
      supersedesStatusId: status.id,
    });
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
