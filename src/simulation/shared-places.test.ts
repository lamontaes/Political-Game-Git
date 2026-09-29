import { describe, expect, test } from "vitest";
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "./character-history";
import { makeIsoDate } from "./dates";
import {
  createEducationEnrollment,
  createOrganization,
  createOrganizationParticipation,
  recordKinship,
} from "./life";
import { peopleKnownTo } from "./living-world/official-views";
import { createPortabilityFixture } from "./portability-fixture";
import { sharedPlaceAcquaintances } from "./shared-places";
import type { EntityId, OrganizationParticipationKind, World } from "./types";

const PROVENANCE = { kind: "generated" as const, generatorKey: "test" };

function organization(world: World, key: string, name: string) {
  const next = createOrganization(world, {
    stableKey: `test:${key}`,
    formedAt: "2000-01-01",
    provenance: PROVENANCE,
    initialProfile: {
      name,
      classification: "community:group",
      locationJurisdictionId: null,
    },
  });
  const id = next.history.organizations.find(
    (row) => row.stableKey === `test:${key}`,
  )!.id;
  return { world: next, id };
}

function join(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
  kind: OrganizationParticipationKind,
): World {
  return createOrganizationParticipation(world, {
    stableKey: `test:${personId}:${organizationId}:${kind}`,
    personId,
    organizationId,
    startedAt: "2020-01-01",
    kind,
    roleKind: null,
    context: null,
    provenance: PROVENANCE,
  });
}

function parentOf(world: World, parent: EntityId, child: EntityId): World {
  return recordKinship(world, {
    stableKey: `test:parent:${parent}:${child}`,
    personIds: [parent, child],
    establishedAt: world.people[child]!.birthDate,
    kind: "lineal:parent-child",
    provenance: PROVENANCE,
  });
}

function enroll(world: World, child: EntityId, school: EntityId): World {
  return createEducationEnrollment(world, {
    stableKey: `test:enroll:${child}:${school}`,
    personId: child,
    organizationId: school,
    startedAt: world.currentDate,
    programKind: "schooling:elementary",
    contextKind: "stage:school",
    provenance: PROVENANCE,
  });
}

/** The fixture's eight people, oldest first. */
function byAge(world: World): EntityId[] {
  return [...world.personOrder].sort((a, b) =>
    world.people[a]!.birthDate.localeCompare(world.people[b]!.birthDate),
  );
}

describe("people know the people they share a room with", () => {
  test("members of one group know each other; a party registration makes no acquaintance", () => {
    let world = createPortabilityFixture();
    const [a, b, c, d] = byAge(world);
    const council = organization(world, "council", "Town Council");
    world = council.world;
    world = join(world, a!, council.id, "leadership:municipal-office");
    world = join(world, b!, council.id, "leadership:municipal-office");
    const party = organization(world, "party", "Town Party");
    world = party.world;
    world = join(world, c!, party.id, "affiliation:political-party");
    world = join(world, d!, party.id, "affiliation:political-party");

    expect(sharedPlaceAcquaintances(world, a!)).toEqual([b!]);
    expect(sharedPlaceAcquaintances(world, c!)).toEqual([]);
    expect(peopleKnownTo(world, a!)).toContain(b!);
  });

  test("parents know the parents of their child's classmates, not of other classes", () => {
    let world = createPortabilityFixture();
    const [p1, p2, p3] = byAge(world);
    const home = world.people[p1!]!.homeJurisdictionId;
    const child = (key: string, birthDate: string) => ({
      stableKey: `test:child:${key}`,
      givenName: key,
      familyName: "Fixture",
      birthDate: makeIsoDate(birthDate),
      homeJurisdictionId: home,
    });
    // Two children who start kindergarten the same fall, and one two years on.
    const inputs = [
      child("Ava", "2019-03-01"),
      child("Ben", "2019-05-01"),
      child("Cal", "2021-02-01"),
    ];
    world = createCharacterHistoryContextPeople(world, inputs);
    const [ava, ben, cal] = inputs.map((input) =>
      characterHistoryContextPersonId(world, input.stableKey),
    );
    const school = organization(world, "school", "Town Elementary");
    world = school.world;
    world = parentOf(world, p1!, ava!);
    world = parentOf(world, p2!, ben!);
    world = parentOf(world, p3!, cal!);
    for (const id of [ava!, ben!, cal!]) world = enroll(world, id, school.id);

    expect(sharedPlaceAcquaintances(world, p1!)).toEqual([p2!]);
    expect(sharedPlaceAcquaintances(world, p3!)).toEqual([]);
  });
});
