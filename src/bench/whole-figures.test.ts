import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pickLook, wholeFigureFor } from "./whole-figures";
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

describe("the look chosen in the creator", () => {
  it("is the player's figure wherever they are drawn", () => {
    const chosen = { sex: "male", build: "heavy", outfit: "base" };
    const look = pickLook(core, { ...person, look: chosen }, place)!;
    expect([look.sex, look.build, look.outfit]).toEqual([
      "male",
      "heavy",
      "base",
    ]);
    // Drawn on a standing spot in the room, the same figure.
    const stage = backdropStaging(place)!;
    const spot = stage.spots.find((row) => (row.pose ?? "stand") === "stand")!;
    expect(
      wholeFigureFor(core, { ...person, look: chosen }, place, stage, spot)!
        .url,
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
      const whole = wholeFigureFor(core, person, place, stage, spot)!;
      const { figure } = whole;
      if (spot.clipBelowY !== undefined && spot.clipBandEndY === undefined) {
        expect(figure.shadow).toBeNull();
        continue;
      }
      const shadow = figure.shadow!;
      // Centered vertically on the floor line the feet stand on.
      expect(shadow.topPercent + shadow.heightPercent / 2).toBeCloseTo(
        spot.y,
        6,
      );
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
    const spot = { ...standing[0]!, clipBelowY: standing[0]!.y - 5 };
    expect(
      wholeFigureFor(core, person, place, stage, spot)!.figure.shadow,
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

  it("gives no two people in a scene the same look", () => {
    const taken = new Set<string>();
    for (let n = 0; n < 4; n++) {
      const look = pickLook(
        core,
        { ...person, id: `person:crowd-${n}`, gender: "female" },
        place,
        taken,
      )!;
      expect(taken.has(look.look)).toBe(false);
      taken.add(look.look);
    }
  });
});

describe("the people the game draws (owner, Oct 24)", () => {
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
