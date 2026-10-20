/**
 * A job a saved agreement names as its provider's qualification is no longer
 * held in place (pool: world-agreements-re-resolve-worker). In a played year,
 * named jobs end like any other (a layoff, a quit, a move) and the world keeps
 * running: the agreement follows the supplier's current staff at its next
 * payment instead of stopping the game.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

function jobIdsNamed(value: unknown, ids: Set<string>): void {
  if (typeof value === "string") {
    if (!value.includes("jobIds")) return;
    try {
      jobIdsNamed(JSON.parse(value), ids);
    } catch {
      return;
    }
  } else if (Array.isArray(value)) {
    for (const item of value) jobIdsNamed(item, ids);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "jobIds" && Array.isArray(item))
        for (const id of item)
          if (typeof id === "string") ids.add(id);
          else jobIdsNamed(item, ids);
    }
  }
}

it("runs a played year with no job held in place by an agreement, and records how many agreements named one", () => {
  const seed = process.env.AGREE_SEED ?? randomBytes(8).toString("hex");
  const place = drawPlace(seed, "agreement-jobs-free");
  const where = `${place.name} [${place.key}], seed ${seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    placeKey: place.key,
  });
  const named = new Set<string>();
  jobIdsNamed(Object.values(core.placeMetadata ?? {}), named);
  for (const organization of core.organizations.values())
    jobIdsNamed(Object.values(organization.governmentFacts ?? {}), named);
  const start = core.date;
  try {
    advanceCore(core, addDays(makeIsoDate(start), 366));
  } catch (error) {
    throw new Error(`${where}: ${(error as Error).message}`);
  }
  const ended = [...named].filter((id) => core.jobs.get(id)?.endsAt);
  // The year ran to its end with every named job free to end (no stop at a payment).
  expect(
    core.date > start,
    `${where}: ${named.size} named, ${ended.length} ended`,
  ).toBe(true);
}, 1_500_000);
