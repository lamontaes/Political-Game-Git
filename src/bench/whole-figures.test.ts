import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ageBandOf,
  colorsFor,
  figureOn,
  pickLook,
  viewOf,
  type FigurePerson,
} from "./whole-figures";
import index from "../../art/people-engine/v2/index.json" with { type: "json" };
import backs from "../../art/people-engine/v2/figures-back.json" with { type: "json" };
import rules from "./data/whole-figures.json" with { type: "json" };
import { backdropStaging } from "./staging";
import staging from "../../art/backdrops/staging.json" with { type: "json" };
import type { CoreState } from "../core2/types";

// A random painted place each run, named so a failure can be replayed.
const places = Object.keys(staging.places).filter((place) =>
  backdropStaging(place)!.spots.some(
    (spot) => (spot.pose ?? "stand") === "stand",
  ),
);
const place =
  process.env.PEOPLE_TEST_PLACE ??
  places[Math.floor(Math.random() * places.length)]!;
const core = {
  date: "2026-10-13",
  people: new Map(),
  jobs: new Map(),
  organizations: new Map(),
} as unknown as CoreState;
const person = {
  id: "person:shadow",
  birthDate: "1984-05-02",
  official: false,
};
/** The person's look drawn on a spot: the chosen look through figureOn. */
const wholeFigureFor = (
  who: FigurePerson,
  where: string,
  stage: Parameters<typeof figureOn>[3],
  spot: Parameters<typeof figureOn>[4],
) => {
  const front = pickLook(core, who, where);
  return front
    ? figureOn(front, ageBandOf(core, who.birthDate), where, stage, spot)
    : null;
};

describe("the look chosen in the creator", () => {
  it("is the player's figure wherever they are drawn", () => {
    const chosen = { sex: "male", build: "heavy", outfit: "base" };
    const look = pickLook(core, { ...person, look: chosen }, place)!;
    expect([look.sex, look.build, look.outfit]).toEqual([
      "male",
      "heavy",
      "base",
    ]);
    // Drawn on a standing spot in the room turned to one side, the same figure.
    const stage = backdropStaging(place)!;
    // A spot with no pose painted at it (a pose draws its own body: poses.test.ts).
    const spot = {
      ...stage.spots.find(
        (row) =>
          (row.pose ?? "stand") === "stand" &&
          !wholeFigureFor(
            { ...person, look: chosen },
            place,
            stage,
            row,
          )?.file.startsWith("pose-"),
      )!,
      facing: "left" as const,
    };
    expect(
      wholeFigureFor({ ...person, look: chosen }, place, stage, spot)!.url,
    ).toContain(look.file.split("/").pop());
  });
});

describe(`contact shadows at ${place}`, () => {
  const stage = backdropStaging(place)!;
  const standing = stage.spots.filter(
    (spot) => (spot.pose ?? "stand") === "stand",
  );

  it("puts every standing person's shadow on their foot point, under their feet", () => {
    for (const spot of standing) {
      const whole = wholeFigureFor(person, place, stage, spot)!;
      const { figure } = whole;
      // A pose stands at furniture, drawn as painted, without a shadow.
      if (whole.file.startsWith("pose-")) continue;
      if (spot.behindY !== undefined) {
        expect(figure.shadow).toBeNull();
        continue;
      }
      const shadow = figure.shadow!;
      // Centered vertically on the floor line the feet stand on: the spot's,
      // or on a spot measured from a plate, the feet as drawn there.
      const middleY = shadow.topPercent + shadow.heightPercent / 2;
      if (spot.head) {
        expect(middleY).toBeGreaterThan(figure.topPercent);
        expect(middleY).toBeLessThanOrEqual(
          figure.topPercent + figure.heightPercent,
        );
      } else expect(middleY).toBeCloseTo(spot.y, 6);
      // Centered under the figure, and no wider than the figure's picture.
      const middle = shadow.leftPercent + shadow.widthPercent / 2;
      expect(middle).toBeGreaterThan(figure.leftPercent);
      expect(middle).toBeLessThan(figure.leftPercent + figure.widthPercent);
      expect(shadow.widthPercent).toBeLessThanOrEqual(
        figure.widthPercent * 1.3,
      );
      // Flat on the floor: wider than tall on screen.
      expect(shadow.heightPercent / 1.7768).toBeLessThan(shadow.widthPercent);
    }
  });

  it("draws no shadow where a counter or desk hides the feet", () => {
    const spot = { ...standing[0]!, behindY: standing[0]!.y - 5 };
    expect(
      wholeFigureFor(person, place, stage, spot)!.figure.shadow,
    ).toBeNull();
  });
});

