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
  const homes = rules.homePlaces;
  const home = homes[Math.floor(Math.random() * homes.length)]!;
  const at = (date: string) => ({ ...core, date }) as unknown as CoreState;
  const teen = (n: number) => ({
    id: `person:teen-${n}`,
    birthDate: "2011-03-01",
    gender: n % 2 ? "male" : "female",
    official: false,
  });

  it(`never draws a skateboard, a basketball or a laptop at home (${home})`, () => {
    for (let n = 0; n < 60; n++) {
      const look = pickLook(core, teen(n), home)!;
      expect(["skateboard", "basketball", "laptop"]).not.toContain(
        look.activity,
      );
      const adult = pickLook(
        core,
        { ...person, id: `person:adult-${n}` },
        home,
      )!;
      expect(["laptop", "clipboard", "tablet-explaining"]).not.toContain(
        adult.activity,
      );
    }
  });

  it("lets a teen carry a ball or a skateboard outdoors", () => {
    const seen = new Set<string>();
    for (let n = 0; n < 60; n++)
      seen.add(pickLook(core, teen(n), "park")!.activity);
    expect(
      [...seen].some((row) => ["skateboard", "basketball"].includes(row)),
    ).toBe(true);
  });

  it("gives no two people in a scene the same look", () => {
    const taken = new Set<string>();
    for (let n = 0; n < 12; n++) {
      const look = pickLook(
        core,
        { ...person, id: `person:crowd-${n}` },
        home,
        taken,
      )!;
      expect(taken.has(look.look)).toBe(false);
      taken.add(look.look);
    }
  });

  it("keeps the player's look family from teen to adult", () => {
    for (const sex of ["male", "female"]) {
      const player = { ...teen(0), gender: sex, player: true };
      const young = pickLook(at("2026-10-13"), player, "park")!;
      const grown = pickLook(at("2031-10-13"), player, home)!;
      expect(young.ageBand).toBe("teen");
      expect(grown.ageBand).not.toBe("teen");
      expect(grown.family).toBe(young.family);
    }
  });

  it("draws people near their real age", () => {
    for (let n = 0; n < 40; n++) {
      const born = 1950 + n;
      const look = pickLook(
        core,
        { ...person, id: `person:age-${n}`, birthDate: `${born}-06-01` },
        home,
      )!;
      expect(Math.abs((look.age ?? 40) - (2026 - born))).toBeLessThanOrEqual(
        12,
      );
    }
  });
});
