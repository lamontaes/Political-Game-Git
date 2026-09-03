import { describe, expect, it } from "vitest";

import {
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  ageOnDate,
  formativeIntervalAt,
  selectPersonHistory,
} from "../simulation";
import type { World } from "../simulation";
import {
  companionRoleFor,
  formativeEligibilityProvider,
  formativeSituationAvailable,
  formativeStepDays,
  resolveFormativeCompanion,
} from "./formative-context";
import {
  chooseFormativeOption,
  letTimePass,
  projectFormativeYears,
} from "./formative-play";
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

function days(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

describe("How fast the years go by", () => {
  it("never takes a step that would leave the band it was sized for", () => {
    // Nine is part-way through middle childhood, which is the case a single
    // fixed step length gets wrong: it measures correctly against the ratio and
    // still walks out of the band.
    for (const startAge of [5, 9, 13, 16]) {
      const { world, playerPersonId } = child(startAge);
      const interval = formativeIntervalAt(world, playerPersonId)!;
      const step = formativeStepDays(world, playerPersonId, interval);
      const daysLeftInBand = days(world.currentDate, interval.endsAt);
      expect({ startAge, step: step > 0 }).toEqual({ startAge, step: true });
      expect({ startAge, inside: step <= daysLeftInBand }).toEqual({
        startAge,
        inside: true,
      });
    }
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

  it("keeps a choice made inwardly out of the other person's history", () => {
    // "Let it pass" is the one option authored as having nothing to see, and
    // this drives it rather than asking whether it could be driven. The audit
    // reproduced a teacher who correctly knew nothing about it and whose own
    // history still returned the player's private sentence, because being
    // listed as a participant is what person history reads.
    const { world, playerPersonId } = child(15, "inward");
    const teacher = resolveFormativeCompanion(world, playerPersonId, "teacher");
    expect(teacher).not.toBeNull();
    const teacherId = teacher!.personId;

    const after = chooseFormativeOption(teacher!.world, {
      personId: playerPersonId,
      situationKey: "formative.belief-challenge",
      optionKey: "let-it-pass",
      withPersonId: teacherId,
    });

    const privateSentence =
      "You let it pass without saying anything, and kept the disagreement somewhere only you could see it.";
    expect(
      after.history.memories.some(
        (memory) =>
          memory.personId === playerPersonId &&
          memory.rememberedSummary === privateSentence,
      ),
    ).toBe(true);

    // Nothing the teacher's own history returns says it.
    for (const event of selectPersonHistory(after, teacherId)) {
      expect(event.summary).not.toBe(privateSentence);
    }
    for (const knowledge of after.history.knowledge) {
      if (knowledge.personId !== teacherId) continue;
      expect(knowledge.believedSummary).not.toBe(privateSentence);
    }
    // And they are not named on the record of it at all, which is the reason
    // the sentence cannot reach them.
    const inward = after.history.events.find((event) =>
      event.tags.includes("choice.let-it-pass"),
    );
    expect(inward).toBeDefined();
    expect(inward!.involvedEntityIds).not.toContain(teacherId);
    expect(
      inward!.participants.some((entry) => entry.personId === teacherId),
    ).toBe(false);
  });

  it("still records the other person when there was something to see", () => {
    const { world, playerPersonId } = child(15, "outward");
    const teacher = resolveFormativeCompanion(world, playerPersonId, "teacher");
    expect(teacher).not.toBeNull();
    const teacherId = teacher!.personId;

    const after = chooseFormativeOption(teacher!.world, {
      personId: playerPersonId,
      situationKey: "formative.belief-challenge",
      optionKey: "say-you-disagree",
      withPersonId: teacherId,
    });

    const outward = after.history.events.find((event) =>
      event.tags.includes("choice.say-you-disagree"),
    );
    expect(outward).toBeDefined();
    // Saying it out loud is something they were part of, so they are on it —
    // described by what they saw rather than by what the player made of it.
    expect(outward!.involvedEntityIds).toContain(teacherId);
    const theirs = after.history.knowledge.find(
      (entry) => entry.personId === teacherId,
    );
    expect(theirs?.believedSummary).toBe(
      "They said out loud that they saw it differently.",
    );
    expect(theirs?.accuracy).toBe("partial");
  });
});

describe("A companion holds the part they are given", () => {
  it("makes a classmate somebody enrolled at the same school", () => {
    const { world, playerPersonId } = child(10, "peer-role");
    const resolved = resolveFormativeCompanion(world, playerPersonId, "peer");
    expect(resolved).not.toBeNull();

    const after = resolved!.world;
    const mine = activeEducationEnrollmentsAt(after, playerPersonId).map(
      (entry) => entry.enrollment.organizationId,
    );
    expect(mine.length).toBeGreaterThan(0);
    // Age made them plausible. The audit found nothing had made them true: a
    // similarly aged stranger was returned as a classmate with no enrolment at
    // this school, or at any school.
    const theirs = activeEducationEnrollmentsAt(after, resolved!.personId).map(
      (entry) => entry.enrollment.organizationId,
    );
    expect(theirs.some((id) => mine.includes(id))).toBe(true);
  });

  it("makes a teacher somebody employed to teach at that school", () => {
    const { world, playerPersonId } = child(10, "teacher-role");
    const resolved = resolveFormativeCompanion(
      world,
      playerPersonId,
      "teacher",
    );
    expect(resolved).not.toBeNull();

    const after = resolved!.world;
    const school = activeEducationEnrollmentsAt(after, playerPersonId)[0]!
      .enrollment.organizationId;
    const work = activeWorkRelationshipsAt(after, resolved!.personId).filter(
      (entry) => entry.relationship.organizationId === school,
    );
    expect(work).toHaveLength(1);
    // Employed at the school is not enough; a caretaker is not who keeps you
    // back after class.
    expect(work[0]!.role.occupationClassification).toBe(
      "occupation:school-teacher",
    );
  });

  it("gives the same child the same classmate rather than a new stranger", () => {
    const { world, playerPersonId } = child(10, "stable-peer");
    const first = resolveFormativeCompanion(world, playerPersonId, "peer")!;
    const second = resolveFormativeCompanion(
      first.world,
      playerPersonId,
      "peer",
    )!;
    expect(second.personId).toBe(first.personId);
  });
});

describe("Spending each band's budget inside that band", () => {
  /**
   * Plays a whole childhood and counts the anchors that landed in each band.
   *
   * The pacing test this replaces measured one step against the ratio it was
   * derived from, which a step that overshoots the band boundary still
   * satisfies. Only walking the years finds the defect: a step that began near
   * the end of a band used to carry the character past it, so the next band
   * lost days it never got to spend an anchor on.
   */
  function playThrough(seed: string) {
    const { world, playerPersonId } = child(5, seed);
    let current: World = world;
    const anchors: Record<string, number> = {};
    let guard = 0;
    while (formativeIntervalAt(current, playerPersonId) !== null) {
      if ((guard += 1) > 400) throw new Error("The years never ended.");
      const interval = formativeIntervalAt(current, playerPersonId)!;
      const projection = projectFormativeYears(current, playerPersonId);
      const scene = projection.scene;
      // An anchor is a moment of the life, whether the game had a situation
      // ready for it or the years simply went by. Counting only situations
      // would measure the size of the writing, not the pacing.
      anchors[interval.band] = (anchors[interval.band] ?? 0) + 1;
      current = scene
        ? chooseFormativeOption(current, {
            personId: playerPersonId,
            situationKey: scene.situationKey,
            optionKey: scene.options[0]!.key,
            withPersonId: scene.withPersonId,
          })
        : letTimePass(current, playerPersonId);
    }
    return anchors;
  }

  // The accepted budgets, which are the contract this is measured against.
  const MINIMUM: Readonly<Record<string, number>> = {
    "middle-childhood": 6,
    adolescence: 8,
  };

  it("gives every fully lived band at least the anchors it was budgeted", () => {
    for (const seed of ["pace-a", "pace-b", "pace-c", "pace-d", "pace-e"]) {
      const anchors = playThrough(seed);
      // Early childhood is entered part-way through by a character who starts
      // at five, so its budget is not owed in full; the two bands lived from
      // their first day are.
      for (const [band, minimum] of Object.entries(MINIMUM)) {
        expect({ seed, band, anchors: anchors[band] ?? 0 }).toEqual({
          seed,
          band,
          anchors: expect.any(Number),
        });
        expect({
          seed,
          band,
          atLeast: (anchors[band] ?? 0) >= minimum,
        }).toEqual({ seed, band, atLeast: true });
      }
    }
  });

  it("never lets a step cross out of the band that sized it", () => {
    const { world, playerPersonId } = child(5, "boundary");
    let current: World = world;
    let guard = 0;
    while (true) {
      const interval = formativeIntervalAt(current, playerPersonId);
      if (!interval) break;
      if ((guard += 1) > 400) throw new Error("The years never ended.");
      const projection = projectFormativeYears(current, playerPersonId);
      const scene = projection.scene;
      const next = scene
        ? chooseFormativeOption(current, {
            personId: playerPersonId,
            situationKey: scene.situationKey,
            optionKey: scene.options[0]!.key,
            withPersonId: scene.withPersonId,
          })
        : letTimePass(current, playerPersonId);
      // Landing exactly on the boundary is right; landing past it is the
      // defect, because those days belonged to the next band's budget.
      expect(next.currentDate <= interval.endsAt).toBe(true);
      current = next;
    }
  });
});