describe("choosing each person's look", () => {
  const government = rules.governmentPlaces;
  const hall = government[Math.floor(Math.random() * government.length)]!;

  it("draws every adult from the v2 standing figures", () => {
    for (let n = 0; n < 20; n++) {
      const look = pickLook(
        core,
        {
          ...person,
          id: `person:adult-${n}`,
          gender: n % 2 ? "male" : "female",
        },
        place,
      )!;
      expect(look.file).toMatch(/^figures\/v2-/);
      expect(look.pose).toBe("stand");
      expect(look.sex).toBe(n % 2 ? "male" : "female");
    }
  });

  it("draws no child: the set paints adults only", () => {
    expect(
      pickLook(
        core,
        { ...person, id: "person:child", birthDate: "2019-01-01" },
        place,
      ),
    ).toBeNull();
  });

  it(`dresses an official in an official's outfit at a government place (${hall})`, () => {
    for (let n = 0; n < 20; n++) {
      const look = pickLook(
        core,
        { ...person, id: `person:official-${n}`, official: true },
        hall,
      )!;
      expect(rules.officialOutfits).toContain(look.outfit);
    }
  });

  it("draws a person the same wherever they stand, whoever else is there", () => {
    const who = { ...person, id: "person:steady", gender: "male" };
    const here = pickLook(core, who, place)!;
    for (let n = 0; n < 5; n++) expect(pickLook(core, who, place)).toBe(here);
    expect(colorsFor(who)).toEqual(colorsFor({ ...who }));
  });

  it("gives neighbors their own skin and clothing colors from their own records", () => {
    const seen = new Set<string>();
    const skins = new Set<string>();
    for (let n = 0; n < 40; n++) {
      const c = colorsFor({ ...person, id: `person:street-${n}` });
      seen.add(`${c.skin}:${c.jacket}:${c.shirt}:${c.pants}:${c.shoes}`);
      skins.add(c.skin!);
    }
    expect(seen.size).toBeGreaterThan(20);
    expect(skins.size).toBeGreaterThan(3);
    // A record's own seed decides, not the id; a creator's choice wins.
    expect(colorsFor({ ...person, id: "a", seed: "s1" })).toEqual(
      colorsFor({ ...person, id: "b", seed: "s1" }),
    );
    expect(
      colorsFor({
        ...person,
        look: {
          sex: "male",
          build: "slim",
          outfit: "base",
          skin: "ebony",
          jacket: "red",
          shirt: "white",
          pants: "navy",
          shoes: "black",
        },
      }),
    ).toMatchObject({
      skin: "ebony",
      jacket: "red",
      shirt: "white",
      pants: "navy",
      shoes: "black",
    });
  });
});

describe("the people the game draws", () => {
  it("loads no whole-figure person from art/people-whole anywhere in the bench", () => {
    const old = ["art", "people-whole"].join("/");
    const here = new URL("./", import.meta.url);
    const loaders = readdirSync(here).filter(
      (file) => /\.(ts|mjs|html)$/.test(file) && !file.endsWith(".test.ts"),
    );
    expect(loaders.length).toBeGreaterThan(0);
    for (const file of loaders)
      expect(readFileSync(new URL(file, here), "utf8"), file).not.toContain(
        old,
      );
  });
});

describe(`the angle each spot asks for at ${place}`, () => {
  const stage = backdropStaging(place)!;
  type Row = {
    file: string;
    angle: string;
    pose: string;
    outfit: string;
    sex: string;
    build: string;
    prop: string;
    flag?: string;
  };
  // The set's own figures, and the standing ones seen from behind ("plain" is "base").
  const rows = new Map(
    [
      ...(index.figures as Row[]),
      ...(backs.figures as Row[]).map((row) => ({
        ...row,
        outfit: row.outfit === "plain" ? "base" : row.outfit,
      })),
    ].map((row) => [row.file.split("/").pop()!, row]),
  );

  it("draws a back where the spot faces away, a face where it faces the viewer, else the three-quarter view", () => {
    for (const spot of stage.spots) {
      if (spot.pose === "podium") continue;
      const whole = wholeFigureFor(person, place, stage, spot);
      // A pose has its own painted view (poses.test.ts).
      if (!whole || whole.file.startsWith("pose-")) continue;
      const drawn = rows.get(whole.file.split("/").pop()!)!;
      const wanted = viewOf(spot);
      // Where the set paints no such view of this look (it has no standing
      // back view, and not every look seated from behind), the three-quarter
      // view, turned.
      const painted = [...rows.values()].some(
        (row) =>
          row.outfit === drawn.outfit &&
          row.sex === drawn.sex &&
          row.build === drawn.build &&
          row.pose === drawn.pose &&
          row.angle === wanted &&
          row.prop === "none" &&
          !row.flag,
      );
      expect(drawn.angle).toBe(painted ? wanted : "three-quarter");
    }
  });

  it("reads the facing as the angle", () => {
    const spot = stage.spots[0]!;
    expect(viewOf({ ...spot, facing: "away" })).toBe("back");
    expect(viewOf({ ...spot, facing: "viewer" })).toBe("front");
    expect(viewOf({ ...spot, facing: "left" })).toBe("three-quarter");
    expect(viewOf({ ...spot, facing: "right" })).toBe("three-quarter");
  });
});
