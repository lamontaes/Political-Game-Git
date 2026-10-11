import { describe, expect, it } from "vitest";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { SeededRng } from "../simulation/rng";
import { realLocalities } from "./places";
import { openHistoryWorld } from "./opening-history";
import { coreAPI } from "./state";
import {
  censusOpeningInput,
  openingInputBudget,
} from "./tooling/opening-input-budget";
import budgets from "./tooling/opening-input-budgets.json" with { type: "json" };
import type { Parameter } from "./parameters";

const identities = lifePlaceStateIdentities();
const localities = realLocalities();

describe("ordinary generated 2026 history openings", () => {
  for (const suffix of ["a", "b", "c"]) {
    const seed = `m1-history-part1-${suffix}`;
    const rng = new SeededRng(seed);
    const state = rng.pick(identities);
    const place = rng.pick(
      localities.filter(
        (row) =>
          row.scope === "locality" &&
          row.stateJurisdictionKey === state.jurisdictionKey,
      ),
    );
    it(`opens ${place.displayName}, seed ${seed}, drawn from all 56`, () => {
      expect(identities).toHaveLength(56);
      // Opening-size test control; the same production producers build every resident.
      const world = openHistoryWorld({
        seed,
        placeKey: place.key,
        minimumPeople: 800,
      });
      expect(world.core.startedAt).toBe("2026-01-01");
      expect(world.core.date).toBe(world.core.startedAt);
      expect(world.core.actCounters.size).toBe(0);
      expect(world.history.passes).toEqual([
        {
          moduleId: "history-people",
          phase: "people",
          tier: "monthly",
          steps: 60,
        },
      ]);
      const table = coreAPI(world.core)
        .moduleState("history-people")
        .table("events");
      const rows = table.rows();
      expect(rows.length).toBeGreaterThan(0);
      const people = new Map(
        world.input.people.map((person) => [person.id, person]),
      );
      for (const row of rows) {
        const person = people.get(String(row.personId))!;
        const fact = person.pastFacts?.find((fact) => fact.id === row.factId);
        expect(fact).toBeDefined();
        expect(fact!.date).toBe(row.date);
        expect(
          fact!.date >= person.birthDate && fact!.date < world.input.startedAt,
        ).toBe(true);
        expect(table.query("byPerson", [person.id])).toContainEqual(row);
      }
      expect(
        world.input.moduleState?.find(
          (snapshot) => snapshot.moduleId === "history-people",
        )?.tables.events?.length,
      ).toBe(rows.length);
      const census = censusOpeningInput(world.input);
      const budget = openingInputBudget(
        census,
        budgets as Readonly<Record<string, Parameter>>,
      );
      console.log(
        JSON.stringify({
          seed,
          state: state.jurisdictionKey,
          place: place.displayName,
          startedAt: world.input.startedAt,
          recentEvents: rows.length,
          examples: rows.slice(0, 3),
          census,
          budget,
        }),
      );
      expect(census.bytes).toBeGreaterThan(0);
      expect(budget.passed).toBe(true);
    });
  }
  it("rejects another law vintage before building", () => {
    expect(() =>
      openHistoryWorld({ seed: "wrong-date", startedAt: "2021-01-01" }),
    ).toThrow("2026");
  });
});
