import { describe, expect, it } from "vitest";
import { requireLifePlace } from "../../src/simulation/life-places";
import { createDemoWorld } from "../../src/simulation/demo";
import {
  addDays,
  ageOnDate,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
  recordHouseholdMembershipState,
  recordKinship,
} from "../../src/simulation/life";
import {
  createDwelling,
  startDwellingOccupancy,
  recordDwellingOccupancyState,
} from "../../src/simulation/resources";
import { activeDwellingOccupanciesAt } from "../../src/simulation/resource-queries";
import {
  assertWorldIntegrity,
  recordWorldEvent,
} from "../../src/simulation/world";
import {
  recordEvictionDestination,
  reviewTownHomes,
  TOWN_HOMES_VERSION,
  EVICTION_DESTINATION_TYPE,
  EVICTION_HOST_ANSWER_TYPE,
} from "../../src/simulation/living-world/town-homes";
import { traitRegistryFor } from "../../src/simulation/trait-registry";
import { traitDefinitionFromPack } from "../../src/simulation/trait-packs";
import {
  createMindProvenance,
  recordPersonalityTendency,
} from "../../src/simulation/mind";
import { recordRelationshipInteraction } from "../../src/simulation/records";
import type { EntityId, World } from "../../src/simulation/types";

function fixture() {
  let world = createDemoWorld("eviction-destination-fixture");
  const personId = world.personOrder.find(
    (id) => ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
  )!;
  const town = world.people[personId]!.homeJurisdictionId;
  const provenance = {
    kind: "authored" as const,
    note: "Eviction destination regression fixture.",
  };
  world = createHousehold(world, {
    stableKey: "fixture:household",
    label: "Fixture household",
    formedAt: world.currentDate,
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  for (const membership of world.history.householdMemberships.filter(
    (row) => row.personId === personId,
  )) {
    const state = world.history.householdMembershipStates
      .filter((row) => row.membershipId === membership.id)
      .at(-1)!;
    if (state.status === "ended" || state.residenceRole !== "primary") continue;
    world = recordHouseholdMembershipState(world, {
      stableKey: `fixture:end:${membership.id}`,
      membershipId: membership.id,
      effectiveAt: world.currentDate,
      status: "ended",
      residenceRole: state.residenceRole,
      kind: state.kind,
      provenance,
      supersedesStateId: state.id,
    });
  }
  world = recordHouseholdLocation(world, {
    stableKey: "fixture:location",
    householdId,
    effectiveAt: world.currentDate,
    jurisdictionId: town,
    label: "Fixture town",
    kind: "residence:primary",
    provenance,
    supersedesLocationId: null,
  });
  world = startHouseholdMembership(world, {
    stableKey: "fixture:member",
    personId,
    householdId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
  world = vacant(world, town, "former");
  const formerId = world.history.dwellings.at(-1)!.id;
  world = startDwellingOccupancy(world, {
    stableKey: "fixture:former-occupancy",
    occupant: { kind: "household", householdId },
    dwellingId: formerId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "residence:rented-home",
    provenance,
  });
  const occupancyId = world.history.dwellingOccupancies.at(-1)!.id;
  const occupancyStateId = world.history.dwellingOccupancyStates.at(-1)!.id;
  world = recordWorldEvent(world, {
    stableKey: "fixture:order",
    type: "housing.evicted",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: town,
    involvedEntityIds: [householdId, personId],
    participants: [{ personId, role: "focus:subject", detail: null }],
    personFactConstraints: [],
    visibility: "limited",
    tags: [],
    summary: "The court ordered the fixture household to leave.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const orderId = world.history.events.at(-1)!.id;
  const ended = recordDwellingOccupancyState(world, {
    stableKey: "fixture:ended",
    dwellingOccupancyId: occupancyId,
    effectiveAt: world.currentDate,
    status: "ended",
    residenceRole: "primary",
    kind: "residence:rented-home",
    reason: "Evicted.",
    provenance: { kind: "simulated-event", eventId: orderId },
    supersedesStateId: occupancyStateId,
  });
  return { world: ended, unended: world, householdId, formerId, orderId, town };
}
function vacant(world: World, town: EntityId, key: string, future = false) {
  if (future) {
    const date = addDays(world.currentDate, 30);
    world = {
      ...world,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
    };
  }
  return createDwelling(world, {
    stableKey: `${TOWN_HOMES_VERSION}:${town}:fixture:${key}`,
    establishedAt: world.currentDate,
    jurisdictionId: town,
    locationLabel: `Fixture ${key} apartment`,
    classification: "residential:apartment",
    provenance: { kind: "authored", note: "Recorded vacancy fixture." },
  });
}
function hostFixture(
  f: ReturnType<typeof fixture>,
  world: World,
  key: string,
  classification: "residential:apartment" | "residential:large-house",
  interactions: number,
) {
  const provenance = {
    kind: "authored" as const,
    note: "Host-first regression fixture.",
  };
  const used = new Set(
    world.history.householdMemberships
      .filter((row) => row.stableKey.startsWith("fixture:"))
      .map((row) => row.personId),
  );
  const personId = world.personOrder.find(
    (id) =>
      !used.has(id) &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
  )!;
  for (const membership of world.history.householdMemberships.filter(
    (row) => row.personId === personId,
  )) {
    const state = world.history.householdMembershipStates
      .filter((row) => row.membershipId === membership.id)
      .at(-1)!;
    if (state.status === "ended" || state.residenceRole !== "primary") continue;
    world = recordHouseholdMembershipState(world, {
      stableKey: `fixture:${key}:end:${membership.id}`,
      membershipId: membership.id,
      effectiveAt: world.currentDate,
      status: "ended",
      residenceRole: state.residenceRole,
      kind: state.kind,
      provenance,
      supersedesStateId: state.id,
    });
  }
  world = createHousehold(world, {
    stableKey: `fixture:${key}:household`,
    label: `${key} host household`,
    formedAt: world.currentDate,
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = recordHouseholdLocation(world, {
    stableKey: `fixture:${key}:location`,
    householdId,
    effectiveAt: world.currentDate,
    jurisdictionId: f.town,
    label: "Fixture town",
    kind: "residence:primary",
    provenance,
    supersedesLocationId: null,
  });
  world = startHouseholdMembership(world, {
    stableKey: `fixture:${key}:member`,
    personId,
    householdId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
  world = createDwelling(world, {
    stableKey: `fixture:${key}:home`,
    establishedAt: world.currentDate,
    jurisdictionId: f.town,
    locationLabel: `${key} host home`,
    classification,
    provenance,
  });
  const dwellingId = world.history.dwellings.at(-1)!.id;
  world = startDwellingOccupancy(world, {
    stableKey: `fixture:${key}:occupancy`,
    occupant: { kind: "household", householdId },
    dwellingId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "residence:owned-home",
    provenance,
  });
  const familyMember = world.history.householdMemberships.find(
    (row) => row.householdId === f.householdId,
  )!.personId;
  world = recordKinship(world, {
    stableKey: `fixture:${key}:kin`,
    personIds: [personId, familyMember],
    establishedAt: world.currentDate,
    kind: "extended:relative",
    provenance,
  });
  for (let i = 0; i < interactions; i++)
    world = recordRelationshipInteraction(world, {
      stableKey: `fixture:${key}:care:${i}`,
      personIds: [personId, familyMember],
      eventId: null,
      occurredAt: world.currentDate,
      kind: "care:helped",
      change: "strengthened",
      significance: "major",
      summary: "They cared for each other.",
      tags: [],
    });
  return { world, personId, dwellingId };
}
function outcome(f: ReturnType<typeof fixture>, world = f.world) {
  return recordEvictionDestination(world, f.householdId, f.formerId, f.orderId);
}
describe("same-day eviction destination from actual housing stock", () => {
  it("records no fixed home without creating stock and never returns to the former home", () => {
    const f = fixture();
    const original = JSON.stringify(f.world);
    const next = outcome(f);
    const event = next.history.events.at(-1)!;
    expect(event.type).toBe(EVICTION_DESTINATION_TYPE);
    expect(event.occurredAt).toBe(f.world.currentDate);
    expect(event.tags).toContain(`eviction:order:${f.orderId}`);
    expect(event.tags).toContain("housing:no-fixed-home");
    expect(event.tags).toContain("housing:destination-cost-unavailable");
    expect(next.history.dwellings).toEqual(f.world.history.dwellings);
    expect(activeDwellingOccupanciesAt(next)).toHaveLength(0);
    expect(JSON.stringify(f.world)).toBe(original);
    expect(outcome(f, next)).toBe(next);
    const saved = JSON.parse(JSON.stringify(next)) as World;
    expect(outcome(f, saved)).toBe(saved);
    const later = reviewTownHomes(
      {
        ...saved,
        currentDate: addDays(saved.currentDate, 120),
        currentMoment: simulationMomentOnLocalDate(
          saved.currentMoment,
          addDays(saved.currentDate, 120),
        ),
      },
      f.town,
      "after-eviction",
    );
    expect(
      later.history.dwellingOccupancies.filter(
        (row) =>
          row.occupant.kind === "household" &&
          row.occupant.householdId === f.householdId &&
          row.dwellingId === f.formerId,
      ),
    ).toEqual(
      next.history.dwellingOccupancies.filter(
        (row) =>
          row.occupant.kind === "household" &&
          row.occupant.householdId === f.householdId &&
          row.dwellingId === f.formerId,
      ),
    );
    assertWorldIntegrity(next);
  });
  it("records no fixed home when there is only an unpriced vacancy and no consenting host", () => {
    const f = fixture();
    const stocked = vacant(f.world, f.town, "destination");
    const next = outcome(f, stocked);
    expect(activeDwellingOccupanciesAt(next)).toHaveLength(0);
    expect(next.history.dwellings).toEqual(stocked.history.dwellings);
    expect(next.history.events.at(-1)!.tags).toContain("housing:no-fixed-home");
    assertWorldIntegrity(next);
  });
  it("counts secondary occupants and records the closest host's refusal before the next acceptance", () => {
    const f = fixture();
    const first = hostFixture(
      f,
      f.world,
      "closest",
      "residential:apartment",
      2,
    );
    const crowded = startDwellingOccupancy(first.world, {
      stableKey: "fixture:additional-resident",
      occupant: { kind: "person", personId: first.world.personOrder.at(-1)! },
      dwellingId: first.dwellingId,
      startedAt: f.world.currentDate,
      residenceRole: "secondary",
      kind: "hosted:family-arrangement",
      provenance: { kind: "authored", note: "Existing additional resident." },
    });
    const second = hostFixture(
      f,
      crowded,
      "next",
      "residential:large-house",
      1,
    );
    const original = JSON.stringify(second.world);
    const next = outcome(f, second.world);
    const answers = next.history.events.filter(
      (row) => row.type === EVICTION_HOST_ANSWER_TYPE,
    );
    expect(answers).toHaveLength(2);
    expect(answers[0]!.involvedEntityIds).toContain(first.personId);
    expect(answers[0]!.tags).toContain("housing:host-declined");
    expect(answers[1]!.involvedEntityIds).toContain(second.personId);
    expect(answers[1]!.tags).toContain("housing:host-accepted");
    expect(answers[1]!.tags).toContain("housing:bedrooms-estimated");
    expect(answers[1]!.tags).toContain("housing:host-money-unknown");
    const occupancy = next.history.dwellingOccupancies.at(-1)!;
    expect(occupancy.dwellingId).toBe(second.dwellingId);
    expect(occupancy.startedAt).toBe(f.world.currentDate);
    expect(next.history.dwellingOccupancyStates.at(-1)!.kind).toBe(
      "hosted:family-arrangement",
    );
    expect(next.history.housingTenures).toEqual(
      second.world.history.housingTenures,
    );
    expect(next.history.dwellings).toEqual(second.world.history.dwellings);
    expect(JSON.stringify(second.world)).toBe(original);
    expect(outcome(f, next)).toBe(next);
    expect(outcome(f, JSON.parse(JSON.stringify(next)))).toEqual(next);
    assertWorldIntegrity(next);
  });
  it("does not treat kinship or missing compassion as host consent", () => {
    const f = fixture();
    const host = hostFixture(
      f,
      f.world,
      "relative",
      "residential:large-house",
      0,
    );
    const next = outcome(f, host.world);
    const answer = next.history.events.find(
      (row) => row.type === EVICTION_HOST_ANSWER_TYPE,
    )!;
    expect(answer.tags).toContain("housing:host-unknown");
    expect(next.history.events.at(-1)!.tags).toContain("housing:no-fixed-home");
    expect(next.history.dwellingOccupancies).toEqual(
      host.world.history.dwellingOccupancies,
    );
    assertWorldIntegrity(next);
  });
  it("lets recorded compassion change a relative's answer while preserving its source", () => {
    const f = fixture();
    const host = hostFixture(
      f,
      f.world,
      "compassionate",
      "residential:large-house",
      0,
    );
    const trait = traitRegistryFor(host.world).traits.get(
      "personality-v1:concern-for-distress",
    )!;
    const definition = traitDefinitionFromPack(trait);
    const catalogued = {
      ...host.world,
      mindCatalog: {
        ...host.world.mindCatalog,
        tendencyOrder: [
          ...new Set([...host.world.mindCatalog.tendencyOrder, definition.id]),
        ],
        tendencies: {
          ...host.world.mindCatalog.tendencies,
          [definition.id]: definition,
        },
      },
    };
    const withConcern = (expressionKey: string) =>
      recordPersonalityTendency(catalogued, {
        stableKey: "fixture:concern",
        personId: host.personId,
        tendencyId: definition.id,
        recordedAt: f.world.currentDate,
        expressionKey,
        strength: "strong",
        confidence: "high",
        scopeTags: [],
        provenance: createMindProvenance("authored", {
          note: "Explicit regression trait.",
        }),
        supersedesTendencyId: null,
      });
    const compassionate = withConcern(trait.poles.high.key);
    const accepted = outcome(f, compassionate);
    const answer = accepted.history.events.find(
      (row) => row.type === EVICTION_HOST_ANSWER_TYPE,
    )!;
    expect(answer.tags).toContain("housing:host-accepted");
    expect(answer.tags).toContain(
      `housing:compassion-source:${compassionate.history.personalityTendencies.at(-1)!.id}`,
    );
    expect(accepted.history.dwellingOccupancies.at(-1)!.dwellingId).toBe(
      host.dwellingId,
    );
    const declined = outcome(f, withConcern(trait.poles.low.key));
    expect(
      declined.history.events.find(
        (row) => row.type === EVICTION_HOST_ANSWER_TYPE,
      )!.tags,
    ).toContain("housing:host-declined");
    expect(declined.history.events.at(-1)!.tags).toContain(
      "housing:no-fixed-home",
    );
    assertWorldIntegrity(accepted);
    assertWorldIntegrity(declined);
  });
  it("asks an actually close friend before a warmer but estranged relative", () => {
    const f = fixture();
    const relative = hostFixture(
      f,
      f.world,
      "estranged",
      "residential:large-house",
      3,
    );
    const member = relative.world.history.householdMemberships.find(
      (row) => row.householdId === f.householdId,
    )!.personId;
    const strained = recordRelationshipInteraction(relative.world, {
      stableKey: "fixture:live-friction",
      personIds: [relative.personId, member],
      eventId: null,
      occurredAt: f.world.currentDate,
      kind: "conflict:falling-out",
      change: "strained",
      significance: "major",
      summary: "Their quarrel is unresolved.",
      tags: [],
    });
    const refusal = outcome(f, strained).history.events.find(
      (row) => row.type === EVICTION_HOST_ANSWER_TYPE,
    )!;
    expect(refusal.tags).toContain("housing:host-declined");
    expect(refusal.summary).toContain("estranged");
    expect(refusal.tags).toContain(
      `housing:estrangement-source:${strained.history.relationshipInteractions.at(-1)!.id}`,
    );
    const friend = hostFixture(
      f,
      strained,
      "close-friend",
      "residential:large-house",
      1,
    );
    const world = friend.world;
    const next = outcome(f, world);
    const answers = next.history.events.filter(
      (row) => row.type === EVICTION_HOST_ANSWER_TYPE,
    );
    expect(answers).toHaveLength(1);
    expect(answers[0]!.involvedEntityIds).toContain(friend.personId);
    expect(answers[0]!.tags).toContain("housing:host-accepted");
    expect(next.history.dwellingOccupancies.at(-1)!.dwellingId).toBe(
      friend.dwellingId,
    );
  });
  it("records unresolved travel when an accepted host is in another town and the existing player move rule blocks it", () => {
    const f = fixture();
    const place = requireLifePlace("1608830");
    const otherTown = place.context.jurisdiction.id;
    const withPlace = {
      ...f.world,
      jurisdictions: {
        ...f.world.jurisdictions,
        [otherTown]: place.context.jurisdiction,
      },
      jurisdictionOrder: [...f.world.jurisdictionOrder, otherTown],
    };
    const host = hostFixture(
      { ...f, town: otherTown },
      withPlace,
      "other-town",
      "residential:large-house",
      1,
    );
    const member = host.world.history.householdMemberships.find(
      (row) => row.householdId === f.householdId,
    )!.personId;
    const world = {
      ...host.world,
      control: { kind: "person" as const, personId: member },
    };
    const next = outcome(f, world);
    expect(
      next.history.events.find((row) => row.type === EVICTION_HOST_ANSWER_TYPE)!
        .tags,
    ).toContain("housing:host-accepted");
    expect(
      next.history.events.some(
        (row) => row.type === "housing.eviction-host-move-unresolved",
      ),
    ).toBe(true);
    expect(next.history.events.at(-1)!.tags).toContain("housing:no-fixed-home");
    expect(next.people[member]!.homeJurisdictionId).toBe(
      world.people[member]!.homeJurisdictionId,
    );
    expect(next.history.dwellingOccupancies).toEqual(
      world.history.dwellingOccupancies,
    );
    assertWorldIntegrity(next);
  });
  it("does not use relationship warmth recorded after the eviction date", () => {
    const f = fixture();
    const host = hostFixture(
      f,
      f.world,
      "later-friend",
      "residential:large-house",
      0,
    );
    const date = addDays(f.world.currentDate, 30);
    let world = {
      ...host.world,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(
        host.world.currentMoment,
        date,
      ),
    };
    const member = world.history.householdMemberships.find(
      (row) => row.householdId === f.householdId,
    )!.personId;
    world = recordRelationshipInteraction(world, {
      stableKey: "fixture:later-care",
      personIds: [host.personId, member],
      eventId: null,
      occurredAt: date,
      kind: "care:helped",
      change: "strengthened",
      significance: "major",
      summary: "Later care.",
      tags: [],
    });
    const next = outcome(f, world);
    expect(
      next.history.events.find((row) => row.type === EVICTION_HOST_ANSWER_TYPE)!
        .tags,
    ).toContain("housing:host-unknown");
    expect(next.history.events.at(-1)!.tags).toContain("housing:no-fixed-home");
  });
  it("does not allocate future stock or a dwelling another household occupies", () => {
    const f = fixture();
    let world = vacant(f.world, f.town, "occupied");
    const dwellingId = world.history.dwellings.at(-1)!.id;
    world = createHousehold(world, {
      stableKey: "fixture:other",
      label: "Other fixture household",
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: "Occupancy fixture." },
    });
    world = startDwellingOccupancy(world, {
      stableKey: "fixture:occupied",
      occupant: {
        kind: "household",
        householdId: world.history.households.at(-1)!.id,
      },
      dwellingId,
      startedAt: world.currentDate,
      residenceRole: "primary",
      kind: "residence:rented-home",
      provenance: { kind: "authored", note: "Occupancy fixture." },
    });
    world = vacant(world, f.town, "future", true);
    const next = outcome(f, world);
    expect(next.history.events.at(-1)!.tags).toContain("housing:no-fixed-home");
    expect(activeDwellingOccupanciesAt(next)).toHaveLength(1);
    expect(next.history.dwellings).toEqual(world.history.dwellings);
  });
  it("requires the former occupancy to end before recording the destination", () => {
    const f = fixture();
    expect(() => outcome(f, f.unended)).toThrow(
      "End the evicted home's occupancy",
    );
  });
});
