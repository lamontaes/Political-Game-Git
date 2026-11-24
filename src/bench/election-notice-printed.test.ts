/**
 * The paper prints the clerk's notice of election as a brief: the place, the
 * day and every office on that ballot, worded from the owner-graded notice
 * (data/english/parts/notice.json) and the contests the notice record names.
 * One place pinned here, two months around the 2026 general election.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import { wordPrintedStory } from "./archive-words";
import { buildBenchWorld } from "./world";

const SEED = "election-notice-pinned-1";
const OPENING = "2026-09-20";

describe("the printed notice of election", () => {
  it("names the day and every office on the ballot, in the owner's graded words", () => {
    setBookkeeping(false);
    const place = drawPlace(SEED, "election-notice");
    const world = buildBenchWorld(place.seed, OPENING, {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    for (let day = 0; day < 75; day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const stories = (
      api.moduleState("news").table("stories").rows() as unknown as {
        id: string;
        kind: string;
        date: string;
        facts: Record<string, unknown>;
      }[]
    ).filter(
      (story) =>
        story.kind === "press.printed" &&
        String(story.facts.sourceRecordId).startsWith("election-notice:"),
    );
    expect(stories.length, `${place.name}: a notice printed`).toBeGreaterThan(
      0,
    );
    // A legal notice runs once, in the town's paper of record.
    const records = stories.map((story) => story.facts.sourceRecordId);
    expect(new Set(records).size, `${place.name}: one paper`).toBe(
      records.length,
    );
    const contests = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
    for (const story of stories) {
      const worded = wordPrintedStory(core, story)!;
      expect(worded, story.id).toBeTruthy();
      expect(worded.headline).toBe("Notice of election");
      expect(worded.lede).toMatch(
        /^NOTICE IS HEREBY GIVEN that an election will be held in .+ on .+ for the following Officers: .+\.$/,
      );
      const day = String(story.facts.sourceRecordId).split(":").at(-1)!;
      for (const title of new Set(
        contests.filter((c) => c.electionDate === day).map((c) => c.title),
      ))
        expect(worded.lede, `${title} on ${day}`).toContain(title);
      expect(worded.paragraphs, story.id).toBeUndefined();
      console.log(`election-notice printed: ${place.name}, ${worded.lede}`);
    }
  }, 600_000);
});
