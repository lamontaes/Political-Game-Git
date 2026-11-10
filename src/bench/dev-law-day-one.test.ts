/**
 * A law set with dev mode on the game's first day, before the national economy has opened,
 * is a change the economy answers: the country tier's opening is fitted under the law the
 * world began with, not under a law enacted that morning. Found by the second session's
 * check of the country tier in Willow River, Minnesota (Nov 10, 2026): the nation's income
 * tax set to zero on day one moved national unemployment by a tenth of a point in a year.
 * A random place and seed each run, named in every message (DEV_MODE_SEED replays one).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";
import { coreAPI } from "../core2/state";
import type { MacroMonth } from "../core2/macro-model";

const seed = process.env.DEV_MODE_SEED ?? randomBytes(8).toString("hex");
const DAYS = 95;

/** The nation's latest simulated month after `DAYS` days, with or without the tax ended on day one. */
function latestMonth(endTheTax: boolean) {
  const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
  const core = world.core;
  const dev = new DevMode(
    core,
    world.director,
    new BenchPlayer(core, world.director),
    world.placeId,
  );
  // Day one, before any day has run: the economy has not opened yet.
  if (endTheTax)
    dev.setLaw({ level: "federal", series: "income-tax", value: 0 });
  dev.advance(
    new Date(Date.parse(`${core.date}T00:00:00Z`) + DAYS * 864e5)
      .toISOString()
      .slice(0, 10),
  );
  const months = (
    coreAPI(core)
      .moduleState("macro")
      .table("months")
      .rows() as unknown as MacroMonth[]
  )
    .filter((row) => row.kind === "simulated")
    .sort((a, b) => a.month.localeCompare(b.month));
  return { place: world.place.displayName, month: months.at(-1)! };
}

describe("a law set on the first day", () => {
  it("moves the country: the nation's income tax ended on day one lowers unemployment within three months", () => {
    const ended = latestMonth(true);
    const left = latestMonth(false);
    const where = `${ended.place} (seed ${seed})`;
    process.stderr.write(
      `${where}: ${ended.month.month} unemployment ${ended.month.unemploymentPct.toFixed(3)} with the tax ended on day one, ${left.month.unemploymentPct.toFixed(3)} left alone\n`,
    );
    expect(ended.month.month, where).toBe(left.month.month);
    // More to spend in every state: more work, by well over the screen's rounding.
    expect(
      left.month.unemploymentPct - ended.month.unemploymentPct,
      where,
    ).toBeGreaterThan(0.2);
  }, 900_000);
});
