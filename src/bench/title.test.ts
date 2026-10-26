import { describe, expect, it } from "vitest";
import { TITLE_SCENES, titleScene } from "./title";

// The Lincoln Memorial at night belongs among the title's national scenes;
// its painting is an imported backdrop.
describe("the title's rotation", () => {
  it("includes the Lincoln Memorial and shows its night painting", () => {
    expect(TITLE_SCENES).toContain("lincoln-memorial");
    const seen = TITLE_SCENES.map(
      (_, visit) => titleScene("2026-10-25", visit).backdrop,
    );
    const lincoln = seen.find((b) => b.file.startsWith("lincoln-memorial"));
    expect(lincoln).toEqual({
      file: "lincoln-memorial__night.jpg",
      variant: "night",
      url: "/art/backdrops/lincoln-memorial__night.jpg",
    });
  });

  it("reaches the Lincoln Memorial on some visit of any day", () => {
    for (const day of ["2026-01-01", "2026-10-25", "2027-06-30"]) {
      const places = TITLE_SCENES.map((_, v) => titleScene(day, v).place);
      expect(places).toContain("lincoln-memorial");
    }
  });
});
