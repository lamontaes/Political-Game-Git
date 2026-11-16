/**
 * The paper weighs a business closing and a layoff by the share of the
 * town's jobs it takes (pool item play-local-layoffs-on-screen). Pinned
 * places and seeds (the industry traces' own): Thief River Falls, Minnesota
 * (2764570, seed ind-2764570), whose one wholesaler closed on June 1, 2025
 * with most of the town's jobs, and Center, North Dakota (3813180, seed
 * ind-3813180), whose county utility laid off in March, April and May 2025
 * and closed. Nothing is staged: the game's own days play. Measured
 * 160 seconds at Thief River Falls and 110 at Center, limit 300 each.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { setBookkeeping } from "../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import { PRESS_MODULE_ID } from "../core2/modules/press";
import type { DeskWeighing, PrintedStory } from "../core2/press-desk";

function played(
  place: string,
  until: string,
  dev: boolean,
  seed = `ind-${place}`,
) {
  setBookkeeping(dev);
  const world = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place,
  });
  advanceCore(world.core, until as never);
  const press = coreAPI(world.core).moduleState(PRESS_MODULE_ID);
  return {
    where: `${world.place.displayName} (seed ${seed})`,
    stories: press.table("stories").rows() as unknown as PrintedStory[],
    weighings: press.table("weighings").rows() as unknown as DeskWeighing[],
  };
}

describe("the paper weighs a closing and a layoff by the town's jobs", () => {
  it("prints the Thief River Falls wholesaler's closing in the town's paper", () => {
    const { where, stories } = played("2764570", "2025-07-15", false);
    const closing = stories.filter((s) =>
      s.wireId.startsWith("employer-closed:"),
    );
    process.stdout.write(
      `PRINTED ${where}: ${closing.length} closing stories\n`,
    );
    expect(closing.length, `${where}: the closing was printed`).toBeGreaterThan(
      0,
    );
    // One story per closing, never the owner's twin beside it.
    expect(
      stories.filter((s) => s.wireId.startsWith("event:business.closed:")),
      `${where}: no twin story`,
    ).toHaveLength(0);
  }, 300_000);

  it("weighs each of Center's three layoff months by its share", () => {
    const { where, stories, weighings } = played("3813180", "2025-06-15", true);
    const layoffs = weighings.filter(
      (w) => w.kind === "business.staff-reduced",
    );
    const months = new Set(layoffs.map((w) => w.wireId.slice(-10, -3)));
    process.stdout.write(
      `WEIGHED ${where}: layoff months ${[...months].sort().join(", ")}\n`,
    );
    for (const month of ["2025-03", "2025-04", "2025-05"])
      expect(months.has(month), `${where}: ${month} was weighed`).toBe(true);
    for (const w of layoffs)
      expect(
        w.reached,
        `${where}: ${w.wireId} reaches some followers`,
      ).toBeGreaterThan(0);
    expect(
      stories.some((s) => s.kind === "business.staff-reduced"),
      `${where}: a layoff was printed`,
    ).toBe(true);
  }, 300_000);

  it("weighs a national disaster by the share of the nation's people it struck (Wilmont, Minnesota)", () => {
    const { where, stories, weighings } = played(
      "2770582",
      "2025-04-01",
      true,
      "2cb5aaf1",
    );
    const disasters = weighings.filter((w) => w.kind === "national.disaster");
    const printed = stories.filter((s) => s.kind === "national.disaster");
    process.stdout.write(
      `DISASTERS ${where}: ${printed.length} printed of ${new Set(disasters.map((w) => w.wireId)).size} weighed\n`,
    );
    expect(printed.length, `${where}: a disaster was printed`).toBeGreaterThan(
      0,
    );
    // The size is the people the declaration names, so disasters differ.
    expect(
      new Set(disasters.map((w) => Math.round(w.reached * 1000))).size,
      `${where}: disasters reach different shares`,
    ).toBeGreaterThan(1);
  }, 300_000);
});
