import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { countedDrift } from "./modules/counted-drift";
import { residentsRuntime } from "./modules/residents";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState } from "./types";

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
  it("has deaths and births at real rates over a year, and every dollar balances", () => {
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
    advanceCore(core, "2021-12-31");
    let deaths = 0,
      births = 0;
    for (const row of countedDrift(core).values()) {
      deaths += row.deaths;
      births += row.births;
    }
    // A year's deaths and births among the counts, near the U.S. rates
    // (about 0.9% and 1.1% a year).
    expect(deaths / before).toBeGreaterThan(0.003);
    expect(deaths / before).toBeLessThan(0.025);
    expect(births / before).toBeGreaterThan(0.003);
    expect(births / before).toBeLessThan(0.025);
    expect(counted()).toBe(before - deaths + births);
    // The dead are gone from the records; the newborns are new people.
    const now = [...rt.households.values()].flatMap((row) =>
      row.people.map((person) => person.id),
    );
    expect(now.filter((id) => !ids.has(id)).length).toBe(births);
    expect(total(core)).toBe(start);
  }, 300_000);
});
