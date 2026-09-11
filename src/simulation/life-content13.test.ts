import { describe, expect, it } from "vitest";

import {
  addDays,
  advanceWorld,
  applyCharacterHistoryPlan,
  assertWorldIntegrity,
  cancelScheduledActivity,
  createScheduledActivity,
  deserializeWorld,
  eligibleEpisodeBeats,
  episodeFacts,
  episodeRoleBindings,
  performScheduledActivity,
  playEpisodeOption,
  recordWorkStatus,
  recordWorldEvent,
  scheduledActivityState,
  serializeWorld,
  simulationMomentAtLocalTime,
  type EntityId,
  type EpisodeBeat,
  type World,
} from "./index";
import { EPISODE_FAMILIES } from "./episode-bank";
import {
  COVERED_SHIFT_LOCATION_KEY,
  COVERED_SHIFT_RETURN_DAYS,
  OPEN_LIFE_CIRCUMSTANCE_LIMIT,
  LIFE_CIRCUMSTANCE_ANSWERING_STAGE,
  bookedClassSessions,
  lifeCircumstanceTag,
  lifeCircumstancesFor,
  recordedSupervisorsAt,
  refreshLifeCircumstances,
  scheduleAgreedCoverShift,
  type LifeCircumstanceKind,
} from "./life-circumstances";
import {
  LIFE_CONTENT_62_KERNEL_KEYS,
  lifeContentKernelCounts,
  reconcileLifeContent62Kernels,
} from "./life-content-reconciliation";
import { createStableId } from "./ids";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";

/* -------------------------------------------------------------------------- */
/* Fixtures: one life, with only the records each proof names                  */
/* -------------------------------------------------------------------------- */

const provenance = {
  kind: "generated" as const,
  generatorKey: "test:life-content13",
};

interface LifeOptions {
  readonly seed: string;
  readonly startAge: number;
  /** The other adult's authority at the shared employer. */
  readonly otherAuthority?: "directed" | "directs-others";
  /** The player's own authority there. */
  readonly playerAuthority?: "directed" | "shared";
  readonly enrolled?: boolean;
  /** Put the other adult on a different employer's books instead. */
  readonly otherElsewhere?: boolean;
}

