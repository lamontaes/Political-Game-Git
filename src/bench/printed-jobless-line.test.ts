/**
 * The paper's "looking for work" line is the town's one jobless count (pool
 * item metrics-paper-looking-for-work-line-pinned). The conditions story reads
 * the town's month row the day before the outcome web's record, and that row
 * is the count `townLaborByPlace` makes (metrics-town-jobs-one-rule), so the
 * number the paper prints must equal that month row's and, for the latest
 * month, the Metrics tab's "looking for work" row.
 * Pinned place and seed: Washington, Kansas (599e6f66e9c1d25a). Nothing is
 * staged or set by hand: the game's own monthly runs write each month's
 * conditions record (the town's unemployment moves every month there), and
 * the paper words each with `wordPrintedStory`. For example, "That leaves 33
 * people in Washington looking for work." The time is the game's own played
 * days (136, January 20 to June 5, 2025; about half a second a day). Measured 75 seconds, limit 150.
 */
import { describe, expect, it } from "vitest";
import { metricsView } from "./metrics";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";
import { count } from "./printed-words";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";

const SEED = "599e6f66e9c1d25a";
const MONTHS = ["2025-02", "2025-03", "2025-04", "2025-05", "2025-06"];

describe("the paper's looking-for-work line", () => {
  it("prints each month's one jobless count (Washington, Kansas)", () => {
    const world = buildBenchWorld(SEED, gameStartDate(), { twoLevel: true });
    const { core, placeId } = world;
    const api = coreAPI(core);
    const where = `${world.place.displayName} (seed ${SEED})`;
    expect(world.place.displayName).toBe("Washington, Kansas");
    advanceCore(core, "2025-06-05" as never);

    const months = api.moduleState("world-metrics").table("months");
    let told = 0;
    let lastLooking = 0;
    for (const month of MONTHS) {
      const record = core.durableLog.get(
        `outcome-web.month:${placeId}:${month}` as never,
      ) as { id: string; date: string; topic: string } | undefined;
      expect(record, `${where}: ${month}'s conditions record`).toBeTruthy();
      // The month row the story read: the day before the web's record.
      const row = months.get(`metrics:${placeId}:${month}-02`) as unknown as
        { unemployed: number } | undefined;
      expect(row, `${where}: ${month}'s month row`).toBeTruthy();
      const worded = wordPrintedStory(core, {
        id: `printed:test:${record!.id}`,
        kind: "press.printed",
        date: record!.date,
        topic: record!.topic,
        facts: { sourceRecordId: record!.id },
      } as never);
      expect(worded, `${where}: ${month} is worded`).toBeTruthy();
      const text = [worded!.headline, ...(worded!.paragraphs ?? [worded!.lede])]
        .filter(Boolean)
        .join(" ");
      // A month the paper tells the jobless in (the rate moved by more than one person's job).
      if (!/looking for work/.test(text)) continue;
      expect(text, `${where}: ${month}`).toMatch(
        new RegExp(
          `\\b${count(row!.unemployed)} people in [^.]*looking for work`,
        ),
      );
      told += 1;
      lastLooking = row!.unemployed;
    }
    process.stdout.write(
      `PRINTED JOBLESS ${where}: ${told} of ${MONTHS.length} months\n`,
    );
    expect(
      told,
      `${where}: months that tell the jobless`,
    ).toBeGreaterThanOrEqual(3);

    // The latest month's same count on the Metrics tab.
    const june = months.get(`metrics:${placeId}:2025-06-02`) as unknown as {
      unemployed: number;
    };
    const tab = metricsView(core, placeId)
      .sections.find((s) => s.key === "city")!
      .rows.find((r) => r.key === "seekers") as { now: number } | undefined;
    expect(tab?.now, where).toBe(june.unemployed);
    expect(lastLooking, where).toBeGreaterThan(1);
  }, 150_000);
});
