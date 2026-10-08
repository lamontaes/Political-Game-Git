import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
} from "../simulation/character-history";
import {
  AGE_OF_MAJORITY_RULES,
  type AgeOfMajorityRules,
} from "../simulation/age-of-majority";
import { catchUpComingOfAge } from "../simulation/coming-of-age";
import { addDays, dateAtAge } from "../simulation/dates";
import {
  buyHome,
  ownedHomeFor,
  personOwnsHome,
} from "../simulation/home-purchase";
import { dateRefusal } from "../simulation/couples";
import { searchLifePlaces } from "../simulation/life-places";
import {
  activeChildAuthoritiesAt,
  childAuthorityStateHistory,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../simulation/life-queries";
import { describePersonContext } from "../simulation/person-context";
import { STATES } from "../simulation/state-reference";
import { resourcePositionAt } from "../simulation/resource-queries";
import { createResourcePosition, money } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { assertWorldIntegrity, advanceWorld } from "../simulation/world";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { passOrdinaryDays } from "./ordinary-life";
import { projectPersonalRecord } from "./personal-record";

/**
 * Growing up ends a guardianship, and buying a home moves a grown child out.
 *
 * From a playtest: a twenty-seven-year-old who owned her house still had
 * "your guardian" listed at home on her profile. Played in Wyoming and North
 * Dakota so the proof does not lean on the Kentucky fixture.
 */

function placeKey(name: string, state: string): string {
  const place = searchLifePlaces(name, 20, {
    stateJurisdictionKey: `US-${state}`,
  }).find((candidate) => candidate.displayName.startsWith(name));
  expect(place, `${name}, ${state}`).toBeDefined();
  return place!.key;
}

function newLife(
  name: string,
  state: string,
  seed: string,
  startAge: number,
  household: NewGameSetup["household"] = "shares-a-home",
  birthday?: { readonly month: number; readonly day: number },
  familyShape?: NewGameSetup["familyShape"],
) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge,
    household,
    placeKey: placeKey(name, state),
    ...(birthday ? { birthMonth: birthday.month, birthDay: birthday.day } : {}),
    ...(familyShape ? { familyShape } : {}),
  } as NewGameSetup);
  return { world: game.world, playerId: game.playerPersonId };
}

const reload = (world: World) => deserializeWorld(serializeWorld(world));

/** The guardian or parent a dependent start was given. */
function openingGuardian(world: World, playerId: EntityId) {
  const authority = world.history.childAuthorities.find(
    (candidate) =>
      candidate.childPersonId === playerId &&
      candidate.stableKey === "production:initial-life:authority:guardian",
  )!;
  expect(authority).toBeDefined();
  expect(authority.holder.kind).toBe("person");
  return {
    authority,
    guardianId: (authority.holder as { personId: EntityId }).personId,
  };
}

