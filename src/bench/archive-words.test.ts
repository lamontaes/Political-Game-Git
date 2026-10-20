import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { gameStartDate } from "../core2/game-start";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import { wordArchiveStory } from "./archive-words";
import { drawPlace } from "../../scripts/core2-year/place";
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
    for (const story of results) {
      const worded = wordArchiveStory(world.core, story);
      expect(worded, story.id).not.toBeNull();
      const winner = world.core.people.get(story.facts.winnerId!)!;
      expect(worded!.lede ?? worded!.headline).toContain(winner.familyName);
      expect(worded!.sourceRecordIds).toContain(story.id);
    }
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

describe("archive death news words", () => {
  it("words a parent's death in the year before day one, naming them and the date", () => {
    // Some places have no parent who died that year: draw places (bounded) until
    // one does, and require at least one so the test cannot pass unchecked.
    let checked = 0;
    for (let draw = 0; draw < 8 && checked === 0; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "archive-death-words");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const stories = coreAPI(core)
        .moduleState(NEWS_MODULE_ID)
        .table("stories")
        .rows() as unknown as {
        id: string;
        kind: string;
        date: string;
        facts: Record<string, string>;
      }[];
      for (const story of stories.filter(
        (row) => row.facts.recordKind === "parent-died",
      )) {
        const words = wordArchiveStory(core, story);
        expect(words, `${where}: ${story.id}`).not.toBeNull();
        const name = `${story.facts.givenName} ${story.facts.familyName}`;
        const text = `${words!.headline ?? ""} ${words!.lede ?? ""}`;
        expect(text, `${where}: names the parent`).toContain(name);
        expect(text, `${where}: gives the date`).toMatch(
          /[A-Z][a-z]+ \d+, \d{4}/,
        );
        expect(words!.sourceRecordIds).toContain(story.id);
        checked += 1;
      }
    }
    expect(
      checked,
      `no parent died in 8 drawn places; seed ${seed}`,
    ).toBeGreaterThan(0);
  }, 600_000);
});

describe(`archive budget news words (${world.place.key}, seed ${seed})`, () => {
  it("words an adopted budget by its largest spending line", () => {
    const stories = coreAPI(world.core)
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows() as unknown as {
      id: string;
      kind: string;
      date: string;
      facts: Record<string, string>;
    }[];
    for (const story of stories.filter(
      (row) => row.facts.recordKind === "budget-adopted",
    )) {
      const words = wordArchiveStory(world.core, story);
      expect(words, story.id).not.toBeNull();
      expect(words!.lede).toMatch(/^The budget includes \$[\d,]+ for .+\.$/);
    }
  }, 120_000);
});
