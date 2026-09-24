import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  createCharacterHistoryContextPerson,
  deserializeWorld,
  drawCanonicalName,
  generatePersonIdentity,
  makeIsoDate,
  SeededRng,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { characterHistoryContextPersonId } from "../simulation/character-history";
import { dateAtAge } from "../simulation/dates";
import {
  householdMembershipStateHistory,
  householdMembershipsAt,
  kinshipRelationshipsAt,
} from "../simulation/life-queries";
import { establishSuccessorBackground } from "../simulation/people-continuation";
import { parentsOf } from "../simulation/people-family";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { continueAs, retireFromPlay } from "./people-continuation";
import { projectPeopleDirectory } from "./people-directory";

/*
 * The playtest that found this: a 34-year-old retired, and play went on as the
 * teacher who had mentored her at twelve. He was a bystander in her history, so
 * as a player he knew one person and had nobody at home. These are the same
 * three people, measured from where the player stands.
 */
function retiredAdult(startAge = 34) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "successor-background",
      startAge,
    }),
  ).game!;
  return {
    world: retireFromPlay(game.world, game.playerPersonId),
    playerId: game.playerPersonId,
  };
}

const contextPerson = (world: World, role: string) =>
  characterHistoryContextPersonId(world, `production:earlier-life:${role}`);

function childhoodMembership(world: World, personId: EntityId) {
  return world.history.householdMemberships.find(
    (membership) =>
      membership.personId === personId &&
      householdMembershipStateHistory(world, membership.id)[0]?.kind ===
        "resident:child",
  );
}

describe("a successor taken up from somebody else's history", () => {
  it("arrives with a past, a family and a home of their own", () => {
    const { world, playerId } = retiredAdult();
    const teacherId = contextPerson(world, "teacher");
    // The measured starting point: one person known, nobody at home.
    expect(parentsOf(world, teacherId)).toEqual([]);
    expect(householdMembershipsAt(world, teacherId)).toEqual([]);
    expect(
      projectPeopleDirectory(world, teacherId).people.map((p) => p.personId),
    ).toEqual([playerId]);

    const next = continueAs(world, playerId, teacherId);
    expect(next.control).toEqual({ kind: "person", personId: teacherId });

    const directory = projectPeopleDirectory(next, teacherId);
    // Still knows the student, and now more than her.
    expect(directory.people.map((p) => p.personId)).toContain(playerId);
    expect(directory.people.length).toBeGreaterThanOrEqual(3);
    const [parentId] = parentsOf(next, teacherId);
    expect(parentId).toBeDefined();
    expect(
      directory.people.find((p) => p.personId === parentId)?.categories,
    ).toContain("family");

    // Left the childhood home at eighteen, and lives in their own today.
    const teacher = next.people[teacherId]!;
    const childhood = childhoodMembership(next, teacherId)!;
    expect(
      householdMembershipStateHistory(next, childhood.id).at(-1),
    ).toMatchObject({
      status: "ended",
      effectiveAt: dateAtAge(teacher.birthDate, 18),
    });
    const homes = householdMembershipsAt(next, teacherId);
    expect(homes).toHaveLength(1);
    expect(homes[0]!.state.residenceRole).toBe("primary");
    expect(homes[0]!.membership.startedAt).toBe(next.currentDate);

    // What they already had is kept: the job, and the student they taught.
    expect(
      next.history.relationshipInteractions.filter(
        (entry) =>
          entry.personIds.includes(teacherId) &&
          entry.personIds.includes(playerId),
      ),
    ).toEqual(
      world.history.relationshipInteractions.filter(
        (entry) =>
          entry.personIds.includes(teacherId) &&
          entry.personIds.includes(playerId),
      ),
    );
    expect(
      next.history.workRelationships.filter((w) => w.personId === teacherId)
        .length,
    ).toBe(
      world.history.workRelationships.filter((w) => w.personId === teacherId)
        .length + 1,
    );

    assertWorldIntegrity(next);
    const reloaded = deserializeWorld(serializeWorld(next));
    expect(serializeWorld(reloaded)).toBe(serializeWorld(next));
    // Written once: taking the same person up again adds nothing.
    expect(establishSuccessorBackground(next, teacherId)).toBe(next);
  });

  it("keeps the home somebody was already recorded in as their only one", () => {
    // A childhood parent is 22 to 38 years older than the player; at 30 the
    // parent is at most 69, inside the oldest age a background is written for.
    const { world, playerId } = retiredAdult(30);
    // The parent written for the player's own childhood: no parents of their
    // own on record, but living in that household since the player was born.
    const parentId = contextPerson(world, "parent");
    const before = householdMembershipsAt(world, parentId);
    expect(before).toHaveLength(1);

    const next = continueAs(world, playerId, parentId);
    const [grandparentId] = parentsOf(next, parentId);
    expect(grandparentId).toBeDefined();
    // Nothing new to live in, and no second home claimed in the past: when
    // they left the one they grew up in is not on record.
    expect(
      householdMembershipsAt(next, parentId).map((e) => e.membership.id),
    ).toEqual(before.map((e) => e.membership.id));
    expect(childhoodMembership(next, parentId)).toBeUndefined();
    expect(
      next.history.householdMemberships.filter((m) => m.personId === parentId),
    ).toHaveLength(1);
    // Their own child is still their child.
    expect(
      kinshipRelationshipsAt(next, parentId).some((k) =>
        k.personIds.includes(playerId),
      ),
    ).toBe(true);
    assertWorldIntegrity(next);
  });

  it("keeps a classmate's schooling as the only schooling on record", () => {
    const { world, playerId } = retiredAdult();
    const peerId = contextPerson(world, "peer");
    const secondary = (w: World) =>
      w.history.educationEnrollments.filter(
        (e) => e.personId === peerId && e.programKind === "schooling:secondary",
      );
    expect(secondary(world)).toHaveLength(1);
    const next = continueAs(world, playerId, peerId);
    expect(parentsOf(next, peerId)).toHaveLength(1);
    // Still one high school, the one they shared with the player.
    expect(secondary(next).map((e) => e.id)).toEqual(
      secondary(world).map((e) => e.id),
    );
    // The stages nobody had written are there.
    expect(
      next.history.educationEnrollments.filter(
        (e) =>
          e.personId === peerId && e.programKind === "schooling:elementary",
      ),
    ).toHaveLength(1);
    assertWorldIntegrity(next);
  });

  it("gives somebody born on the 29th of February a past too", () => {
    // Their generated teacher is thirty years older, in a year with no 29th of
    // February; before, that date was refused and the hand-off threw.
    const { world } = retiredAdult();
    const stableKey = "successor-background:leap-born";
    const rng = new SeededRng(stableKey);
    const withLeapBorn = createCharacterHistoryContextPerson(world, {
      stableKey,
      ...drawCanonicalName(rng.fork("name")),
      identity: generatePersonIdentity(rng.fork("identity")),
      birthDate: makeIsoDate("1976-02-29"),
      homeJurisdictionId:
        world.people[world.personOrder[0]!]!.homeJurisdictionId,
    });
    const personId = characterHistoryContextPersonId(withLeapBorn, stableKey);
    const next = establishSuccessorBackground(withLeapBorn, personId);
    expect(parentsOf(next, personId)).toHaveLength(1);
    assertWorldIntegrity(next);
  });

  it("writes nothing for somebody whose childhood is already on record", () => {
    const { world, playerId } = retiredAdult();
    expect(establishSuccessorBackground(world, playerId)).toBe(world);
  });
});
