import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import poses from "../../art/people-rooms/poses/index.json" with { type: "json" };
import { drawnFigure, hairStyles } from "./figure-hair";
import { backdropStaging } from "./staging";
import { figureOn, lookFigures, type Figure } from "./whole-figures";

interface Pose {
  id: string;
  scene: string;
  sex: string;
  build: string;
}
const POSES = poses.figures as unknown as Pose[];
/** A standing adult look of a sex, the pose's build where there is one. */
const lookOf = (sex: string, build: string): Figure =>
  lookFigures().find((f) => f.sex === sex && f.build === build) ??
  lookFigures().find((f) => f.sex === sex)!;

describe("poses painted at furniture", () => {
  it("draws a person of the pose's sex at its spot in that pose, where it was painted, and the other sex as before", () => {
    let posed = 0;
    for (const pose of POSES) {
      const stage = backdropStaging(pose.scene);
      if (!stage) continue;
      const sex = pose.sex === "f" ? "female" : "male";
      const other = sex === "female" ? "male" : "female";
      for (const spot of stage.spots) {
        const drawn = figureOn(
          lookOf(sex, pose.build),
          "adult",
          pose.scene,
          stage,
          spot,
        );
        if (!drawn?.file.startsWith("pose-")) continue;
        posed++;
        const own = POSES.find((p) => p.id === drawn.file)!;
        expect(own.scene).toBe(pose.scene);
        expect(own.sex).toBe(pose.sex);
        expect(drawn.url).toBe(`/art/people-engine/v2/figures/${own.id}.png`);
        expect(drawn.figure.mirrored).toBe(false);
        // Nobody of the other sex takes a pose painted for this one.
        const them = figureOn(
          lookOf(other, pose.build),
          "adult",
          pose.scene,
          stage,
          spot,
        );
        if (them?.file.startsWith("pose-"))
          expect(POSES.find((p) => p.id === them.file)!.sex).not.toBe(pose.sex);
      }
    }
    // The debate podiums, the council lectern, the counter, the desks and visitor chairs.
    expect(posed).toBeGreaterThanOrEqual(10);
  });

  it("draws every pose in the person's colors, with their hair on the pose's own view of the head", () => {
    for (const pose of POSES) {
      const sex = pose.sex === "f" ? "female" : "male";
      const plain = PNG.sync.read(drawnFigure(pose.id, {}));
      const style = String(hairStyles(sex)[0]!.style);
      const dressed = PNG.sync.read(
        drawnFigure(pose.id, {
          skin: "deep",
          jacket: "red",
          shirt: "white",
          pants: "navy",
          hair: style,
          hairColor: "black",
        }),
      );
      expect([dressed.width, dressed.height]).toEqual([
        plain.width,
        plain.height,
      ]);
      let changed = 0;
      for (let i = 0; i < plain.data.length; i += 4)
        if (
          plain.data[i] !== dressed.data[i] ||
          plain.data[i + 1] !== dressed.data[i + 1] ||
          plain.data[i + 2] !== dressed.data[i + 2]
        )
          changed++;
      expect(changed / (plain.width * plain.height), pose.id).toBeGreaterThan(
        0.05,
      );
    }
  });
});
