import { describe, it, expect } from "vitest";
import {
  createDemoWorld,
  createWorld,
  serializeWorld,
  deserializeWorld,
  createResourcePosition,
  money,
  advanceWorld,
  cancelFutureDueItem,
  futureDueItemStateAt,
  recordWorldEvent,
} from "./index";
import {
  enterLifePath,
  changeLifePathStatus,
  hasLifePathCredential,
  lifePaths2Handlers,
  pathForRelationship,
} from "./life-paths2";
import {
  completedStudyPeriods,
  creditsEarnedShare,
  migrateLegacyStudyProgression,
  paidStudyPeriods,
  studyCreditsEarned,
  studyCreditsRequired,
  studyProgressSummary,
  studyPeriodTuitionOutstanding,
  totalStudyPeriods,
} from "./education-study-progression";
import { stableHash } from "./ids";
import { recordLifeCommitment } from "./life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "./life-places";
import { resourcePositionAt } from "./resource-queries";
import type { EntityId, World } from "./types";

const provenance = {
  kind: "authored",
  note: "WEEKEND19-F period study test.",
} as const;

function fixture(balance = 5_000_000): World {
  const demo = createDemoWorld("edu-period-proof");
  let world = createWorld({
    seed: demo.seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id]!),
    control: { kind: "person", personId: demo.personOrder[0]! },
  });
  world = createResourcePosition(world, {
    stableKey: "funds",
    owner: { kind: "person", personId: world.personOrder[0]! },
    openedAt: world.currentDate,
    openingBalance: money(balance, "USD"),
    provenance,
  });
  return world;
}

const liquid = (w: World) =>
  resourcePositionAt(
    w,
    { kind: "person", personId: w.personOrder[0]! },
    money(0, "USD").currency,
  )!.liquidBalance.minorUnits;