function life(options: LifeOptions) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startAge: options.startAge,
    seed: options.seed,
    depth: "summarize-earlier-life",
  });
  const otherId = game.world.personOrder.find(
    (id) => id !== game.playerPersonId,
  )!;
  const jurisdictionId =
    game.world.people[game.playerPersonId]!.homeJurisdictionId;
  const organizationId = createStableId(
    "organization",
    `${game.world.id}:test:employer`,
  );
  const elsewhereId = createStableId(
    "organization",
    `${game.world.id}:test:elsewhere`,
  );
  const schoolId = createStableId(
    "organization",
    `${game.world.id}:test:school`,
  );
  const employer = (stableKey: string, name: string) => ({
    kind: "organization" as const,
    input: {
      stableKey,
      formedAt: game.world.currentDate,
      provenance,
      initialProfile: {
        name,
        classification: "enterprise:retail" as const,
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  const job = (
    personId: EntityId,
    orgId: EntityId,
    authority: "directed" | "directs-others" | "shared",
  ) => ({
    kind: "work" as const,
    input: {
      stableKey: `test:work:${personId}`,
      personId,
      organizationId: orgId,
      startedAt: game.world.currentDate,
      kind: "employment:part-time" as const,
      compensation: "paid" as const,
      authority,
      dependency: "dependent" as const,
      economicRisk: "organization-borne" as const,
      provenance,
      initialRole: {
        // Deliberately the same title for both: authority, not a title, is
        // what makes somebody a supervisor.
        title: "Store assistant",
        occupationClassification: "occupation:retail-assistant" as const,
        locationJurisdictionId: jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 8, maximumHours: 16 },
          attention: "low" as const,
          concurrency: "mostly-concurrent" as const,
          scheduleRigidity: "flexible" as const,
          interruptibility: "interruptible" as const,
          locationJurisdictionId: jurisdictionId,
        },
      },
    },
  });
  const world = applyCharacterHistoryPlan(game.world, {
    stableKey: `test:life-content13:${options.seed}`,
    mode: "quick-generated",
    personId: game.playerPersonId,
    transitions: [
      employer("test:employer", "Test employer"),
      ...(options.otherElsewhere
        ? [employer("test:elsewhere", "Another employer")]
        : []),
      job(
        game.playerPersonId,
        organizationId,
        options.playerAuthority ?? "directed",
      ),
      job(
        otherId,
        options.otherElsewhere ? elsewhereId : organizationId,
        options.otherAuthority ?? "directed",
      ),
      ...(options.enrolled
        ? [
            {
              kind: "organization" as const,
              input: {
                stableKey: "test:school",
                formedAt: game.world.currentDate,
                provenance,
                initialProfile: {
                  name: "Test college",
                  classification: "service:college" as const,
                  locationJurisdictionId: jurisdictionId,
                },
              },
            },
            {
              kind: "education" as const,
              input: {
                stableKey: "test:enrollment",
                personId: game.playerPersonId,
                organizationId: schoolId,
                startedAt: game.world.currentDate,
                programKind: "postsecondary:office-certificate" as const,
                contextKind: "track:open-learning" as const,
                provenance,
              },
            },
          ]
        : []),
    ],
  }).world;
  return { world, playerId: game.playerPersonId, otherId };
}

/** A class session actually on the calendar, the only class timetable there is. */
function bookClassSession(world: World, playerId: EntityId): World {
  // The fixture's own active enrollment, not an earlier ended school record.
  const enrollment = world.history.educationEnrollments.find(
    (entry) =>
      entry.personId === playerId && entry.stableKey === "test:enrollment",
  )!;
  const at = (minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      date: addDays(world.currentDate, 10),
      minuteOfDay,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    });
  return createScheduledActivity(world, {
    stableKey: "test:class-session",
    title: "Office certificate session",
    summary: "A booked class session.",
    kind: "confirmed",
    start: at(14 * 60),
    end: at(16 * 60),
    participantPersonIds: [playerId],
    responsiblePersonId: playerId,
    location: {
      locationKey: "test:classroom",
      label: "Classroom",
      jurisdictionId: null,
    },
    sourceEntityIds: [enrollment.id],
    flexibility: { kind: "fixed" },
    access: { kind: "private", personIds: [playerId] },
  });
}

function refreshDays(world: World, playerId: EntityId, days: number): World {
  let next = world;
  for (let day = 0; day < days; day++) {
    next = refreshLifeCircumstances(next, playerId);
    next = advanceWorld(next, 1);
  }
  return refreshLifeCircumstances(next, playerId);
}

/** Refresh day by day until a kind is written, or the days run out. */
function refreshUntil(
  world: World,
  playerId: EntityId,
  kind: LifeCircumstanceKind,
  days: number,
): World {
  let next = refreshLifeCircumstances(world, playerId);
  for (let day = 0; day < days && !everWritten(next, kind); day++) {
    next = refreshLifeCircumstances(advanceWorld(next, 1), playerId);
  }
  return next;
}

/** Answer every other open circumstance the way a player would: first option. */
function answerOthers(
  world: World,
  playerId: EntityId,
  keep: LifeCircumstanceKind,
): World {
  let next = world;
  for (const open of lifeCircumstancesFor(next, playerId)) {
    if (open.kind === keep) continue;
    const [episodeKey, stageKey] =
      LIFE_CIRCUMSTANCE_ANSWERING_STAGE[open.kind].split("/");
    const answer = beat(next, playerId, episodeKey!, stageKey!);
    if (!answer) continue;
    next = playEpisodeOption(next, {
      personId: playerId,
      beat: answer,
      optionKey: answer.options[0]!.key,
      families: EPISODE_FAMILIES,
    }).world;
  }
  return next;
}

