import { describe, expect, it } from "vitest";
import { CAREER_PROVIDERS } from "./career-path7-provider";
import { fileDraftFromOffice } from "./legislation-docket";
import {
  applyLegislativeCommand,
  institutionOwnsStep,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import { publishLegislativeTransition } from "./publish-legislative-transition";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import {
  declarePersonalTaxOccurrence,
  fileTaxProposalFromOffice,
} from "./tax-work";
import {
  measurePosition,
  availableMeasureSteps,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { addDays, compareSimulationMoments } from "../simulation/dates";
import { passOrdinaryDays } from "./ordinary-life";
import { scheduledActivityState } from "../simulation/time-work";
import {
  castMemberBallot,
  memberVotesAhead,
  pendingChamberQuestions,
} from "../simulation/governing/legislative-clock";
import { declineVenueActivity } from "./scheduled-activity-choice";
import {
  performCareerWork,
  resignCareer,
  respondCareerOffer,
  seekCareerOffer,
  startCareerWork,
} from "../simulation/career-path7";
import { resourcePositionAt } from "../simulation/resource-queries";
import { money } from "../simulation/resources";
import {
  programCapacity,
  programInstallments,
  programOutturns,
  programPosition,
  commitPublicProgram,
} from "../simulation/governing/public-program";
import {
  openAppropriationsFor,
  programAlternativesFor,
  programOperatorOrganization,
} from "../simulation/governing/program-governing";
import { stateTaxServiceProfileForJurisdictionKey } from "../simulation/world-setup/state-tax-service-profiles";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "../simulation/nationwide-world/state-executives";
import { publicTaxAccountForJurisdiction } from "../simulation/tax-policy";
import { enactedLawEffects } from "../simulation/enacted-law-effects";
import { lawEffectSentences } from "./law-effects-prose";
import { proseDate } from "./prose-dates";
import { ordinaryStateHouseFilingEntry } from "../../tests/fixtures/multistate-funded-service-entry";

const USD = money(0, "USD").currency;

function reopen(world: World): World {
  return deserializeWorld(serializeWorld(world));
}

const PAIRED_BACKGROUND_BILLS_INTRODUCED_AT = "2027-02-15";

function pairedBackgroundMeasure(
  world: World,
  jurisdictionId: EntityId,
  shortTitle: string,
) {
  // The ordinary member fixture starts in 2027. Earlier and later bills can
  // reuse a title, so this regression binds to the two measures from the
  // traced 2027-02-15 pair rather than a historical or recurring bill.
  return (world.history.legislativeMeasures ?? [])
    .filter(
      (measure) =>
        measure.jurisdictionId === jurisdictionId &&
        measure.introducedAt === PAIRED_BACKGROUND_BILLS_INTRODUCED_AT &&
        measure.shortTitle === shortTitle,
    )
    .sort((left, right) => right.sequence - left.sequence)[0];
}

function cash(
  world: World,
  owner:
    | { readonly kind: "person"; readonly personId: EntityId }
    | { readonly kind: "organization"; readonly organizationId: EntityId },
): number {
  return resourcePositionAt(world, owner, USD)?.liquidBalance.minorUnits ?? 0;
}

function enactThroughGenericClock(
  world: World,
  measureId: EntityId,
  personId: EntityId,
  memberSeatStableKey: string,
): World {
  const input = { measureId, playerPersonId: personId, memberSeatStableKey };
  let next = world;
  let clockWaits = 0;
  let ballots = 0;
  for (
    let turn = 0;
    turn < 100 && measurePosition(next, measureId).outcome === null;
    turn++
  ) {
    const entry = resolveLegislativeAssignmentForMeasure(next, input);
    if (entry.kind !== "available") throw new Error(entry.reason);
    expect(entry.assignment.procedure.recordedSittingEventId).toBeUndefined();
    const step = availableMeasureSteps(next, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `No supported step at ${measurePosition(next, measureId).phase}.`,
      );
    try {
      for (const forum of pendingChamberQuestions(next, measureId)) {
        if (!forum.members.some((member) => member.personId === personId))
          continue;
        const decided = castMemberBallot(next, {
          personId,
          question: forum.question,
          ballot: "yea",
        });
        if (decided !== next) ballots += 1;
        next = decided;
      }
      if (institutionOwnsStep(next, entry.assignment, step)) {
        next = publishLegislativeTransition(
          next,
          applyLegislativeCommand(next, entry.assignment, {
            kind: "await-institution",
            step,
          }).world,
        );
        clockWaits += 1;
      } else if (step === "await-executive-decision") {
        next = publishLegislativeTransition(
          next,
          applyLegislativeCommand(next, entry.assignment, {
            kind: "take-step",
            step,
          }).world,
        );
      } else {
        next = publishLegislativeTransition(
          next,
          applyLegislativeCommand(next, entry.assignment, {
            kind: "take-step",
            step,
          }).world,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const conflictId = /scheduled-activity_[a-z0-9]+/.exec(message)?.[0];
      const activity = conflictId
        ? next.history.scheduledActivities.find((row) => row.id === conflictId)
        : undefined;
      const state = conflictId
        ? scheduledActivityState(next, conflictId)
        : null;
      throw new Error(
        `${message}; measure ${measureId}, step ${step}, phase ${measurePosition(next, measureId).phase}, date ${next.currentDate}; overlapping activity ${JSON.stringify(
          activity && state
            ? {
                stableKey: activity.stableKey,
                title: activity.title,
                kind: activity.kind,
                participantPersonIds: activity.participantPersonIds,
                start: state.start,
                end: state.end,
                status: state.status,
              }
            : null,
        )}`,
      );
    }
  }
  expect(clockWaits).toBeGreaterThan(0);
  expect(ballots).toBeGreaterThan(0);
  expect(
    measurePosition(next, measureId).outcome,
    JSON.stringify({
      currentDate: next.currentDate,
      position: measurePosition(next, measureId),
      measure: (() => {
        const entry = next.history.legislativeMeasures?.find(
          (row) => row.id === measureId,
        );
        return entry
          ? {
              title: entry.shortTitle,
              jurisdictionId: entry.jurisdictionId,
              introducedAt: entry.introducedAt,
            }
          : null;
      })(),
      actions: (next.history.legislativeActions ?? [])
        .filter((entry) => entry.measureId === measureId)
        .map(({ kind, occurredAt, chamberKey, rationale }) => ({
          kind,
          occurredAt,
          chamberKey,
          rationale,
        })),
      votes: (next.history.legislativeVotes ?? [])
        .filter(
          (entry) =>
            entry.measureId === measureId &&
            (entry.purpose === "floor-stage" ||
              entry.purpose === "veto-override"),
        )
        .map(
          ({
            purpose,
            forum,
            floorStageKey,
            takenAt,
            tally,
            outcome,
            requiredVotes,
            thresholdLabel,
          }) => ({
            purpose,
            forum,
            floorStageKey,
            takenAt,
            tally,
            outcome,
            requiredVotes,
            thresholdLabel,
          }),
        ),
      executiveDispositions: next.history.executiveDispositions?.filter(
        (entry) => entry.measureId === measureId,
      ),
      enactment: next.history.legislativeEnactments?.find(
        (entry) => entry.measureId === measureId,
      ),
    }),
  ).toBe("enacted");
  const outstandingNotices = next.history.scheduledActivities.filter(
    (activity) =>
      activity.stableKey.startsWith("legislative-clock/v1:member-vote:") &&
      activity.sourceEntityIds.includes(measureId) &&
      scheduledActivityState(next, activity.id).status === "scheduled",
  );
  expect(
    outstandingNotices,
    "resolved measures leave no ballot reminders",
  ).toEqual([]);
  return next;
}

function saveAndChoosePairedBackgroundRollCalls(
  world: World,
  jurisdictionId: EntityId,
): World {
  if (world.control.kind !== "person") return world;
  const personId = world.control.personId;
  const measures = ["Rural Road Sign Replacement", "Right to work"].map(
    (shortTitle) => pairedBackgroundMeasure(world, jurisdictionId, shortTitle),
  );
  if (measures.some((measure) => !measure)) return world;
  const completeMeasures = measures as NonNullable<(typeof measures)[number]>[];
  const notices = completeMeasures.map((measure) =>
    world.history.scheduledActivities.find(
      (activity) =>
        activity.sourceEntityIds.includes(measure.id) &&
        activity.stableKey.includes(
          `${measure.id}:floor-stage:house:final-passage:`,
        ) &&
        scheduledActivityState(world, activity.id).status === "scheduled",
    ),
  );
  if (notices.some((notice) => !notice)) return world;
  const spans = notices
    .map((notice) => scheduledActivityState(world, notice!.id))
    .sort((left, right) => compareSimulationMoments(left.start, right.start));
  expect(spans[0]!.start.date).toBe(spans[1]!.start.date);
  expect(
    compareSimulationMoments(spans[0]!.end, spans[1]!.start),
  ).toBeLessThanOrEqual(0);

  // The player sees both distinct ballot questions after a save/reload and can
  // choose independently; the clock does not manufacture either vote.
  let next = reopen(world);
  expect(serializeWorld(next)).toBe(serializeWorld(world));
  const questions = completeMeasures.map((measure) =>
    memberVotesAhead(next, personId).find(
      (entry) =>
        entry.measure.id === measure.id &&
        entry.question.purpose === "floor-stage" &&
        entry.question.forumKey === "house" &&
        entry.question.floorStageKey === "final-passage",
    ),
  );
  expect(questions.every(Boolean)).toBe(true);
  expect(questions.every((entry) => entry?.ballot === null)).toBe(true);
  next = castMemberBallot(next, {
    personId,
    question: questions[0]!.question,
    ballot: "nay",
  });
  next = castMemberBallot(next, {
    personId,
    question: questions[1]!.question,
    ballot: "yea",
  });
  next = reopen(next);
  const savedQuestions = completeMeasures.map((measure) =>
    memberVotesAhead(next, personId).find(
      (entry) =>
        entry.measure.id === measure.id &&
        entry.question.purpose === "floor-stage" &&
        entry.question.forumKey === "house" &&
        entry.question.floorStageKey === "final-passage",
    ),
  );
  expect(savedQuestions.map((entry) => entry?.ballot)).toEqual(["nay", "yea"]);
  return next;
}

function expectRecordedHouseFinalPassage(
  world: World,
  shortTitle: string,
  jurisdictionId: EntityId,
  personId: EntityId,
  expectedDisposition: "yea" | "nay",
): void {
  const measure = pairedBackgroundMeasure(world, jurisdictionId, shortTitle);
  expect(measure).toBeDefined();
  const vote = world.history.legislativeVotes?.find(
    (row) =>
      row.measureId === measure!.id &&
      row.purpose === "floor-stage" &&
      row.floorStageKey === "final-passage" &&
      row.forum.kind === "chamber" &&
      row.forum.chamberKey === "house",
  );
  expect(vote).toBeDefined();
  const disposition = vote!.dispositions.find(
    (row) => row.personId === personId,
  );
  expect(
    disposition,
    JSON.stringify({
      controlledPersonId:
        world.control.kind === "person" ? world.control.personId : null,
      measureId: measure!.id,
      vote: world.history.legislativeVotes
        ?.filter((row) => row.measureId === measure!.id)
        .map((row) => ({
          takenAt: row.takenAt,
          forum: row.forum,
          purpose: row.purpose,
          floorStageKey: row.floorStageKey,
          playerDisposition: row.dispositions.find(
            (entry) => entry.personId === personId,
          ),
        })),
      ballotEvents: world.history.events
        .filter(
          (event) =>
            event.type === "legislation.member-ballot" &&
            event.involvedEntityIds.includes(measure!.id) &&
            event.involvedEntityIds.includes(personId),
        )
        .map((event) => ({ occurredAt: event.occurredAt, tags: event.tags })),
    }),
  ).toMatchObject({
    disposition: expectedDisposition,
    reason: "member:own-ballot",
  });
}

function advanceTo(
  world: World,
  target: string,
  jurisdictionId: EntityId,
): World {
  let next = world;
  let pairedRollCallsSaved = false;
  for (let guard = 0; guard < 200 && next.currentDate < target; guard++) {
    // The test driver answers optional invitations before advancing the clock,
    // as a player can. This prevents a future member-vote reminder from being
    // scheduled across an unanswered local meeting/travel hold.
    if (next.control.kind === "person") {
      const personId = next.control.personId;
      const optional = next.history.scheduledActivities.filter(
        (activity) =>
          activity.kind === "tentative" &&
          activity.participantPersonIds.includes(personId) &&
          scheduledActivityState(next, activity.id).status === "scheduled",
      );
      for (const activity of optional)
        next = declineVenueActivity(next, personId, activity.id);
    }
    try {
      next = passOrdinaryDays(next, 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const conflictId = /scheduled-activity_[a-z0-9]+/.exec(message)?.[0];
      const activity = conflictId
        ? next.history.scheduledActivities.find((row) => row.id === conflictId)
        : undefined;
      const collidingMeasureIds = [
        ...new Set(message.match(/legislative-measure_[a-f0-9]+/g) ?? []),
      ];
      const collidingMeasures = (next.history.legislativeMeasures ?? [])
        .filter((row) => collidingMeasureIds.includes(row.id))
        .map((row) => ({
          id: row.id,
          designation: row.designation,
          shortTitle: row.shortTitle,
          origin: row.origin,
          subjectClass: row.subjectClass,
          sponsorPersonId: row.sponsorPersonId,
          sourceDocumentKey: row.sourceDocumentKey,
          introducedAt: row.introducedAt,
        }));
      const associatedDueItems = next.history.futureDueItems
        .filter((row) =>
          collidingMeasureIds.some((id) => row.entityIds.includes(id)),
        )
        .map((row) => ({
          id: row.id,
          stableKey: row.stableKey,
          scheduledAt: row.scheduledAt,
          dueAt: row.dueAt,
          transitionKey: row.transitionKey,
          entityIds: row.entityIds,
          provenance: row.provenance,
          latestState: next.history.futureDueItemStates
            .filter((state) => state.dueItemId === row.id)
            .sort((a, b) => a.sequence - b.sequence)
            .at(-1),
        }));
      const associatedNotices = next.history.scheduledActivities
        .filter((row) =>
          collidingMeasureIds.some((id) => row.sourceEntityIds.includes(id)),
        )
        .map((row) => ({
          id: row.id,
          stableKey: row.stableKey,
          title: row.title,
          sourceEntityIds: row.sourceEntityIds,
        }));
      const state = activity ? scheduledActivityState(next, activity.id) : null;
      const controlledPersonId =
        next.control.kind === "person" ? next.control.personId : null;
      const pendingForPlayer = controlledPersonId
        ? next.history.scheduledActivities
            .filter((row) =>
              row.participantPersonIds.includes(controlledPersonId),
            )
            .flatMap((row) => {
              const current = scheduledActivityState(next, row.id);
              return current.status === "scheduled"
                ? [
                    {
                      stableKey: row.stableKey,
                      title: row.title,
                      kind: row.kind,
                      start: current.start,
                      end: current.end,
                    },
                  ]
                : [];
            })
        : [];
      throw new Error(
        `${message}; advancing from ${next.currentDate} to ${target}; conflict id is in current world ${Boolean(activity)}; overlapping activity ${JSON.stringify(
          activity && state
            ? {
                stableKey: activity.stableKey,
                title: activity.title,
                kind: activity.kind,
                participantPersonIds: activity.participantPersonIds,
                start: state.start,
                end: state.end,
                status: state.status,
              }
            : null,
        )}; pending activities for player ${JSON.stringify(pendingForPlayer)}; colliding measures ${JSON.stringify(collidingMeasures)}; associated due items ${JSON.stringify(associatedDueItems)}; associated notices ${JSON.stringify(associatedNotices)}`,
      );
    }
    if (!pairedRollCallsSaved) {
      const withSavedChoices = saveAndChoosePairedBackgroundRollCalls(
        next,
        jurisdictionId,
      );
      if (withSavedChoices !== next) {
        next = withSavedChoices;
        pairedRollCallsSaved = true;
      }
    }
  }
  if (next.currentDate < target)
    throw new Error(`Ordinary time did not reach ${target}.`);
  return next;
}

function earnOrdinaryCash(world: World, personId: EntityId): World {
  const provider = CAREER_PROVIDERS.find(
    (entry) => entry.pathId === "shop-assistant",
  )!;
  let result = seekCareerOffer(world, provider);
  expect(result.ok).toBe(true);
  let next = result.world;
  const engagement = next.history.workRelationships.at(-1)!;
  next = respondCareerOffer(next, engagement.id, provider, true).world;
  next = passOrdinaryDays(next, 1);
  result = startCareerWork(next, engagement.id, provider);
  expect(result.ok).toBe(true);
  next = result.world;
  for (
    let shift = 0;
    shift < 30 && cash(next, { kind: "person", personId }) < 5_000;
    shift++
  ) {
    result = performCareerWork(next, engagement.id, provider);
    if (result.ok) next = result.world;
    next = passOrdinaryDays(next, 1);
  }
  expect(cash(next, { kind: "person", personId })).toBeGreaterThanOrEqual(
    5_000,
  );
  next = resignCareer(next, engagement.id, provider).world;
  return next;
}

function fundedServiceRoute(state: "KY" | "MN" | "NV") {
  const fixture = ordinaryStateHouseFilingEntry(state);
  const profile = stateTaxServiceProfileForJurisdictionKey(
    fixture.world,
    `US-${state}`,
  )!;
  const personId = fixture.personId;
  let world = earnOrdinaryCash(fixture.world, personId);
  const entry = resolveLegislativeFilingEntry(world, personId);
  expect(entry.kind).toBe("available");
  if (entry.kind !== "available") throw new Error(entry.reason);
  expect(entry.seat.jurisdictionKey).toBe(profile.jurisdictionKey);

  const wrongTerms = stateTaxServiceProfileForJurisdictionKey(
    fixture.world,
    state === "KY" ? "US-MN" : "US-KY",
  )!.taxTerms;
  const beforeWrongFiling = serializeWorld(world);
  expect(() =>
    fileTaxProposalFromOffice(world, {
      personId,
      stableKey: `funded-service:${state}:wrong-tax`,
      terms: wrongTerms,
    }),
  ).toThrow(/exact tax terms/);
  expect(serializeWorld(world)).toBe(beforeWrongFiling);

  const tax = fileTaxProposalFromOffice(world, {
    personId,
    stableKey: `funded-service:${state}:tax`,
    terms: profile.taxTerms,
  });
  const filedTax = reopen(tax.world);
  expect(serializeWorld(filedTax)).toBe(serializeWorld(tax.world));
  expect(
    stateTaxServiceProfileForJurisdictionKey(filedTax, "US-" + state),
  ).toEqual(profile);
  world = enactThroughGenericClock(
    filedTax,
    tax.measureId,
    personId,
    entry.seat.relationshipStableKey,
  );
  world = reopen(world);
  const proposal = world.history.taxProposals!.find(
    (row) => row.measureId === tax.measureId,
  )!;
  expect(proposal.gameProfileRef).toEqual(profile.ref);
  expect(proposal.power).toBeNull();
  const taxPolicy = world.history.taxPolicies!.find(
    (row) => row.proposalId === proposal.id,
  )!;
  const taxEnactment = world.history.legislativeEnactments!.find(
    (row) => row.measureId === tax.measureId,
  )!;
  expect(taxPolicy.effectiveAt).toBe(
    addDays(taxEnactment.resolvedAt, profile.taxTerms.effectiveDelayDays),
  );
  const jurisdictionId = fixture.governingJurisdictionId;
  const initialAccount = publicTaxAccountForJurisdiction(world, jurisdictionId);
  expect(initialAccount).not.toBeNull();
  expect(
    cash(world, {
      kind: "organization",
      organizationId: initialAccount!.organizationId,
    }),
  ).toBe(0);

  const appropriation = fileDraftFromOffice(world, {
    playerPersonId: personId,
    scenarioKey: entry.scenarioKey,
    jurisdictionId,
    familyKey: profile.appropriation.familyKey,
    variantKey: profile.appropriation.variantKey,
    authorityKey: profile.appropriation.authorityKey,
    parameterValues: {
      appropriation: {
        kind: "money",
        minorUnits: profile.appropriation.amountMinorUnits,
        currency: profile.capacity.currency,
      },
      "availability-term": { kind: "duration-years", years: 1 },
      "reporting-duty": {
        kind: "enumerated",
        value: "quarterly-statement",
      },
    },
  });
  world = reopen(appropriation.world);
  expect(serializeWorld(world)).toBe(serializeWorld(appropriation.world));
  world = enactThroughGenericClock(
    world,
    appropriation.bill.measureId,
    personId,
    entry.seat.relationshipStableKey,
  );
  world = reopen(world);
  const adopted = openAppropriationsFor(world, jurisdictionId).find(
    (record) => record.programKey === profile.appropriation.programKey,
  );
  expect(adopted).toBeDefined();
  expect(adopted!.amount.minorUnits).toBe(
    profile.appropriation.amountMinorUnits,
  );
  expect(adopted!.sourceMeasureId).toBe(appropriation.bill.measureId);
  expect(
    programPosition(world, profile.appropriation.programKey).uncommitted
      .minorUnits,
  ).toBe(profile.appropriation.amountMinorUnits);
  expect(
    cash(world, {
      kind: "organization",
      organizationId: adopted!.accountOrganizationId,
    }),
  ).toBe(0);

  world = advanceTo(
    world,
    taxPolicy.effectiveAt,
    fixture.governingJurisdictionId,
  );
  if (state === "KY") {
    expectRecordedHouseFinalPassage(
      world,
      "Rural Road Sign Replacement",
      fixture.governingJurisdictionId,
      personId,
      "nay",
    );
    expectRecordedHouseFinalPassage(
      world,
      "Right to work",
      fixture.governingJurisdictionId,
      personId,
      "yea",
    );
  }
  const taxableAmount = Math.ceil(
    (profile.capacity.restorationCostPerUnitMinorUnits *
      profile.taxTerms.rateDenominator) /
      profile.taxTerms.rateNumerator,
  );
  world = declarePersonalTaxOccurrence(world, {
    personId,
    stableKey: `funded-service:${state}:occurrence`,
    proposalId: proposal.id,
    baseKey: profile.taxTerms.baseKey,
    amountMinorUnits: taxableAmount,
    assumptionNote:
      "Explicit fictional game-profile taxable occurrence for this route; not a statement of state tax law.",
  });
  const assessment = world.history.taxAssessments!.at(-1)!;
  expect(assessment.taxAmount.minorUnits).toBe(
    profile.capacity.restorationCostPerUnitMinorUnits,
  );
  const residentCashBeforeCollection = cash(world, {
    kind: "person",
    personId,
  });
  world = advanceTo(world, assessment.dueAt, fixture.governingJurisdictionId);
  const collection = world.history.taxCollections!.find(
    (row) => row.assessmentId === assessment.id,
  )!;
  expect(collection.status).toBe("collected");
  expect(collection.transferredAmount.minorUnits).toBe(
    profile.capacity.restorationCostPerUnitMinorUnits,
  );
  expect(cash(world, { kind: "person", personId })).toBe(
    residentCashBeforeCollection - collection.transferredAmount.minorUnits,
  );
  world = reopen(world);

  let authorizedWorld = ensureStateExecutiveIncumbent(world, personId, state);
  const governor = currentStateExecutiveHolders(authorizedWorld).find(
    (holder) => holder.stateUsps === state,
  );
  expect(governor).toBeDefined();
  const account = publicTaxAccountForJurisdiction(
    authorizedWorld,
    jurisdictionId,
  )!;
  expect(
    cash(authorizedWorld, {
      kind: "organization",
      organizationId: account.organizationId,
    }),
  ).toBe(collection.transferredAmount.minorUnits);
  const alternative = programAlternativesFor(authorizedWorld, adopted!).find(
    (option) => option.key === "restore-units",
  )!;
  expect(alternative.installments).toHaveLength(1);
  expect(alternative.installments[0]!.amount.minorUnits).toBe(
    profile.capacity.restorationCostPerUnitMinorUnits,
  );
  const operator = programOperatorOrganization(
    authorizedWorld,
    profile.appropriation.programKey,
    jurisdictionId,
  );
  authorizedWorld = operator.world;
  expect(
    cash(authorizedWorld, {
      kind: "organization",
      organizationId: operator.organizationId,
    }),
  ).toBe(0);
  const sameOperator = programOperatorOrganization(
    authorizedWorld,
    profile.appropriation.programKey,
    jurisdictionId,
  );
  expect(sameOperator.world).toBe(authorizedWorld);
  expect(sameOperator.organizationId).toBe(operator.organizationId);
  const committed = commitPublicProgram(authorizedWorld, {
    appropriationId: adopted!.id,
    alternative,
    personId: governor!.personId,
    office: { kind: "state-executive" },
    recipientOrganizationId: operator.organizationId,
  });
  expect(committed.ok).toBe(true);
  if (!committed.ok) throw new Error(committed.reason);
  world = committed.world;
  const paid = programInstallments(world, profile.appropriation.programKey);
  expect(paid).toHaveLength(1);
  expect(paid[0]!.status).toBe("posted");
  expect(paid[0]!.reason).toBeNull();
  expect(
    programPosition(world, profile.appropriation.programKey).unitsOperational,
  ).toBe(0);
  expect(programOutturns(world, profile.appropriation.programKey)).toHaveLength(
    0,
  );
  expect(
    cash(world, {
      kind: "organization",
      organizationId: account.organizationId,
    }),
  ).toBe(0);
  expect(
    cash(world, {
      kind: "organization",
      organizationId: operator.organizationId,
    }),
  ).toBe(profile.capacity.restorationCostPerUnitMinorUnits);
  world = reopen(world);
  expect(programInstallments(world, profile.appropriation.programKey)).toEqual(
    paid,
  );
  expect(
    cash(world, {
      kind: "organization",
      organizationId: account.organizationId,
    }),
  ).toBe(0);
  expect(
    cash(world, {
      kind: "organization",
      organizationId: operator.organizationId,
    }),
  ).toBe(profile.capacity.restorationCostPerUnitMinorUnits);

  const deliveryAt = addDays(world.currentDate, 90);
  world = advanceTo(
    world,
    addDays(deliveryAt, -1),
    fixture.governingJurisdictionId,
  );
  expect(programOutturns(world, profile.appropriation.programKey)).toHaveLength(
    0,
  );
  expect(
    programPosition(world, profile.appropriation.programKey).unitsOperational,
  ).toBe(0);
  world = advanceTo(world, deliveryAt, fixture.governingJurisdictionId);
  const outturns = programOutturns(world, profile.appropriation.programKey);
  expect(outturns).toHaveLength(1);
  const outturnEvent = world.history.events.find(
    (event) => event.id === outturns[0]!.eventId,
  );
  expect(outturnEvent?.jurisdictionId).toBe(fixture.governingJurisdictionId);
  expect(outturnEvent?.involvedEntityIds).not.toContain(personId);
  expect(
    world.history.knowledge.filter(
      (knowledge) => knowledge.eventId === outturnEvent?.id,
    ),
  ).toEqual([]);
  expect(outturns[0]!.restoredUnits).toBe(1);
  expect(outturns[0]!.unitsOperational).toBe(1);
  const capacity = programCapacity(world, profile.appropriation.programKey);
  expect(capacity?.unitsTotal).toBe(1);
  expect(capacity?.basis.kind).toBe("game-profile");
  expect(
    programPosition(world, profile.appropriation.programKey).unitsOperational,
  ).toBe(1);
  expect(
    programPosition(world, profile.appropriation.programKey).unitsTotal,
  ).toBe(1);
  const reopened = reopen(world);
  expect(programOutturns(reopened, profile.appropriation.programKey)).toEqual(
    outturns,
  );
  const later = advanceTo(
    reopened,
    addDays(deliveryAt, 7),
    fixture.governingJurisdictionId,
  );
  expect(programOutturns(later, profile.appropriation.programKey)).toHaveLength(
    1,
  );
  return { world: later, fixture, profile, tax, appropriation, collection };
}

describe("fictional state-funded school-facilities service route", () => {
  it.each(["KY", "MN", "NV"] as const)(
    "%s: an ordinary member's generic ballot and clock enact saved tax and spending terms, collect cash, pay the service, and record its delayed capacity outturn",
    (state) => {
      const result = fundedServiceRoute(state);
      expect(result.fixture.stateUsps).toBe(state);
      expect(result.profile.jurisdictionKey).toBe(`US-${state}`);
      expect(
        result.world.history.taxCollections?.some(
          (row) =>
            row.id === result.collection.id && row.status === "collected",
        ),
      ).toBe(true);
      expect(
        result.world.history.legislativeMeasures?.some(
          (row) => row.id === result.tax.measureId,
        ),
      ).toBe(true);
      expect(
        result.world.history.legislativeMeasures?.some(
          (row) => row.id === result.appropriation.bill.measureId,
        ),
      ).toBe(true);
      const outturn = programOutturns(
        result.world,
        result.profile.appropriation.programKey,
      )[0]!;
      expect(outturn).toMatchObject({
        serviceLabel: result.profile.capacity.serviceLabel,
        unitLabel: result.profile.capacity.unitLabel,
        placeLabel:
          result.world.jurisdictions[result.fixture.governingJurisdictionId]!
            .name,
        restoredUnits: 1,
      });
      const effects = enactedLawEffects(
        result.world,
        result.appropriation.bill.measureId,
      );
      const appropriationEffect = effects?.lines.find(
        (line) => line.kind === "appropriation",
      );
      expect(appropriationEffect?.kind).toBe("appropriation");
      if (appropriationEffect?.kind !== "appropriation") return;
      expect(appropriationEffect.deliveredServices).toEqual([
        {
          serviceLabel: result.profile.capacity.serviceLabel,
          unitLabel: result.profile.capacity.unitLabel,
          placeLabel:
            result.world.jurisdictions[result.fixture.governingJurisdictionId]!
              .name,
          deliveredAt: outturn.recordedAt,
          restoredUnits: 1,
        },
      ]);
      const deliverySentence = lawEffectSentences(
        result.world,
        result.appropriation.bill.measureId,
      ).find(
        (sentence) =>
          sentence.includes(result.profile.capacity.serviceLabel) &&
          sentence.includes(outturn.unitLabel!),
      );
      expect(deliverySentence).toContain(result.profile.capacity.serviceLabel);
      expect(deliverySentence).toContain(outturn.placeLabel!);
      expect(deliverySentence).toContain(outturn.unitLabel!);
      expect(deliverySentence).toContain(proseDate(outturn.recordedAt));
    },
    300_000,
  );
});
