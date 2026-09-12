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
  LIFE_PATHS2_HANDLERS,
  pathForRelationship,
} from "./life-paths2";
import {
  completedStudyPeriods,
  migrateLegacyStudyProgression,
  studyProgressSummary,
  totalStudyPeriods,
} from "./education-study-progression";
import { resourcePositionAt } from "./resource-queries";
import type { World } from "./types";

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
    w = advanceWorld(w, 20, LIFE_PATHS2_HANDLERS);
    w = changeLifePathStatus(w, id, "pause").world;
    w = advanceWorld(w, 200, LIFE_PATHS2_HANDLERS);
    w = deserializeWorld(serializeWorld(w));
    w = changeLifePathStatus(w, id, "return").world;
    w = advanceWorld(w, 140, LIFE_PATHS2_HANDLERS);
    expect(completedStudyPeriods(w, id)).toBe(0);
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
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
      w = advanceWorld(w, period === 8 ? 186 : 182, LIFE_PATHS2_HANDLERS);
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
    w = advanceWorld(w, 182, LIFE_PATHS2_HANDLERS);
    expect(completedStudyPeriods(w, id)).toBe(1);
    w = changeLifePathStatus(w, id, "pause").world;
    w = deserializeWorld(serializeWorld(w));
    expect(studyProgressSummary(w, id, path).completed).toBe(1);
    w = changeLifePathStatus(w, id, "return").world;
    w = advanceWorld(w, 100, LIFE_PATHS2_HANDLERS);
    expect(completedStudyPeriods(w, id)).toBe(1);
    w = advanceWorld(w, 82, LIFE_PATHS2_HANDLERS);
    expect(completedStudyPeriods(w, id)).toBe(2);
  }, 30000);

  it("does not double-charge when a period due is replayed", () => {
    let w = enterLifePath(fixture(10_000_000), "college-bachelors").world;
    for (let i = 0; i < 8; i++)
      w = advanceWorld(w, i === 7 ? 186 : 182, LIFE_PATHS2_HANDLERS);
    w = enterLifePath(w, "law-school").world;
    const start = liquid(w);
    w = advanceWorld(w, 182, LIFE_PATHS2_HANDLERS);
    const mid = liquid(w);
    expect(mid).toBe(start - 750_000);
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
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
    const progressed = advanceWorld(migrated, 332, LIFE_PATHS2_HANDLERS);
    expect(studyProgressSummary(progressed, id, path).completed).toBe(2);
    expect(liquid(progressed)).toBe(start - 96_000);
    expect(deserializeWorld(serializeWorld(progressed))).toEqual(progressed);
  }, 30000);
});
