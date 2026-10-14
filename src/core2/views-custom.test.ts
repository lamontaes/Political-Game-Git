import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import { viewOf, viewsModule } from "./modules/views";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

// M6-04, custom politics: a custom world's lean shift (placeMetadata.worldSettings)
// moves every resident's opening lean by the shift times half the scale,
// within the scale's ends; a world from real data is unchanged.
const place = drawPlace(
  process.env.GOLDEN_PATH_SEED ?? "views-custom",
  "custom",
);
const input = buildDeepPast(
  buildPopulation({
    seed: place.seed,
    placeKey: place.key,
    startedAt: "2021-01-01",
    minimumPeople: 300,
  }),
);
const leans = (shift?: number) => {
  const core = createLifeCore(
    shift === undefined
      ? input
      : {
          ...input,
          placeMetadata: {
            ...(input.placeMetadata ?? {}),
            worldSettings: JSON.stringify({ politics: { leanShift: shift } }),
          },
        },
    { modules: [viewsModule] },
  );
  const api = coreAPI(core);
  return [...core.people.values()]
    .filter((person) => person.tier !== "husk")
    .map((person) => viewOf(api, person.id)!.lean);
};

describe(`custom politics in ${place.name} (seed ${place.seed.slice(0, 12)})`, () => {
  it("shifts every resident's lean by the custom setting, within the scale", () => {
    const real = leans();
    const right = leans(0.5);
    let checked = 0;
    for (const [index, lean] of real.entries()) {
      // A lean at the scale's end was clamped there; the shift moves the
      // unclamped one.
      if (lean <= -2 || lean >= 2) {
        expect(right[index]).toBeGreaterThanOrEqual(lean);
        continue;
      }
      expect(right[index]).toBeCloseTo(Math.min(2, lean + 1), 6);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
    expect(leans(0)).toEqual(real);
  });
});
