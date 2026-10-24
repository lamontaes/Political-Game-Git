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
/**
 * Draws before the test gives up. A town whose own counts expect too few
 * deaths is passed over and named; a seed whose first six towns were all that
 * small (ca31b9e4225f7b58) still finds one well inside this.
 */
const DRAWS = 24;
/** A town whose tables expect fewer deaths than this in four months is too small to compare. */
const SMALLEST = 10;
/**
 * Deaths follow onsets by weeks to months, so the first four months run
 * under the tables': the check expects at least this share of them (measured
 * Oct 24, 2026: 66 percent in Blair, Nebraska and 70 percent in Garden City,
 * Idaho).
 */
const FIRST_MONTHS_SHARE = 0.5;
/**
 * How many standard deviations of a Poisson count below that share still
 * pass: a small town's few deaths either way pass, and none at all fails.
 */
const SIGMAS = 3;

interface CountsRow {
  readonly deaths: readonly string[];
  readonly openingIll: readonly string[];
  readonly expected: { readonly deaths: number };
}

it("illnesses under way at the opening are booked and counted people die from the first months", () => {
  let proof: string | undefined;
  // The towns passed over, each with what its own counts expected.
  const passed: string[] = [];
  // The renewal engine keeps its monthly counts only under bookkeeping
  // (src/core2/births-counted.ts:667), so the worlds run with it on.
  const was = setBookkeeping(true);
  try {
    for (let draw = 0; draw < DRAWS && !proof; draw++) {
      const place = drawPlace(`${seed}-${draw}`, "counted-deaths-opening");
      const where = `seed ${place.seed}, ${place.name} (${place.key})`;
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
      if (expected < SMALLEST) {
        passed.push(`${place.name} (${place.key}), ${expected.toFixed(1)}`);
        continue;
      }
      const deaths = rows.reduce((n, row) => n + row.deaths.length, 0);
      const opening = rows.reduce((n, row) => n + row.openingIll.length, 0);
      expect(
        opening,
        `${where}: illnesses under way at the opening`,
      ).toBeGreaterThan(0);
      const mean = expected * FIRST_MONTHS_SHARE;
      const floor = Math.max(1, mean - SIGMAS * Math.sqrt(mean));
      expect(
        deaths,
        `${where}: ${deaths} died, ${expected.toFixed(1)} expected, at least ${floor.toFixed(1)} needed`,
      ).toBeGreaterThanOrEqual(floor);
      proof = `${where}: ${opening} illnesses under way booked at the opening; ${deaths} counted people died in four months against ${expected.toFixed(1)} expected; passed over, expecting fewer than ${SMALLEST}: ${passed.join("; ") || "none"}`;
    }
  } finally {
    setBookkeeping(was);
  }
  expect(
    proof,
    `none of ${DRAWS} drawn places (seed ${seed}) expected ${SMALLEST} counted deaths in four months: ${passed.join("; ")}`,
  ).toBeDefined();
  console.log(`DEATHS ${proof}`);
}, 3_600_000);
