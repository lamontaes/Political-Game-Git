import {
  ageOnDate,
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  createStableId,
  drawCanonicalName,
  makeIsoDate,
  SeededRng,
  recordWorldEvent,
} from "../simulation";
import {
  createOrganizationParticipation,
  recordOrganizationParticipationState,
} from "../simulation/life";
import { activeOrganizationParticipationsAt } from "../simulation/life-queries";
import { refreshLifeOpportunities } from "../simulation/life-opportunities";
import { establishLifePersonality } from "../simulation/life-personality";
import type { EntityId, World } from "../simulation";

const KEY = "opening-life:walking-group:v1";

export function canJoinOrdinaryGroup(
  world: World,
  personId: EntityId,
): boolean {
  const person = world.people[personId];
  return (
    !!person &&
    world.control.kind === "person" &&
    world.control.personId === personId &&
    ageOnDate(person.birthDate, world.currentDate) >= 18 &&
    !world.history.personDeaths.some(
      (entry) =>
        entry.personId === personId && entry.diedAt <= world.currentDate,
    ) &&
    !activeOrganizationParticipationsAt(world, personId).some(
      (entry) =>
        entry.participation.organizationId ===
        createStableId("organization", `${world.id}:${KEY}`),
    )
  );
}

/** Explicitly joining an authored social group establishes participation, not attendance or a career. */
export function joinOrdinaryGroup(world: World, personId: EntityId): World {
  if (!canJoinOrdinaryGroup(world, personId)) return world;
  const person = world.people[personId]!;
  const memberKey = `${KEY}:organizer`;
  const memberId = characterHistoryContextPersonId(world, memberKey);
  const organizationId = createStableId("organization", `${world.id}:${KEY}`);
  const rng = new SeededRng(world.seed).fork(memberKey);
  const provenance = { kind: "generated" as const, generatorKey: KEY };
  let next = world;
  if (
    !world.history.organizations.some((entry) => entry.id === organizationId)
  ) {
    next = applyCharacterHistoryPlan(next, {
      stableKey: KEY,
      mode: "quick-generated",
      personId,
      transitions: [
        {
          kind: "context-person",
          input: {
            stableKey: memberKey,
            ...drawCanonicalName(rng),
            birthDate: makeIsoDate(
              `${Number(world.currentDate.slice(0, 4)) - 35}-01-01`,
            ),
            homeJurisdictionId: person.homeJurisdictionId,
          },
        },
        {
          kind: "organization",
          input: {
            stableKey: KEY,
            formedAt: world.currentDate,
            provenance,
            initialProfile: {
              name: "Neighborhood walking group",
              classification: "community:recreation",
              locationJurisdictionId: person.homeJurisdictionId,
            },
          },
        },
      ],
    }).world;
    next = establishLifePersonality(next, memberId);
    next = createOrganizationParticipation(next, {
      stableKey: `${KEY}:organizer-participation`,
      personId: memberId,
      organizationId,
      startedAt: world.currentDate,
      kind: "activity:walking",
      roleKind: "leader:organizer",
      context: "Organizes this fictional walking group.",
      provenance,
    });
  }
  const previous = next.history.organizationParticipations
    .filter(
      (entry) =>
        entry.personId === personId && entry.organizationId === organizationId,
    )
    .at(-1);
  const previousState = previous
    ? next.history.organizationParticipationStates
        .filter((entry) => entry.participationId === previous.id)
        .at(-1)
    : undefined;
  const joinKey = previous
    ? `${KEY}:rejoin:${personId}:${next.history.nextSequence}`
    : `${KEY}:join:${personId}`;
  next = recordWorldEvent(next, {
    stableKey: joinKey,
    type: "life.group-joined",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: person.homeJurisdictionId,
    involvedEntityIds: [personId, organizationId, memberId],
    participants: [
      { personId, role: "focus:subject", detail: "Joined the walking group" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [KEY, "provenance:player-choice"],
    summary: "You joined the neighborhood walking group.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: "Join the walking group",
      motivation: null,
      immediateReaction: null,
    },
  });
  const participationProvenance = {
    kind: "simulated-event" as const,
    eventId: next.history.events.at(-1)!.id,
  };
  if (previous && previousState?.status === "inactive") {
    next = recordOrganizationParticipationState(next, {
      stableKey: `${joinKey}:active`,
      participationId: previous.id,
      effectiveAt: next.currentDate,
      status: "active",
      roleKind: "participant:member",
      context:
        "Resumed by explicit player choice; no meeting attendance is implied.",
      provenance: participationProvenance,
      supersedesStateId: previousState.id,
    });
  } else
    next = createOrganizationParticipation(next, {
      stableKey: previous
        ? `${joinKey}:participation`
        : `${KEY}:participation:${personId}`,
      personId,
      organizationId,
      startedAt: world.currentDate,
      kind: "activity:walking",
      roleKind: "participant:member",
      context:
        "Joined by explicit player choice; no meeting attendance is implied.",
      provenance: participationProvenance,
    });
  return refreshLifeOpportunities(next, personId);
}
