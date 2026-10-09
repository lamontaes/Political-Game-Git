import { describe, expect, it } from "vitest";
import threadData from "../../../data/content/story-threads.json" with { type: "json" };
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { addDays, simulationMomentAtLocalTime } from "../dates";
import { stableHash } from "../ids";
import { activeWorkRelationshipsAt, workStatusHistory } from "../life-queries";
import {
  openOrdinaryLifeRecords,
  refreshLifeOpportunities,
} from "../life-opportunities";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import {
  recordTownJobLoss,
  TOWN_JOB_END_REASONS,
} from "../living-world/town-labor-market";
import type { EntityId, FutureDueItem, IsoDate, World } from "../types";
import { withWorldIntegrityDeferred } from "../world";
import { recordStoryMoments, storyMomentsOf } from "./moments";
import {
  latestThreadState,
  STORY_THREAD_FADE_KEY,
  STORY_THREAD_HANDLERS,
  storyThreadsOf,
  storyThreadStates,
  storyThreadStatesTo,
} from "./threads";

/** A new game in a place drawn from all 56 by the seed's hash, advanced 7 days. */
function seededWeek(seed: string, startAge: number) {
  const states = lifePlaceStateIdentities();
  const state =
    states[parseInt(stableHash(seed).slice(0, 8), 16) % states.length]!;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  })[0]!;
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge,
    placeKey: place.key,
  });
  const personId = game.playerPersonId;
  const opened = refreshLifeOpportunities(
    openOrdinaryLifeRecords(game.world, personId),
    personId,
  );
  return {
    world: recordStoryMoments(passOrdinaryDays(opened, 7)),
    personId,
    place: `${place.displayName}, US-${state.usps}`,
  };
}

/** The same World on a later day, its clock moved with it. */
function on(world: World, date: IsoDate): World {
  return {
    ...world,
    currentDate: date,
    currentMoment: simulationMomentAtLocalTime({
      date,
      minuteOfDay: world.currentMoment.minuteOfDay,
      timeZone: world.currentMoment.timeZone,
    }),
  };
}

function named(world: World, personId: EntityId): string {
  const person = world.people[personId]!;
  return `${person.givenName} ${person.familyName}`;
}

function fadeCheck(
  world: World,
  personId: EntityId,
  otherId: EntityId,
): FutureDueItem {
  return world.history.futureDueItems
    .filter(
      (item) =>
        item.transitionKey === STORY_THREAD_FADE_KEY &&
        item.stableKey.startsWith(
          `${STORY_THREAD_FADE_KEY}:${personId}:${otherId}:`,
        ),
    )
    .at(-1)!;
}

/** The fade check as the clock runs it: with the writers' checks deferred. */
function fade(world: World, item: FutureDueItem) {
  const handler = STORY_THREAD_HANDLERS.get(STORY_THREAD_FADE_KEY)!;
  return withWorldIntegrityDeferred(() => handler(world, item));
}

