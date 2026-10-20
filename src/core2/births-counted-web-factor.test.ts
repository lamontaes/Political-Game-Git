/**
 * The counted women's expected births are their state rate times the web's
 * factor for the place: the same town, built twice from one seed, is played
 * forty days with the factor held at 1 and then at one half. The rate that
 * counts the births is the only thing that differs, so the expectation roughly halves.
 * (The played year, with the web's own factors and month records, is in
 * births-counted-web.test.ts.)
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import type * as OutcomeWeb from "./modules/outcome-web";
import type * as OutcomeWebReach from "./outcome-web-reach";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { coreAPI } from "./state";
import { drawPlace } from "../../scripts/core2-year/place";

const held = vi.hoisted(() => ({ factor: 1 }));
vi.mock("./modules/outcome-web", async (original) => ({
  ...(await original<OutcomeWeb>()),
  outcomeWebFactor: () => held.factor,
}));
// Each woman's own factor (her age's share of the web's links) is held too.
vi.mock("./outcome-web-reach", async (original) => ({
  ...(await original<OutcomeWebReach>()),
  webFactorFor: () => held.factor,
}));

const seed = process.env.WEB_BIRTHS_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "web-births-factor");

interface Counts {
  placeId: string;
  month: string;
  webBirths: number;
  webRecordId: string | null;
  expected: { births: number };
}

function firstMonth(factor: number): Counts {
  held.factor = factor;
  const opening = gameStartDate();
  const world = buildBenchWorld(seed, opening, {
    twoLevel: true,
    placeKey: place.key,
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

describe(`counted births take the web's factor (${place.name}, seed ${seed})`, () => {
  it("expects births in proportion to the factor", () => {
    const whole = firstMonth(1);
    const half = firstMonth(0.5);
    expect(half.placeId).toBe(whole.placeId);
    expect(whole.webBirths).toBe(1);
    expect(half.webBirths).toBe(0.5);
    // The monthly share of a yearly rate is slightly concave, so half the rate
    // is a little under half the expectation.
    const ratio = half.expected.births / whole.expected.births;
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThanOrEqual(0.5);
  }, 900_000);
});
