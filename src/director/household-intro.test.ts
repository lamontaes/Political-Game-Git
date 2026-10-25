/**
 * A household member whose surname differs is explained through the parent
 * whose family they belong to (a grandparent, an aunt or uncle), read from the
 * family facts of both; a parent with another surname has no such record and
 * is reported. The fixtures here prove the edge cases only; the played world
 * is proved in src/bench/opening-household.test.ts.
 */
import { describe, expect, it } from "vitest";
import { composeHouseholdIntro } from "./household-intro";
import type { CoreState } from "../core2/types";

const person = (
  id: string,
  given: string,
  family: string,
  gender: string,
  facts: [string, string][] = [],
) => ({
  id,
  givenName: given,
  familyName: family,
  alive: true,
  householdId: "hh",
  looks: { gender },
  pastFacts: facts.map(([kind, other], at) => ({
    id: `${id}:fact${at}`,
    kind: `family:${kind}`,
    facts: { otherPersonId: other },
  })),
});

const world = (rows: ReturnType<typeof person>[]) =>
  ({
    seed: "test",
    date: "2025-01-20",
    people: new Map(rows.map((row) => [row.id, row])),
    households: new Map([
      ["hh", { id: "hh", memberIds: rows.map((row) => row.id) }],
    ]),
  }) as unknown as CoreState;

describe("household introduction", () => {
  it("explains a grandmother's other surname through the parent whose mother she is", () => {
    const core = world([
      person("me", "Ana", "Reyes", "female", [
        ["parent", "mom"],
        ["other-parent", "dad"],
        ["grandparent", "gran"],
      ]),
      person("mom", "Rosa", "Reyes", "female", [["parent", "gran"]]),
      person("dad", "Luis", "Reyes", "male"),
      person("gran", "Blair", "Stein", "female", [["child", "mom"]]),
    ]);
    const intro = composeHouseholdIntro(core, "me");
    const gran = intro.lines.find((row) => row.personId === "gran")!;
    expect(gran.text).toMatch(/Blair Stein/);
    expect(gran.text).toMatch(/your grandmother/i);
    expect(gran.text).toMatch(/your mother's side/);
    expect(gran.sourceRecordIds).toContain("me:fact2");
    expect(intro.unexplained).toEqual([]);
    expect(intro.lines).toHaveLength(3);
  });

  it("reports a parent whose surname differs and no record explains", () => {
    const core = world([
      person("me", "Bo", "Snider", "female", [["parent", "dad"]]),
      person("dad", "John", "Stein", "male"),
    ]);
    const intro = composeHouseholdIntro(core, "me");
    expect(intro.lines[0]!.text).toMatch(/your father/i);
    expect(intro.lines[0]!.text).not.toMatch(/side/);
    expect(intro.unexplained).toEqual(["dad"]);
  });

  it("says a housemate with no family fact lives in the home, nothing more", () => {
    const core = world([
      person("me", "Ana", "Reyes", "female"),
      person("pal", "Kai", "Moon", "other"),
    ]);
    const intro = composeHouseholdIntro(core, "me");
    expect(intro.lines[0]!.text).toMatch(
      /^Kai Moon lives (in|under) your (home|roof)\.$/,
    );
    expect(intro.unexplained).toEqual([]);
  });
});
