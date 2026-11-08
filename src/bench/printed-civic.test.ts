import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { OUTCOME_WEB_MODULE_ID } from "../core2/outcome-web-model";
import { TERM_MEASURES } from "../core2/term-read";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";

// Strikes, protests, rallies and a governor's or mayor's address are stories
// the press can tell in full (owner, Nov 8: "News stories are written out in
// full from the records of what happened"). One world drawn from all 56 places
// on a seed the builder did not choose; the web's rows are written the way the
// web writes them so the town's term reads badly, the public-action engine
// and the yearly addresses run through their own calendars, and each record
// is put on the wire and worded as the press would print it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DEVELOPER = /[{}_]|\b[a-z]+:[a-z]|\b(?:civic|address)\.[a-z]/;

describe("civic records as news", () => {
  it("words a protest, a rally and the yearly addresses with a headline and a lede that cite their records", () => {
    setBookkeeping(false);
    const place = drawPlace(`${seed}:0`, "printed-civic");
    const where = `${place.name} (${place.key}), seed ${seed}:0`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    const api = coreAPI(core);
    const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
    const change: Record<string, number> = {
      "housing.rent": 0.3,
      "health.": -0.2,
      "env.": 0.3,
    };
    for (const [at, month] of [
      "2025-01",
      "2026-01",
      "2026-02",
      "2026-03",
    ].entries()) {
      const values: Record<string, number> = {};
      for (const key of TERM_MEASURES) {
        const factor = Object.entries(change).find(([prefix]) =>
          key.startsWith(prefix),
        )?.[1];
        values[key] = 100 * (1 + (factor ?? 0) * (Math.max(at - 1, 0) / 2));
      }
      web.put({
        id: `web:${world.placeId}:${month}`,
        placeId: world.placeId,
        month,
        date: `${month}-02`,
        values,
        bases: values,
        effects: {},
        engineSources: {},
      } as never);
    }
    advanceCore(core, "2025-07-06");
    const records = [...core.durableLog.values()].filter((row) =>
      /^(?:civic\.|governor\.address|mayor\.address)/.test(row.kind),
    );
    expect(records.length, where).toBeGreaterThan(0);
    const printed = new Set(
      (
        api.moduleState("news").table("stories").rows() as unknown as {
          kind: string;
          facts: Record<string, unknown>;
        }[]
      )
        .filter((row) => row.kind === "press.printed")
        .map((row) => String(row.facts.sourceRecordId)),
    );
    const told: string[] = [];
    for (const record of records) {
      const worded = wordPrintedStory(core, {
        id: `printed:test:${record.id}`,
        kind: "press.printed",
        date: record.date,
        topic: record.topic,
        facts: { sourceRecordId: record.id },
      } as never);
      expect(worded, `${where}: ${record.id} is not worded`).toBeTruthy();
      for (const text of [worded!.headline, worded!.lede])
        if (text) expect(text, record.id).not.toMatch(DEVELOPER);
      expect(worded!.sourceRecordIds, record.id).toContain(record.id);
      told.push(`${record.kind}: ${worded!.headline} / ${worded!.lede}`);
    }
    const inPaper = records.filter((row) => printed.has(row.id));
    process.stdout.write(
      `PRINTED CIVIC ${where}: ${inPaper.length} of ${records.length} in the paper\n  ${told.join("\n  ")}\n`,
    );
  }, 300_000);
});
