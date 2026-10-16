/**
 * The bench serves every world panel (pool item play-world-panels-served): in
 * a random place from all 56, the town as the player gets it, played a year.
 * The new homes, what the laws cost, unemployment claims, the central bank's
 * seats and the town's monthly numbers come back beside the older panels, as
 * record data, and the route that serves them is registered.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { worldPanels } from "./economy";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("serves the building, law-cost, benefit, board and metrics panels", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "bench-world-panels");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core, placeId } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 120));
  const panels = worldPanels(core, placeId);
  for (const key of [
    "national",
    "region",
    "turnover",
    "bank",
    "evictions",
    "owners",
    "building",
    "lawCosts",
    "benefits",
    "board",
    "metrics",
  ])
    expect(panels, `${where}: panel ${key}`).toHaveProperty(key);
  expect(Array.isArray(panels.benefits), where).toBe(true);
  expect(Array.isArray(panels.board), where).toBe(true);
  expect(Array.isArray(panels.metrics), where).toBe(true);
  expect(panels.building, where).toMatchObject({
    stock: expect.any(Array),
    projects: expect.any(Array),
    affordable: expect.any(Array),
  });
  expect(panels.lawCosts, where).toMatchObject({
    priceRules: expect.any(Array),
    assessments: expect.any(Array),
    counsel: expect.any(Array),
  });
  // The played town has a central bank board and a month of its own numbers.
  expect(panels.board.length, where).toBeGreaterThan(0);
  expect(panels.metrics.length, where).toBeGreaterThan(0);
  // The route that serves them is registered on the bench handler.
  expect(readFileSync("src/bench/handler.ts", "utf8")).toContain(
    '"/api/world-panels"',
  );
}, 600_000);
