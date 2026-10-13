import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import { viewOf, viewsModule } from "./modules/views";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import { POLICY_VALUES, valueSupport, valuesOf } from "./views-values";
import keys from "./data/views/ces-2024-values.json" with { type: "json" };

// M1-10, the 14 values: in two drawn towns, each person's values come from
// their state and age band's survey answers (CES 2024) and agree with their
// own lean as surveyed people's do; a policy's support follows from the
// values it bears on.
const KEYS = keys as unknown as {
  values: Record<
    string,
    {
      strength: string;
      slopeOnLean: number;
      cells: Record<string, { mean: number; leanMean: number }>;
    }
  >;
};
const towns = ["values-a", "values-b"].map((label) => {
  const place = drawPlace(
    process.env.GOLDEN_PATH_SEED ?? "views-values",
    label,
  );
  const input = buildDeepPast(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: "2021-01-01",
      minimumPeople: 600,
    }),
  );
  const core = createLifeCore(input, { modules: [viewsModule] });
  const api = coreAPI(core);
  const adults = [...core.people.values()].filter(
    (person) =>
      person.alive &&
      person.tier !== "husk" &&
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(core.startedAt)) >=
        18,
  );
  return { place, core, api, adults };
});

describe(`the 14 values in ${towns.map(({ place }) => `${place.name} (seed ${place.seed.slice(0, 12)})`).join(", ")}`, () => {
  it("gives every adult all 14 values between -1 and 1", () => {
    for (const { api, adults } of towns)
      for (const person of adults) {
        const values = valuesOf(api, person.id)!;
        expect(Object.keys(values).sort()).toEqual(
          POLICY_VALUES.values.map((row) => row.key).sort(),
        );
        for (const value of Object.values(values)) {
          expect(value).toBeGreaterThanOrEqual(-1);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
  });

  it("lands each well-measured value near the survey's mean for the town's state and ages", () => {
    for (const { api, adults } of towns) {
      const key = lifePlaceByJurisdictionId(
        adults[0]!.placeId as never,
      )?.stateJurisdictionKey;
      const state = key ? key.slice(key.lastIndexOf("-") + 1) : "US";
      for (const [value, row] of Object.entries(KEYS.values)) {
        if (row.strength !== "good") continue;
        let expected = 0;
        let measured = 0;
        for (const person of adults) {
          const age = ageOnDate(
            makeIsoDate(person.birthDate),
            makeIsoDate(api.state.startedAt),
          );
          const band =
            age < 30
              ? "18-29"
              : age < 45
                ? "30-44"
                : age < 65
                  ? "45-64"
                  : "65-plus";
          const cell =
            row.cells[`${state}:${band}`] ?? row.cells[`US:${band}`]!;
          expected += cell.mean;
          measured += valuesOf(api, person.id)![value]!;
        }
        expect(measured / adults.length, value).toBeCloseTo(
          expected / adults.length,
          0,
        );
      }
    }
  });

  it("moves values with lean as the survey's do", () => {
    for (const [value, row] of Object.entries(KEYS.values)) {
      if (Math.abs(row.slopeOnLean) < 0.2) continue;
      let lean = 0;
      let x = 0;
      let lx = 0;
      let ll = 0;
      let n = 0;
      for (const { api, adults } of towns)
        for (const person of adults) {
          const l = viewOf(api, person.id)!.lean;
          const v = valuesOf(api, person.id)![value]!;
          lean += l;
          x += v;
          lx += l * v;
          ll += l * l;
          n += 1;
        }
      const slope =
        (lx / n - (lean / n) * (x / n)) / (ll / n - (lean / n) ** 2);
      expect(Math.sign(slope), value).toBe(Math.sign(row.slopeOnLean));
    }
  });

  it("supports a policy by the values it bears on: liberals favor a state income tax more", () => {
    const support = (side: (lean: number) => boolean) => {
      const rows = towns.flatMap(({ api, adults }) =>
        adults
          .filter((person) => side(viewOf(api, person.id)!.lean))
          .map((person) =>
            valueSupport(api, person.id, "fiscal.adopt-income-tax")!,
          ),
      );
      return rows.reduce((a, b) => a + b, 0) / rows.length;
    };
    expect(support((lean) => lean < -0.5)).toBeGreaterThan(
      support((lean) => lean > 0.5),
    );
    expect(
      valueSupport(towns[0]!.api, towns[0]!.adults[0]!.id, "no-such-policy"),
    ).toBeNull();
  });
});
