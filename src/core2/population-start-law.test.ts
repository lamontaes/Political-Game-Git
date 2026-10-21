import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stableHash } from "./kernel/ids";
import { parameter as p } from "./parameters";
import { realLocalities } from "./places";
import { buildPopulation } from "./population";

interface WageRow {
  tier: string;
  value: number;
  operativeAt: string;
}
const matrix = JSON.parse(
  readFileSync(
    "data/research/money/minimum-wage-dated-matrix-2026.json",
    "utf8",
  ),
) as {
  asOf: string;
  federalFloor: WageRow;
  places: Record<string, { rows: WageRow[] }>;
};
// The table holds a dated rate before this day for the states that rose after it.
const startedAt = "2026-01-01";

/** The rate in force on a date, read straight from the research rows: the higher of the federal floor and the latest statewide row. */
function rateOn(rows: readonly WageRow[], date: string): number {
  const dated = [matrix.federalFloor, ...rows]
    .filter((row) => row.operativeAt <= date)
    .sort((a, b) => a.operativeAt.localeCompare(b.operativeAt));
  return Math.max(
    matrix.federalFloor.value,
    dated[dated.length - 1]?.value ?? p("zero"),
  );
}

describe("opening pay rests on the minimum wage of the start date", () => {
  it("opens a state whose rate rose after the start at the start-date rate", () => {
    const states = Object.entries(matrix.places)
      .filter(
        ([, state]) =>
          state.rows.every((row) => row.tier === "statewide") &&
          rateOn(state.rows, startedAt) > matrix.federalFloor.value &&
          rateOn(state.rows, matrix.asOf) > rateOn(state.rows, startedAt),
      )
      .map(([key]) => key)
      .sort();
    const seed = `start-law-pay:${stableHash(`${Date.now()}`)}`;
    const draw = (key: string, size: number) =>
      Number.parseInt(stableHash(key).slice(0, 8), 16) % size;
    // From the drawn state on, open one drawn place per state until a worker
    // stands on the floor: there the pay is the day's rate, not the later one
    // the research table also holds. Nobody anywhere is paid below the day's.
    let onFloor = "";
    for (let step = 0; step < states.length && !onFloor; step += 1) {
      const stateKey =
        states[(draw(seed, states.length) + step) % states.length]!;
      const places = realLocalities().filter(
        (place) => place.stateJurisdictionKey === stateKey,
      );
      const place = places[draw(`${seed}:${stateKey}`, places.length)]!;
      const rows = matrix.places[stateKey]!.rows;
      const atStart = rateOn(rows, startedAt);
      const label = `${place.key} (${stateKey}, ${atStart} rose to ${rateOn(rows, matrix.asOf)}) seed ${seed}`;
      const opening = buildPopulation({
        seed,
        placeKey: place.key,
        startedAt,
        minimumPeople: p("populationTestMinimum"),
      });
      const hourly = opening.jobs.map((job) => job.hourlyMinor);
      expect(hourly.length, label).toBeGreaterThan(p("zero"));
      expect(Math.min(...hourly), label).toBeGreaterThanOrEqual(atStart);
      if (hourly.some((rate) => rate === atStart)) onFloor = label;
    }
    expect(
      onFloor,
      `no state opened a worker on its start-date floor, seed ${seed}`,
    ).not.toBe("");
  });
});
