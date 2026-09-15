import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import {
  addDays,
  advanceWorld,
  assertWorldIntegrity,
  campaignState,
  candidacyPackForJurisdiction,
  createFutureTransitionHandlerRegistry,
  createOrganization,
  createResourcePosition,
  createStableId,
  makeCurrencyCode,
  createWorkRelationship,
  electionContestResult,
  ensureCampaignSupportMetric,
  recordWorldEvent,
  recordWorkStatus,
  resolveElectionContest,
  requireLifePlace,
  scheduleElectionContest,
  type CampaignRecord,
  type EntityId,
  type World,
} from "../../src/simulation";

/**
 * Supplied-result boundary fixture, not a campaign forecast or a normal-play
 * election producer proof. Fictional ballots and an explicit terminal/seat
 * receipt are supplied; production result/work writers validate those inputs.
 */
export function suppliedLegislativeSeat(stateKey: string, chamberKey: string) {
  const placeKey =
    (
      {
        "US-KY": "kentucky",
        "US-NE": "nebraska",
        "US-AK": "alaska",
      } as Readonly<Record<string, string>>
    )[stateKey] ?? `state:${stateKey}`;
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: `s30-s-supplied:${stateKey}:${chamberKey}`,
    placeKey,
    startAge: 40,
    startingLife: "ordinary-life",
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
  });
  return addSuppliedLegislativeSeat(
    built.world,
    built.playerPersonId,
    stateKey,
    chamberKey,
  );
}

