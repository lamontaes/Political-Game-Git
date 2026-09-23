import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import {
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
} from "../simulation/character-history";
import {
  AGE_OF_MAJORITY_PLACEHOLDER,
  catchUpComingOfAge,
} from "../simulation/coming-of-age";
import { dateAtAge } from "../simulation/dates";
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
import { resourcePositionAt } from "../simulation/resource-queries";
import { createResourcePosition, money } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, World } from "../simulation/types";
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
) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge,
    household,
    placeKey: placeKey(name, state),
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

/** A life started at seventeen and played on for ten years before any repair. */
function grownBeforeTheRepair(seed: string) {
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

describe("coming of age", () => {
  it("ends a dependent start's guardianship on the eighteenth birthday", () => {
    const { world, playerId } = newLife(
      "Fargo",
      "ND",
      "coming-of-age:fargo",
      17,
    );
    const { authority } = openingGuardian(world, playerId);
    expect(activeChildAuthoritiesAt(world, playerId)).toHaveLength(1);
    const birthday = dateAtAge(
      world.people[playerId]!.birthDate,
      AGE_OF_MAJORITY_PLACEHOLDER,
    );
    const days = daysUntil(world.currentDate, birthday);
    expect(days).toBeGreaterThan(0);

    // The day before, still a child in somebody's care.
    const eve = passOrdinaryDays(world, days - 1);
    expect(activeChildAuthoritiesAt(eve, playerId)).toHaveLength(1);

    const grown = passOrdinaryDays(eve, 1);
    assertWorldIntegrity(grown);
    expect(grown.currentDate).toBe(birthday);
    expect(activeChildAuthoritiesAt(grown, playerId)).toHaveLength(0);
    const ended = childAuthorityStateHistory(grown, authority.id).at(-1)!;
    expect(ended).toMatchObject({
      status: "ended",
      effectiveAt: birthday,
      context: "Reached adulthood",
      basisKind: "custom:generated-start",
    });
    // Running it again changes nothing.
    expect(serializeWorld(catchUpComingOfAge(grown))).toBe(
      serializeWorld(grown),
    );
  });

  it("repairs an older save whose grown character is still somebody's child", () => {
    // A guardian rather than a parent, as in the playtest.
    const { world, playerId } = grownBeforeTheRepair("coming-of-age:casper-2");
    const { authority, guardianId } = openingGuardian(world, playerId);
    // The old shape: twenty-seven, with the childhood authority still open.
    expect(activeChildAuthoritiesAt(world, playerId)).toHaveLength(1);
    expect(
      describePersonContext(world, playerId, guardianId)?.relationship,
    ).toBe("your guardian");

    // Loading alone writes nothing.
    expect(serializeWorld(reload(world))).toBe(serializeWorld(world));

    const moved = passOrdinaryDays(world, 1);
    assertWorldIntegrity(moved);
    expect(activeChildAuthoritiesAt(moved, playerId)).toHaveLength(0);
    const ended = childAuthorityStateHistory(moved, authority.id).at(-1)!;
    // Back-dated to the birthday, not the day it was noticed.
    expect(ended.effectiveAt).toBe(
      dateAtAge(moved.people[playerId]!.birthDate, 18),
    );
    expect(ended.context).toBe("Reached adulthood");
    // Named by kinship now, not by an authority that ended.
    expect(
      describePersonContext(moved, playerId, guardianId)?.relationship,
    ).toBe("the guardian who raised you");
    // Whoever asks whether she ever raised them still reads the whole record.
    expect(dateRefusal(moved, playerId, guardianId)).toBe("You are family.");
  });
});

describe("buying a home as a grown child", () => {
  it("moves the buyer into a home of their own and leaves the guardian behind", () => {
    const { world: old, playerId } = grownBeforeTheRepair(
      "coming-of-age:casper-home",
    );
    const { guardianId } = openingGuardian(old, playerId);
    const world = withSavings(passOrdinaryDays(old, 1), playerId, 10_000_000);
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

  it("takes a partner who lives there along, and nobody else", () => {
    const { world: old, playerId } = grownBeforeTheRepair(
      "coming-of-age:casper-partner",
    );
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