describe("period-based study progression", () => {
  it("excludes inactive dates across reload when resuming a period", () => {
    let w = enterLifePath(fixture(), "college-office-certificate").world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    w = advanceWorld(w, 20, lifePaths2Handlers());
    w = changeLifePathStatus(w, id, "pause").world;
    w = advanceWorld(w, 200, lifePaths2Handlers());
    w = deserializeWorld(serializeWorld(w));
    w = changeLifePathStatus(w, id, "return").world;
    w = advanceWorld(w, 140, lifePaths2Handlers());
    expect(completedStudyPeriods(w, id)).toBe(0);
    w = advanceWorld(w, 1, lifePaths2Handlers());
    expect(completedStudyPeriods(w, id)).toBe(1);
  });
  it("enrolls in bachelor's, advances by period, charges once per period, and completes after elapsed years", () => {
    let w = enterLifePath(fixture(), "college-bachelors").world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    const path = pathForRelationship(w, id)!;
    expect(path.progressionModel).toBe("periods");
    expect(totalStudyPeriods(path)).toBe(8);
    const start = liquid(w);
    for (let period = 1; period <= 8; period++) {
      // Seven 182-day periods plus the four-day remainder preserve the
      // authored 1,460-day minimum instead of shortening four years to 1,456.
      w = advanceWorld(w, period === 8 ? 186 : 182, lifePaths2Handlers());
      expect(completedStudyPeriods(w, id)).toBe(period);
    }
    expect(hasLifePathCredential(w, w.personOrder[0]!, path.program)).toBe(
      true,
    );
    expect(liquid(w)).toBe(start - 8 * 500_000);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  }, 30000);

  it("preserves partial progress across interruption, reload, and refuses early completion", () => {
    let w = enterLifePath(fixture(), "college-bachelors").world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    const path = pathForRelationship(w, id)!;
    w = advanceWorld(w, 182, lifePaths2Handlers());
    expect(completedStudyPeriods(w, id)).toBe(1);
    w = changeLifePathStatus(w, id, "pause").world;
    w = deserializeWorld(serializeWorld(w));
    expect(studyProgressSummary(w, id, path).completed).toBe(1);
    w = changeLifePathStatus(w, id, "return").world;
    w = advanceWorld(w, 100, lifePaths2Handlers());
    expect(completedStudyPeriods(w, id)).toBe(1);
    w = advanceWorld(w, 82, lifePaths2Handlers());
    expect(completedStudyPeriods(w, id)).toBe(2);
  }, 30000);

  it("does not double-charge when a period due is replayed", () => {
    let w = enterLifePath(fixture(10_000_000), "college-bachelors").world;
    for (let i = 0; i < 8; i++)
      w = advanceWorld(w, i === 7 ? 186 : 182, lifePaths2Handlers());
    w = enterLifePath(w, "law-school").world;
    const start = liquid(w);
    w = advanceWorld(w, 182, lifePaths2Handlers());
    const mid = liquid(w);
    expect(mid).toBe(start - 750_000);
    w = advanceWorld(w, 1, lifePaths2Handlers());
    expect(liquid(w)).toBe(mid);
  }, 60000);

  it("migrates legacy session progress without erasing it or charging it twice", () => {
    let w = enterLifePath(fixture(), "college-associate").world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    const path = pathForRelationship(w, id)!;
    const originalDue = w.history.futureDueItems.at(-1)!;
    w = cancelFutureDueItem(w, {
      stableKey: "legacy-save:remove-never-existing-period-due",
      dueItemId: originalDue.id,
      effectiveAt: w.currentDate,
      reasonKey: "migration:test-fixture",
      context: "The represented legacy save predates period due items.",
    });
    for (let session = 1; session <= 24; session++) {
      w = recordWorldEvent(w, {
        stableKey: `legacy-save:study-session:${session}`,
        type: "life-paths2.study-session",
        occurredAt: w.currentDate,
        recordedAt: w.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [w.personOrder[0]!, id],
        participants: [
          {
            personId: w.personOrder[0]!,
            role: "agency:student",
            detail: "Legacy study session",
          },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: ["education", "legacy-study-session"],
        summary: "A preserved legacy study session.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
    }

    const migrated = migrateLegacyStudyProgression(w);
    const summary = studyProgressSummary(migrated, id, path);
    expect(summary).toMatchObject({ model: "periods", completed: 1, total: 4 });
    expect(
      migrated.history.events.filter(
        (event) =>
          event.type === "life-paths2.study-session" &&
          event.involvedEntityIds.includes(id),
      ),
    ).toHaveLength(24);
    const migratedDue = migrated.history.futureDueItems.at(-1)!;
    expect(migratedDue.stableKey).toContain(":2:");
    expect(
      futureDueItemStateAt(migrated, migratedDue.id, {
        asOfDate: migrated.currentDate,
        historySequenceExclusive: migrated.history.nextSequence,
      })?.status,
    ).toBe("scheduled");

    const start = liquid(migrated);
    const progressed = advanceWorld(migrated, 332, lifePaths2Handlers());
    expect(studyProgressSummary(progressed, id, path).completed).toBe(2);
    expect(liquid(progressed)).toBe(start - 96_000);
    expect(deserializeWorld(serializeWorld(progressed))).toEqual(progressed);
  }, 30000);
});

/*
 * A141: finishing paid study time does not by itself grant a credential. The
 * credits earned must reach the requirement; how many a student earns
 * slides with the hours they owe elsewhere. The world holds a place drawn
 * from all 56 by seed, beside the demo's own; the care the third case
 * adds is located there.
 */
const A141_SEED = "a141-study-credits";

function drawnFixture(): { world: World; label: string; placeId: EntityId } {
  const states = lifePlaceStateIdentities();
  expect(states).toHaveLength(56);
  const drawn =
    states[parseInt(stableHash(A141_SEED).slice(0, 8), 16) % states.length]!;
  const place = stateJurisdictionForKey(drawn.jurisdictionKey)!;
  const base = fixture();
  return {
    world: {
      ...base,
      jurisdictions: { ...base.jurisdictions, [place.id]: place },
      jurisdictionOrder: base.jurisdictionOrder.includes(place.id)
        ? base.jurisdictionOrder
        : [...base.jurisdictionOrder, place.id],
    },
    label: `${drawn.jurisdictionKey}, seed ${A141_SEED}`,
    placeId: place.id,
  };
}

function creditsOf(w: World, enrollmentId: EntityId) {
  return w.history.events
    .filter(
      (e) =>
        e.type === "life-paths2.study-period" &&
        e.involvedEntityIds.includes(enrollmentId),
    )
    .map((e) =>
      Number(
        e.tags.find((t) => t.startsWith("credits-earned:"))!.split(":")[1],
      ),
    );
}

/** Days pass a month at a time, as the routine resolver expects. */
function advanceBy(w: World, days: number): World {
  let next = w;
  for (let left = days; left > 0; left -= 30)
    next = advanceWorld(next, Math.min(30, left), lifePaths2Handlers());
  return next;
}

describe(`A141: a credential needs the credits earned (${A141_SEED})`, () => {
  it("a student with no other hours earns every credit taken and graduates on time", () => {
    const { world, label } = drawnFixture();
    let w = enterLifePath(world, "college-associate").world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    const path = pathForRelationship(w, id)!;
    expect(studyCreditsRequired(path), label).toBe(60);
    w = advanceBy(w, 4 * 166 + 1);
    expect(creditsOf(w, id), label).toEqual([15, 15, 15, 15]);
    expect(studyCreditsEarned(w, id, path)).toBe(60);
    expect(hasLifePathCredential(w, w.personOrder[0]!, path.program)).toBe(
      true,
    );
  }, 60000);

  it("is short of credits after the paid periods while working twenty hours a week, and keeps studying until the credits are met", () => {
    const { world, label } = drawnFixture();
    let w = enterLifePath(world, "shop-assistant").world;
    w = enterLifePath(w, "college-associate").world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    const path = pathForRelationship(w, id)!;
    w = advanceBy(w, 4 * 166 + 1);
    // Four paid periods, but twenty hours of work leave 13 of 15 credits each.
    expect(creditsEarnedShare(20), label).toBeCloseTo(6 / 7);
    expect(creditsOf(w, id), label).toEqual([13, 13, 13, 13]);
    expect(completedStudyPeriods(w, id, path)).toBe(4);
    expect(hasLifePathCredential(w, w.personOrder[0]!, path.program)).toBe(
      false,
    );
    // The paid time is over and the credits are short: studies carry on.
    expect(studyProgressSummary(w, id, path).total).toBe(5);
    expect(studyPeriodTuitionOutstanding(w, id, path)).toBe(
      path.periodCostMinor,
    );
    w = advanceBy(w, 2 * 166 + 1);
    // The last periods take only the credits still needed.
    expect(creditsOf(w, id), label).toEqual([13, 13, 13, 13, 7, 1]);
    expect(studyCreditsEarned(w, id, path)).toBe(60);
    expect(hasLifePathCredential(w, w.personOrder[0]!, path.program)).toBe(
      true,
    );
    // The two extra periods are paid for, like the planned ones.
    expect(paidStudyPeriods(w, id)).toBe(6);
  }, 60000);

  it("ends the studies without the credential at the maximum timeframe when the credits are still short", () => {
    const { world, label, placeId } = drawnFixture();
    let w = enterLifePath(world, "shop-assistant").world;
    // Twenty more hours a week caring for a relative in the drawn place.
    w = recordLifeCommitment(w, {
      stableKey: "a141:care",
      personId: w.personOrder[0]!,
      startsAt: w.currentDate,
      endsAt: null,
      kind: "personal:caring-for-a-relative",
      label: "Caring for a relative",
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 20 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "flexible",
        interruptibility: "limited",
        locationJurisdictionId: placeId,
      },
      provenance,
    });
    w = enterLifePath(w, "college-office-certificate").world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    const path = pathForRelationship(w, id)!;
    w = advanceBy(w, 2 * 161 + 10);
    // Forty hours a week elsewhere: 16 of the 30 credits in the one planned
    // period, then 8 of the 14 left in the one more the federal maximum
    // timeframe allows (150% of one period, rounded up to two).
    expect(studyCreditsRequired(path), label).toBe(30);
    expect(creditsOf(w, id), label).toEqual([16, 8]);
    expect(hasLifePathCredential(w, w.personOrder[0]!, path.program)).toBe(
      false,
    );
    expect(
      w.history.events.some(
        (e) =>
          e.type === "life-paths2.short-of-credits" &&
          e.involvedEntityIds.includes(id),
      ),
      label,
    ).toBe(true);
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  }, 60000);
});