function everWritten(world: World, kind: LifeCircumstanceKind): boolean {
  return world.history.events.some((event) =>
    event.tags.includes(lifeCircumstanceTag(kind)),
  );
}

function beat(
  world: World,
  playerId: EntityId,
  episodeKey: string,
  stageKey: string,
): EpisodeBeat | undefined {
  return eligibleEpisodeBeats({
    world,
    personId: playerId,
    families: EPISODE_FAMILIES,
  }).beats.find(
    (candidate) =>
      candidate.episodeKey === episodeKey && candidate.stageKey === stageKey,
  );
}

const SHIFT = "work.the-shift-you-were-asked-for";

/** A colleague asks, and the player says yes. Nothing else. */
function agreeToCover(seed: string) {
  const fixture = life({ seed, startAge: 24 });
  let world = refreshLifeCircumstances(fixture.world, fixture.playerId);
  const asked = beat(world, fixture.playerId, SHIFT, "asked-by-a-colleague");
  // The request itself stays a legitimate new situation.
  expect(asked).toBeDefined();
  world = playEpisodeOption(world, {
    personId: fixture.playerId,
    beat: asked!,
    optionKey: "cover-it",
    families: EPISODE_FAMILIES,
  }).world;
  return { ...fixture, world };
}

function coveredShift(world: World, playerId: EntityId) {
  return world.history.scheduledActivities.find(
    (activity) =>
      activity.location.locationKey === COVERED_SHIFT_LOCATION_KEY &&
      activity.responsiblePersonId === playerId,
  );
}

/* -------------------------------------------------------------------------- */
/* The ledger                                                                  */
/* -------------------------------------------------------------------------- */

