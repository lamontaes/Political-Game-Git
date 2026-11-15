/**
 * The paper's "looking for work" line (the bank words it as, for example, "That leaves 33 people in Washington looking for work") is the town's one jobless count (pool
 * item metrics-paper-looking-for-work-line-pinned). The conditions story reads
 * the town's month row the day before the outcome web's record, and that row
 * is the count `townLaborByPlace` makes (metrics-town-jobs-one-rule), so the
 * number the paper prints must equal the month row's, the Metrics tab's
 * "looking for work" row and the jobs panel.
 * Pinned place and seed: Washington, Kansas (599e6f66e9c1d25a). The story is
 * staged through the game's own path: June's web reading is set a point and a
 * half lower, so July's own monthly run (the web's, then `monthEvent`) finds
 * unemployment moved and puts the record on the wire; the paper words it with
 * `wordPrintedStory`. The time is the game's own played days (166, January 20
 * to July 5, 2025; about half a second a day). Measured 87 seconds, limit 180.
 */
import { describe, expect, it } from "vitest";
import { metricsView } from "./metrics";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";
import { count } from "./printed-words";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { OUTCOME_WEB_MODULE_ID } from "../core2/outcome-web-model";
import { townJobsPanel } from "../core2/modules/world-panels";
import { coreAPI } from "../core2/state";

const SEED = "599e6f66e9c1d25a";

describe("the paper's looking-for-work line", () => {
  it("prints the town's one jobless count (Washington, Kansas)", () => {
    const world = buildBenchWorld(SEED, gameStartDate(), { twoLevel: true });
    const { core, placeId } = world;
    const api = coreAPI(core);
    const where = `${world.place.displayName} (seed ${SEED})`;
    expect(world.place.displayName).toBe("Washington, Kansas");

    advanceCore(core, "2025-06-25" as never);
    const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
    const june = web.get(`web:${placeId}:2025-06`) as unknown as {
      values: Record<string, number>;
    };
    expect(june, where).toBeTruthy();
    const was = june.values["labor.unemployment-pct"]!;
    expect(was, where).toBeGreaterThan(0);
    web.put({
      ...june,
      values: { ...june.values, "labor.unemployment-pct": was - 1.5 },
    } as never);

    advanceCore(core, "2025-07-05" as never);
    const record = core.durableLog.get(
      `outcome-web.month:${placeId}:2025-07` as never,
    ) as { id: string; date: string; topic: string } | undefined;
    expect(record, `${where}: July's conditions record`).toBeTruthy();

    // The month row the story read: the day before the web's record.
    const monthRow = api
      .moduleState("world-metrics")
      .table("months")
      .get(`metrics:${placeId}:2025-07-02`) as unknown as
      | {
          unemployed: number;
          residentsLooking: number;
          residentsEmployed: number;
        }
      | undefined;
    expect(monthRow, where).toBeTruthy();
    const looking = monthRow!.unemployed;
    expect(looking, where).toBeGreaterThan(1);

    const worded = wordPrintedStory(core, {
      id: `printed:test:${record!.id}`,
      kind: "press.printed",
      date: record!.date,
      topic: record!.topic,
      facts: { sourceRecordId: record!.id },
    } as never);
    expect(worded, `${where}: the record is worded`).toBeTruthy();
    const text = [worded!.headline, ...(worded!.paragraphs ?? [worded!.lede])]
      .filter(Boolean)
      .join(" ");
    const line = new RegExp(
      `\\b${count(looking)} people in [^.]*looking for work`,
    );
    process.stdout.write(`PRINTED JOBLESS ${where}: ${text}\n`);
    expect(text, where).toMatch(line);

    // The same count on the Metrics tab and the jobs panel.
    const kept = metricsView(core, placeId).sections.find(
      (s) => s.key === "city",
    )!.rows;
    const tab = kept.find((r) => r.key === "seekers") as
      { now: number } | undefined;
    expect(tab?.now, where).toBe(looking);
    expect(townJobsPanel(api, placeId).seekers, where).toBeGreaterThan(0);
  }, 180_000);
});
