import { describe, expect, it } from "vitest";

import { SeededRng } from "./rng";
import {
  SCHOOL_NAMES_V1,
  generateSchoolName,
  generateSchoolNames,
  getSchoolNameCorpus,
} from "./school-names";

/** A generated name still has to read like a school, everywhere and always. */
describe("generated school names", () => {
  const STEMS = [
    "Springfield",
    "Nashville",
    "Sangamon County",
    "Salt Lake City",
    "Wilkes-Barre",
  ];

  it("ends every name in the level the school actually is", () => {
    for (const stem of STEMS) {
      for (let seed = 0; seed < 40; seed += 1) {
        const drawn = generateSchoolNames(
          new SeededRng(`${stem}:${seed}`),
          stem,
        );
        expect(drawn.elementary).toMatch(/ Elementary School$/);
        expect(drawn.middle).toMatch(/ Middle School$/);
        expect(drawn.high).toMatch(/ High School$/);
      }
    }
  });

  it("never leaves a blank where the name should be", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const drawn = generateSchoolNames(new SeededRng(`blank:${seed}`), "");
      for (const name of Object.values(drawn)) {
        expect(name).toMatch(/^\S/);
        expect(name).not.toMatch(/\s{2}/);
        expect(name.trim()).toBe(name);
      }
    }
  });

  it("gives one childhood three different schools", () => {
    for (const stem of STEMS) {
      for (let seed = 0; seed < 40; seed += 1) {
        const drawn = generateSchoolNames(
          new SeededRng(`${stem}:${seed}`),
          stem,
        );
        expect(new Set(Object.values(drawn)).size).toBe(3);
      }
    }
  });

  it("does not put a compass point in front of a county", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const drawn = generateSchoolNames(
        new SeededRng(`county:${seed}`),
        "Sangamon County",
      );
      for (const name of Object.values(drawn)) {
        expect(name).not.toMatch(/^(?:North|South|East|West|Central) Sangamon/);
      }
    }
  });

  it("draws the same name from the same stream", () => {
    const once = generateSchoolName(new SeededRng("fixed"), "high", "Helena");
    const twice = generateSchoolName(new SeededRng("fixed"), "high", "Helena");
    expect(twice).toBe(once);
  });

  it("refuses a corpus version it does not have", () => {
    expect(() => getSchoolNameCorpus("school-names-v99")).toThrow();
    expect(getSchoolNameCorpus().version).toBe(SCHOOL_NAMES_V1.version);
  });

  it("keeps the corpus free of duplicates", () => {
    expect(new Set(SCHOOL_NAMES_V1.figures).size).toBe(
      SCHOOL_NAMES_V1.figures.length,
    );
    expect(new Set(SCHOOL_NAMES_V1.features).size).toBe(
      SCHOOL_NAMES_V1.features.length,
    );
  });
});
