import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays, simulationMomentOnLocalDate } from "../dates";
import { introduceMeasure } from "../legislation";
import { searchLifePlaces } from "../life-places";
import {
  PRESSURE_CONTRACT_VERSION,
  UNREST_EVENT,
  homeStateKeyOf,
  prominentPeopleIn,
  stepPressure,
  stepPressureEvents,
  worldStates,
  type PressureReading,
} from "../pressure";
import { createStableId } from "../ids";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  PolicyPropositionDefinition,
  World,
} from "../types";
import { recordPersonDeath } from "../vitality";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { recordWorldEvent } from "../world";
import {
  BLANKET_MOVEMENTS,
  MOVEMENT_BACKLASH_EVENT,
  MOVEMENT_FADED_EVENT,
  MOVEMENT_FOUNDED_EVENT,
  MOVEMENT_LEADER_EVENT,
  MOVEMENT_MARCH_EVENT,
  MOVEMENT_STATEMENT_EVENT,
  MOVEMENT_WON_EVENT,
  activeMovements,
  allMovements,
  assertMovementIntegrity,
  foundMovementAs,
  joinMovement,
  leadMovement,
  leaderCandidates,
  leaveMovement,
  movementByKey,
  movementLeader,
  movementLeadersIn,
  movementPeople,
  movementRoleOf,
  opposeMovement,
  principleBearing,
  speakOnMovement,
  stepMovements,
  type Movement,
} from ".";

const LONG = 900_000;
/** Oregon; Kentucky is deliberately not the test place. */
const STATE = "US-OR";

function openLife(seed: string): World {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: STATE,
    scope: "locality",
  })[0]!;
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!.world;
}

function stateId(world: World): EntityId {
  return worldStates(world).find((row) => row.stateKey === STATE)!.jurisdiction
    .id;
}

function player(world: World): EntityId {
  if (world.control.kind !== "person") throw new Error("No player.");
  return world.control.personId;
}

function eventsOf(world: World, type: string) {
  return world.history.events.filter((event) => event.type === type);
}

/**
 * Steps one quarter with an authored Oregon reading, by date alone as the
 * pressure layer's own tests do, so these check the movement store; the test
 * on the real clock checks the whole world: the pressure layer's own
 * causes are tested in its files, and here the reading is the input. Anger
 * from jobs, and unrest recorded this quarter when asked.
 */