describe("LIFE-CONTENT13 exact-key reconciliation", () => {
  it("declares exactly 62 kernel keys", () => {
    expect(LIFE_CONTENT_62_KERNEL_KEYS).toHaveLength(62);
    expect(new Set(LIFE_CONTENT_62_KERNEL_KEYS).size).toBe(62);
  });

  it("maps more kernels than the first wave alone", () => {
    const counts = lifeContentKernelCounts();
    expect(counts["registered-existing-content"]).toBeGreaterThanOrEqual(19);
    expect(counts["opening-adaptation"]).toBeGreaterThanOrEqual(20);
    expect(
      counts["registered-existing-content"] +
        counts["opening-adaptation"] +
        counts["premise-blocked"] +
        counts["no-exact-mapping-verified"],
    ).toBe(62);
  });

  it("names every newly reachable priority kernel", () => {
    const byKey = new Map(
      reconcileLifeContent62Kernels().map((row) => [row.key, row]),
    );
    for (const key of [
      "early.community.curious-neighbor",
      "adult.trans.college-vs-work",
      "adult.trans.drop-class-keep-job",
    ])
      expect(byKey.get(key)?.status).toBe("opening-adaptation");
    for (const key of [
      "rel.encounter.shift-breakroom",
      "rel.encounter.campaign-canvass-partner",
      "adult.trans.shift-call-in",
    ]) {
      expect(byKey.get(key)?.status).toBe("registered-existing-content");
      expect(byKey.get(key)?.withheld).toBeUndefined();
    }
  });

  it("says which registered content is never offered, and why", () => {
    const byKey = new Map(
      reconcileLifeContent62Kernels().map((row) => [row.key, row]),
    );
    expect(byKey.get("adult.trans.commuter-strain")?.withheld).toMatch(
      /transit/,
    );
    expect(byKey.get("rel.encounter.bus-stop-regular")?.withheld).toMatch(
      /transit/,
    );
    expect(byKey.get("early.family.packing-boxes")?.withheld).toMatch(
      /household move/,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Defect 1 — a job and an enrollment are not a commute or a clash             */
/* -------------------------------------------------------------------------- */

describe("employment and enrollment alone assert no commute or collision", () => {
  it("never writes a commute, and never offers the commute or bus-stop scenes", () => {
    const fixture = life({
      seed: "no-commute",
      startAge: 19,
      enrolled: true,
      otherAuthority: "directs-others",
    });
    const world = refreshDays(fixture.world, fixture.playerId, 40);
    expect(everWritten(world, "commute-schedule-conflict")).toBe(false);
    expect(
      episodeFacts(world, fixture.playerId).get(
        "school.commute-schedule-conflict",
      )?.holds ?? false,
    ).toBe(false);
    const eligibility = eligibleEpisodeBeats({
      world,
      personId: fixture.playerId,
      families: EPISODE_FAMILIES,
    });
    expect(
      eligibility.beats.some((entry) =>
        ["the-commute", "dropped-pass"].includes(entry.stageKey),
      ),
    ).toBe(false);
    expect(
      eligibility.exclusions.find((entry) => entry.stageKey === "the-commute")
        ?.requirement.kind,
    ).toBe("withheld");
  });

  it("writes no class clash without a booked class session", () => {
    const fixture = life({
      seed: "no-booked-class",
      startAge: 20,
      enrolled: true,
      otherAuthority: "directs-others",
    });
    const world = refreshDays(fixture.world, fixture.playerId, 40);
    expect(bookedClassSessions(world, fixture.playerId)).toHaveLength(0);
    expect(everWritten(world, "class-work-schedule-conflict")).toBe(false);
  });

  it("writes the class clash against the session that is actually booked", () => {
    const fixture = life({
      seed: "booked-class",
      startAge: 20,
      enrolled: true,
      otherAuthority: "directs-others",
    });
    const booked = bookClassSession(fixture.world, fixture.playerId);
    const session = bookedClassSessions(booked, fixture.playerId)[0]!;
    let world = refreshLifeCircumstances(booked, fixture.playerId);
    for (
      let day = 0;
      day < 6 && !everWritten(world, "class-work-schedule-conflict");
      day++
    ) {
      world = answerOthers(
        world,
        fixture.playerId,
        "class-work-schedule-conflict",
      );
      world = refreshLifeCircumstances(
        advanceWorld(world, 1),
        fixture.playerId,
      );
    }
    const clash = world.history.events.find((event) =>
      event.tags.includes(lifeCircumstanceTag("class-work-schedule-conflict")),
    );
    expect(clash).toBeDefined();
    expect(clash!.involvedEntityIds).toContain(session.activity.id);
    expect(clash!.involvedEntityIds).toContain(fixture.otherId);
    expect(clash!.tags).toContain("proposal:start-hour:14");
    expect(clash!.summary).not.toMatch(/Thursday|lab|team lead/);
  });
});

/* -------------------------------------------------------------------------- */
/* Defect 2 — a colleague is not a supervisor                                  */
/* -------------------------------------------------------------------------- */

describe("a supervisor is a recorded work authority, not a name", () => {
  it("binds nobody as supervisor when the only other worker is a directed colleague", () => {
    const fixture = life({
      seed: "colleague-only",
      startAge: 20,
      enrolled: true,
    });
    const booked = bookClassSession(fixture.world, fixture.playerId);
    const world = refreshDays(booked, fixture.playerId, 40);
    expect(recordedSupervisorsAt(world, fixture.playerId)).toHaveLength(0);
    expect(
      episodeRoleBindings(world, fixture.playerId).some(
        (binding) => binding.role === "supervisor",
      ),
    ).toBe(false);
    expect(everWritten(world, "supervisor-extra-shift")).toBe(false);
    expect(everWritten(world, "class-work-schedule-conflict")).toBe(false);
    expect(beat(world, fixture.playerId, SHIFT, "called-in")).toBeUndefined();
  });

  it("does not treat somebody who directs others at another employer as this person's supervisor", () => {
    const fixture = life({
      seed: "other-employer",
      startAge: 20,
      enrolled: true,
      otherAuthority: "directs-others",
      otherElsewhere: true,
    });
    const world = refreshDays(fixture.world, fixture.playerId, 20);
    expect(recordedSupervisorsAt(world, fixture.playerId)).toHaveLength(0);
    expect(everWritten(world, "supervisor-extra-shift")).toBe(false);
  });

  it("does not make a shared-authority worker answer to anybody", () => {
    const fixture = life({
      seed: "shared-authority",
      startAge: 20,
      enrolled: true,
      otherAuthority: "directs-others",
      playerAuthority: "shared",
    });
    expect(recordedSupervisorsAt(fixture.world, fixture.playerId)).toHaveLength(
      0,
    );
  });

  it("names the recorded supervisor in the request, and survives reload", () => {
    const fixture = life({
      seed: "real-supervisor",
      startAge: 20,
      enrolled: true,
      otherAuthority: "directs-others",
    });
    expect(recordedSupervisorsAt(fixture.world, fixture.playerId)).toEqual([
      expect.objectContaining({ personId: fixture.otherId }),
    ]);
    const world = refreshUntil(
      fixture.world,
      fixture.playerId,
      "supervisor-extra-shift",
      30,
    );
    const request = lifeCircumstancesFor(world, fixture.playerId).find(
      (entry) => entry.kind === "supervisor-extra-shift",
    );
    expect(request?.counterpartPersonId).toBe(fixture.otherId);
    const calledIn = beat(world, fixture.playerId, SHIFT, "called-in");
    expect(calledIn).toBeDefined();
    const supervisorName = calledIn!.bindings.find(
      (binding) => binding.role === "supervisor",
    )?.personName;
    expect(supervisorName).toBeTruthy();
    expect(calledIn!.prose.startsWith(supervisorName!)).toBe(true);
    expect(calledIn!.prose).not.toMatch(/set aside|have due|put aside/);
    const saved = serializeWorld(world);
    const loaded = deserializeWorld(saved);
    expect(serializeWorld(loaded)).toBe(saved);
    assertWorldIntegrity(loaded);
    expect(beat(loaded, fixture.playerId, SHIFT, "called-in")?.prose).toBe(
      calledIn!.prose,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Defect 3 — agreeing to cover is not having covered                          */
/* -------------------------------------------------------------------------- */

describe("a favour is leaned on only after the covered shift was worked", () => {
  it("offers no follow-up when the player agreed but the shift was never booked or worked", () => {
    const agreed = agreeToCover("agreed-not-worked");
    const world = refreshDays(
      agreed.world,
      agreed.playerId,
      COVERED_SHIFT_RETURN_DAYS + 10,
    );
    expect(coveredShift(world, agreed.playerId)).toBeUndefined();
    expect(everWritten(world, "own-shift-coverage-needed")).toBe(false);
    expect(
      beat(world, agreed.playerId, SHIFT, "it-came-back-round"),
    ).toBeUndefined();
  });

  it("offers no follow-up when the covered shift was booked and then cancelled", () => {
    const agreed = agreeToCover("booked-then-cancelled");
    const booked = scheduleAgreedCoverShift(agreed.world, agreed.playerId);
    const shift = coveredShift(booked, agreed.playerId)!;
    expect(scheduledActivityState(booked, shift.id).status).toBe("scheduled");
    const world = refreshDays(
      cancelScheduledActivity(booked, shift.id),
      agreed.playerId,
      COVERED_SHIFT_RETURN_DAYS + 10,
    );
    expect(everWritten(world, "own-shift-coverage-needed")).toBe(false);
    expect(
      beat(world, agreed.playerId, SHIFT, "it-came-back-round"),
    ).toBeUndefined();
  });

  it("offers no follow-up while the booked shift is still only scheduled", () => {
    const agreed = agreeToCover("booked-not-worked");
    const booked = scheduleAgreedCoverShift(agreed.world, agreed.playerId);
    const world = refreshDays(
      booked,
      agreed.playerId,
      COVERED_SHIFT_RETURN_DAYS + 10,
    );
    const shift = coveredShift(world, agreed.playerId)!;
    expect(scheduledActivityState(world, shift.id).status).toBe("scheduled");
    expect(everWritten(world, "own-shift-coverage-needed")).toBe(false);
  });

  it("refuses to book a shift the player turned down", () => {
    const fixture = life({ seed: "turned-down", startAge: 24 });
    let world = refreshLifeCircumstances(fixture.world, fixture.playerId);
    const asked = beat(world, fixture.playerId, SHIFT, "asked-by-a-colleague")!;
    world = playEpisodeOption(world, {
      personId: fixture.playerId,
      beat: asked,
      optionKey: "turn-them-down",
      families: EPISODE_FAMILIES,
    }).world;
    expect(scheduleAgreedCoverShift(world, fixture.playerId)).toBe(world);
  });

  it("ignores a first-version follow-up event written from the yes alone", () => {
    const agreed = agreeToCover("legacy-event");
    const legacy = recordWorldEvent(agreed.world, {
      stableKey: "test:legacy-own-shift",
      type: "work.own-shift-coverage-needed",
      occurredAt: agreed.world.currentDate,
      recordedAt: agreed.world.currentDate,
      jurisdictionId: agreed.world.people[agreed.playerId]!.homeJurisdictionId,
      involvedEntityIds: [agreed.playerId, agreed.otherId],
      participants: [
        {
          personId: agreed.playerId,
          role: "focus:subject",
          detail: "The person this is happening to",
        },
        {
          personId: agreed.otherId,
          role: "agency:asked",
          detail: "The person who asked",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [
        lifeCircumstanceTag("own-shift-coverage-needed"),
        "provenance:authored-life-circumstance-v1",
      ],
      summary:
        "You need a shift covered, and somebody on your rota is scheduled that day.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    // The saved event stays exactly as written; it simply is not a premise.
    expect(
      legacy.history.events.some(
        (event) => event.stableKey === "test:legacy-own-shift",
      ),
    ).toBe(true);
    expect(
      lifeCircumstancesFor(legacy, agreed.playerId).some(
        (entry) => entry.kind === "own-shift-coverage-needed",
      ),
    ).toBe(false);
  });

  it("agrees, books, works, and only then leans on the favour — across reload", () => {
    const agreed = agreeToCover("worked-shift");
    // Agreeing wrote no calendar entry.
    expect(coveredShift(agreed.world, agreed.playerId)).toBeUndefined();
    const booked = scheduleAgreedCoverShift(agreed.world, agreed.playerId);
    const shift = coveredShift(booked, agreed.playerId)!;
    expect(shift.sourceEntityIds).toHaveLength(2);
    // Booking twice books once.
    expect(scheduleAgreedCoverShift(booked, agreed.playerId)).toBe(booked);
    const worked = performScheduledActivity(booked, shift.id);
    const state = scheduledActivityState(worked, shift.id);
    expect(state.status).toBe("completed");
    expect(state.outcomeEventId).not.toBeNull();

    // Before the return window, nothing yet.
    const early = refreshDays(worked, agreed.playerId, 30);
    expect(everWritten(early, "own-shift-coverage-needed")).toBe(false);

    const world = refreshDays(
      worked,
      agreed.playerId,
      COVERED_SHIFT_RETURN_DAYS + 5,
    );
    const need = lifeCircumstancesFor(world, agreed.playerId).find(
      (entry) => entry.kind === "own-shift-coverage-needed",
    );
    expect(need?.counterpartPersonId).toBe(agreed.otherId);
    const followUp = beat(world, agreed.playerId, SHIFT, "it-came-back-round");
    expect(followUp).toBeDefined();
    expect(followUp!.bindings.map((binding) => binding.personId)).toContain(
      agreed.otherId,
    );
    expect(followUp!.prose).toMatch(/and you did\.$/);
    expect(followUp!.prose).not.toMatch(/rota/);

    const saved = serializeWorld(world);
    const loaded = deserializeWorld(saved);
    expect(serializeWorld(loaded)).toBe(saved);
    assertWorldIntegrity(loaded);
    expect(
      beat(loaded, agreed.playerId, SHIFT, "it-came-back-round")?.prose,
    ).toBe(followUp!.prose);
  });
});

/* -------------------------------------------------------------------------- */
/* A circumstance stops being open when what it says stops being true          */
/* -------------------------------------------------------------------------- */

describe("an open circumstance keeps speaking only while its premise holds", () => {
  it("closes the class clash when the session it names is cancelled", () => {
    const fixture = life({
      seed: "clash-cancelled",
      startAge: 20,
      enrolled: true,
      otherAuthority: "directs-others",
    });
    const booked = bookClassSession(fixture.world, fixture.playerId);
    const session = bookedClassSessions(booked, fixture.playerId)[0]!;
    let world = refreshLifeCircumstances(booked, fixture.playerId);
    for (
      let day = 0;
      day < 6 && !everWritten(world, "class-work-schedule-conflict");
      day++
    ) {
      world = answerOthers(
        world,
        fixture.playerId,
        "class-work-schedule-conflict",
      );
      world = refreshLifeCircumstances(
        advanceWorld(world, 1),
        fixture.playerId,
      );
    }
    expect(
      lifeCircumstancesFor(world, fixture.playerId).some(
        (entry) => entry.kind === "class-work-schedule-conflict",
      ),
    ).toBe(true);
    const cancelled = cancelScheduledActivity(world, session.activity.id);
    // The event stays in history; the premise does not.
    expect(everWritten(cancelled, "class-work-schedule-conflict")).toBe(true);
    expect(
      lifeCircumstancesFor(cancelled, fixture.playerId).some(
        (entry) => entry.kind === "class-work-schedule-conflict",
      ),
    ).toBe(false);
    expect(
      episodeFacts(cancelled, fixture.playerId).get(
        "work.class-schedule-conflict",
      )?.holds ?? false,
    ).toBe(false);
  });

  it("closes the supervisor's request when the supervisor's job ends", () => {
    const fixture = life({
      seed: "supervisor-left",
      startAge: 20,
      enrolled: true,
      otherAuthority: "directs-others",
    });
    const world = refreshUntil(
      fixture.world,
      fixture.playerId,
      "supervisor-extra-shift",
      30,
    );
    expect(
      lifeCircumstancesFor(world, fixture.playerId).some(
        (entry) => entry.kind === "supervisor-extra-shift",
      ),
    ).toBe(true);
    const relationship = world.history.workRelationships.find(
      (entry) => entry.personId === fixture.otherId,
    )!;
    const left = recordWorkStatus(world, {
      stableKey: "test:supervisor-left",
      workRelationshipId: relationship.id,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "Left the job.",
      provenance,
      supersedesStatusId:
        world.history.workStatuses
          .filter((entry) => entry.workRelationshipId === relationship.id)
          .at(-1)?.id ?? null,
    });
    expect(recordedSupervisorsAt(left, fixture.playerId)).toHaveLength(0);
    expect(
      lifeCircumstancesFor(left, fixture.playerId).some(
        (entry) => entry.kind === "supervisor-extra-shift",
      ),
    ).toBe(false);
    expect(beat(left, fixture.playerId, SHIFT, "called-in")).toBeUndefined();
    // And the freed slot can be used again.
    expect(lifeCircumstancesFor(left, fixture.playerId).length).toBeLessThan(
      OPEN_LIFE_CIRCUMSTANCE_LIMIT,
    );
  });

  it("never re-issues a request this life has already answered", () => {
    const agreed = agreeToCover("no-reissue");
    const world = refreshDays(agreed.world, agreed.playerId, 20);
    expect(
      world.history.events.filter((event) =>
        event.tags.includes(lifeCircumstanceTag("colleague-coverage-request")),
      ),
    ).toHaveLength(1);
  });

  it("books the covered shift again after a cancelled booking", () => {
    const agreed = agreeToCover("rebook");
    const booked = scheduleAgreedCoverShift(agreed.world, agreed.playerId);
    const first = coveredShift(booked, agreed.playerId)!;
    const cancelled = cancelScheduledActivity(booked, first.id);
    const rebooked = scheduleAgreedCoverShift(cancelled, agreed.playerId);
    expect(rebooked).not.toBe(cancelled);
    const live = rebooked.history.scheduledActivities.filter(
      (activity) =>
        activity.location.locationKey === COVERED_SHIFT_LOCATION_KEY &&
        scheduledActivityState(rebooked, activity.id).status === "scheduled",
    );
    expect(live).toHaveLength(1);
    expect(live[0]!.id).not.toBe(first.id);
    assertWorldIntegrity(rebooked);
  });
});

/* -------------------------------------------------------------------------- */
/* The reviewed encounters                                                     */
/* -------------------------------------------------------------------------- */

describe("the newly eligible encounters bind people the records support", () => {
  it("offers the breakroom encounter with a colleague from the same employer", () => {
    const fixture = life({ seed: "breakroom", startAge: 24 });
    const encounter = beat(
      fixture.world,
      fixture.playerId,
      "work.where-you-stand-there",
      "calibration-chart",
    );
    expect(encounter?.bindings[0]?.personId).toBe(fixture.otherId);
    expect(encounter?.prose).toMatch(/printed chart from work/);
  });

  function withPoliticalGroup(seed: string, partner: "same" | "none") {
    const fixture = life({ seed, startAge: 24 });
    const groupId = createStableId(
      "organization",
      `${fixture.world.id}:test:group`,
    );
    const participation = (personId: EntityId) => ({
      kind: "participation" as const,
      input: {
        stableKey: `test:participation:${personId}`,
        personId,
        organizationId: groupId,
        startedAt: fixture.world.currentDate,
        kind: "membership:political-club" as const,
        roleKind: "member:volunteer" as const,
        context: null,
        provenance,
      },
    });
    const world = applyCharacterHistoryPlan(fixture.world, {
      stableKey: `test:group:${seed}`,
      mode: "quick-generated",
      personId: fixture.playerId,
      transitions: [
        {
          kind: "organization",
          input: {
            stableKey: "test:group",
            formedAt: fixture.world.currentDate,
            provenance,
            initialProfile: {
              name: "Test political club",
              classification: "community:voluntary",
              locationJurisdictionId:
                fixture.world.people[fixture.playerId]!.homeJurisdictionId,
            },
          },
        },
        participation(fixture.playerId),
        ...(partner === "same" ? [participation(fixture.otherId)] : []),
      ],
    }).world;
    return { ...fixture, world };
  }

  it("pairs a canvass only with somebody from the same political group", () => {
    const paired = withPoliticalGroup("canvass-paired", "same");
    const encounter = beat(
      paired.world,
      paired.playerId,
      "political.what-your-name-is-for",
      "between-doors",
    );
    expect(encounter?.bindings[0]?.personId).toBe(paired.otherId);
    expect(encounter?.prose).not.toMatch(/measure|candidate|party/);
  });

  it("never pairs a work colleague who is not in the group", () => {
    const alone = withPoliticalGroup("canvass-colleague-only", "none");
    expect(
      episodeFacts(alone.world, alone.playerId).get("political.participation")
        ?.holds,
    ).toBe(true);
    expect(
      beat(
        alone.world,
        alone.playerId,
        "political.what-your-name-is-for",
        "between-doors",
      ),
    ).toBeUndefined();
  });
});
