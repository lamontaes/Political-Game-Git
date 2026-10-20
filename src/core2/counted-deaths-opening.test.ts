/**
 * The counted dead in a town's first months (pool item
 * core-counted-deaths-opening-illness-nan): the illnesses already under way
 * when a town opens are found by walking the months back from the opening,
 * and each past month's death chance summed over everyone. A baby born within
 * those months made the sum not a number, so no illness under way was booked
 * and nobody counted died until the first new illnesses ran their course, nine
 * months in. In a drawn place the illnesses under way are booked at the
 * opening and the counted dead of the first four months are the order of what
 * the tables expect.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;
/** A town whose tables expect fewer deaths than this in four months is too small to compare. */
const SMALLEST = 10;

interface CountsRow {
  readonly deaths: readonly string[];
  readonly openingIll: readonly string[];
  readonly expected: { readonly deaths: number };
}

it("illnesses under way at the opening are booked and counted people die from the first months", () => {
  let proof: string | undefined;
  for (let draw = 0; draw < DRAWS && !proof; draw++) {
    const place = drawPlace(`${seed}-${draw}`, "counted-deaths-opening");
    const where = `GOLDEN_PATH_SEED ${seed} draw ${draw} (place seed ${place.seed}), ${place.name} (${place.key})`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 125));
    const rows = coreAPI(core)
      .moduleState("core2-renewal-v1")
      .table("counts")
      .rows() as unknown as CountsRow[];
    const expected = rows.reduce((n, row) => n + row.expected.deaths, 0);
    if (expected < SMALLEST) continue;
    const deaths = rows.reduce((n, row) => n + row.deaths.length, 0);
    const opening = rows.reduce((n, row) => n + row.openingIll.length, 0);
    expect(
      opening,
      `${where}: illnesses under way at the opening`,
    ).toBeGreaterThan(0);
    // Deaths follow onsets by weeks to months, so the first four months run a little under the tables'.
    expect(
      deaths,
      `${where}: ${deaths} died, ${expected.toFixed(1)} expected`,
    ).toBeGreaterThanOrEqual(expected * 0.5);
    proof = `${where}: ${opening} illnesses under way booked at the opening; ${deaths} counted people died in four months against ${expected.toFixed(1)} expected`;
  }
  expect(
    proof,
    `none of ${DRAWS} drawn places (seed ${seed}) expected ${SMALLEST} counted deaths in four months`,
  ).toBeDefined();
  console.log(`DEATHS ${proof}`);
}, 3_600_000);
