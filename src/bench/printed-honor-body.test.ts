/**
 * The town's spelling bee is a story that opens (brief M, owner, Nov 14).
 * In a played year of two pinned drawn places the paper prints the bee with
 * a body: the lede, the school the honor row names and what comes next, each
 * from the honor's own record. The winners in these places are counted
 * students, so the story is unnamed; the named wording is proved by facts in
 * `src/english/news-honor-story.test.ts`. Places and seeds are named.
 */
import { appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";

for (const seed of ["h1", "h3"])
  it(`the spelling bee prints with a body (seed ${seed})`, () => {
    const place = drawPlace(seed, "honor-body");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    setBookkeeping(false);
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    const stories = (
      coreAPI(core).moduleState("news").table("stories").rows() as unknown as {
        id: string;
        kind: string;
        facts: Record<string, unknown>;
      }[]
    ).filter(
      (story) =>
        story.kind === "press.printed" &&
        String(story.facts.sourceRecordId).includes("spelling-bee-local"),
    );
    expect(stories.length, `${where}: no bee printed`).toBeGreaterThan(0);
    for (const story of stories) {
      const worded = wordPrintedStory(core, story)!;
      expect(worded.brief, where).toBe(true);
      const body = worded.paragraphs ?? [];
      expect(body.length, `${where}: ${story.id}`).toBeGreaterThanOrEqual(2);
      expect(body.join(" "), where).toMatch(/School|school/);
      expect(body.join(" "), where).toMatch(/regional bee/);
      appendFileSync(
        path.join(tmpdir(), "printed-honor-body-proof.txt"),
        `${where}: ${story.id}: ${worded.headline} | ${body.join(" ")}\n`,
      );
    }
  }, 600_000);
