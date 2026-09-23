import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import type { NewGameSetup } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import SSA_COPY from "./given-names-by-decade.json" with { type: "json" };
import {
  birthYearDecadeWeights,
  cohortGivenNames,
  drawCohortGivenName,
} from "./given-name-cohorts";
import { lifePlaceSearch } from "./life-places";
import { SeededRng } from "./rng";
import type { Person } from "./types";

interface EvidenceRow {
  readonly rank: number;
  readonly name: string;
  readonly count: number;
}
const EVIDENCE = JSON.parse(
  readFileSync("docs/research/evidence/ssa-given-names-by-decade.json", "utf8"),
) as {
  readonly decades: Record<string, Record<"male" | "female", EvidenceRow[]>>;
};

describe("the SSA decade tables the draw uses", () => {
  it("are the evidence file, name for name and count for count", () => {
    const copy = SSA_COPY.decades as unknown as Record<
      string,
      Record<"male" | "female", [string, number][]>
    >;
    expect(Object.keys(copy)).toStrictEqual(Object.keys(EVIDENCE.decades));
    for (const [decade, sexes] of Object.entries(EVIDENCE.decades)) {
      for (const sex of ["male", "female"] as const) {
        const ranked = [...sexes[sex]].sort((a, b) => a.rank - b.rank);
        expect(ranked).toHaveLength(100);
        expect(copy[decade]![sex]).toStrictEqual(
          ranked.map((row) => [row.name, row.count]),
        );
      }
    }
  });
});

describe("a birth year draws from the decades around it", () => {
  it("blends the two nearest decades and never steps at a decade line", () => {
    expect(birthYearDecadeWeights(1955)).toStrictEqual([["1950s", 1]]);
    expect(birthYearDecadeWeights(1950)).toStrictEqual([
      ["1940s", 0.5],
      ["1950s", 0.5],
    ]);
    for (let year = 1900; year <= 2060; year += 1) {
      const weights = birthYearDecadeWeights(year);
      const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
      expect(total).toBeCloseTo(1, 10);
      // Continuity: a year later moves at most a tenth of the weight.
      const share = (y: number) =>
        new Map(birthYearDecadeWeights(y).map(([key, w]) => [key, w]));
      const now = share(year);
      const next = share(year + 1);
      for (const key of new Set([...now.keys(), ...next.keys()])) {
        expect(
          Math.abs((now.get(key) ?? 0) - (next.get(key) ?? 0)),
        ).toBeLessThanOrEqual(0.1 + 1e-9);
      }
    }
    // Outside the tables the nearest decade holds.
    expect(birthYearDecadeWeights(1901)).toStrictEqual([["1920s", 1]]);
    expect(birthYearDecadeWeights(2050)).toStrictEqual([["2020s", 1]]);
  });

  it("draws the names of the decade, by how common they were", () => {
    const rng = new SeededRng("cohort-draw");
    const counts = new Map<string, number>();
    for (let index = 0; index < 2000; index += 1) {
      const name = drawCohortGivenName(rng.fork(`${index}`), "female", 1955)!;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    // Mary was the 1950s' most common girls' name by a wide margin.
    expect(top).toBe("Mary");
    const nineties = new Set(
      (SSA_COPY.decades as unknown as Record<string, Record<string, [string]>>)[
        "1990s"
      ]!.female!.map(([name]) => name),
    );
    const fifties = new Set(
      (SSA_COPY.decades as unknown as Record<string, Record<string, [string]>>)[
        "1950s"
      ]!.female!.map(([name]) => name),
    );
    const onlyNineties = [...counts.keys()].filter(
      (name) => nineties.has(name) && !fifties.has(name),
    );
    expect(onlyNineties).toStrictEqual([]);
  });

  it("steps around names already taken, and gives up rather than invent one", () => {
    const every = [...cohortGivenNames("male")];
    expect(
      drawCohortGivenName(new SeededRng("full"), "male", 1985, every),
    ).toBeNull();
    const name = drawCohortGivenName(new SeededRng("one"), "male", 1985, [
      "Michael",
    ]);
    expect(name).not.toBe("Michael");
  });
});

describe("a new world's people are named for the year they were born", () => {
  const columbus = lifePlaceSearch("Columbus", 20, {
    stateJurisdictionKey: "US-OH",
    scope: "locality",
  }).find((place) => /^Columbus\b/.test(place.displayName))!;

  function people(setup: Partial<NewGameSetup>, seed: string): Person[] {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: columbus.key,
        startAge: 34,
        depth: "summarize-earlier-life",
        ...setup,
      }),
    ).game!;
    return Object.values(game.world.people).filter(
      (person) => person.id !== game.playerPersonId,
    );
  }

  // The share of people born between 1935 and 1964 whose given name was in
  // their own birth decade's SSA top 100.
  function periodShare(population: readonly Person[]): {
    readonly counted: number;
    readonly share: number;
  } {
    const decades = SSA_COPY.decades as unknown as Record<
      string,
      Record<"male" | "female", [string, number][]>
    >;
    let counted = 0;
    let matched = 0;
    for (const person of population) {
      const sex = person.identity?.gender;
      if (sex !== "male" && sex !== "female") continue;
      const year = Number(person.birthDate.slice(0, 4));
      if (year < 1935 || year > 1964) continue;
      const decade = decades[`${Math.floor(year / 10) * 10}s`]![sex];
      counted += 1;
      if (decade.some(([name]) => name === person.givenName)) matched += 1;
    }
    return { counted, share: matched / counted };
  }

  it("gives older people the names of their generation", () => {
    const before = people(
      {
        givenNameGenerationVersion: "given-name-v2",
        livingWorldMemberNameVersion: "identity-v1",
      },
      "cohort-world",
    );
    const after = people({}, "cohort-world");
    const was = periodShare(before);
    const now = periodShare(after);
    // Proof the measurement reaches people: a seated Congress is hundreds.
    expect(now.counted).toBeGreaterThan(150);
    expect(now.counted).toBe(was.counted);
    // Measured on this head: see the declaration for the numbers.
    expect(now.share).toBeGreaterThan(was.share + 0.3);
  });
});
