import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { stableHash } from "../simulation/ids";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { addDays } from "../simulation/dates";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";

import {
  cancelScheduledActivity,
  createCharacterHistoryContextPerson,
  createScheduledActivity,
  scheduleFutureDueItem,
  cancelFutureDueItem,
  activeEducationEnrollmentsAt,
  activeWorkRelationshipsAt,
  ageOnDate,
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  makeIsoDate,
  recordWorkStatus,
  recordEducationEnrollmentState,
  formativeIntervalAt,
  selectPersonHistory,
} from "../simulation";
import type { CharacterHistoryTransition, World } from "../simulation";
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
import { sampledProofLocalityForState } from "./new-game-geography";

/**
 * The growing-up years, held to the contracts they were written against.
 *
 * The audit reproduced an eight-year-old sharing a lunch table with a
 * twenty-eight-year-old and a pacing constant that ignored the accepted anchor
 * budget in favor of an invented arrival rate. Both were the same mistake:
 * treating a formative scene as content to be shown rather than as something
 * that either has its context or does not happen.
 */

function child(
  startAge: number,
  seed = "formative",
  recordedCompanions = true,
) {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  const enrollment = activeEducationEnrollmentsAt(
    game.world,
    game.playerPersonId,
  )[0];
  if (!recordedCompanions || !enrollment) return game;
  const player = game.world.people[game.playerPersonId]!;
  const transitions: CharacterHistoryTransition[] = [];
  for (const role of ["peer", "teacher"] as const) {
    const stableKey = `n1-fixture:${role}`;
    const companionId = characterHistoryContextPersonId(game.world, stableKey);
    transitions.push({
      kind: "context-person",
      input: {
        stableKey,
        givenName: role === "peer" ? "Taylor" : "Jordan",
        familyName: "Lane",
        birthDate:
          role === "peer"
            ? player.birthDate
            : makeIsoDate(
                `${Number(player.birthDate.slice(0, 4)) - 30}${player.birthDate.slice(4)}`,
              ),
        homeJurisdictionId: player.homeJurisdictionId,
      },
    });
    const provenance = {
      kind: "authored" as const,
      note: "Existing school companion fixture, created before scene lookup.",
    };
    if (role === "peer")
      transitions.push({
        kind: "education",
        input: {
          stableKey: `${stableKey}:enrollment`,
          personId: companionId,
          organizationId: enrollment.enrollment.organizationId,
          startedAt: enrollment.enrollment.startedAt,
          programKind: enrollment.enrollment.programKind,
          contextKind: startAge >= 14 ? "stage:secondary" : "stage:primary",
          provenance,
        },
      });
    else
      transitions.push({
        kind: "work",
        input: {
          stableKey: `${stableKey}:work`,
          personId: companionId,
          organizationId: enrollment.enrollment.organizationId,
          startedAt: enrollment.enrollment.startedAt,
          kind: "employment:school-teaching",
          compensation: "paid",
          authority: "directs-others",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance,
          initialRole: {
            title: "Teacher",
            occupationClassification: "occupation:school-teacher",
            locationJurisdictionId: player.homeJurisdictionId,
            timeDemand: {
              expectedWeekly: { minimumHours: 30, maximumHours: 45 },
              attention: "high",
              concurrency: "partly-concurrent",
              scheduleRigidity: "rigid",
              interruptibility: "non-interruptible",
              locationJurisdictionId: player.homeJurisdictionId,
            },
          },
        },
      });
  }
  return {
    ...game,
    world: applyCharacterHistoryPlan(game.world, {
      stableKey: "n1-school-fixture",
      mode: "quick-generated",
      personId: game.playerPersonId,
      transitions,
    }).world,
  };
}

