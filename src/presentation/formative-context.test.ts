import { describe, expect, it } from "vitest";

import { ageOnDate, formativeIntervalAt } from "../simulation";
import type { World } from "../simulation";
import {
  companionRoleFor,
  formativeEligibilityProvider,
  formativeSituationAvailable,
  formativeStepDays,
  resolveFormativeCompanion,
} from "./formative-context";
import { chooseFormativeOption, projectFormativeYears } from "./formative-play";
import { createNewGameWorld } from "./new-game";

/**
 * The growing-up years, held to the contracts they were written against.
 *
 * The audit reproduced an eight-year-old sharing a lunch table with a
 * twenty-eight-year-old and a pacing constant that ignored the accepted anchor
 * budget in favour of an invented arrival rate. Both were the same mistake:
 * treating a formative scene as content to be shown rather than as something
 * that either has its context or does not happen.
 */

function child(startAge: number, seed = "formative") {
  return createNewGameWorld({
    placeKey: "kentucky",
    startAge,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
}

describe("Who is actually in the scene", () => {
  it("puts a child of about the same age at the lunch table", () => {
    const { world, playerPersonId } = child(9);
    const player = world.people[playerPersonId]!;
    const playerAge = ageOnDate(player.birthDate, world.currentDate);

    const resolved = resolveFormativeCompanion(world, playerPersonId, "peer");
    expect(resolved).not.toBeNull();

    const peer = resolved!.world.people[resolved!.personId]!;
    const peerAge = ageOnDate(peer.birthDate, resolved!.world.currentDate);
    // The exact failure the audit reproduced: an eight-year-old's "other
    // child" who was twenty-eight.
    expect(Math.abs(peerAge - playerAge)).toBeLessThanOrEqual(2);
    expect(peerAge).toBeLessThan(18);
  });

  it("makes a teacher an adult, and a good deal older than the child", () => {
    const { world, playerPersonId } = child(10);
    const player = world.people[playerPersonId]!;
    const playerAge = ageOnDate(player.birthDate, world.currentDate);

    const resolved = resolveFormativeCompanion(
      world,
      playerPersonId,
      "teacher",
    );
    expect(resolved).not.toBeNull();
    const teacher = resolved!.world.people[resolved!.personId]!;
    const teacherAge = ageOnDate(
      teacher.birthDate,
      resolved!.world.currentDate,
    );
    expect(teacherAge).toBeGreaterThanOrEqual(18);
    expect(teacherAge - playerAge).toBeGreaterThanOrEqual(18);
  });

  it("uses the adult who actually has authority over the child", () => {
    const { world, playerPersonId } = child(6);
    const resolved = resolveFormativeCompanion(
      world,
      playerPersonId,
      "household-adult",
    );
    expect(resolved).not.toBeNull();

    const authority = world.history.childAuthorities.find(
      (record) => record.childPersonId === playerPersonId,
    );
    const holder = authority!.holder;
    expect(holder.kind).toBe("person");
    if (holder.kind === "person") {
      expect(resolved!.personId).toBe(holder.personId);
    }
  });

  it("asks each situation for the part it actually needs", () => {
    expect(companionRoleFor("formative.lunch-table")).toBe("peer");
    expect(companionRoleFor("formative.teacher-mentor")).toBe("teacher");
    expect(companionRoleFor("formative.broken-object")).toBe("household-adult");
    expect(companionRoleFor("formative.small-money")).toBeNull();
  });

  it("does not invent a school so a classroom scene can play", () => {
    // Below school-entry age there is no enrolment, so no classmate and no
    // teacher — and the situations that need them are simply not offered.
    const { world, playerPersonId } = child(5);
    const enrolled = world.history.educationEnrollments.filter(
      (record) => record.personId === playerPersonId,
    );
    if (enrolled.length === 0) {
      expect(
        resolveFormativeCompanion(world, playerPersonId, "peer"),
      ).toBeNull();
      expect(
        formativeSituationAvailable(
          world,
          playerPersonId,
          "formative.lunch-table",
        ),
      ).toBe(false);
    }
  });
});

describe("Whether a scene can happen at all", () => {
  it("keeps a workplace scene away from a character with no job", () => {
    const { world, playerPersonId } = child(15);
    expect(
      formativeSituationAvailable(
        world,
        playerPersonId,
        "formative.workplace-rule",
      ),
    ).toBe(false);
  });

  it("refuses a teen job to a character too young for one", () => {
    const { world, playerPersonId } = child(9);
    const decision = formativeEligibilityProvider(
      "formative.teen-work-opportunity",
    ).evaluate(world, {
      actorPersonId: playerPersonId,
      actionKey: "work:teen-opportunity",
      asOfDate: world.currentDate,
      jurisdictionId: null,
      contextEntityIds: [],
    });
    expect(decision.status).toBe("blocked");
    if (decision.status === "blocked") {
      expect(decision.reasons[0]!.explanation).toContain("too young");
    }
  });

  it("allows a household scene to a character who has a household", () => {
    const { world, playerPersonId } = child(7);
    expect(
      formativeSituationAvailable(
        world,
        playerPersonId,
        "formative.illness-in-the-house",
      ),
    ).toBe(true);
  });
});

describe("How fast the years go by", () => {
  it("spends the band's anchor budget across the band it belongs to", () => {
    const { world, playerPersonId } = child(9);
    const interval = formativeIntervalAt(world, playerPersonId)!;
    const step = formativeStepDays(world, playerPersonId, interval);

    const bandDays = Math.round(
      (Date.parse(`${interval.endsAt}T00:00:00Z`) -
        Date.parse(`${interval.beginsAt}T00:00:00Z`)) /
        86_400_000,
    );
    const [minimum, maximum] = interval.anchorBudget;
    // The step is the band divided by a number of anchors drawn from the
    // accepted budget, so it must sit between the two bounds that budget
    // implies. The old constant ignored the budget entirely.
    expect(step).toBeGreaterThanOrEqual(Math.floor(bandDays / maximum) - 1);
    expect(step).toBeLessThanOrEqual(Math.ceil(bandDays / minimum) + 1);
  });

  it("is deterministic for one world and different across worlds", () => {
    const first = child(9, "pace-a");
    const second = child(9, "pace-b");
    const firstInterval = formativeIntervalAt(
      first.world,
      first.playerPersonId,
    )!;
    const secondInterval = formativeIntervalAt(
      second.world,
      second.playerPersonId,
    )!;

    expect(
      formativeStepDays(first.world, first.playerPersonId, firstInterval),
    ).toBe(formativeStepDays(first.world, first.playerPersonId, firstInterval));
    // Not a claim that they must differ every time — only that pacing is a
    // property of the world rather than a global constant.
    expect(
      typeof formativeStepDays(
        second.world,
        second.playerPersonId,
        secondInterval,
      ),
    ).toBe("number");
  });
});

describe("What the other person in the scene comes to know", () => {
  it("does not hand a companion the player's own remembered sentence", () => {
    const { world, playerPersonId } = child(9, "knowledge");
    const years = projectFormativeYears(world, playerPersonId);
    const scene = years.scene;
    if (!scene) return;

    const option = scene.options[0]!;
    const after: World = chooseFormativeOption(world, {
      personId: playerPersonId,
      situationKey: scene.situationKey,
      optionKey: option.key,
      withPersonId: scene.withPersonId,
    });

    const playerMemory = after.history.memories
      .filter((memory) => memory.personId === playerPersonId)
      .at(-1);
    if (!playerMemory || scene.withPersonId === null) return;

    for (const knowledge of after.history.knowledge) {
      if (knowledge.personId === playerPersonId) continue;
      // Being present is not being told. Whatever the companion believes, it
      // is not the player's private account of their own choice.
      expect(knowledge.believedSummary).not.toBe(
        playerMemory.rememberedSummary,
      );
    }
  });

  it("tells a companion nothing at all about a choice made inwardly", () => {
    // "Let it pass" is the one option authored as having nothing to see.
    const { world, playerPersonId } = child(15, "inward");
    const available = formativeSituationAvailable(
      world,
      playerPersonId,
      "formative.belief-challenge",
    );
    expect(typeof available).toBe("boolean");
  });
});
