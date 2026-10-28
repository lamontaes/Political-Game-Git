import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { openingFrames } from "../bench/opening";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { PRESS_MODULE_ID } from "../core2/modules/press";
import { PRESIDENT_FACT } from "../core2/officials-president";
import { OPENING_SPEECH_BANK } from "../english/english-opening-speech";
import { subjectsBetween } from "./conversation";
import { composeOpeningStory, OPENING_ADDRESS_EVENT } from "./opening-story";

// The opening told as a story (owner, Oct 14, 2026), in the world the player
// gets: `buildBenchWorld`, two-level, on a fresh seed and a place drawn from
// all 56 (GOLDEN_PATH_SEED pins one). The address says only mined sentences
// with the world's records in their slots, names a place only from the
// President's campaign visits, and is a public record the news engine
// carries and the household can bring up.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "opening-story");
const date = process.env.OPENING_STORY_DATE ?? "2025-01-20";
console.log(
  `opening story: seed ${seed}, ${place.name} (${place.key}), ${date}`,
);

const sentencePatterns = OPENING_SPEECH_BANK.parts.map(
  (part) =>
    new RegExp(
      `^${part.text
        .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
        .replace(/\{[\w-]+\}/g, ".+")}$`,
    ),
);

describe("the opening story", () => {
  const world = buildBenchWorld(place.seed, date, {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const playerId = world.playerId!;
  const story = director.ledger.opening!;

  it("composes the address from authored pieces and the world's records", () => {
    expect(story, "no opening story").toBeTruthy();
    expect(story.date).toBe(core.date);
    const levels = story.address.sentences.map((row) => row.level);
    expect(levels[0]).toBe("salutation");
    expect(levels.at(-1)).toBe("close");
    for (const sentence of story.address.sentences) {
      expect(
        sentencePatterns.some((pattern) => pattern.test(sentence.text)),
        sentence.text,
      ).toBe(true);
      expect(sentence.sourceRecordIds).toContain(story.president.id);
    }
    // A number or claim about the country cites the macro engine's months.
    for (const sentence of story.address.sentences.filter(
      (row) => row.level === "country" && row.facts.length,
    ))
      expect(
        sentence.sourceRecordIds.some((id) => id.startsWith("macro-month:")),
        sentence.text,
      ).toBe(true);
    // A figure with what it is, never a bare claim ("Prices are too high").
    for (const sentence of story.address.sentences.filter((row) =>
      row.facts.some((key) => /-rate$|-growth$|-added$/.test(key)),
    ))
      expect(sentence.text, sentence.text).toMatch(/\d/);
    // Composed from records, the same every time.
    expect(composeOpeningStory(core, playerId)).toEqual(story);
  });

  it("names no place of the player's: the address is national only", () => {
    const president = core.people.get(story.president.id)!;
    // Owner, Oct 27: "nothing about your state". No sentence is put to the
    // governors or names a town the President visited.
    for (const sentence of story.address.sentences)
      expect(String(sentence.level), sentence.text).not.toMatch(
        /^(governors|towns)$/,
      );
    // The name card is the office alone: the President's home state is read
    // as where the player is (owner, Oct 26).
    const card = openingFrames(core, playerId, story).speaker;
    expect(card.detail).toEqual([]);
    const kinds = new Set((president.pastFacts ?? []).map((row) => row.kind));
    expect(kinds.has(PRESIDENT_FACT.homeState)).toBe(true);
    expect(kinds.has(PRESIDENT_FACT.elected)).toBe(true);
  });

  it("is a public record the news carries and a subject at home", () => {
    const api = coreAPI(core);
    // Where the press runs, its reporters decide what becomes a story, and
    // every public record goes on its wire (src/core2/modules/press.ts);
    // without it, the news module files the record itself.
    const stored = (core.modules.has(PRESS_MODULE_ID)
      ? api.moduleState(PRESS_MODULE_ID).table("wire").get(story.id)
      : api
          .moduleState(NEWS_MODULE_ID)
          .table("stories")
          .get(story.id)) as unknown as { kind: string } | undefined;
    expect(stored?.kind).toBe(OPENING_ADDRESS_EVENT);
    // The player saw the address: it is theirs to bring up at home.
    const other = story.home.memberIds.find((id) => id !== playerId);
    if (other)
      expect(
        subjectsBetween(core, playerId, other).some(
          (row) => row.kind === "address" && row.aboutId === story.id,
        ),
      ).toBe(true);
  });

  it("is printed by the press as national news within weeks, for readers to read", () => {
    const api = coreAPI(core);
    if (!core.modules.has(PRESS_MODULE_ID)) return;
    const press = api.moduleState(PRESS_MODULE_ID);
    expect(
      (press.table("wire").get(story.id) as unknown as { level: string })
        ?.level,
    ).toBe("nation");
    const at = new Date(`${core.date}T00:00:00Z`);
    for (let day = 0; day < 28; day += 1) {
      at.setUTCDate(at.getUTCDate() + 1);
      advanceCore(core, at.toISOString().slice(0, 10));
    }
    const printed = (
      press.table("stories").rows() as unknown as { wireId: string }[]
    ).filter((row) => row.wireId === story.id);
    expect(printed.length, `${place.name}; seed ${seed}`).toBeGreaterThan(0);
  }, 600_000);
});