describe("Who is actually in the scene", () => {
  it("does not create missing school companions while offering scenes", () => {
    const game = child(10, "n1-missing-staff", false);
    const playerPersonId = game.playerPersonId;
    let world = game.world;
    const schoolId = activeEducationEnrollmentsAt(world, playerPersonId)[0]!
      .enrollment.organizationId;
    for (const id of world.personOrder) {
      if (id !== playerPersonId) {
        for (const entry of activeEducationEnrollmentsAt(world, id)) {
          if (entry.enrollment.organizationId !== schoolId) continue;
          world = recordEducationEnrollmentState(world, {
            stableKey: `n1-ended-peer:${entry.enrollment.id}`,
            enrollmentId: entry.enrollment.id,
            effectiveAt: world.currentDate,
            status: "ended",
            contextKind: entry.state.contextKind,
            reason: "The fixture's classmates left before this scene.",
            provenance: {
              kind: "authored",
              note: "Missing school peer fixture.",
            },
            supersedesStateId: entry.state.id,
          });
        }
      }
      for (const entry of activeWorkRelationshipsAt(world, id)) {
        if (entry.relationship.organizationId !== schoolId) continue;
        world = recordWorkStatus(world, {
          stableKey: `n1-ended-staff:${entry.relationship.id}`,
          workRelationshipId: entry.relationship.id,
          effectiveAt: world.currentDate,
          status: "ended",
          reason: "The fixture's school staff left before this scene.",
          provenance: {
            kind: "authored",
            note: "Missing school staff fixture.",
          },
          supersedesStatusId: entry.status.id,
        });
      }
    }
    const people = [...world.personOrder];
    const sequence = world.history.nextSequence;
    expect(
      resolveFormativeCompanion(world, playerPersonId, "teacher"),
    ).toBeNull();
    expect(resolveFormativeCompanion(world, playerPersonId, "peer")).toBeNull();
    expect(
      projectFormativeYears(world, playerPersonId).scene?.situationKey,
    ).not.toBe("formative.teacher-mentor");
    expect(world.personOrder).toEqual(people);
    expect(world.history.nextSequence).toBe(sequence);
  });

  it("returns the identical world when an existing teacher is found", () => {
    const { world, playerPersonId } = child(10, "n1-existing-teacher");
    const result = resolveFormativeCompanion(world, playerPersonId, "teacher");
    expect(result?.world).toBe(world);
    expect(world.people[result!.personId]!.givenName).toBe("Jordan");
  });

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
    // Below school-entry age there is no enrollment, so no classmate and no
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
  it("offers no unnamed activity to join or leave while none is recorded", () => {
    const { world, playerPersonId } = child(15, "activity-choice");
    expect(
      formativeSituationAvailable(
        world,
        playerPersonId,
        "formative.activity-choice",
      ),
    ).toBe(false);
  });

  it("offers nothing to organize while no school issue is recorded", () => {
    const { world, playerPersonId } = child(15, "student-organizing");
    expect(
      formativeSituationAvailable(
        world,
        playerPersonId,
        "formative.student-organizing",
      ),
    ).toBe(false);
  });

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

  it("does not invent an ill relative or care need from a shared home", () => {
    for (const stateKey of ["US-ME", "US-NV"]) {
      const placeKey = sampledProofLocalityForState(stateKey).key;
      for (const [situation, startAge] of [
        ["formative.illness-in-the-house", 7],
        ["formative.caring-for-someone", 15],
      ] as const) {
        const { world, playerPersonId } = createNewGameWorld({
          placeKey,
          startAge,
          depth: "play-formative-years",
          startingLife: "ordinary-life",
          household: "shares-a-home",
          seed: `formative-unrecorded-illness-${placeKey}-${startAge}`,
          givenName: null,
          familyName: null,
        });
        expect(
          formativeSituationAvailable(world, playerPersonId, situation),
        ).toBe(false);
      }
    }
  });

  it("does not turn a shared home into an unrecorded illness or canceled plan", () => {
    const { world, playerPersonId } = child(7);
    for (const key of [
      "formative.illness-in-the-house",
      "formative.money-shortfall",
      "formative.school-rule-input",
      "formative.care-conflict",
    ] as const) {
      expect(formativeSituationAvailable(world, playerPersonId, key)).toBe(
        false,
      );
    }
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

  it("paces identical saved records identically across seeds", () => {
    const first = child(9, "pace-a");
    const second = child(9, "pace-b");
    const firstInterval = formativeIntervalAt(
      first.world,
      first.playerPersonId,
    )!;

    expect(
      formativeStepDays(first.world, first.playerPersonId, firstInterval),
    ).toBe(formativeStepDays(first.world, first.playerPersonId, firstInterval));
    expect(
      formativeStepDays(
        { ...first.world, seed: second.world.seed },
        first.playerPersonId,
        firstInterval,
      ),
    ).toBe(formativeStepDays(first.world, first.playerPersonId, firstInterval));
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
    // similarly aged stranger was returned as a classmate with no enrollment at
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

describe("A147 waits for saved causes", () => {
  function recordedChild() {
    const seed = "a147-saved-child-calendar";
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    const place =
      places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
    const f = smallWorld({ place: place.jurisdictionKey, seed });
    const stableKey = "a147:child";
    const world = createCharacterHistoryContextPerson(f.world, {
      stableKey,
      givenName: "Taylor",
      familyName: "Lane",
      birthDate: makeIsoDate(
        `${Number(f.world.currentDate.slice(0, 4)) - 9}${f.world.currentDate.slice(4)}`,
      ),
      homeJurisdictionId: f.jurisdictionId,
    });
    const personId = characterHistoryContextPersonId(world, stableKey);
    const interval = formativeIntervalAt(world, personId)!;
    return { world, personId, interval, place: place.jurisdictionKey, seed };
  }

  function commitment(
    world: World,
    personId: World["personOrder"][number],
    offset: number,
    key: string,
  ) {
    const date = addDays(world.currentDate, offset);
    return createScheduledActivity(world, {
      stableKey: key,
      title: "Saved childhood appointment",
      summary: "A fixture commitment on the child's saved calendar.",
      kind: "confirmed",
      start: { ...world.currentMoment, date, minuteOfDay: 600 },
      end: { ...world.currentMoment, date, minuteOfDay: 660 },
      participantPersonIds: [personId],
      responsiblePersonId: personId,
      location: {
        locationKey: "a147:calendar-place",
        label: "Appointment place",
        jurisdictionId: null,
      },
      sourceEntityIds: [personId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [personId] },
    });
  }

  it("stops at the birth-based band boundary when no earlier cause is recorded", () => {
    const { world, personId, interval } = recordedChild();
    expect(formativeStepDays(world, personId, interval)).toBe(
      days(world.currentDate, interval.endsAt),
    );
  });

  it("uses the earliest confirmed personal appointment, ignores another person's, and restores after Continue", () => {
    const f = recordedChild();
    let world = commitment(f.world, f.personId, 12, "a147:later");
    world = commitment(world, f.personId, 5, "a147:earlier");
    world = commitment(world, f.world.personOrder[0]!, 2, "a147:other");
    const before = serializeWorld(world);
    expect(formativeStepDays(world, f.personId, f.interval)).toBe(5);
    expect(
      formativeStepDays(
        { ...world, seed: "a147:other-seed" },
        f.personId,
        f.interval,
      ),
    ).toBe(5);
    const continued = deserializeWorld(JSON.parse(before));
    expect(formativeStepDays(continued, f.personId, f.interval)).toBe(5);
    expect(serializeWorld(world)).toBe(before);
    const earlier = world.history.scheduledActivities.find(
      (a) => a.stableKey === "a147:earlier",
    )!;
    world = cancelScheduledActivity(world, earlier.id);
    expect(formativeStepDays(world, f.personId, f.interval)).toBe(12);
  });

  it("uses a personal scheduled cause until canceled, and caps appointments beyond the band", () => {
    const f = recordedChild();
    let world = commitment(
      f.world,
      f.personId,
      days(f.world.currentDate, f.interval.endsAt) + 2,
      "a147:beyond",
    );
    world = scheduleFutureDueItem(world, {
      stableKey: "a147:recorded-cause",
      dueAt: addDays(world.currentDate, 7),
      transitionKey: "fixture:a147-cause",
      entityIds: [f.personId],
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Saved-cause reader fixture only; not an event frequency.",
      },
    });
    const due = world.history.futureDueItems.find(
      (item) => item.stableKey === "a147:recorded-cause",
    )!;
    expect(formativeStepDays(world, f.personId, f.interval)).toBe(7);
    world = cancelFutureDueItem(world, {
      stableKey: "a147:cancel-recorded-cause",
      dueItemId: due.id,
      effectiveAt: world.currentDate,
      reasonKey: "fixture:canceled",
      context: "The fixture cause was canceled.",
    });
    expect(formativeStepDays(world, f.personId, f.interval)).toBe(
      days(world.currentDate, f.interval.endsAt),
    );
  });
});
