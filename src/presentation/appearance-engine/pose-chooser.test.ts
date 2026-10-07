import { describe, expect, it } from "vitest";
import poseByTraitData from "../../../data/content/pose-by-trait.json" with { type: "json" };
import { loadedTraitRegistry } from "../../simulation/trait-registry";
import { BODY_POSES, isSeatedPose } from "./pack";
import { chooseBodyPose } from "./pose-chooser";

describe("recorded trait pose choices", () => {
  it("uses the highest matching trait weight", () => {
    expect(
      chooseBodyPose({
        activity: "idle",
        seated: false,
        seed: "same-person",
        traits: [{ qualifiedKey: "people-mind-v1:sociability", value: 2 }],
      }),
    ).toBe("hand-on-hip");
    expect(
      chooseBodyPose({
        activity: "idle",
        seated: false,
        seed: "same-person",
        traits: [{ qualifiedKey: "people-mind-v1:sociability", value: -2 }],
      }),
    ).toBe("arms-folded");
  });

  it("uses present company when activity is otherwise idle", () => {
    const alone = chooseBodyPose({
      activity: "idle",
      seated: false,
      seed: "same-person",
    });
    const together = chooseBodyPose({
      activity: "idle",
      seated: false,
      seed: "same-person",
      hasCompanion: true,
    });
    expect(alone).toBe("standing");
    expect(["standing", "hand-on-hip", "arms-folded"]).toContain(together);
    expect(
      chooseBodyPose({
        activity: "idle",
        seated: false,
        seed: "same-person",
        hasCompanion: true,
        traits: [{ qualifiedKey: "people-mind-v1:sociability", value: 2 }],
      }),
    ).toBe("hand-on-hip");
  });

  it("uses a stable hash only when candidate weights tie", () => {
    const choice = {
      activity: "listening" as const,
      seated: false,
      seed: "same-person",
    };
    expect(chooseBodyPose(choice)).toBe(chooseBodyPose(choice));
    expect(["arms-folded", "hand-on-hip"]).toContain(chooseBodyPose(choice));
  });

  it("maps each loaded trait or records why it has no direct posture cue", () => {
    const rules = poseByTraitData.traits as Record<
      string,
      { reason?: string; high?: unknown; low?: unknown }
    >;
    const traits = [...loadedTraitRegistry().traits.keys()].sort();
    expect(Object.keys(rules).sort()).toEqual(traits);
    expect(
      Object.values(rules).every(
        (rule) => rule.reason || rule.high || rule.low,
      ),
    ).toBe(true);
  });

  it("uses known poses, positive weights, and the person's seating", () => {
    const rules = poseByTraitData.traits as Record<
      string,
      {
        high?: Record<string, Record<string, number>>;
        low?: Record<string, Record<string, number>>;
      }
    >;
    const poses = new Set<string>(BODY_POSES);
    for (const rule of Object.values(rules)) {
      for (const pole of [rule.high, rule.low]) {
        for (const [activity, weights] of Object.entries(pole ?? {})) {
          expect([
            "speaking",
            "listening",
            "waiting",
            "speech",
            "desk",
            "meeting",
            "idle",
          ]).toContain(activity);
          for (const [pose, weight] of Object.entries(weights)) {
            expect(poses.has(pose)).toBe(true);
            expect(Number.isFinite(weight) && weight > 0).toBe(true);
            expect(isSeatedPose(pose as (typeof BODY_POSES)[number])).toBe(
              pose.startsWith("seated"),
            );
          }
        }
      }
    }
  });
});
