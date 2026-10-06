import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addDays, ageOnDate, simulationMomentOnLocalDate } from "./dates";
import {
  createOrganization,
  createOrganizationParticipation,
  recordOrganizationParticipationState,
} from "./life";
import { activeOrganizationParticipationsAt } from "./life-queries";
import {
  CIVIC_ACTION_EVENTS,
  reviewTownCivicActions,
} from "./living-world/civic-actions";
import { ensureLocalGovernmentSeats } from "./living-world/local-government-seats";
import {
  ensureLocalCouncilMeetings,
  LOCAL_COUNCIL_MEETING,
  localCouncilMeetingHandlers,
} from "./living-world/local-council-meetings";
import {
  cancelFutureDueItem,
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "./future-transitions";
import { placeLocalGovernmentUnits } from "./nationwide-world/local-governments";
import { localGoverningBodyRules } from "./nationwide-world/local-governing-body-rules";
import { withWorldIntegrityDeferred } from "./world";
import type { World } from "./types";

const seed = "session-110-standing-group";
const place = drawRandomPlace(seed, (row) =>
  placeLocalGovernmentUnits(row).municipal.some(
    (unit) =>
      localGoverningBodyRules(unit)?.seats !== null &&
      localGoverningBodyRules(unit) !== null,
  ),
);
const provenance = {
  kind: "authored" as const,
  note: "Standing-group participation contract fixture; group founding/recruiting producer is not on main.",
};

function groupWorld(worldSeed: string) {
  const fixture = smallWorld({
    place: place.key,
    seed: worldSeed,
    people: 24,
    offices: ["governor"],
  });
  let world = ensureLocalCouncilMeetings(
    ensureLocalGovernmentSeats(fixture.world, fixture.personId),
    fixture.personId,
  );
  world = createOrganization(world, {
    stableKey: "standing-group:contract",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Residents for the shared campaign cause",
      classification: "membership:standing-group",
      locationJurisdictionId: fixture.jurisdictionId,
    },
  });
  const group = world.history.organizations.at(-1)!;
  const members = fixture.world.personOrder.filter(
    (id) =>
      id !== fixture.personId &&
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
  );
  const without = world;
  for (const personId of members)
    world = createOrganizationParticipation(world, {
      stableKey: `standing-group:${personId}`,
      personId,
      organizationId: group.id,
      startedAt: world.currentDate,
      kind: "membership:standing-group-member",
      roleKind: "member:standing-group",
      context: "Joined the shared cause through the participation contract.",
      provenance,
    });
  return { fixture, world, without, group, members };
}

function civicYear(input: ReturnType<typeof groupWorld>, opening: World) {
  let world = opening;
  world = withWorldIntegrityDeferred(() => {
    let next = world;
    for (const item of world.history.futureDueItems) {
      if (item.transitionKey === LOCAL_COUNCIL_MEETING) continue;
      const status = futureDueItemStateAt(next, item.id, {
        asOfDate: next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      });
      if (status?.status === "scheduled")
        next = cancelFutureDueItem(next, {
          stableKey: `group-contract:calendar:${item.id}`,
          dueItemId: item.id,
          effectiveAt: next.currentDate,
          reasonKey: "group-contract:calendar-isolation",
          context:
            "Isolate the generated council calendar from unrelated transitions.",
        });
    }
    return next;
  });
  const handlers = createFutureTransitionHandlerRegistry(
    localCouncilMeetingHandlers(),
  );
  for (let quarter = 0; quarter < 4; quarter++) {
    const date = addDays(world.currentDate, 91);
    world = resolveFutureDueItemsThrough(world, date, handlers);
    world = {
      ...world,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(world.currentMoment, date),
    };
    world = reviewTownCivicActions(
      world,
      input.fixture.jurisdictionId,
      input.fixture.personId,
      `group-contract:${quarter}`,
    );
  }
  return world;
}

describe("standing-group members use the existing civic path", () => {
  it("raises active members' civic stake and records their council attendance over a year", () => {
    const input = groupWorld(seed);
    expect(
      input.world.history.futureDueItems.some(
        (row) => row.transitionKey === LOCAL_COUNCIL_MEETING,
      ),
    ).toBe(true);
    const withMembers = civicYear(input, input.world);
    const withoutMembers = civicYear(input, input.without);
    const rows = (world: World, type: string) =>
      world.history.events.filter(
        (event) =>
          event.type === type &&
          event.participants.some((person) =>
            input.members.includes(person.personId),
          ),
      );
    expect(
      rows(withMembers, CIVIC_ACTION_EVENTS.contacted).length,
    ).toBeGreaterThan(
      rows(withoutMembers, CIVIC_ACTION_EVENTS.contacted).length,
    );
    expect(
      rows(withMembers, CIVIC_ACTION_EVENTS.attended).length,
    ).toBeGreaterThan(0);
    for (const event of rows(withMembers, CIVIC_ACTION_EVENTS.attended)) {
      expect(event.tags.some((tag) => tag.startsWith("meeting:"))).toBe(true);
      expect(
        event.participants.some((row) => input.members.includes(row.personId)),
      ).toBe(true);
    }
    expect(
      input.members.filter((id) =>
        activeOrganizationParticipationsAt(withMembers, id).some(
          (row) => row.participation.organizationId === input.group.id,
        ),
      ),
    ).toEqual(input.members);
    process.stdout.write(
      `${JSON.stringify({ seed, place: place.key, worldId: withMembers.id, date: withMembers.currentDate, groupId: input.group.id, memberIds: input.members, contacts: rows(withMembers, CIVIC_ACTION_EVENTS.contacted).map((row) => row.id), attendance: rows(withMembers, CIVIC_ACTION_EVENTS.attended).map((row) => row.id) })}\n`,
    );
  });

  it("uses participation status rather than counting people who ended membership", () => {
    const input = groupWorld(`${seed}:ended`);
    let world = input.world;
    for (const personId of input.members) {
      const active = activeOrganizationParticipationsAt(world, personId).find(
        (row) => row.participation.organizationId === input.group.id,
      )!;
      world = recordOrganizationParticipationState(world, {
        stableKey: `standing-group:end:${personId}`,
        participationId: active.participation.id,
        effectiveAt: world.currentDate,
        status: "ended",
        roleKind: null,
        context: "The resident ended this membership.",
        provenance,
        supersedesStateId: active.state.id,
      });
    }
    const ended = civicYear(input, world);
    const without = civicYear(input, input.without);
    const actions = (at: World) =>
      at.history.events
        .filter((row) =>
          Object.values(CIVIC_ACTION_EVENTS).includes(
            row.type as typeof CIVIC_ACTION_EVENTS.contacted,
          ),
        )
        .map((row) => row.stableKey);
    expect(actions(ended)).toEqual(actions(without));
  });
});
