import { describe, it, expect } from "vitest";
import {
  createDemoWorld,
  createWorld,
  serializeWorld,
  deserializeWorld,
  createResourcePosition,
  money,
  advanceWorld,
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
  it("enrolls in bachelor's, advances by period, charges once per period, and completes after elapsed years", () => {
    let w = enterLifePath(fixture(), "college-bachelors").world;
    const id = w.history.educationEnrollments.at(-1)!.id;
    const path = pathForRelationship(w, id)!;
    expect(path.progressionModel).toBe("periods");
    expect(totalStudyPeriods(path)).toBe(8);
    const start = liquid(w);
    for (let period = 1; period <= 8; period++) {
      w = advanceWorld(w, 182, LIFE_PATHS2_HANDLERS);
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
    for (let i = 0; i < 8; i++) w = advanceWorld(w, 182, LIFE_PATHS2_HANDLERS);
    w = enterLifePath(w, "law-school").world;
    const start = liquid(w);
    w = advanceWorld(w, 182, LIFE_PATHS2_HANDLERS);
    const mid = liquid(w);
    expect(mid).toBe(start - 750_000);
    w = advanceWorld(w, 1, LIFE_PATHS2_HANDLERS);
    expect(liquid(w)).toBe(mid);
  }, 60000);
});
