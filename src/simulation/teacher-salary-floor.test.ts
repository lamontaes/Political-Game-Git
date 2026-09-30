import { describe, expect, it } from "vitest";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import type { EntityId, World } from "./types";
import {
  TEACHER_FLOOR_OF_STATE_MEDIAN,
  teacherFloorRatioAt,
} from "./teacher-salary-floor";

describe("the estimated teacher floor ratio", () => {
  it("shares one bounded draw across a state's towns and survives save reload", () => {
    const state = lifePlaceStateIdentities()[0]!;
    const towns = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
    }).filter(
      (place) => place.scope === "locality" && place.stateJurisdictionKey,
    );
    const first = towns[0]!;
    const sameState = towns.find(
      (place) =>
        place.key !== first.key &&
        place.stateJurisdictionKey === first.stateJurisdictionKey,
    )!;
    const otherStateId = stateJurisdictionForKey(
      lifePlaceStateIdentities()[1]!.jurisdictionKey,
    )!.id;
    const world = { seed: "teacher-floor-ranges" } as World;
    const before = JSON.stringify(world);
    const firstId = first.context.jurisdiction.id;
    const ratio = teacherFloorRatioAt(world, firstId);
    expect(ratio).toBeGreaterThanOrEqual(TEACHER_FLOOR_OF_STATE_MEDIAN.low);
    expect(ratio).toBeLessThanOrEqual(TEACHER_FLOOR_OF_STATE_MEDIAN.high);
    expect(teacherFloorRatioAt(world, firstId)).toBe(ratio);
    expect(teacherFloorRatioAt(world, sameState.context.jurisdiction.id)).toBe(
      ratio,
    );
    expect(
      teacherFloorRatioAt(
        world,
        stateJurisdictionForKey(first.stateJurisdictionKey!)!.id,
      ),
    ).toBe(ratio);
    expect(teacherFloorRatioAt(JSON.parse(before) as World, firstId)).toBe(
      ratio,
    );
    expect(
      teacherFloorRatioAt({ ...world, seed: "another-teacher-world" }, firstId),
    ).not.toBe(ratio);
    expect(teacherFloorRatioAt(world, otherStateId)).not.toBe(ratio);
    expect(JSON.stringify(world)).toBe(before);
  });

  it("retains the central estimate only for seedless fixtures", () => {
    expect(teacherFloorRatioAt({} as World, "fixture_place" as EntityId)).toBe(
      TEACHER_FLOOR_OF_STATE_MEDIAN.central,
    );
  });
});
