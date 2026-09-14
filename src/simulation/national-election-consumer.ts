import { nationalOfficeRef } from "./national-election-offices";
import {
  nationalUnitJurisdiction,
  ensureJurisdiction,
} from "./national-election-geography";
import { scheduleElectionContest } from "./election-contests";
import { compareSimulationMoments } from "./dates";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "./future-transitions";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "./life";
import { workStatusAt } from "./life-queries";
import { nationalElectionRules } from "./national-election-rules";
import {
  appendNationalRecord,
  nationalRecords,
  requireNationalElection,
  nationalCountProposal,
  recordNationalCount,
  nationalOutcome,
  nationalPersonAlive,
} from "./national-elections";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  FutureTransitionHandlerRegistry,
  World,
  ElectionContestProvenance,
  TimeDemandProfile,
} from "./types";
import type {
  NationalTermPlan,
  NationalTermState,
} from "./national-election-types";
import { recordWorldEvent } from "./world";

export const NATIONAL_COUNT_TRANSITION =
  "election:national-electoral-count" as const;
/** Adapter over the current producer; importing a result is never certification. */
export function importNationalContestResult(
  world: World,
  input: {
    stableKey: string;
    electionId: EntityId;
    unitKey: string;
    contestResultId: EntityId;
  },
): World {
  const result = (world.history.electionContestResults ?? []).find(
    (record) => record.id === input.contestResultId,
  );
  if (!result) throw new Error("Canonical contest result missing.");
  return appendNationalRecord(world, {
    stableKey: input.stableKey,
    electionId: input.electionId,
    kind: "unit-result",
    unitKey: input.unitKey,
    sourceContestResultId: result.id,
    allocationWinnerPersonId: input.unitKey.startsWith("ME")
      ? null
      : result.winnerPersonId,
    tallies: result.tallies.map((tally) => ({
      candidatePersonId: tally.candidatePersonId,
      votes: tally.votes,
    })),
    provenance: {
      method: result.provenance.method,
      sourceEntityIds: [result.id],
      note: "Imported canonical elector-unit contest result; not certified, not a projection, not office entry.",
    },
  });
}
export function scheduleNationalCount(
  world: World,
  electionId: EntityId,
): World {
  const election = requireNationalElection(world, electionId);
  return scheduleFutureDueItem(world, {
    stableKey: `${election.stableKey}:count-due`,
    dueAt: nationalElectionRules(election.cycle).countDate,
    transitionKey: NATIONAL_COUNT_TRANSITION,
    entityIds: [election.id],
    jurisdictionId: election.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [election.id] },
  });
}
export function nationalCountTransitionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  if (
    due.transitionKey !== NATIONAL_COUNT_TRANSITION ||
    due.entityIds.length !== 1
  )
    throw new Error("Invalid national count due item.");
  const electionId = due.entityIds[0]!;
  requireNationalElection(world, electionId);
  const existing = nationalRecords(world, electionId).find(
    (record) => record.kind === "count",
  );
  if (existing)
    return {
      world,
      status: "resolved",
      reasonKey: null,
      context: "National count already recorded; no duplicate count.",
      outcomeEventId: null,
    };
  if (!nationalCountProposal(world, electionId).ready)
    return {
      world,
      status: "blocked",
      reasonKey: "election:national-count-pending",
      context:
        "Missing certification, tied allocation, missing electoral ballots or contested records. No outcome or office entry inferred.",
      outcomeEventId: null,
    };
  return {
    world: recordNationalCount(world, {
      stableKey: `${due.stableKey}:count`,
      electionId,
      provenance: {
        method: "simulated",
        sourceEntityIds: [electionId],
        note: "Scheduled count of supplied canonical certified electoral ballots.",
      },
    }),
    status: "resolved",
    reasonKey: null,
    context:
      "Congressional electoral count recorded; possession requires separate qualification and noon term transition.",
    outcomeEventId: null,
  };
}
export function createNationalElectionTransitionRegistry() {
  return createFutureTransitionHandlerRegistry([
    [NATIONAL_COUNT_TRANSITION, nationalCountTransitionHandler],
  ]);
}
/** Compatibility export, with no registry construction during cold module initialization. */
export const NATIONAL_ELECTION_HANDLERS: FutureTransitionHandlerRegistry = {
  get: (key) => createNationalElectionTransitionRegistry().get(key),
};
/** Attested qualification/oath is a named receiver input, not inferred from winning. */
export function planNationalOfficeTerm(
  world: World,
  input: {
    stableKey: string;
    electionId: EntityId;
    office: "president" | "vice-president";
    qualificationNote: string;
    workTimeDemand: TimeDemandProfile;
    provenance: ElectionContestProvenance;
  },
): World {
  const election = requireNationalElection(world, input.electionId);
  const outcome = nationalOutcome(world, input.electionId, input.office);
  if (!outcome) throw new Error("Office outcome is pending.");
  const rules = nationalElectionRules(election.cycle);
  return appendNationalRecord(world, {
    ...input,
    kind: "term-plan",
    personId: outcome.personId,
    outcomeId: outcome.outcomeId,
    startsAt: rules.startsAt,
    endsAt: rules.endsAt,
  });
}
export function nationalOfficeHolder(
  world: World,
  office: "president" | "vice-president",
) {
  const plans = nationalRecords(world).filter(
    (record): record is NationalTermPlan =>
      record.kind === "term-plan" && record.office === office,
  );
  return (
    plans
      .flatMap((plan) => {
        const states = nationalRecords(world, plan.electionId).filter(
          (record): record is NationalTermState =>
            record.kind === "term-state" &&
            record.planId === plan.id &&
            compareSimulationMoments(record.effectiveAt, world.currentMoment) <=
              0,
        );
        const state = states.at(-1);
        return state?.status === "entered" &&
          state.workRelationshipId !== null &&
          workStatusAt(world, state.workRelationshipId)?.status === "active" &&
          compareSimulationMoments(world.currentMoment, plan.endsAt) < 0 &&
          nationalPersonAlive(world, plan.personId)
          ? [{ plan, state }]
          : [];
      })
      .at(-1) ?? null
  );
}
/** Ordinary clock calls this at exact represented instants. Legacy Worlds are a no-op. */
export function applyNationalTermTransitions(world: World): World {
  let next = world;
  const plans = nationalRecords(world)
    .filter((record): record is NationalTermPlan => record.kind === "term-plan")
    .sort(
      (a, b) =>
        compareSimulationMoments(a.startsAt, b.startsAt) ||
        a.sequence - b.sequence,
    );
  for (const plan of plans) {
    let states = nationalRecords(next, plan.electionId).filter(
      (record): record is NationalTermState =>
        record.kind === "term-state" && record.planId === plan.id,
    );
    const election = requireNationalElection(next, plan.electionId);
    const qualification = nationalRecords(next, plan.electionId).find(
      (record) =>
        record.kind === "qualification" &&
        record.planId === plan.id &&
        record.disposition === "qualified-and-sworn",
    );
    if (
      !states.length &&
      qualification?.kind === "qualification" &&
      compareSimulationMoments(next.currentMoment, qualification.effectiveAt) >=
        0 &&
      compareSimulationMoments(next.currentMoment, plan.endsAt) < 0
    ) {
      if (!nationalPersonAlive(next, plan.personId)) {
        next = appendNationalRecord(next, {
          kind: "term-state",
          stableKey: `${plan.stableKey}:blocked`,
          electionId: plan.electionId,
          planId: plan.id,
          effectiveAt: qualification.effectiveAt,
          status: "blocked",
          workRelationshipId: null,
          outcomeEventId: null,
          reason:
            "Chosen person is deceased; succession receiver is unresolved.",
          provenance: {
            method: "simulated",
            sourceEntityIds: [plan.id],
            note: "Term entry refused pending supported succession.",
          },
        });
        continue;
      }
      const eventKey = `${plan.stableKey}:entry-event`;
      next = recordWorldEvent(next, {
        stableKey: eventKey,
        type: "election.national-office-entered",
        occurredAt: qualification.effectiveAt.date,
        recordedAt: next.currentDate,
        jurisdictionId: election.jurisdictionId,
        involvedEntityIds: [plan.personId, plan.id],
        participants: [
          {
            personId: plan.personId,
            role: "focus:officeholder",
            detail: plan.office,
          },
        ],
        personFactConstraints: [],
        visibility: "public",
        tags: ["election", "office-term", `office:us-${plan.office}`],
        summary: `The recorded ${plan.office} outcome entered its qualified term after the January 20 noon boundary.`,
        context: {
          location: null,
          socialContext: plan.qualificationNote,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const eventId = next.history.events.find(
        (event) => event.stableKey === eventKey,
      )!.id;
      const bodyKey = `national-office:us-${plan.office}`;
      if (
        !next.history.organizations.some((body) => body.stableKey === bodyKey)
      )
        next = createOrganization(next, {
          stableKey: bodyKey,
          formedAt: plan.startsAt.date,
          detailLevel: "lightweight",
          provenance: {
            kind: "authored",
            note: "Canonical national office identity; no department hierarchy or additional powers.",
          },
          initialProfile: {
            name:
              plan.office === "president"
                ? "Presidency of the United States"
                : "Vice Presidency of the United States",
            classification: "sector:government",
            locationJurisdictionId: election.jurisdictionId,
          },
        });
      const bodyId = next.history.organizations.find(
        (body) => body.stableKey === bodyKey,
      )!.id;
      const workKey = `${plan.stableKey}:office-work`;
      next = createWorkRelationship(next, {
        stableKey: workKey,
        personId: plan.personId,
        organizationId: bodyId,
        startedAt: qualification.effectiveAt.date,
        kind:
          plan.office === "president"
            ? "employment:executive-officeholder"
            : "employment:vice-presidential-officeholder",
        compensation: "paid",
        authority: "directed",
        dependency: "partly-dependent",
        economicRisk: "organization-borne",
        provenance: { kind: "simulated-event", eventId },
        initialRole: {
          title: nationalOfficeRef(plan.office).title,
          occupationClassification: nationalOfficeRef(plan.office)
            .occupationClassification,
          locationJurisdictionId: election.jurisdictionId,
          timeDemand: plan.workTimeDemand,
        },
      });
      const workId = next.history.workRelationships.find(
        (work) => work.stableKey === workKey,
      )!.id;
      next = appendNationalRecord(next, {
        kind: "term-state",
        stableKey: `${plan.stableKey}:entered`,
        electionId: plan.electionId,
        planId: plan.id,
        effectiveAt: qualification.effectiveAt,
        status: "entered",
        workRelationshipId: workId,
        outcomeEventId: eventId,
        reason: null,
        provenance: {
          method: "simulated",
          sourceEntityIds: [plan.id, eventId],
          note: "Qualified term entry through canonical work; no compensation amount or weekly load inferred.",
        },
      });
      states = nationalRecords(next, plan.electionId).filter(
        (record): record is NationalTermState =>
          record.kind === "term-state" && record.planId === plan.id,
      );
    }
    const entry = states.find((state) => state.status === "entered");
    if (
      entry &&
      !states.some((state) => state.status === "ended") &&
      compareSimulationMoments(next.currentMoment, plan.endsAt) >= 0
    ) {
      const status = workStatusAt(next, entry.workRelationshipId!);
      if (status && status.status !== "ended")
        next = recordWorkStatus(next, {
          stableKey: `${plan.stableKey}:work-ended`,
          workRelationshipId: entry.workRelationshipId!,
          effectiveAt: plan.endsAt.date,
          status: "ended",
          reason: "Recorded constitutional term expired at noon.",
          supersedesStatusId: status.id,
          provenance: {
            kind: "authored",
            note: "Twentieth Amendment dated term boundary.",
          },
        });
      next = appendNationalRecord(next, {
        kind: "term-state",
        stableKey: `${plan.stableKey}:ended`,
        electionId: plan.electionId,
        planId: plan.id,
        effectiveAt: plan.endsAt,
        status: "ended",
        workRelationshipId: entry.workRelationshipId,
        outcomeEventId: null,
        reason:
          "Fixed term expired; no successor or acting authority inferred.",
        provenance: {
          method: "simulated",
          sourceEntityIds: [plan.id],
          note: "Term expiry closes its canonical work relationship.",
        },
      });
    }
  }
  return next;
}

export function qualifyNationalOfficeEntry(
  world: World,
  input: {
    stableKey: string;
    electionId: EntityId;
    planId: EntityId;
    personId: EntityId;
    disposition: "qualified-and-sworn" | "refused";
    authorityNote: string;
    provenance: ElectionContestProvenance;
  },
): World {
  return applyNationalTermTransitions(
    appendNationalRecord(world, {
      ...input,
      kind: "qualification",
      effectiveAt: world.currentMoment,
    }),
  );
}

/** Declared canonical geography enters through the existing contest scheduler. */
export function scheduleNationalUnitContest(
  world: World,
  input: {
    stableKey: string;
    electionId: EntityId;
    unitKey: string;
    jurisdictionId: EntityId;
    provenance: ElectionContestProvenance;
  },
): World {
  const election = requireNationalElection(world, input.electionId);
  const rules = nationalElectionRules(election.cycle);
  if (!rules.units.some((unit) => unit.key === input.unitKey))
    throw new Error("Unsupported national election unit.");
  const jurisdiction = nationalUnitJurisdiction(election.cycle, input.unitKey);
  if (input.jurisdictionId !== jurisdiction.id)
    throw new Error(
      "National unit jurisdiction does not match the selected canonical state/DC.",
    );
  const scheduled = scheduleElectionContest(
    ensureJurisdiction(world, jurisdiction),
    {
      stableKey: input.stableKey,
      jurisdictionId: input.jurisdictionId,
      office: {
        officeKey: `electors:${input.unitKey}`,
        title: `Presidential electors (${input.unitKey})`,
        seatKey: input.unitKey,
        occupationClassification: null,
      },
      electionDate: rules.electionDate,
      candidatePersonIds: election.tickets.map(
        (ticket) => ticket.presidentPersonId,
      ),
      provenance: input.provenance,
    },
  );
  const contestId = scheduled.history.electionContests!.at(-1)!.id;
  return appendNationalRecord(scheduled, {
    kind: "contest-link",
    stableKey: `${input.stableKey}:national-link`,
    electionId: election.id,
    unitKey: input.unitKey,
    contestId,
    provenance: {
      method: "simulated",
      sourceEntityIds: [election.id, contestId],
      note: "Bound canonical elector-unit contest to the national election. No certification or campaign/ballot-access admission inferred.",
    },
  });
}
/** The current scheduled producer supplies raw results; certification remains external. */
export function importLinkedNationalContestResult(
  world: World,
  contestId: EntityId,
): World {
  const link = nationalRecords(world).find(
    (record) =>
      record.kind === "contest-link" && record.contestId === contestId,
  );
  if (
    link?.kind !== "contest-link" ||
    nationalRecords(world, link.electionId).some(
      (record) =>
        record.kind === "unit-result" && record.unitKey === link.unitKey,
    )
  )
    return world;
  const result = (world.history.electionContestResults ?? []).find(
    (record) => record.contestId === contestId,
  );
  return result
    ? importNationalContestResult(world, {
        stableKey: `${link.stableKey}:raw-result`,
        electionId: link.electionId,
        unitKey: link.unitKey,
        contestResultId: result.id,
      })
    : world;
}

/** National unit schedules never invoke the legacy seeded popular-vote placeholder. */
export function linkedNationalUnitTransition(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult | null {
  const contestId = due.entityIds[0];
  const link = nationalRecords(world).find(
    (record) =>
      record.kind === "contest-link" && record.contestId === contestId,
  );
  if (link?.kind !== "contest-link" || !contestId) return null;
  const result = (world.history.electionContestResults ?? []).find(
    (record) => record.contestId === contestId,
  );
  if (!result)
    return {
      world,
      status: "blocked",
      reasonKey: "election:national-unit-result-missing",
      context:
        "A supplied canonical state/district result is required. The legacy seeded placeholder is not a national election producer.",
      outcomeEventId: null,
    };
  return {
    world: importLinkedNationalContestResult(world, contestId),
    status: "resolved",
    reasonKey: null,
    context:
      "Supplied canonical unit result imported as raw totals; certification and electoral ballots remain separate.",
    outcomeEventId: result.outcomeEventId,
  };
}
