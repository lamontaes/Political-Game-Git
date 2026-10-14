import { randomBytes } from "node:crypto";
import { gameStartDate } from "./game-start";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { countedDrift } from "./modules/counted-drift";
import { residentsRuntime } from "./modules/residents";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";

/** A date this many days after the game's opening date (tests once assumed January 1, 2021). */
const after = (days: number) => {
  const at = new Date(`${gameStartDate()}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-counted-drift");

const total = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  ) +
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

describe(`the wider population changes in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("has deaths, births and moves at real rates over a year, and every dollar balances", () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    const rt = residentsRuntime(core)!;
    const counted = () =>
      [...rt.households.values()].reduce((n, row) => n + row.people.length, 0);
    const before = counted();
    const start = total(core);
    const ids = new Set(
      [...rt.households.values()].flatMap((row) =>
        row.people.map((person) => person.id),
      ),
    );
    advanceCore(core, after(364));
    let deaths = 0,
      births = 0,
      movedOut = 0,
      movedIn = 0;
    for (const row of countedDrift(core).values()) {
      deaths += row.deaths;
      births += row.births;
      movedOut += row.movedOut;
      movedIn += row.movedIn;
    }
    // A year's deaths and births among the counts, near the U.S. rates
    // (about 0.9% and 1.1% a year).
    expect(deaths / before).toBeGreaterThan(0.003);
    expect(deaths / before).toBeLessThan(0.025);
    expect(births / before).toBeGreaterThan(0.003);
    expect(births / before).toBeLessThan(0.025);
    // Moves: ACS 2024 has about 4 to 9% of adults leaving the county in a
    // year, depending on the state.
    expect(movedOut / before).toBeGreaterThan(0.02);
    expect(movedOut / before).toBeLessThan(0.15);
    expect(movedIn).toBeGreaterThan(0);
    expect(movedIn).toBeLessThanOrEqual(movedOut);
    expect(counted()).toBe(before - deaths + births - movedOut + movedIn);
    // The dead are gone from the records; the newborns are new people.
    const now = [...rt.households.values()].flatMap((row) =>
      row.people.map((person) => person.id),
    );
    // Newcomers and newborns may themselves die or leave within the year.
    const fresh = now.filter((id) => !ids.has(id)).length;
    expect(fresh).toBeLessThanOrEqual(births + movedIn);
    expect(fresh).toBeGreaterThan(0.8 * (births + movedIn));
    expect(total(core)).toBe(start);
  }, 300_000);
});
