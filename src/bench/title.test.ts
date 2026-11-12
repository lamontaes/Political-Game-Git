import { describe, expect, it } from "vitest";
import {
  TITLE_MONUMENTS,
  TITLE_ROTATE_SECONDS,
  TITLE_SCENES,
  titleRotation,
  titleScene,
} from "./title";

// The title shows the national monuments in their lights (owner, Oct 29
// monument ruling): no conventions, rallies or rooms, every painting a real
// manifest backdrop, each monument in more than one frame where main has
// more than one painting of it.
describe("the title's monuments", () => {
  it("shows only monuments, in more than one light", () => {
    const places = new Set(TITLE_SCENES.map((frame) => frame.place));
    expect([...places].sort()).toEqual([...TITLE_MONUMENTS].sort());
    for (const frame of TITLE_SCENES)
      expect(frame.place, frame.backdrop.file).not.toMatch(
        /convention|rally|floor|debate|office/,
      );
    const files = TITLE_SCENES.map((frame) => frame.backdrop.file);
    const lights = new Set(TITLE_SCENES.map((frame) => frame.backdrop.variant));
    expect(lights.size).toBeGreaterThan(2);
    expect(files).toContain("lincoln-memorial__night.jpg");
    expect(files).toContain("us-capitol-exterior__morning.jpg");
  });

  it("never shows one monument twice in a row, round the loop too", () => {
    TITLE_SCENES.forEach((frame, i) =>
      expect(frame.place, frame.backdrop.file).not.toBe(
        TITLE_SCENES.at(i - 1)!.place,
      ),
    );
  });

  it("plays every frame once, starting where the visit starts", () => {
    const rotation = titleRotation("2026-10-25", 3);
    expect(rotation[0]).toEqual(titleScene("2026-10-25", 3));
    expect(rotation.map((s) => s.backdrop.file).sort()).toEqual(
      TITLE_SCENES.map((s) => s.backdrop.file).sort(),
    );
    expect(TITLE_ROTATE_SECONDS).toBeGreaterThan(5);
  });
});