describe("the thread calibration", () => {
  it("cites its source and keeps every tie and the fading discount between 0 and 1", () => {
    expect(Object.keys(threadData.sources)).toContain(threadData.source);
    for (const value of Object.values(threadData.ties)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(threadData.fadingDiscount).toBeGreaterThan(0);
    expect(threadData.fadingDiscount).toBeLessThanOrEqual(1);
  });
});

describe("threads in a seeded week", () => {
  // Seed p6-story-c draws Aberdeen Gardens, Washington: Mateo McKenzie, 34.
  const { world, personId, place } = seededWeek("p6-story-c", 34);
  const threads = storyThreadsOf(world, personId);
  const byName = new Map(
    threads.map((thread) => [named(world, thread.otherPersonId), thread]),
  );

  it("ranks the people in Mateo's life by importance, as the design worked it", () => {
    expect(place).toBe("Aberdeen Gardens, Washington, US-WA");
    expect(
      threads.map((thread) => [
        named(world, thread.otherPersonId),
        thread.tieKind,
        Math.round(thread.importance * 1000) / 1000,
      ]),
    ).toEqual([
      ["Sarah McKenzie", "parent", 0.8],
      ["Audrey McKenzie", "sibling", 0.575],
      ["Joel McKenzie", "parent", 0.5],
      // Back in touch after years apart: the reunion adds their school
      // friendship's weight again (part 5, rule 1).
      ["Wyatt Murray", null, 0.467],
      ["Amos McKenzie", "sibling", 0.35],
      ["Jacob Gomez", "sharedHome", 0.3],
      ...threads
        .filter((thread) => thread.tieKind === "grandparent")
        .map((thread) => [
          named(world, thread.otherPersonId),
          "grandparent",
          0.2,
        ]),
      ["Rafael Butler", null, 0.117],
      ["Ivan Harmon", null, 0.058],
    ]);
    expect(
      threads.filter((thread) => thread.tieKind === "grandparent"),
    ).toHaveLength(4);
  });

  it("stores only what changed: kin with no moment carry their tie and no rows", () => {
    expect(byName.get("Joel McKenzie")?.turns).toEqual([]);
    expect(
      byName.get("Sarah McKenzie")?.turns.map((turn) => turn.turn),
    ).toEqual(["started"]);
    // No contact between Mateo and his mother is on record, so the thread
    // takes no currency from the absence reader.
    expect(byName.get("Sarah McKenzie")?.currency).toBeNull();
  });

  it("renews Wyatt's dormant thread on the day he makes an introduction", () => {
    const wyatt = byName.get("Wyatt Murray")!;
    expect(
      wyatt.turns.map((turn) => [turn.occurredAt, turn.turn, turn.importance]),
    ).toEqual([
      ["2001-05-12", "started", 0.058333],
      ["2026-01-12", "renewed", 0.466666],
    ]);
    // The introduction puts them back in touch, and that is a moment of its
    // own, carrying the thread's weight from before it faded.
    const renewal = storyMomentsOf(world, personId).find(
      (moment) =>
        moment.kindKey === "relationship:contact:introducer:maintained",
    )!;
    expect(wyatt.turns[1]?.momentId).toBe(renewal.id);
    expect(renewal.factors.resurfaced).toBe(0.233333);
    expect(wyatt.lastContactOn).toBe("2026-01-12");
    // Ivan Harmon, last seen in 2003, stays faded: his moment counts a quarter.
    expect(byName.get("Ivan Harmon")?.currency).toBe("dormant");
  });

  it("indexes thread changes by the other person too", () => {
    const rafaelId = byName.get("Rafael Butler")!.otherPersonId;
    expect(
      storyThreadStatesTo(world, rafaelId).some(
        (state) => state.personId === personId,
      ),
    ).toBe(true);
  });

  it("fades a thread on the day the pair would go dormant, and not before", () => {
    const rafaelId = byName.get("Rafael Butler")!.otherPersonId;
    const check = fadeCheck(world, personId, rafaelId);
    expect(check.dueAt > world.currentDate).toBe(true);

    // A month early, they are still in touch: the check looks again later.
    const early = fade(on(world, addDays(check.dueAt, -30)), check);
    expect(early.reasonKey).toBe("story:thread-still-current");
    expect(latestThreadState(early.world, personId, rafaelId)?.turn).toBe(
      "started",
    );
    expect(fadeCheck(early.world, personId, rafaelId).dueAt).toBe(check.dueAt);

    // On the day, the thread fades and the meeting counts for a quarter.
    const due = fade(on(world, check.dueAt), check);
    expect(due.reasonKey).toBe("story:thread-faded");
    const faded = latestThreadState(due.world, personId, rafaelId)!;
    expect([faded.turn, faded.currency, faded.fading]).toEqual([
      "faded",
      "dormant",
      1,
    ]);
    expect(faded.importance).toBe(Math.round(0.116667 * 0.25 * 1e6) / 1e6);
    expect(faded.sourceRecordId).toBe(check.id);
  });

  it("drops a fade check that a later change replaced", () => {
    const rafaelId = byName.get("Rafael Butler")!.otherPersonId;
    const check = fadeCheck(world, personId, rafaelId);
    const stale = { ...check, sequence: 0 };
    const result = fade(on(world, check.dueAt), stale);
    expect(result.reasonKey).toBe("story:thread-check-replaced");
    expect(storyThreadStates(result.world)).toBe(storyThreadStates(world));
  });

  it("puts a lost job's whole pay at stake when it is the household's only recorded pay", () => {
    // Mateo is laid off through the town's own writer. His job is the only
    // pay on record in his household (he shares a home with Jacob Gomez).
    const job = activeWorkRelationshipsAt(world, personId)[0]!;
    const relationshipId = job.relationship.id;
    const laidOff = recordStoryMoments(
      recordTownJobLoss(world, {
        stableKey: "p6-test:laid-off",
        workRelationshipId: relationshipId,
        effectiveAt: world.currentDate,
        status: "ended",
        reason: TOWN_JOB_END_REASONS.laidOff,
        supersedesStatusId: workStatusHistory(world, relationshipId).at(-1)!.id,
        provenance: { kind: "authored", note: "P6 stakes fixture." },
      }),
    );
    const lost = storyMomentsOf(laidOff, personId).find(
      (moment) => moment.kindKey === "job-lost",
    )!;
    expect(lost.weight.row).toBe("Being fired");
    expect(lost.factors.stakes).toBe(1.5);
    expect(lost.salience).toBe(1);
  });
});

describe("threads in a child's seeded week", () => {
  // Seed p6-story-a draws Acorn, Arkansas: Quinn Vazquez, 10.
  const { world, personId } = seededWeek("p6-story-a", 10);

  it("rests a child's threads on family ties when nothing has happened between them", () => {
    const threads = storyThreadsOf(world, personId);
    expect(threads.length).toBeGreaterThan(0);
    for (const thread of threads) {
      expect(thread.turns).toEqual([]);
      expect(thread.tieKind).not.toBeNull();
    }
    expect(
      threads.filter((thread) => thread.tieKind === "parent"),
    ).toHaveLength(2);
  });
});
