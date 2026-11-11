import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bustFor, bustPath, bustPick, bustPieces, lookText } from "./bust";
import { packPeople } from "./people-pack";

describe("the bust bank", () => {
  it("names only pieces that are on disk", () => {
    const pieces = bustPieces();
    expect(pieces.length).toBeGreaterThan(10);
    for (const piece of pieces)
      expect(existsSync(bustPath(piece)), piece).toBe(true);
    expect(() => bustPath("/art/busts/women/front/checks.json")).toThrow();
  });

  it("draws the same person as the same bust, in the manifest's order", () => {
    for (const person of packPeople()) {
      const pick = bustPick(`seed:${person.id}:bust`);
      const a = bustFor(person, "everyday", pick);
      const b = bustFor(person, "everyday", pick);
      expect(a, person.id).not.toBeNull();
      expect(a).toEqual(b);
      // Head first, hair last, a top between.
      expect(a!.layers[0]).toMatch(/\/head-[A-Z]\.png$/);
      expect(a!.layers[1]).toMatch(/\/top-/);
      expect(a!.layers.at(-1)).toMatch(/\/hair-/);
      expect(a!.size).toBeGreaterThan(0);
    }
  });

  it("gives the lightest painted person the first head and the darkest the last", () => {
    const luminance = ([r, g, b]: readonly number[]) =>
      0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    for (const sex of new Set(packPeople().map((p) => p.sex))) {
      const alike = packPeople()
        .filter((p) => p.sex === sex)
        .sort((a, b) => luminance(b.skin) - luminance(a.skin));
      const heads = alike.map((p) => bustFor(p, "work", 0)!.layers[0]);
      expect(heads[0], sex).toMatch(/head-A\.png$/);
      expect(heads.at(-1), sex).toMatch(/head-C\.png$/);
    }
  });

  it("dresses an official, a worker and anyone else differently", () => {
    const person = packPeople()[0]!;
    const tops = (["everyday", "work", "official"] as const).map(
      (dress) => bustFor(person, dress, 5)!.layers[1],
    );
    expect(new Set(tops).size).toBe(3);
  });

  it("puts no facial hair on someone who wears none", () => {
    for (const person of packPeople())
      for (let pick = 0; pick < 40; pick++)
        expect(
          bustFor(person, "everyday", pick, false)!.layers.some((l) =>
            /\/face-/.test(l),
          ),
        ).toBe(false);
  });

  it("sets a chosen look's bust from the look, whatever order its colors come in", () => {
    const a = lookText({
      person: "woman-slim",
      outfit: "kit",
      colors: { top: "red", hair: "black" },
    });
    const b = lookText({
      person: "woman-slim",
      outfit: "kit",
      colors: { hair: "black", top: "red" },
    });
    expect(a).toBe(b);
    expect(bustPick(a)).toBe(bustPick(b));
  });
});
