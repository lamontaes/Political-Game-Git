import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import bases from "../../data/research/money/public-budget-bases.json" with { type: "json" };
import federal from "../../data/research/money/federal-budget-fy2025.json" with { type: "json" };
import { gameStartDate } from "../core2/game-start";
import { budgetView, lineName } from "./budget";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "budget-line-names");

describe("every budget line has the name its source table gives it", () => {
  it("lists any line key in the source data with no name", () => {
    const keys = new Set<string>([
      ...Object.keys(federal.receipts),
      ...Object.keys(federal.outlays),
    ]);
    for (const row of Object.values(
      bases.places as Record<
        string,
        Record<
          string,
          { revenue: Record<string, number>; spending: Record<string, number> }
        >
      >,
    ))
      for (const level of ["state", "local"])
        for (const part of ["revenue", "spending"] as const)
          for (const key of Object.keys(row[level]?.[part] ?? {}))
            keys.add(key);
    expect([...keys].filter((key) => !lineName(key))).toEqual([]);
  });
  it(`names every line the screen shows for the town (${place.name}, seed ${seed})`, () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const view = budgetView(world.core, world.playerId!);
    const shown = view.governments.flatMap((gov) => [
      ...(gov.latest?.revenue ?? []),
      ...(gov.latest?.spending ?? []),
    ]);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.filter((row) => !row.name).map((row) => row.line)).toEqual([]);
  }, 600_000);
});
