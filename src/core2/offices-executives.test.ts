import { expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bodies from "./data/offices/bodies.json" with { type: "json" };
import executives from "./data/offices/executives.json" with { type: "json" };
import stateOfficeResearch from "../../data/research/offices/state-offices.json" with { type: "json" };
import { federalOffices } from "./offices-state";
import {
  executiveRow,
  headsExecutive,
  headsLocalExecutive,
  nationalExecutive,
} from "./offices-executives";

const LEVELS = ["city", "county", "state", "federal"];

it("gives every executive row a level of the bodies' words and one head per level", () => {
  const levels = new Set(bodies.bodies.map((row) => row.level));
  for (const row of executives.executives)
    expect(levels.has(row.level), row.kind).toBe(true);
  for (const level of LEVELS)
    expect(
      executives.executives.filter((row) => row.level === level && row.heads)
        .length,
      level,
    ).toBe(1);
});

it("has a row for every executive office the offices engine seats that a reader asks about", () => {
  // The nation's: every federal office that is not a seat in Congress.
  const federal = federalOffices("US-VA", "5115176", "2025-01-01")
    .map(({ office }) => office.kind)
    .filter((kind) => !kind.startsWith("us-"));
  expect(federal.length).toBeGreaterThan(0);
  for (const kind of federal) expect(executiveRow(kind), kind).toBeDefined();
  // Every state's and territory's governor and lieutenant governor, from the research the engine seats them from.
  const places = Object.values(
    (
      stateOfficeResearch as unknown as {
        places: Record<string, { executives?: { key: string }[] }>;
      }
    ).places,
  );
  const keys = new Set(
    places.flatMap((place) => (place.executives ?? []).map((row) => row.key)),
  );
  for (const kind of ["governor", "lieutenant-governor"]) {
    expect(keys.has(kind), kind).toBe(true);
    expect(executiveRow(kind), kind).toBeDefined();
  }
  // The town's and the county's own (src/core2/offices-local.ts).
  for (const kind of ["mayor", "county-executive"])
    expect(executiveRow(kind), kind).toBeDefined();
});

it("answers each reader the way its typed list did", () => {
  const kinds = [
    "mayor",
    "county-executive",
    "governor",
    "lieutenant-governor",
    "president",
    "vice-president",
    "council",
    "county-board",
    "county-sheriff",
    "attorney-general",
    "legislature-lower",
    "us-senate",
  ];
  const pick = (test: (kind: string) => boolean) => kinds.filter(test);
  expect(pick(headsLocalExecutive)).toEqual(["mayor", "county-executive"]);
  expect(pick(headsExecutive)).toEqual([
    "mayor",
    "county-executive",
    "governor",
    "president",
  ]);
  expect(pick(nationalExecutive)).toEqual(["president", "vice-president"]);
  expect(
    pick((kind) => {
      const row = executiveRow(kind);
      return row?.heads === true && row.level !== "federal";
    }),
  ).toEqual(["mayor", "county-executive", "governor"]);
});

it("leaves no list of executive office kinds typed in code under src", () => {
  // A list typed in code is two or more executive kinds side by side: in a
  // pattern (`mayor|governor`) or an array (`"mayor", "governor"`). Each
  // reader asks the rows instead (offices-executives-one-list).
  const kinds = executives.executives.map((row) => row.kind).join("|");
  const typed = new RegExp(
    `(?:\\b(?:${kinds})\\|(?:${kinds})\\b)|(?:["'](?:${kinds})["']\\s*,\\s*["'](?:${kinds})["'])`,
  );
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (
        /\.(ts|mts|mjs|js)$/.test(entry.name) &&
        !/\.test\.|\.browser\./.test(entry.name)
      ) {
        readFileSync(path, "utf8")
          .split("\n")
          .forEach((line, at) => {
            if (typed.test(line))
              found.push(`${path}:${at + 1}: ${line.trim()}`);
          });
      }
    }
  };
  walk(join(dirname(fileURLToPath(import.meta.url)), ".."));
  expect(found).toEqual([]);
});