function quarter(
  world: World,
  options: { readonly anger: number; readonly unrest?: boolean },
): World {
  const currentDate = addDays(world.currentDate, 91);
  const ordinal = (world.pressure?.quartersStepped ?? 0) + 1;
  const reading: PressureReading = {
    key: `test:${STATE}:${ordinal}`,
    ordinal,
    stateKey: STATE,
    jurisdictionId: stateId(world),
    periodStart: addDays(world.currentDate, 1),
    periodEnd: currentDate,
    levels: { leave: 0, arrive: 0, anger: options.anger, fear: 0, hope: 0 },
    contributions:
      options.anger > 0
        ? [
            {
              causeKey: "unemployment-rise:national",
              kind: "anger",
              amount: options.anger,
              sourceId: world.id,
            },
          ]
        : [],
  };
  let next: World = {
    ...world,
    currentDate,
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      currentDate,
    ),
    pressure: {
      contractVersion: PRESSURE_CONTRACT_VERSION,
      quartersStepped: ordinal,
      lastPeriodEnd: currentDate,
      readings: [...(world.pressure?.readings ?? []), reading],
      flows: world.pressure?.flows ?? [],
    },
  };
  if (options.unrest)
    next = recordWorldEvent(next, {
      stableKey: `test:unrest:${ordinal}`,
      type: UNREST_EVENT,
      occurredAt: currentDate,
      recordedAt: currentDate,
      jurisdictionId: stateId(next),
      involvedEntityIds: [stateId(next)],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["pressure", UNREST_EVENT, `state:${STATE}`, `quarter:${ordinal}`],
      summary: "Unrest broke out in Oregon as public anger ran high.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  return stepMovements(next);
}

function proposition(world: World, key: string): PolicyPropositionDefinition {
  return Object.values(world.policyCatalog.propositions).find((row) =>
    row.stableKey.endsWith(key),
  )!;
}

/**
 * Enacts a state measure answering one question. The measure is introduced
 * through the real writer; the enactment record is authored, because the
 * route from introduction to law is tested in the legislation files and what
 * movements read is the record.
 */
function enact(
  world: World,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  answer: "yes" | "no",
  stableKey: string,
): World {
  const introduced = introduceMeasure(world, {
    stableKey,
    jurisdictionId,
    rulePackId: "us-ne-legislature-v1",
    designation: "SB 12",
    shortTitle: "A test act",
    summary: "Authored for the movements test.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    propositionIds: [propositionId],
    propositionAnswers: [{ propositionId, answer }],
  });
  const measure = introduced.history.legislativeMeasures!.find(
    (row) => row.stableKey === stableKey,
  )!;
  const enactment: LegislativeEnactmentRecord = {
    id: createStableId("legislative-enactment", `${measure.id}:test`),
    stableKey: `${stableKey}:enactment`,
    sequence: introduced.history.nextSequence,
    measureId: measure.id,
    resolvedAt: introduced.currentDate,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: null,
    outcomeEventId: measure.id,
  };
  return {
    ...introduced,
    history: {
      ...introduced.history,
      nextSequence: introduced.history.nextSequence + 1,
      legislativeEnactments: [
        ...(introduced.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}

/** Lasting jobs unrest until a worker movement forms. */
function withWorkerMovement(seed: string): {
  world: World;
  movement: Movement;
} {
  let world = quarter(openLife(seed), { anger: 1.5, unrest: true });
  for (let n = 0; n < 6 && activeMovements(world).length === 0; n += 1)
    world = quarter(world, { anger: 1.5, unrest: true });
  const movement = activeMovements(world)[0];
  if (!movement) throw new Error("No worker movement formed.");
  return { world, movement };
}

describe("rights and protest movements", { timeout: LONG }, () => {
  it("founds nothing when nothing feeds anger", () => {
    let world = openLife("movements-quiet");
    for (let n = 0; n < 8; n += 1)
      world = stepMovements(
        stepPressureEvents(
          stepPressure({
            ...world,
            currentDate: addDays(world.currentDate, 91),
          }),
        ),
      );
    expect(allMovements(world)).toEqual([]);
    expect(world.movements).toBeUndefined();
  });

  it("needs lasting unrest: one quarter of unrest founds nothing", () => {
    const world = quarter(openLife("movements-one-quarter"), {
      anger: 1.5,
      unrest: true,
    });
    expect(allMovements(world)).toEqual([]);
  });

  it("founds a worker movement from lasting jobs unrest, led by someone with no office", () => {
    const { world, movement } = withWorkerMovement("movements-worker");
    expect(movement.cause).toBe("worker");
    expect(movement.stateKey).toBe(STATE);
    const demand = world.policyCatalog.propositions[movement.propositionId]!;
    const bearing = principleBearing(world, demand, "worker-protection");
    expect(bearing).not.toBeNull();
    expect(movement.answer).toBe(bearing === "consistent-with" ? "yes" : "no");
    const leader = movementLeader(movement)!;
    expect(leader).not.toBe(player(world));
    expect(homeStateKeyOf(world, leader)).toBe(STATE);
    expect(prominentPeopleIn(world, STATE)).not.toContain(leader);
    expect(movementLeadersIn(world, STATE)).toEqual([leader]);
    expect(movement.evidenceIds.length).toBeGreaterThan(0);
    const founded = eventsOf(world, MOVEMENT_FOUNDED_EVENT);
    expect(founded).toHaveLength(1);
    expect(founded[0]!.visibility).toBe("public");
    expect(founded[0]!.summary).toContain("With jobs disappearing");
    expect(() => assertMovementIntegrity(world)).not.toThrow();
  });

  it("grows and marches while anger holds, draws backlash, and fades when it dwindles", () => {
    let { world, movement } = withWorkerMovement("movements-arc");
    for (let n = 0; n < 6; n += 1) world = quarter(world, { anger: 1 });
    movement = movementByKey(world, movement.key)!;
    expect(movement.strength).toBeGreaterThan(BLANKET_MOVEMENTS.startStrength);
    expect(movement.marches).toBeGreaterThan(0);
    expect(movement.phase).toBe("marching");
    expect(movement.backlash).toBeGreaterThan(0);
    const march = eventsOf(world, MOVEMENT_MARCH_EVENT)[0]!;
    expect(march.participants.map((row) => row.personId)).toContain(
      movementLeader(movement),
    );
    expect(eventsOf(world, MOVEMENT_BACKLASH_EVENT).length).toBeGreaterThan(0);

    // Its leader steps down and anger passes: it dwindles and fades.
    world = leaveMovement(world, movement.key, movementLeader(movement)!);
    for (
      let n = 0;
      n < 30 && movementByKey(world, movement.key)!.phase !== "faded";
      n += 1
    )
      world = quarter(world, { anger: 0 });
    movement = movementByKey(world, movement.key)!;
    expect(movement.phase).toBe("faded");
    expect(movement.endedAt).toBe(world.currentDate);
    expect(eventsOf(world, MOVEMENT_FADED_EVENT)).toHaveLength(1);
    expect(() => assertMovementIntegrity(world)).not.toThrow();
  });

  it("wins when a law answering its demand is enacted", () => {
    let { world, movement } = withWorkerMovement("movements-win");
    world = enact(
      world,
      movement.jurisdictionId,
      movement.propositionId,
      movement.answer,
      "movements-test:win",
    );
    world = quarter(world, { anger: 0.5 });
    movement = movementByKey(world, movement.key)!;
    expect(movement.phase).toBe("won");
    expect(movement.wonByMeasureId).not.toBeNull();
    const won = eventsOf(world, MOVEMENT_WON_EVENT);
    expect(won).toHaveLength(1);
    expect(won[0]!.summary).toContain("won");
    expect(activeMovements(world)).toEqual([]);
  });

  it("does not count a law answering the other way as a win", () => {
    const setup = withWorkerMovement("movements-no-win");
    const { movement } = setup;
    let { world } = setup;
    world = enact(
      world,
      movement.jurisdictionId,
      movement.propositionId,
      movement.answer === "yes" ? "no" : "yes",
      "movements-test:loss",
    );
    world = quarter(world, { anger: 0.5 });
    expect(movementByKey(world, movement.key)!.phase).not.toBe("won");
  });

  it("founds a rights movement after a law against equal treatment", () => {
    let world = openLife("movements-rights");
    const question = proposition(
      world,
      "ban-discrimination-in-housing-and-work",
    );
    expect(principleBearing(world, question, "equal-treatment")).toBe(
      "consistent-with",
    );
    world = enact(
      world,
      stateId(world),
      question.id,
      "no",
      "movements-test:rights",
    );
    for (let n = 0; n < 12 && activeMovements(world).length === 0; n += 1)
      world = quarter(world, { anger: 0.4 });
    const movement = activeMovements(world)[0]!;
    expect(movement.cause).toBe("rights");
    expect(movement.propositionId).toBe(question.id);
    expect(movement.answer).toBe("yes");
    expect(eventsOf(world, MOVEMENT_FOUNDED_EVENT)[0]!.summary).toMatch(
      /^After .* enacted SB 12, A test act, .* began organizing a movement/,
    );
    expect(() => assertMovementIntegrity(world)).not.toThrow();
  });

  it("succeeds a leader who dies, and the loss rallies the movement", () => {
    // Someone in Oregon founds it, then dies; the real clock steps it.
    let world = openLife("movements-succession");
    const leader = leaderCandidates(world, STATE)[0]!;
    world = foundMovementAs(world, {
      personId: leader,
      propositionId: proposition(world, "paid-family-leave").id,
      answer: "yes",
    });
    const key = activeMovements(world)[0]!.key;
    const before = activeMovements(world)[0]!.strength;
    world = recordPersonDeath(world, {
      stableKey: `movements-test:death:${leader}`,
      personId: leader,
      diedAt: world.currentDate,
      causeKey: "cause:movements-fixture",
      sourceEntityIds: [world.id],
      summary: "Died; the cause is not recorded.",
      provenance: { kind: "authored", note: "Movements test fixture." },
    });
    world = passOrdinaryDays(world, 100);
    const movement = movementByKey(world, key)!;
    const heir = movementLeader(movement);
    expect(heir).not.toBe(leader);
    expect(heir).not.toBeNull();
    expect(homeStateKeyOf(world, heir!)).toBe(STATE);
    expect(
      movement.roles.find((row) => row.personId === leader)!.until,
    ).not.toBeNull();
    expect(eventsOf(world, MOVEMENT_LEADER_EVENT)[0]!.summary).toContain(
      "died",
    );
    // The rally comes before the quarter's growth, and a led movement with
    // no backlash grows, so it ends above where it began.
    expect(movement.strength).toBeGreaterThan(before);
  });

  it("lets the player found, lead and speak, and refuses what makes no sense", () => {
    let world = quarter(openLife("movements-player"), { anger: 0 });
    const me = player(world);
    const question = proposition(world, "civilian-oversight-of-police");
    world = foundMovementAs(world, {
      personId: me,
      propositionId: question.id,
      answer: "yes",
    });
    const movement = activeMovements(world)[0]!;
    expect(movement.cause).toBe("founded");
    expect(movementLeader(movement)).toBe(me);
    expect(eventsOf(world, MOVEMENT_FOUNDED_EVENT)[0]!.summary).toMatch(
      /founded a movement in Oregon for “Civilian oversight of police”/,
    );
    expect(() =>
      foundMovementAs(world, {
        personId: me,
        propositionId: question.id,
        answer: "yes",
      }),
    ).toThrow(/already exists/);
    expect(() => joinMovement(world, movement.key, me)).toThrow(/Step down/);

    world = speakOnMovement(world, movement.key, me, "support");
    expect(movementByKey(world, movement.key)!.strength).toBeCloseTo(
      BLANKET_MOVEMENTS.startStrength + BLANKET_MOVEMENTS.statement.support,
    );
    expect(eventsOf(world, MOVEMENT_STATEMENT_EVENT)).toHaveLength(1);
    expect(() => speakOnMovement(world, movement.key, me, "calm")).toThrow(
      /already spoken/,
    );
    // A new quarter, a new chance to speak.
    world = quarter(world, { anger: 0 });
    expect(() =>
      speakOnMovement(world, movement.key, me, "calm"),
    ).not.toThrow();
    expect(() => assertMovementIntegrity(world)).not.toThrow();
  });

  it("lets the player join, oppose, leave and take up an empty lead", () => {
    let { world, movement } = withWorkerMovement("movements-roles");
    const me = player(world);
    world = joinMovement(world, movement.key, me);
    expect(movementRoleOf(movementByKey(world, movement.key)!, me)).toBe(
      "member",
    );
    expect(() => leadMovement(world, movement.key, me)).toThrow(
      /already leads/,
    );
    world = opposeMovement(world, movement.key, me);
    movement = movementByKey(world, movement.key)!;
    expect(movementRoleOf(movement, me)).toBe("opponent");
    expect(movementPeople(movement, "member")).not.toContain(me);
    const backlash = movement.backlash;
    world = quarter(world, { anger: 0 });
    // An opponent keeps backlash from fading all the way.
    expect(movementByKey(world, movement.key)!.backlash).toBeGreaterThan(
      backlash * (1 - BLANKET_MOVEMENTS.backlashFade),
    );

    world = leaveMovement(world, movement.key, me);
    world = leaveMovement(world, movement.key, movementLeader(movement)!);
    expect(movementLeader(movementByKey(world, movement.key)!)).toBeNull();
    world = leadMovement(world, movement.key, me);
    expect(movementLeader(movementByKey(world, movement.key)!)).toBe(me);
    expect(() => assertMovementIntegrity(world)).not.toThrow();
    // A save survives the trip through JSON.
    const saved = JSON.parse(JSON.stringify(world)) as World;
    expect(() => assertMovementIntegrity(saved)).not.toThrow();
    expect(saved.movements).toEqual(world.movements);
  });

  it("steps on the real game clock, inside the quarterly review", () => {
    let world = openLife("movements-clock");
    const me = player(world);
    world = foundMovementAs(world, {
      personId: me,
      propositionId: proposition(world, "restore-voting-after-sentence").id,
      answer: "yes",
    });
    const key = activeMovements(world)[0]!.key;
    // passOrdinaryDays checks the whole world's integrity when it ends.
    world = passOrdinaryDays(world, 200);
    const movement = movementByKey(world, key)!;
    expect(movement.lastQuarter).toBeGreaterThan(movement.foundedQuarter);
    expect(movementLeader(movement)).toBe(me);
  });
});
