import { expect, it } from "vitest";
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