/** Add another independently supplied raw result/work chain to the same World. */
export function addSuppliedLegislativeSeat(
  initialWorld: World,
  personId: EntityId,
  stateKey: string,
  chamberKey: string,
  namespace = "s30-s",
) {
  const placeKey =
    (
      {
        "US-KY": "kentucky",
        "US-NE": "nebraska",
        "US-AK": "alaska",
      } as Readonly<Record<string, string>>
    )[stateKey] ?? `state:${stateKey}`;
  const place = requireLifePlace(placeKey);
  const pack = candidacyPackForJurisdiction(place.context.jurisdiction.id)!;
  const office = pack.offices.find(
    (entry) =>
      entry.officeKey === `${pack.legislativeRulePackId}:${chamberKey}`,
  )!;
  if (!office)
    throw new Error(`No actual office for ${stateKey}/${chamberKey}.`);
  let world = ensureCampaignSupportMetric(initialWorld);
  const filedAt = world.currentDate;
  world = recordWorldEvent(world, {
    stableKey: `${namespace}:supplied-filing`,
    type: "campaign.candidacy-filed",
    occurredAt: filedAt,
    recordedAt: filedAt,
    jurisdictionId: place.context.jurisdiction.id,
    involvedEntityIds: [personId],
    participants: [
      {
        personId,
        role: "agency:candidate",
        detail: "Supplied fictional candidacy receipt.",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["campaign.filing"],
    summary: "Supplied fictional candidacy record.",
    context: {
      location: {
        jurisdictionId: place.context.jurisdiction.id,
        label: place.displayName,
        setting: null,
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const filingEventId = world.history.events.at(-1)!.id;
  const rivalId = world.personOrder.find((id) => id !== personId)!;
  world = scheduleElectionContest(world, {
    stableKey: `${namespace}:supplied-contest`,
    jurisdictionId: place.context.jurisdiction.id,
    office: office.office,
    electionDate: addDays(world.currentDate, 28),
    candidatePersonIds: [personId, rivalId],
    provenance: {
      method: "authored",
      sourceEntityIds: [],
      note: "Supplied fictional contest; eligibility and ordinary election production are outside this boundary fixture.",
    },
  });
  const contest = world.history.electionContests!.at(-1)!;
  const organizationIds: EntityId[] = [];
  for (const name of ["committee", "donor", "vendor"]) {
    world = createOrganization(world, {
      stableKey: `${namespace}:${name}`,
      formedAt: world.currentDate,
      detailLevel: "lightweight",
      provenance: {
        kind: "authored",
        note: "Supplied campaign-root fixture, with no support values or forecast.",
      },
      initialProfile: {
        name: `Fictional ${name}`,
        classification:
          name === "committee"
            ? "custom:political-campaign"
            : "sector:government",
        locationJurisdictionId: place.context.jurisdiction.id,
      },
    });
    organizationIds.push(world.history.organizations.at(-1)!.id);
  }
  world = createResourcePosition(world, {
    stableKey: `${namespace}:treasury`,
    owner: { kind: "organization", organizationId: organizationIds[0]! },
    openedAt: world.currentDate,
    openingBalance: { minorUnits: 0, currency: makeCurrencyCode("USD") },
    provenance: { kind: "authored", note: "Empty supplied account." },
  });
  const treasuryPositionId = world.history.resourcePositions.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: `${namespace}:candidate-work`,
    personId,
    organizationId: organizationIds[0]!,
    startedAt: world.currentDate,
    kind: "service:campaign-candidate",
    compensation: "unpaid",
    authority: "shared",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: {
      kind: "authored",
      note: "Supplied candidacy receipt; no political score is assigned.",
    },
    initialRole: {
      title: "Fictional candidate",
      occupationClassification: "service:campaign-candidate",
      locationJurisdictionId: place.context.jurisdiction.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 5, maximumHours: 30 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: place.context.jurisdiction.id,
      },
    },
  });
  const campaign: CampaignRecord = {
    id: createStableId(
      "campaign",
      `${world.id}:${namespace}:supplied-campaign`,
    ),
    stableKey: `${namespace}:supplied-campaign`,
    sequence: world.history.nextSequence,
    contestId: contest.id,
    candidatePersonId: personId,
    jurisdictionId: place.context.jurisdiction.id,
    officeKey: office.officeKey,
    candidacyPackId: pack.packId,
    compliancePackId: null,
    organizationId: organizationIds[0]!,
    donorPoolOrganizationId: organizationIds[1]!,
    advertisingVendorOrganizationId: organizationIds[2]!,
    treasuryPositionId,
    treasuryCurrency: makeCurrencyCode("USD"),
    candidateWorkRelationshipId: world.history.workRelationships.at(-1)!.id,
    staffWorkRelationshipIds: [],
    supportMetricId: world.metricCatalog.definitionOrder.find(
      (id) =>
        world.metricCatalog.definitions[id]!.domainKey === "campaign.support",
    )!,
    candidateSupportScopes: contest.candidatePersonIds.map(
      (candidatePersonId) => ({
        candidatePersonId,
        segmentKey: `supplied.${candidatePersonId}`,
      }),
    ),
    filingEventId,
    filedAt,
  };
  const initialStateKey = `${campaign.stableKey}:state:active`;
  world = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 2,
      campaigns: [...(world.history.campaigns ?? []), campaign],
      campaignStates: [
        ...(world.history.campaignStates ?? []),
        {
          id: createStableId(
            "campaign-state",
            `${world.id}:${initialStateKey}`,
          ),
          stableKey: initialStateKey,
          sequence: world.history.nextSequence + 1,
          campaignId: campaign.id,
          effectiveAt: filedAt,
          status: "active",
          electionResultId: null,
          reason: "Supplied fixture receipt.",
          supersedesStateId: null,
        },
      ],
    },
  };
  world = advanceWorld(
    world,
    28,
    createFutureTransitionHandlerRegistry([
      [
        "election:contest-resolution",
        (atDate) => {
          let resolved = resolveElectionContest(atDate, {
            contestId: contest.id,
            winnerPersonId: personId,
            tallies: contest.candidatePersonIds.map((candidatePersonId) => ({
              candidatePersonId,
              votes: candidatePersonId === personId ? 2 : 1,
              voteShare: candidatePersonId === personId ? 2 / 3 : 1 / 3,
            })),
            provenance: {
              method: "authored",
              sourceEntityIds: [],
              note: "Explicit fictional recorded ballots; no outcome model invoked.",
            },
          });
          resolved = supplyWonReceipt(resolved, campaign);
          return {
            world: resolved,
            status: "resolved",
            reasonKey: null,
            context: "Supplied fictional result fixture.",
            outcomeEventId: electionContestResult(resolved, contest.id)!
              .outcomeEventId,
          };
        },
      ],
    ]),
  );
  const result = electionContestResult(world, contest.id)!;
  for (const relationshipId of [
    campaign.candidateWorkRelationshipId,
    ...campaign.staffWorkRelationshipIds,
  ]) {
    const previous = world.history.workStatuses
      .filter((status) => status.workRelationshipId === relationshipId)
      .at(-1)!;
    world = recordWorkStatus(world, {
      stableKey: `${namespace}:campaign-ended:${relationshipId}`,
      workRelationshipId: relationshipId,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "Supplied result ended this fixture campaign.",
      supersedesStatusId: previous.id,
      provenance: { kind: "simulated-event", eventId: result.outcomeEventId },
    });
  }
  world = createOrganization(world, {
    stableKey: `${namespace}:legislature:${pack.packId}`,
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "Fictional institutional employer at the sourced governing jurisdiction.",
    },
    initialProfile: {
      name: pack.displayName,
      classification: "sector:government",
      locationJurisdictionId: place.context.jurisdiction.id,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: `${campaign.stableKey}:seat`,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:legislative-member",
    compensation: "paid",
    authority: "shared",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "simulated-event", eventId: result.outcomeEventId },
    initialRole: {
      title: office.office.title,
      occupationClassification: "service:elected-legislator",
      locationJurisdictionId: place.context.jurisdiction.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 10, maximumHours: 45 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: place.context.jurisdiction.id,
      },
    },
  });
  assertWorldIntegrity(world);
  return {
    world,
    personId,
    jurisdictionId: place.context.jurisdiction.id,
    packId: pack.legislativeRulePackId,
    fixtureKind: "supplied-result-and-seat" as const,
  };
}

export function endSuppliedSeat(world: World): World {
  const relationship = world.history.workRelationships.find(
    (entry) => entry.kind === "employment:legislative-member",
  )!;
  const previous = world.history.workStatuses
    .filter((entry) => entry.workRelationshipId === relationship.id)
    .at(-1)!;
  return recordWorkStatus(world, {
    stableKey: "s30-s:seat-ended",
    workRelationshipId: relationship.id,
    effectiveAt: world.currentDate,
    status: "ended",
    reason: "The supplied fixture's current seat ended.",
    supersedesStatusId: previous.id,
    provenance: {
      kind: "authored",
      note: "Ended-seat test input; no invented legal expiry date.",
    },
  });
}

function supplyWonReceipt(world: World, campaign: CampaignRecord): World {
  const result = electionContestResult(world, campaign.contestId)!;
  const previousState = campaignState(world, campaign.id);
  const stableKey = `${campaign.stableKey}:state:won`;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      campaignStates: [
        ...(world.history.campaignStates ?? []),
        {
          id: createStableId("campaign-state", `${world.id}:${stableKey}`),
          stableKey,
          sequence: world.history.nextSequence,
          campaignId: campaign.id,
          effectiveAt: world.currentDate,
          status: "won",
          electionResultId: result.id,
          reason: "Supplied fictional result receipt.",
          supersedesStateId: previousState.id,
        },
      ],
    },
  };
}
