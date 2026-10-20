import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { gameStartDate } from "../core2/game-start";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { wordArchiveStory } from "./archive-words";
import { buildBenchWorld } from "./world";

// The year-before-day-one stories the press archived are worded by the
// English engine from their records (bench world, a seed nobody chose).
const seed = process.env.ARCHIVE_WORDS_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });

describe(`archive news words (${world.place.key}, seed ${seed})`, () => {
  it("words an archived election result from its winner's record", () => {
    const stories = coreAPI(world.core)
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows() as unknown as {
      id: string;
      kind: string;
      date: string;
      facts: Record<string, string>;
    }[];
    const results = stories.filter(
      (row) => row.facts.recordKind === "election-result",
    );
    expect(results.length).toBeGreaterThan(0);
    let officeWorded = 0;
    for (const story of results) {
      const worded = wordArchiveStory(world.core, story);
      expect(worded, story.id).not.toBeNull();
      const winner = world.core.people.get(story.facts.winnerId!)!;
      expect(worded!.lede ?? worded!.headline).toContain(winner.familyName);
      // Said with the office the race was for when its record names one, so a
      // reader is told which election it was.
      const officeId = story.facts.officeId;
      const office = officeId
        ? (
            coreAPI(world.core)
              .moduleState(OFFICES_MODULE_ID)
              .table("offices")
              .get(officeId) as { title?: string } | undefined
          )?.title
        : undefined;
      if (office) officeWorded += worded!.lede?.includes(office) ? 1 : 0;
      expect(worded!.sourceRecordIds).toContain(story.id);
    }
    // Some of the results are said with their office (the bank keeps a plain
    // line too, so not every one is).
    console.log(
      `archive-words: ${officeWorded} of ${results.length} results name the office (${world.place.key}, seed ${seed})`,
    );
    expect(officeWorded).toBeGreaterThan(0);
  }, 120_000);
});

describe(`archive law news words (${world.place.key}, seed ${seed})`, () => {
  it("words an archived law that took effect, naming the law and the date", () => {
    const stories = coreAPI(world.core)
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows() as unknown as {
      id: string;
      kind: string;
      date: string;
      facts: Record<string, string>;
    }[];
    const laws = stories.filter(
      (row) => row.facts.recordKind === "law-took-effect",
    );
    expect(laws.length).toBeGreaterThan(0);
    const worded = laws
      .map((story) => ({ story, words: wordArchiveStory(world.core, story) }))
      .filter((row) => row.words);
    expect(worded.length, "a law has a name on the catalog").toBeGreaterThan(0);
    for (const { story, words } of worded) {
      expect(words!.lede).toMatch(
        /^.+ took effect on [A-Z][a-z]+ \d+, \d{4}\.$/,
      );
      expect(words!.sourceRecordIds).toContain(story.id);
    }
  }, 120_000);
});
