/**
 * A career does not begin at the minimum age (owner's playthrough, Nov 23,
 * row C10: a mayor born in 1984 "elected at 21"). The age a seat's holder
 * first took office at is the minimum plus a spread whose mode is past it, and
 * no sitting holder's recorded service begins before it unless the current
 * term is their first. Read from a played world on a drawn place and from the
 * draw itself across many seats.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import tenure from "./data/offices/tenure.json" with { type: "json" };
import {
  OFFICES_MODULE_ID,
  firstTermAge,
  townSeats,
  type TermRow,
} from "./modules/offices";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "first-term-age-spread");
const parameters = (
  tenure as unknown as { parameters: Record<string, { value: number }> }
).parameters;
const minimum = parameters.minimumAgeAtFirstTerm!.value;
const past = parameters.yearsPastMinimumAtFirstTerm!.value;
console.log(
  `first-term-age-spread: ${place.name} (${place.key}), seed ${seed}`,
);

describe("a career begins at an age spread past the minimum", () => {
  it("draws ages that sit past the minimum, with the table's mean, and few at the floor", () => {
    const ages = Array.from({ length: 4000 }, (_, i) =>
      firstTermAge(seed, `seat:draw:${i}`),
    );
    const mean = ages.reduce((a, b) => a + b, 0) / ages.length;
    expect(Math.min(...ages)).toBeGreaterThanOrEqual(minimum);
    expect(mean).toBeGreaterThan(minimum + past * 0.9);
    expect(mean).toBeLessThan(minimum + past * 1.1);
    // The mode is past the minimum: fewer start within three years of it than
    // within three years of the mean.
    const near = (center: number) =>
      ages.filter((a) => Math.abs(a - center) <= 3).length;
    expect(near(minimum)).toBeLessThan(near(minimum + past));
  });

  it("starts no sitting holder's service before the seat's first-term age, unless the current term is their first", () => {
    const world = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    let careers = 0;
    for (const { seat } of townSeats(api)) {
      const term = (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[]
      )[0];
      if (!term?.serviceStart || term.serviceStart >= term.startDate) continue;
      careers += 1;
      const first =
        Number(term.serviceStart.slice(0, 4)) -
        Number(term.identity.birthDate.slice(0, 4));
      expect(
        first >= Math.floor(firstTermAge(world.core.seed, seat.id)),
        `${seat.id}: service began at ${first}`,
      ).toBe(true);
    }
    expect(careers).toBeGreaterThan(0);
  }, 240_000);
});
