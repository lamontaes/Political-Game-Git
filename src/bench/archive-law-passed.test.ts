// @vitest-environment node
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import { wordArchiveStory } from "./archive-words";

// A law enacted in the year before day one is told for what it does and where
// (owner, Oct 27: "no record kinds, series names or jurisdiction labels";
// Nov 1: "They need to vary"; the playtest check, C7): the amount it moves from
// and to, or what the policy is for, with the day it starts, chosen by the
// law's own row. A law whose row says too little keeps its name and date.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "archive-law-passed");
const where = `${place.name} (${place.key}), seed ${seed}:0`;
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});

describe(`laws enacted before day one, told for what they do (${where})`, () => {
  const stories = (
    coreAPI(world.core)
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows() as unknown as {
      id: string;
      kind: string;
      date: string;
      facts: Record<string, string>;
    }[]
  ).filter((row) => row.facts.recordKind === "law-enacted");
  const told = stories.map((story) => ({
    story,
    words: wordArchiveStory(world.core, story),
  }));
  const lines = (row: (typeof told)[number]) =>
    [row.words?.headline, ...(row.words?.paragraphs ?? [row.words?.lede])]
      .filter(Boolean)
      .join(" ");

  it("tells most of them by what they change, not only by name and date", () => {
    expect(stories.length, where).toBeGreaterThan(0);
    const more = told.filter((row) => (row.words?.paragraphs?.length ?? 0) > 1);
    for (const row of told.slice(0, 12))
      process.stdout.write(
        `ENACTED ${where}: ${row.words?.headline ?? "(no headline)"} | ${lines(row)}\n`,
      );
    process.stdout.write(
      `ENACTED ${where}: ${more.length} of ${told.length} say more than a name and a day\n`,
    );
    expect(more.length, where).toBeGreaterThan(0);
  });

  it("names no record kind, series, id or ISO date, and cites the law's own record", () => {
    for (const row of told) {
      expect(row.words, row.story.id).not.toBeNull();
      expect(lines(row), row.story.id).not.toMatch(
        /law-enacted|law:|us-policy|\d{4}-\d{2}-\d{2}|US-[A-Z]{2}/,
      );
      expect(row.words!.sourceRecordIds, row.story.id).toContain(row.story.id);
    }
  });

  it("varies: the wordings differ with what moved, an amount up or down, or a policy", () => {
    const ledes = told.map((row) => row.words?.lede ?? "");
    const shapes = new Set(
      ledes.map((text) =>
        /raising|up from/.test(text)
          ? "up"
          : /cutting|lowers|down from/.test(text)
            ? "down"
            : /keeping|keeps/.test(text)
              ? "same"
              : /became law|passed the/.test(text) && !/ on /.test(text)
                ? "policy"
                : "name",
      ),
    );
    process.stdout.write(
      `ENACTED ${where}: shapes ${[...shapes].join(", ")}\n`,
    );
    // A policy law is told with what it is for; an amount with from and to.
    for (const row of told) {
      const text = lines(row);
      if (/ from .+ to /.test(text) || /up from|down from/.test(text))
        expect(text, row.story.id).toMatch(/\d/);
    }
    expect(shapes.size, where).toBeGreaterThan(1);
  });
});
