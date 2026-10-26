/**
 * The Politics-news sheet shows why an employer cut staff (pool item
 * play-staffing-news-sales-costs): the employer, the jobs lost, its sales and
 * its costs, read from the public record's own facts. A year is played in
 * places drawn from all 56 until a layoff has been printed; set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { buildBenchWorld } from "./world";
import { newsItems } from "./calendar";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a layoff in the news carries the employer, the jobs lost, its sales and its costs", () => {
  const seen: string[] = [];
  for (let draw = 0; draw < 10; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "staffing-news");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    advanceCore(core, addDays(makeIsoDate(gameStartDate()), 365));
    const rows = newsItems(core).filter((row) => row.staffing);
    seen.push(`${place.name}: ${rows.length}`);
    if (!rows.length) continue;
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    for (const row of rows) {
      const here = `${where}: ${row.id}`;
      expect(row.kind, here).toBe("business.staff-reduced");
      expect(row.staffing!.employer, here).toBe(
        core.organizations.get(String(row.facts.organizationId))!.name,
      );
      expect(row.staffing!.jobsLost, here).toBeGreaterThan(0);
      expect(row.staffing!.jobsLost, here).toBe(Number(row.facts.jobsLost));
    }
    // The books that explain it are on the sheet when the month was traded.
    expect(
      rows.some(
        (row) =>
          row.staffing!.salesMinor !== undefined &&
          row.staffing!.costsMinor !== undefined,
      ),
      `${where}: a layoff with its sales and costs`,
    ).toBe(true);
    return;
  }
  throw new Error(
    `no layoff reached the news in 10 places: ${seen.join("; ")}`,
  );
}, 3_600_000);
