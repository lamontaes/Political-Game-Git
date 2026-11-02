/**
 * The paper's law and budget items read as news (owner's Nov 1 playtest: the
 * foot of the first paper was bare lines such as "State unemployment tax rate
 * took effect on January 1, 2025.", and "spend $7145 billion" for a federal
 * budget months old). In a world drawn from all 56 places:
 *
 * - every law the press archived from the year before day one changed what
 *   stood at its level, and its story names the level, the change (from and
 *   to) and whom it reaches;
 * - the federal budget's sums are said in trillions, never thousands of
 *   billions;
 * - the opening paper carries no law or budget past the days a story stays
 *   news.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import billNames from "../../data/english/bill-names.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  LAWS_MODULE_ID,
  rowReplaced,
  type LawRowInput,
} from "../core2/modules/laws";
import { NEWS_MODULE_ID, stillNews } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import { wordArchiveStory } from "./archive-words";
import { heardItems } from "./calendar";
import { storyRecordKind } from "./printed-words";
import { buildBenchWorld } from "./world";

const seed = process.env.PAPER_BRIEFS_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(`${seed}:0`, "paper-briefs");
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const where = `${place.name} (${place.key}), seed ${seed}:0`;
const api = coreAPI(world.core);
const amounts = (
  billNames as unknown as {
    amounts: { series: Record<string, { who: string }> };
  }
).amounts.series;

type Stored = {
  id: string;
  kind: string;
  date: string;
  facts: Record<string, string>;
};
const archived = (
  api.moduleState(NEWS_MODULE_ID).table("stories").rows() as unknown as Stored[]
).filter((story) => story.kind === "press.archived");

describe(`the paper's law and budget items (${where})`, () => {
  it("archives only a law that changed what stood, and tells its level, change and reach", () => {
    const laws = archived.filter((story) =>
      /^law-(?:enacted|took-effect)$/.test(story.facts.recordKind ?? ""),
    );
    const lines: string[] = [];
    for (const story of laws) {
      const row = api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .get(story.facts.lawId!) as unknown as LawRowInput;
      const before = rowReplaced(api, row);
      // Not the law as the world starts, nor a year's row that sets the same.
      expect(before, `${story.id} replaced nothing (${where})`).not.toBeNull();
      expect(before!.value, `${story.id} changed nothing (${where})`).not.toBe(
        row.value,
      );
      const words = wordArchiveStory(world.core, story);
      // An amount the banks have no name for stays a record.
      if (!amounts[row.series]) continue;
      expect(words, `${story.id} (${where})`).not.toBeNull();
      const text = [words!.headline, ...(words!.paragraphs ?? [words!.lede])]
        .filter(Boolean)
        .join(" ");
      lines.push(text);
      // The level: the government that set it.
      expect(text, `${story.id} (${where})`).toMatch(
        row.level === "federal"
          ? /\b(?:federal|Federal|Congress)\b/
          : /\b(?:state law|town ordinance|county ordinance|will (?:raise|lower) its)\b/,
      );
      // The change: from one amount to another.
      expect(text, `${story.id} (${where})`).toMatch(
        /from \$?[\d.,]+%? to \$?[\d.,]+%?/,
      );
      // Whom it reaches.
      expect(text, `${story.id} (${where})`).toContain(
        amounts[row.series]!.who,
      );
      // Never the bare line the owner turned down.
      expect(text, `${story.id} (${where})`).not.toMatch(
        /^\S.* (?:took effect|became law) on [A-Z][a-z]+ \d+, \d{4}\.$/,
      );
    }
    process.stdout.write(
      `PAPER LAWS ${where}: ${laws.length} archived\n${lines.map((line) => `  ${line}`).join("\n")}\n`,
    );
  }, 300_000);

  it("says the federal budget's sums in trillions", () => {
    const federal = archived.find(
      (story) =>
        story.facts.recordKind === "budget-adopted" &&
        story.facts.governmentId === "US",
    );
    expect(federal, `no federal budget archived (${where})`).toBeTruthy();
    const words = wordArchiveStory(world.core, federal!);
    const text = [words?.headline, ...(words?.paragraphs ?? [words?.lede])]
      .filter(Boolean)
      .join(" ");
    process.stdout.write(`PAPER BUDGET ${where}: ${text}\n`);
    expect(text, where).toMatch(/\$\d+(?:\.\d)? trillion/);
    expect(text, where).not.toMatch(/\$\d{4,}(?:\.\d+)? billion/);
  });

  it("carries no law or budget past the days a story stays news on the opening paper", () => {
    const stale = heardItems(world.core, world.playerId!).filter(
      (story) =>
        /^(?:budget-adopted|law-enacted|law-took-effect)$/.test(
          storyRecordKind(world.core, story),
        ) && !stillNews(api, story.date),
    );
    expect(
      stale.map((story) => `${story.id} ${story.date}`),
      where,
    ).toEqual([]);
  });
});
