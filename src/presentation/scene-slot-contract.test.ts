import { describe, expect, it } from "vitest";
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import { SCENE_SLOT_ROLES, slotAcceptsRole } from "./scene-slot-contract";
import { backdropSurfaceSlots } from "./backdrop-surfaces";
import { PEOPLE_PACK } from "./appearance-engine/runtime";
import { BODY_POSES } from "./appearance-engine/pack";

describe("standing scene slot contract", () => {
  it("requires explicit eligibility for authority, witness, and counter slots", () => {
    for (const role of [
      "staff-behind-counter",
      "member-at-dais",
      "witness",
      "judge",
      "jury",
      "counsel",
      "presiding",
      "speaker",
    ] as const) {
      expect(slotAcceptsRole(role)).toBe(false);
      expect(slotAcceptsRole(role, "customer")).toBe(false);
      expect(slotAcceptsRole(role, role)).toBe(true);
    }
    expect(slotAcceptsRole("general")).toBe(true);
    expect(slotAcceptsRole("audience")).toBe(true);
  });

  it("covers every existing spot and resolves only measured surface references", () => {
    let spots = 0,
      surfaces = 0;
    for (const [place, stage] of Object.entries(staging.places)) {
      for (const spot of stage.spots) {
        expect(SCENE_SLOT_ROLES).toContain(spot.role);
        spots++;
      }
      const resolved = backdropSurfaceSlots(place, "midday");
      expect(resolved.map((s) => s.id)).toEqual(
        stage.surfaceSlots.map((s) => s.surfaceId),
      );
      expect(backdropSurfaceSlots(place, "unmeasured-variant")).toEqual([]);
      surfaces += stage.surfaceSlots.length;
    }
    expect(spots).toBe(870);
    expect(surfaces).toBe(56);
  });

  it("keeps diner customer stools distinct from the seated clerk behind the counter", () => {
    expect(
      staging.places.diner.spots
        .filter((s) => "group" in s && s.group === "counter")
        .every((s) => s.role === "customer"),
    ).toBe(true);
    expect(
      staging.places["clerk-counter"].spots
        .filter((s) => "group" in s && s.group === "counter")
        .every((s) => s.role === "staff-behind-counter"),
    ).toBe(true);
  });

  it("does not relabel a standing or seated pack pose as leaning geometry", () => {
    for (const pose of BODY_POSES) {
      const fits = PEOPLE_PACK.slotKindsByPose?.[pose];
      expect(fits).toBeDefined();
      expect(fits).toEqual([
        pose.startsWith("seated")
          ? "sit"
          : pose === "podium"
            ? "podium"
            : "stand",
      ]);
    }
  });
});
