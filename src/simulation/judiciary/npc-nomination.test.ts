import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { currentPresidentOf } from "../crisis/offices";
import { addDays, simulationMomentAtLocalTime } from "../dates";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { IsoDate, World } from "../types";
import { recordPersonDeath } from "../vitality";
import { seatHolderAt, vacateJudicialSeat } from "./courts";
import {
  JUDICIAL_NPC_CANDIDATE_RESPONSE_EVENT,
  JUDICIAL_NPC_NOMINATION_TRANSITION,
  JUDICIAL_NPC_REVIEW_EVENT,
  npcFederalJudicialNominationHandler,
  scheduleNpcFederalJudicialNominationForDeath,
} from "./npc-nomination";

function deceasedDistrictJudge() {
  let world = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "npc-judicial-death-nomination",
    }),
  ).game!.world;
  const seat = Object.values(world.judiciary!.seats).find(
    (item) =>
      world.judiciary!.courts[item.courtId]?.level === "federal-district" &&
      !!seatHolderAt(world, item.seatId),
  )!;
  const deceasedId = seatHolderAt(world, seat.seatId)!.personId;
  world = recordPersonDeath(world, {
    stableKey: `judiciary:npc-test-death:${deceasedId}`,
    personId: deceasedId,
    diedAt: world.currentDate,
    causeKey: "cause:external-fixture",
    sourceEntityIds: [world.id],
    summary: "A sitting judge died.",
    provenance: { kind: "authored", note: "NPC nomination death fixture." },
  });
  const deathId = world.history.personDeaths.at(-1)!.id;
  world = vacateJudicialSeat(world, {
    seatId: seat.seatId,
    vacatedAt: world.currentDate,
    reason: "death",
  });
  return { world, seatId: seat.seatId, deceasedId, deathId };
}

function onDueDate(world: World, dueAt: IsoDate): World {
  return {
    ...world,
    currentDate: dueAt,
    currentMoment: simulationMomentAtLocalTime({
      date: dueAt,
      minuteOfDay: 0,
      timeZone: world.currentMoment.timeZone,
      preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
    }),
  };
}

describe("NPC death-vacancy nomination entry", () => {
  let openingDeath: ReturnType<typeof deceasedDistrictJudge>;
  beforeAll(() => {
    openingDeath = deceasedDistrictJudge();
  });

  it("schedules once from an actual dead district judge and preserves death provenance", () => {
    const { world, seatId, deceasedId, deathId } = openingDeath;
    const scheduled = scheduleNpcFederalJudicialNominationForDeath(
      world,
      deathId,
      deceasedId,
    );
    const due = scheduled.history.futureDueItems.find(
      (item) => item.transitionKey === JUDICIAL_NPC_NOMINATION_TRANSITION,
    )!;
    expect(due).toMatchObject({
      dueAt: addDays(world.currentDate, 1),
      entityIds: [deathId],
      provenance: { kind: "simulated", sourceEntityIds: [deathId] },
    });
    expect(due.stableKey).toContain(seatId);
    expect(
      scheduleNpcFederalJudicialNominationForDeath(
        scheduled,
        deathId,
        deceasedId,
      ),
    ).toBe(scheduled);
    const restored = deserializeWorld(serializeWorld(scheduled));
    expect(restored.history.futureDueItems).toContainEqual(due);
  });

  it("reserves the controlled President's explicit action and never silently nominates", () => {
    const { world, deceasedId, deathId } = openingDeath;
    const scheduled = scheduleNpcFederalJudicialNominationForDeath(
      world,
      deathId,
      deceasedId,
    );
    const due = scheduled.history.futureDueItems.at(-1)!;
    const presidentId = currentPresidentOf(scheduled)!.personId;
    const atDue = {
      ...onDueDate(scheduled, due.dueAt),
      control: { kind: "person" as const, personId: presidentId },
    };
    const result = npcFederalJudicialNominationHandler(atDue, due);
    expect(result.status).toBe("cancelled");
    expect(result.world).toBe(atDue);
    expect(result.world.judiciary!.selections).toEqual(
      world.judiciary!.selections,
    );
    expect(
      result.world.history.events.some(
        (event) => event.type === "judicial.nomination",
      ),
    ).toBe(false);
  });

  it("uses saved President and candidate choices on the real roster without forced consent", () => {
    const { world, deceasedId, deathId, seatId } = openingDeath;
    const scheduled = scheduleNpcFederalJudicialNominationForDeath(
      world,
      deathId,
      deceasedId,
    );
    const due = scheduled.history.futureDueItems.at(-1)!;
    const atDue = onDueDate(scheduled, due.dueAt);
    const result = npcFederalJudicialNominationHandler(atDue, due);
    expect(["blocked", "resolved"]).toContain(result.status);
    expect(
      result.world.history.decisionTraces.some(
        (trace) =>
          trace.context.decisionType ===
          "judicial.npc-president-candidate-choice",
      ),
    ).toBe(true);
    const review = result.world.history.events.find(
      (event) =>
        event.type === JUDICIAL_NPC_REVIEW_EVENT &&
        event.tags.includes(`seat:${seatId}`),
    );
    expect(review?.tags).toContain(`death:${deathId}`);
    const responses = result.world.history.events.filter(
      (event) => event.type === JUDICIAL_NPC_CANDIDATE_RESPONSE_EVENT,
    );
    const nomination = result.world.history.events.find(
      (event) =>
        event.type === "judicial.nomination" &&
        event.tags.includes(`seat:${seatId}`),
    );
    if (nomination) {
      expect(
        responses.some((event) => event.tags.includes("answer:accept")),
      ).toBe(true);
      expect(result.status).toBe("resolved");
    } else {
      expect(result.status).toBe("blocked");
      expect(result.reasonKey).toMatch(/^judiciary:npc-/);
      expect(result.world.history.events).not.toContainEqual(
        expect.objectContaining({ type: "judicial.nomination" }),
      );
    }
    expect(
      deserializeWorld(serializeWorld(result.world)).history.decisionTraces,
    ).toEqual(result.world.history.decisionTraces);
  });
});
