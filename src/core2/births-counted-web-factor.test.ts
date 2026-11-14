/**
 * The counted women's expected births are their state rate times the web's
 * factor for the place: the same town, built twice from one seed, is played
 * forty days with the factor held at 1 and then at one half. The rate that
 * counts the births is the only thing that differs, so the expectation roughly halves.
 * (The played year, with the web's own factors and month records, is in
 * births-counted-web.test.ts.)
 */
import { describe, expect, it, vi } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { outcomeWebFactor } from "./modules/outcome-web";
import { webFactorFor } from "./outcome-web-reach";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const held = vi.hoisted(() => ({ factor: 1 }));
// Spy mode: the modules load as they are and the two readers are replaced
// where they stand, so a module that reached them through an import cycle
// while the mock was being built still calls the held factor.
vi.mock("./modules/outcome-web", { spy: true });
vi.mock("./outcome-web-reach", { spy: true });
vi.mocked(outcomeWebFactor).mockImplementation(() => held.factor);
// Each woman's own factor (her age's share of the web's links) is held too.
vi.mocked(webFactorFor).mockImplementation(() => held.factor);

/** Pinned: the same places on every run (an env seed replaces it to check others). */
const seed = process.env.WEB_BIRTHS_SEED || "pinned-counted-births-web-factor";
/** Places drawn before the test gives up; one with no birth expected in the first month shows no ratio and is passed over. */
const DRAWS = 8;

interface Counts {
  placeId: string;
  month: string;
  webBirths: number;
  webRecordId: string | null;
  expected: { births: number };
}

function firstMonth(
  worldSeed: string,
  placeKey: string,
  factor: number,
): Counts {
  held.factor = factor;
  const opening = gameStartDate();
  const world = buildBenchWorld(worldSeed, opening, {
    twoLevel: true,
    placeKey,
  });
  advanceCore(world.core, addDays(makeIsoDate(opening), 40));
  const rows = coreAPI(world.core)
    .moduleState(RENEWAL_MODULE_ID)
    .table("counts")
    .rows() as unknown as Counts[];
  const row = rows.find((entry) => entry.webRecordId);
  expect(row, "a counts row that read the web").toBeTruthy();
  return row!;
}

describe(`counted births take the web's factor (seed ${seed})`, () => {
  it("expects births in proportion to the factor", () => {
    const passed: string[] = [];
    for (let draw = 0; draw < DRAWS; draw++) {
      const place = drawPlace(`${seed}-${draw}`, "web-births-factor");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const whole = firstMonth(place.seed, place.key, 1);
      if (!(whole.expected.births > 0)) {
        passed.push(`${where}: no birth expected in the first month`);
        continue;
      }
      const half = firstMonth(place.seed, place.key, 0.5);
      expect(half.placeId, where).toBe(whole.placeId);
      expect(whole.webBirths, where).toBe(1);
      expect(half.webBirths, where).toBe(0.5);
      // The monthly share of a yearly rate is slightly concave, so half the rate
      // is a little under half the expectation.
      const ratio = half.expected.births / whole.expected.births;
      expect(ratio, where).toBeGreaterThan(0.45);
      expect(ratio, where).toBeLessThanOrEqual(0.5);
      process.stdout.write(
        `WEB BIRTHS ${where}: ratio ${ratio.toFixed(3)}; passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(`no drawn place expected a birth: ${passed.join("; ")}`);
  }, 900_000);
});
