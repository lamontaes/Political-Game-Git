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
  bustTopColors,
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
      expect(a!.layers[0]).toMatch(/\/head-(light|medium|dark)-adult\.png$/);
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
      expect(heads[0], sex).toMatch(/head-light-adult\.png$/);
      expect(heads.at(-1), sex).toMatch(/head-dark-adult\.png$/);
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
    const clothes = (layers: readonly string[]) =>
      layers.filter((url) => /\/(top|shirt|tie|jacket)-/.test(url)).join(" ");
    for (const person of bustPeople()) {
      const worn = (["everyday", "work", "official"] as const).map((dress) =>
        clothes(bustFor(person, dress, 5)!.layers),
      );
      expect(new Set(worn).size, person.id).toBe(3);
    }
  });

  // Owner, Nov 11, 2026, on the layered clothes: "put these in the morning
  // build." An officeholder is shown as they serve: a shirt under a jacket,
  // and a tie where the bank paints ties for them.
  it("dresses someone in office in a shirt and a jacket, with a tie where one is painted", () => {
    for (const person of bustPeople()) {
      const ties = bustChoices(person).tie.length > 0;
      for (let pick = 0; pick < 60; pick++) {
        const layers = bustFor(person, "official", pick)!.layers;
        const at = (piece: string) =>
          layers.findIndex((url) => url.includes(`/${piece}-`));
        expect(at("shirt"), `${person.id} ${pick}`).toBeGreaterThan(0);
        expect(at("jacket"), `${person.id} ${pick}`).toBeGreaterThan(
          at("shirt"),
        );
        expect(at("tie") > at("shirt") && at("tie") < at("jacket")).toBe(ties);
        // Never a whole top under a jacket.
        expect(at("top")).toBe(-1);
        // The jacket sits under the hair and any facial hair.
        expect(at("jacket")).toBeLessThan(layers.length - 1);
      }
    }
  });

  it("wears each piece in more than one color across people", () => {
    for (const person of bustPeople()) {
      const seen = new Set<string>();
      for (let pick = 0; pick < 400; pick++)
        for (const dress of ["everyday", "work", "official"] as const)
          for (const url of bustFor(person, dress, pick)!.layers)
            if (/\/(top|shirt|tie|jacket)-/.test(url)) seen.add(url);
      const { shirt, tie, jacket } = bustChoices(person);
      // Every painted color of the shirt, the tie and the jacket is worn by someone.
      for (const [piece, colors] of [
        ["shirt", shirt],
        ["tie", tie],
        ["jacket", jacket],
      ] as const)
        for (const color of colors)
          expect(
            [...seen].some(
              (url) =>
                url.includes(`/${piece}-`) && url.endsWith(`-${color.key}.png`),
            ),
            `${person.id} ${piece} ${color.key}`,
          ).toBe(true);
    }
  });

  it("dresses a chosen look in its own shirt, tie and jacket at work and in office, and an everyday top elsewhere", () => {
    const man = bustPeople().find((p) => p.sex === "man")!;
    const { hair, hairColor, shirt, tie, jacket } = bustChoices(man);
    const look = {
      person: man.id,
      hair: hair[0]!.key,
      hairColor: hairColor[0]!.key,
      shirt: shirt[2]!.key,
      tie: tie[1]!.key,
    };
    const has = (layers: readonly string[], piece: string, color?: string) =>
      layers.some(
        (url) =>
          url.includes(`/${piece}-`) &&
          (color === undefined || url.endsWith(`-${color}.png`)),
      );
    const work = bustOfLook(look, "work")!.layers;
    expect(has(work, "shirt", look.shirt)).toBe(true);
    expect(has(work, "tie", look.tie)).toBe(true);
    expect(has(work, "jacket")).toBe(false);
    // In office a jacket is always worn: the look's own, or the first painted.
    expect(has(bustOfLook(look, "official")!.layers, "jacket")).toBe(true);
    const own = bustOfLook({ ...look, jacket: jacket[2]!.key }, "official")!;
    expect(has(own.layers, "jacket", jacket[2]!.key)).toBe(true);
    // No tie where the look names none.
    const open = {
      person: look.person,
      hair: look.hair,
      hairColor: look.hairColor,
      shirt: look.shirt,
    };
    expect(has(bustOfLook(open, "official")!.layers, "tie")).toBe(false);
    // Everyday: one whole top, the same every time, and no shirt under it.
    const home = bustOfLook(look, "everyday")!.layers;
    expect(has(home, "top")).toBe(true);
    expect(has(home, "shirt") || has(home, "jacket")).toBe(false);
    expect(bustOfLook(look, "everyday")!.layers).toEqual(home);
    // Work is the shirt and tie without the jacket, even where one is chosen;
    // office adds it.
    const jacketed = { ...look, jacket: jacket[1]!.key };
    expect(has(bustOfLook(jacketed, "work")!.layers, "jacket")).toBe(false);
    expect(
      has(bustOfLook(jacketed, "official")!.layers, "jacket", jacket[1]!.key),
    ).toBe(true);
    // A chosen everyday top is the one worn everyday, in its chosen color.
    const set = bustChoices(bustPerson(look.person)!).top;
    for (const choice of set) {
      const colors = bustTopColors(bustPerson(look.person)!, choice.key);
      const last = colors.at(-1)!.key;
      const worn = bustOfLook(
        { ...look, top: choice.key, topColor: last },
        "everyday",
      )!.layers;
      expect(
        worn.some((url) => url.endsWith(`/top-${choice.key}-${last}.png`)),
        choice.key,
      ).toBe(true);
      // Work and office ignore it.
      expect(
        has(bustOfLook({ ...look, top: choice.key }, "work")!.layers, "top"),
      ).toBe(false);
    }
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
    const { hair, hairColor, face } = bustChoices(man);
    const look = {
      person: man.id,
      hair: hair[1]!.key,
      hairColor: hairColor[0]!.key,
      face: face[0]!.key,
    };
    const drawn = bustOfLook(look, "work")!;
    expect(drawn.layers.at(-1)).toMatch(
      new RegExp(`/hair-${look.hair}-${look.hairColor}\\.png$`),
    );
    expect(
      drawn.layers.some((url) => url.includes(`/face-${look.face}-`)),
    ).toBe(true);
    // No facial hair where the look names none.
    const bare = {
      person: look.person,
      hair: look.hair,
      hairColor: look.hairColor,
    };
    expect(
      bustOfLook(bare, "work")!.layers.some((url) => /\/face-/.test(url)),
    ).toBe(false);
    expect(bustOfLook({ ...look, hair: "none" }, "work")).toBeNull();
    expect(bustOfLook({ ...look, person: "nobody" }, "work")).toBeNull();
    // Every choice the creator offers has a word for it.
    for (const person of bustPeople()) {
      const choices = bustChoices(person);
      for (const choice of [
        ...choices.hair,
        ...choices.hairColor,
        ...choices.face,
        ...choices.shirt,
        ...choices.tie,
        ...choices.jacket,
      ])
        expect(choice.label, choice.key).not.toBe("");
    }
  });

  it("gives someone older the older face and gray hair, by seed or by look", () => {
    for (const person of bustPeople()) {
      const seeded = bustFor(person, "everyday", 12345, true, true)!;
      expect(seeded.layers[0], person.id).toMatch(/-older\.png$/);
      expect(seeded.layers.at(-1), person.id).toMatch(/-gray\.png$/);
      const { hair, hairColor } = bustChoices(person);
      const look = {
        person: person.id,
        hair: hair[0]!.key,
        hairColor: hairColor[0]!.key,
      };
      const chosen = bustOfLook(look, "everyday", true)!;
      expect(chosen.layers[0], person.id).toMatch(/-older\.png$/);
      expect(chosen.layers.at(-1), person.id).toMatch(/-gray\.png$/);
    }
  });

  it("spreads people of one sex and tone over hairstyles, colors and tops", () => {
    const woman = bustPeople().find((p) => p.sex === "woman")!;
    const looks = new Set(
      Array.from({ length: 400 }, (_, n) =>
        bustFor(woman, "everyday", bustPick(`seed-${n}:bust`))!.layers.join(
          " ",
        ),
      ),
    );
    // Six hairstyles, at least two colors and two everyday tops.
    expect(looks.size).toBeGreaterThanOrEqual(20);
  });
});
