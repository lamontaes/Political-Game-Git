import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
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
function retiredAdult() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "successor-background",
      startAge: 34,
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
    const { world, playerId } = retiredAdult();
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

  it("writes nothing for somebody whose childhood is already on record", () => {
    const { world, playerId } = retiredAdult();
    expect(establishSuccessorBackground(world, playerId)).toBe(world);
  });
});
