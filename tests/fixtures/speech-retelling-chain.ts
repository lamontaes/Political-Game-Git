import { expect } from "vitest";
import { smallWorld } from "./small-world";

import { ageOnDate } from "../../src/simulation/dates";

import { recordKinship } from "../../src/simulation/life";
import { recordTraitChange } from "../../src/simulation/people-traits";
import { recordMemory } from "../../src/simulation/records";
import {
  recordSpeechReception,
  householdmatesOf,
  familyAndFriendsNearby,
} from "../../src/simulation/speech-reception";

import type { EntityId, World } from "../../src/simulation/types";
import { recordWorldEvent } from "../../src/simulation/world";

export function fixture(openedWorld?: World) {
  let world =
    openedWorld ??
    smallWorld({
      place: "NH",
      date: "2026-12-15",
      people: 16,
      seed: "a9-three-retellings",
    }).world;
  // Public Begin includes people from many jurisdictions. Retelling contacts
  // must share their recorded home; this fixture does not move anyone.
  const eligible = world.personOrder.filter(
    (id) =>
      ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 5 &&
      householdmatesOf(world, id).length === 0 &&
      !world.history.personDeaths.some(
        (death) => death.personId === id && death.diedAt <= world.currentDate,
      ),
  );
  const byHome = new Map<EntityId, EntityId[]>();
  for (const id of eligible) {
    const home = world.people[id]!.homeJurisdictionId;
    const group = byHome.get(home) ?? [];
    group.push(id);
    byHome.set(home, group);
  }
  const isolated =
    [...byHome.values()].find((group) => group.length >= 5) ?? [];
  expect(isolated.length).toBeGreaterThanOrEqual(5);
  const [speaker, first, second, third, fourth] = isolated as [
    EntityId,
    EntityId,
    EntityId,
    EntityId,
    EntityId,
  ];
  expect(
    new Set(
      [speaker, first, second, third, fourth].map(
        (id) => world.people[id]!.homeJurisdictionId,
      ),
    ).size,
  ).toBe(1);
  const event = (
    stableKey: string,
    type: `${string}.${string}`,
    tags: readonly string[],
    involvedEntityIds: readonly EntityId[],
  ) => {
    world = recordWorldEvent(world, {
      stableKey,
      type,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.people[speaker]!.homeJurisdictionId,
      involvedEntityIds,
      participants:
        type === "speech.given"
          ? [
              {
                personId: speaker,
                role: "focus:subject",
                detail: "Gave the speech",
              },
              {
                personId: first,
                role: "observation:witness",
                detail: "Heard the speech",
              },
            ]
          : [],
      personFactConstraints: [],
      visibility: "public",
      tags,
      summary: "An authored fixture speech and its reception.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    return world.history.events.at(-1)!;
  };
  const speech = event("a9:speech", "speech.given", [], [speaker, first]);
  for (const [a, b] of [
    [first, second],
    [second, third],
    [third, fourth],
  ] as const) {
    world = recordKinship(world, {
      stableKey: `a9:kin:${a}:${b}`,
      personIds: [a, b],
      establishedAt: world.currentDate,
      kind: "collateral:sibling",
      provenance: {
        kind: "authored",
        note: "Fixture isolates a three-link retelling chain.",
      },
    });
  }
  // Assert the recorded kinship chain is eligible under the production reader.
  expect(familyAndFriendsNearby(world, first)).toContain(second);
  expect(familyAndFriendsNearby(world, second)).toContain(third);
  expect(familyAndFriendsNearby(world, third)).toContain(fourth);
  const social = event(
    "a9:social",
    "person.socialized",
    [],
    [first, second, third, fourth],
  );
  for (const id of [first, second, third, fourth]) {
    world = recordTraitChange(world, {
      personId: id,
      trait: "sociability",
      value: 2,
      eventId: social.id,
      reason: "Authored outgoing fixture; no new production trait rule.",
    });
  }
  // The actual reception writer records access and schedules this world's clock.
  world = recordSpeechReception(world, speech, speaker, [first], "victory");
  world = recordMemory(world, {
    stableKey: "a9:original-memory",
    personId: first,
    eventId: speech.id,
    formedAt: world.currentDate,
    rememberedSummary: speech.summary,
    interpretation: "Heard the speech.",
    strength: "defining",
    relevanceTags: ["speech.heard"],
    supersedesMemoryId: null,
  });
  return {
    world,
    speech,
    second,
    third,
    fourth,
  };
}