function daysUntil(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** A life started at seventeen and played on for ten years. */
function grownUp(seed: string) {
  const { world: start, playerId } = newLife("Casper", "WY", seed, 17);
  const birthday27 = dateAtAge(start.people[playerId]!.birthDate, 27);
  const world = advanceWorld(
    start,
    daysUntil(start.currentDate, birthday27) + 3,
    createCampaignElectionTransitionRegistry(),
  );
  return { world: reload(world), playerId };
}

function withSavings(world: World, personId: EntityId, minor: number): World {
  const tracked = resourcePositionAt(
    world,
    { kind: "person", personId },
    money(0, "USD").currency,
  );
  expect(tracked).toBeUndefined();
  return createResourcePosition(world, {
    stableKey: "test:coming-of-age-savings",
    owner: { kind: "person", personId },
    openedAt: world.currentDate,
    openingBalance: money(minor, "USD"),
    provenance: { kind: "authored", note: "Test savings." },
  });
}

/** A seventeen-year-old whose birthday falls two days into play. */
function turningEighteen(
  name: string,
  state: string,
  seed: string,
  familyShape?: NewGameSetup["familyShape"],
) {
  const place = searchLifePlaces(name, 20, {
    stateJurisdictionKey: `US-${state}`,
  }).find((candidate) => candidate.displayName.startsWith(name))!;
  const [, month, day] = addDays(place.context.initialMoment.date, 2)
    .split("-")
    .map(Number);
  return newLife(
    name,
    state,
    seed,
    17,
    "shares-a-home",
    { month: month!, day: day! },
    familyShape,
  );
}

/** A rule for tests only, standing in for another state's age. */
const MISSISSIPPI_AT_21: AgeOfMajorityRules = {
  "US-MS": {
    age: 21,
    source: {
      citation: "Test fixture, not a source",
      url: "https://example.invalid/test-only",
      retrievedAt: "2026-01-01" as IsoDate,
    },
  },
};

describe("coming of age", () => {
  it("ships a sourced age of majority for every one of the 56 places", () => {
    expect(Object.keys(AGE_OF_MAJORITY_RULES).sort()).toEqual(
      Object.keys(STATES)
        .map((usps) => `US-${usps}`)
        .sort(),
    );
    for (const [key, rule] of Object.entries(AGE_OF_MAJORITY_RULES)) {
      expect(rule!.age, key).toBeGreaterThanOrEqual(18);
      expect(rule!.age, key).toBeLessThanOrEqual(21);
      expect(rule!.source.citation, key).toContain("Age of Majority");
      expect(rule!.source.url, key).toMatch(/^https:\/\//);
      expect(rule!.source.retrievedAt, key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    // The places the source table does not list carry what the age rests on.
    expect(
      Object.entries(AGE_OF_MAJORITY_RULES)
        .filter(([, rule]) => rule!.estimatedFrom)
        .map(([key]) => key)
        .sort(),
    ).toEqual(["US-AS", "US-MP"]);
    expect(
      Object.fromEntries(
        Object.entries(AGE_OF_MAJORITY_RULES)
          .filter(([, rule]) => rule!.age !== 18)
          .map(([key, rule]) => [key, rule!.age]),
      ),
    ).toEqual({ "US-AL": 19, "US-NE": 19, "US-MS": 21, "US-PR": 21 });
  });

  it("ends a guardian's authority on the eighteenth birthday in Wyoming, and stops calling the guardian theirs", () => {
    // A guardian rather than a parent, as in the playtest.
    const { world: child, playerId } = turningEighteen(
      "Casper",
      "WY",
      "coming-of-age:casper-2",
      "guardian",
    );
    const { authority, guardianId } = openingGuardian(child, playerId);
    expect(
      describePersonContext(child, playerId, guardianId)?.relationship,
    ).toBe("your guardian");
    expect(activeChildAuthoritiesAt(child, playerId).length).toBeGreaterThan(0);
    // Loading alone writes nothing.
    expect(serializeWorld(reload(child))).toBe(serializeWorld(child));

    const birthday = dateAtAge(child.people[playerId]!.birthDate, 18);
    const grown = passOrdinaryDays(child, 3);
    assertWorldIntegrity(grown);
    expect(grown.currentDate > birthday).toBe(true);
    expect(activeChildAuthoritiesAt(grown, playerId)).toHaveLength(0);
    expect(
      childAuthorityStateHistory(grown, authority.id).at(-1),
    ).toMatchObject({
      status: "ended",
      effectiveAt: birthday,
      context: "Reached adulthood",
    });
    // Once only.
    expect(serializeWorld(catchUpComingOfAge(grown))).toBe(
      serializeWorld(grown),
    );

    // The label is presentation, and a grown woman's guardian is not
    // "your guardian" to her.
    expect(
      describePersonContext(grown, playerId, guardianId)?.relationship,
    ).toBe("the guardian who raised you");
    expect(
      projectPersonalRecord(grown, playerId)!.household.find(
        (line) => line.personId === guardianId,
      )?.relationship,
    ).toBe("the guardian who raised you");
    // Whoever asks whether she ever raised them still reads the record.
    expect(dateRefusal(grown, playerId, guardianId)).toBe("You are family.");
  });

  it("keeps the authority past eighteen where the place's age is twenty-one", () => {
    const { world: child, playerId } = turningEighteen(
      "Jackson",
      "MS",
      "coming-of-age:jackson-18",
    );
    const { authority } = openingGuardian(child, playerId);
    const grown = passOrdinaryDays(child, 3);
    expect(
      grown.currentDate > dateAtAge(child.people[playerId]!.birthDate, 18),
    ).toBe(true);
    expect(activeChildAuthoritiesAt(grown, playerId)).toHaveLength(
      activeChildAuthoritiesAt(child, playerId).length,
    );
    expect(childAuthorityStateHistory(grown, authority.id)).toEqual(
      childAuthorityStateHistory(child, authority.id),
    );
  });

  it.skip("ends the authority on the birthday a state's rule names (slow until SPEED FIXED)", () => {
    const { world: start, playerId } = newLife(
      "Jackson",
      "MS",
      "coming-of-age:jackson",
      17,
    );
    const { authority, guardianId } = openingGuardian(start, playerId);
    const birthDate = start.people[playerId]!.birthDate;
    const at = (years: number, extraDays: number) =>
      advanceWorld(
        start,
        daysUntil(start.currentDate, dateAtAge(birthDate, years)) + extraDays,
        createCampaignElectionTransitionRegistry(),
      );

    // Twenty in Mississippi: still a minor there, so nothing ends.
    const twenty = at(20, 3);
    expect(serializeWorld(catchUpComingOfAge(twenty, MISSISSIPPI_AT_21))).toBe(
      serializeWorld(twenty),
    );

    const older = at(21, 40);
    // Another state's rule says nothing about a Mississippi life.
    expect(
      serializeWorld(
        catchUpComingOfAge(older, {
          "US-WY": MISSISSIPPI_AT_21["US-MS"],
        }),
      ),
    ).toBe(serializeWorld(older));

    const ended = catchUpComingOfAge(older, MISSISSIPPI_AT_21);
    assertWorldIntegrity(ended);
    expect(activeChildAuthoritiesAt(ended, playerId)).toHaveLength(0);
    expect(
      childAuthorityStateHistory(ended, authority.id).at(-1),
    ).toMatchObject({
      status: "ended",
      // Back-dated to the twenty-first birthday, not the day it was noticed.
      effectiveAt: dateAtAge(birthDate, 21),
      context: "Reached adulthood",
      basisKind: "custom:generated-start",
    });
    // Once only.
    expect(serializeWorld(catchUpComingOfAge(ended, MISSISSIPPI_AT_21))).toBe(
      serializeWorld(ended),
    );
    // Still somebody who raised them.
    expect(dateRefusal(ended, playerId, guardianId)).toBe("You are family.");
    expect(
      describePersonContext(ended, playerId, guardianId)?.relationship,
    ).toMatch(/^(the guardian who raised you|your (mom|dad|parent))$/);
  });
});

describe("buying a home as a grown child", () => {
  it.skip("moves the buyer into a home of their own and leaves the guardian behind (slow until SPEED FIXED)", () => {
    const { world: old, playerId } = grownUp("coming-of-age:casper-home");
    const { guardianId } = openingGuardian(old, playerId);
    const world = withSavings(passOrdinaryDays(old, 1), playerId, 10_000_000);
    // Wyoming's age of majority ended the guardianship on the eighteenth
    // birthday; moving out is a separate choice, made nine years later.
    expect(activeChildAuthoritiesAt(world, playerId)).toHaveLength(0);
    const childhoodHome = householdMembershipsAt(world, playerId)[0]!.household
      .id;
    const stayed = peopleInHouseholdAt(world, childhoodHome).filter(
      (id) => id !== playerId,
    );
    expect(stayed).toContain(guardianId);
    const owned = personOwnsHome(world, guardianId);

    const result = buyHome(world, playerId);
    expect(result.status).toBe("bought");
    const bought = result.world;
    assertWorldIntegrity(bought);

    // A household of the buyer's own, which owns the new home.
    const homes = householdMembershipsAt(bought, playerId);
    expect(homes).toHaveLength(1);
    const ownHome = homes[0]!.household.id;
    expect(ownHome).not.toBe(childhoodHome);
    expect(homes[0]!.state.kind).toBe("resident:member");
    expect(peopleInHouseholdAt(bought, ownHome)).toEqual([playerId]);
    expect(ownedHomeFor(bought, ownHome)).not.toBeNull();
    expect(personOwnsHome(bought, playerId)).toBe(true);

    // Everybody else stays where they were, and their home is not sold.
    expect(peopleInHouseholdAt(bought, childhoodHome)).toEqual(stayed);
    expect(ownedHomeFor(bought, childhoodHome)).toBeNull();
    expect(personOwnsHome(bought, guardianId)).toBe(owned);

    // The profile lists only who lives in the new home: nobody but her.
    const record = projectPersonalRecord(reload(bought), playerId)!;
    expect(record.household).toEqual([]);
    expect(
      describePersonContext(bought, playerId, guardianId)?.relationship,
    ).toBe("the guardian who raised you");
    expect(dateRefusal(bought, playerId, guardianId)).toBe("You are family.");
  });

  it.skip("takes a partner who lives there along, and nobody else (slow until SPEED FIXED)", () => {
    const { world: old, playerId } = grownUp("coming-of-age:casper-partner");
    const { guardianId } = openingGuardian(old, playerId);
    const grown = passOrdinaryDays(old, 1);
    const childhoodHome = householdMembershipsAt(grown, playerId)[0]!.household
      .id;
    const partnerKey = "test:partner";
    const partnerId = characterHistoryContextPersonId(grown, partnerKey);
    const player = grown.people[playerId]!;
    const withPartner = applyCharacterHistoryPlan(grown, {
      stableKey: "test:partner-moves-in",
      mode: "quick-generated",
      personId: playerId,
      transitions: [
        {
          kind: "context-person",
          input: {
            stableKey: partnerKey,
            givenName: "Robin",
            familyName: "Tanaka",
            birthDate: player.birthDate,
            homeJurisdictionId: player.homeJurisdictionId,
          },
        },
        {
          kind: "household-membership",
          input: {
            stableKey: "test:partner-membership",
            personId: partnerId,
            householdId: childhoodHome,
            startedAt: grown.currentDate,
            residenceRole: "primary",
            kind: "resident:member",
            provenance: { kind: "authored", note: "Test partner." },
          },
        },
        {
          kind: "partnership",
          input: {
            stableKey: "test:partnership",
            personIds: [playerId, partnerId],
            startedAt: grown.currentDate,
            kind: "romantic:dating",
            provenance: { kind: "authored", note: "Test partner." },
          },
        },
      ],
    }).world;
    const world = withSavings(withPartner, playerId, 10_000_000);

    const result = buyHome(world, playerId);
    expect(result.status).toBe("bought");
    const bought = result.world;
    assertWorldIntegrity(bought);
    const ownHome = householdMembershipsAt(bought, playerId)[0]!.household.id;
    expect(ownHome).not.toBe(childhoodHome);
    expect(peopleInHouseholdAt(bought, ownHome)).toEqual(
      [playerId, partnerId].sort(),
    );
    const left = peopleInHouseholdAt(bought, childhoodHome);
    expect(left).toContain(guardianId);
    expect(left).not.toContain(partnerId);
    expect(left).not.toContain(playerId);
    const record = projectPersonalRecord(bought, playerId)!;
    expect(record.household.map((line) => line.personId)).toEqual([partnerId]);
  });

  it("buys for the household as before when no parent lives there", () => {
    const { world: start, playerId } = newLife(
      "Fargo",
      "ND",
      "coming-of-age:fargo-adult",
      30,
      "shares-a-home",
    );
    const world = withSavings(start, playerId, 10_000_000);
    const household = householdMembershipsAt(world, playerId)[0]!.household.id;
    const residents = peopleInHouseholdAt(world, household);
    expect(residents.length).toBe(2);

    const result = buyHome(world, playerId);
    expect(result.status).toBe("bought");
    const bought = result.world;
    assertWorldIntegrity(bought);
    expect(bought.history.households).toHaveLength(
      world.history.households.length,
    );
    expect(householdMembershipsAt(bought, playerId)[0]!.household.id).toBe(
      household,
    );
    expect(peopleInHouseholdAt(bought, household)).toEqual(residents);
    expect(ownedHomeFor(bought, household)).not.toBeNull();
  });
});
