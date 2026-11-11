import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bustChoices,
  bustFor,
  bustOfLook,
  bustPath,
  bustPeople,
  bustPerson,
  bustPick,
  bustPieces,
} from "./bust";
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
    for (const person of bustPeople()) {
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

  it("gives each sex's people one head each, tone 0 the lightest", () => {
    for (const sex of new Set(bustPeople().map((p) => p.sex))) {
      const alike = bustPeople()
        .filter((p) => p.sex === sex)
        .sort((a, b) => a.tone - b.tone);
      expect(
        alike.map((p) => p.tone),
        sex,
      ).toEqual(alike.map((_, i) => i));
      const heads = alike.map((p) => bustFor(p, "work", 0)!.layers[0]);
      expect(heads[0], sex).toMatch(/head-A\.png$/);
      expect(heads.at(-1), sex).toMatch(/head-C\.png$/);
    }
    expect(bustFor({ id: "nobody" }, "work", 0)).toBeNull();
  });

  // Until the full-body pack is archived (docs/art/full-body-people-after-
  // early-access.md), a saved look names one of its people: the bank's people
  // carry the same ids, in the same order, lightest skin the same way.
  it("holds the same people as the full-body pack while both exist", () => {
    expect(bustPeople().map((p) => [p.id, p.sex])).toEqual(
      packPeople().map((p) => [p.id, p.sex]),
    );
    const luminance = ([r, g, b]: readonly number[]) =>
      0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    for (const sex of new Set(packPeople().map((p) => p.sex))) {
      const painted = packPeople()
        .filter((p) => p.sex === sex)
        .sort((a, b) => luminance(b.skin) - luminance(a.skin));
      expect(
        painted.map((p) => bustPerson(p.id)!.tone),
        sex,
      ).toEqual(painted.map((_, i) => i));
    }
  });

  it("dresses an official, a worker and anyone else differently", () => {
    const person = bustPeople()[0]!;
    const tops = (["everyday", "work", "official"] as const).map(
      (dress) => bustFor(person, dress, 5)!.layers[1],
    );
    expect(new Set(tops).size).toBe(3);
  });

  it("puts no facial hair on someone who wears none", () => {
    for (const person of bustPeople())
      for (let pick = 0; pick < 40; pick++)
        expect(
          bustFor(person, "everyday", pick, false)!.layers.some((l) =>
            /\/face-/.test(l),
          ),
        ).toBe(false);
  });

  it("draws a chosen look from its own pieces, and nothing for a piece the bank lacks", () => {
    const man = bustPeople().find((p) => p.sex === "man")!;
    const { hair, face } = bustChoices("man");
    const look = { person: man.id, hair: hair[1]!.file, face: face[0]!.file };
    const drawn = bustOfLook(look, "work")!;
    expect(drawn.layers.at(-1)!.endsWith(look.hair)).toBe(true);
    expect(drawn.layers.some((url) => url.endsWith(look.face))).toBe(true);
    // No facial hair where the look names none.
    const bare = bustOfLook({ person: man.id, hair: look.hair }, "work")!;
    expect(bare.layers.some((url) => /\/face-/.test(url))).toBe(false);
    expect(bustOfLook({ ...look, hair: "hair-none.png" }, "work")).toBeNull();
    expect(bustOfLook({ ...look, person: "nobody" }, "work")).toBeNull();
    // Every piece the creator offers has a word for it.
    for (const sex of ["woman", "man"])
      for (const piece of [...bustChoices(sex).hair, ...bustChoices(sex).face])
        expect(piece.label, piece.file).not.toBe("");
  });
});
