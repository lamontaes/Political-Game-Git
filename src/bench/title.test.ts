import { describe, expect, it } from "vitest";
import {
  TITLE_MONUMENTS,
  TITLE_ROTATE_SECONDS,
  TITLE_SCENES,
  titleRotation,
} from "./title";
import { newGameFaces } from "./appearance";

// The title shows the national monuments in their lights (owner, Oct 29
// monument ruling): no conventions, rallies or rooms, every painting a real
// manifest backdrop. Each launch and each game starts with a new one (owner,
// Nov 16: "each game, it should start with new ones").
describe("the title's monuments", () => {
  it("shows only monuments, every painting of them once", () => {
    const places = new Set(TITLE_SCENES.map((frame) => frame.place));
    expect([...places].sort()).toEqual(Object.keys(TITLE_MONUMENTS).sort());
    for (const frame of TITLE_SCENES)
      expect(frame.place, frame.backdrop.file).not.toMatch(
        /convention|rally|protest|floor|debate|office/,
      );
    const files = TITLE_SCENES.map((frame) => frame.backdrop.file);
    expect(new Set(files).size).toBe(files.length);
    expect(files).toContain("lincoln-memorial__night.jpg");
    expect(files).toContain("us-capitol-exterior__morning.jpg");
    expect(files).toContain("supreme-court-exterior__rain.jpg");
  });

  it("plays every painting once per visit, no monument twice in a row", () => {
    for (let visit = 0; visit < 20; visit += 1) {
      const rotation = titleRotation("launch-a", visit);
      expect(rotation.map((s) => s.backdrop.file).sort()).toEqual(
        TITLE_SCENES.map((s) => s.backdrop.file).sort(),
      );
      rotation.forEach((frame, i) => {
        if (i) expect(frame.monument).not.toBe(rotation[i - 1]!.monument);
      });
    }
    expect(TITLE_ROTATE_SECONDS).toBeGreaterThan(5);
  });

  it("opens differently each launch and each game, the same for the same launch and visit", () => {
    const first = (launch: string, visit: number) =>
      titleRotation(launch, visit)[0]!.backdrop.file;
    expect(titleRotation("launch-a", 2)).toEqual(titleRotation("launch-a", 2));
    // Two launches on the same day, and two games in one launch, differ.
    const launches = new Set(
      ["a", "b", "c", "d", "e", "f"].map((l) => first(`launch-${l}`, 0)),
    );
    expect(launches.size).toBeGreaterThan(2);
    const games = new Set([0, 1, 2, 3, 4, 5].map((v) => first("launch-a", v)));
    expect(games.size).toBeGreaterThan(2);
    // Every monument opens some game, not only the most painted ones.
    const opening = new Set(
      Array.from(
        { length: 60 },
        (_, v) => titleRotation("launch-a", v)[0]!.monument,
      ),
    );
    expect(opening).toEqual(new Set(Object.values(TITLE_MONUMENTS)));
  });

  it("pictures new faces on New game each launch", () => {
    const faces = (seed: string) =>
      JSON.stringify(newGameFaces(seed).advanced.map((f) => f.bust.layers));
    expect(faces("launch-a:0")).toBe(faces("launch-a:0"));
    const seen = new Set(["a:0", "a:1", "b:0", "c:0"].map(faces));
    expect(seen.size).toBeGreaterThan(1);
    expect(newGameFaces("launch-a:0").advanced).toHaveLength(3);
  });
});
