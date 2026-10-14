import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { openingFrames } from "../bench/opening";
import { drawPlace } from "../../scripts/core2-year/place";
import { coreAPI } from "../core2/state";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { PRESIDENT_FACT } from "../core2/officials-president";
import { OPENING_SPEECH_BANK } from "../presentation/english-opening-speech";
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
        .replace(/\{\w+\}/g, ".+")}$`,
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

  it("composes the address from mined sentences and the world's records", () => {
    expect(story, "no opening story").toBeTruthy();
    expect(story.date).toBe(core.date);
    const levels = story.address.sentences.map((row) => row.level);
    expect(levels[0]).toBe("occasion");
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
      (row) => row.level === "country",
    ))
      expect(
        sentence.sourceRecordIds.some((id) => id.startsWith("macro-month:")),
        sentence.text,
      ).toBe(true);
    // Composed from records, the same every time.
    expect(composeOpeningStory(core, playerId)).toEqual(story);
  });

  it("names a place only from the President's campaign visits", () => {
    const president = core.people.get(story.president.id)!;
    const visits = new Map(
      (president.pastFacts ?? [])
        .filter((row) => row.kind === PRESIDENT_FACT.visit)
        .map((row) => [row.id, row.facts!.stateName!]),
    );
    expect(visits.size).toBeGreaterThan(0);
    for (const sentence of story.address.sentences.filter(
      (row) => row.level === "towns",
    )) {
      const visit = sentence.sourceRecordIds.find((id) => visits.has(id));
      if (!/\{place\}/.test(sentence.text) && !visit) continue;
      expect(visit, sentence.text).toBeTruthy();
      expect(sentence.text).toContain(visits.get(visit!));
    }
    const kinds = new Set((president.pastFacts ?? []).map((row) => row.kind));
    expect(kinds.has(PRESIDENT_FACT.homeState)).toBe(true);
    expect(kinds.has(PRESIDENT_FACT.elected)).toBe(true);
  });

  it("is a public record the news carries, the evening news, and a subject at home", () => {
    const api = coreAPI(core);
    const stored = api
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .get(story.id) as unknown as { kind: string } | undefined;
    expect(stored?.kind).toBe(OPENING_ADDRESS_EVENT);
    expect(story.newscast.length).toBeGreaterThan(0);
    for (const item of story.newscast) {
      expect(item.broadcast.length).toBeGreaterThan(0);
      // The anchor never takes the President's name as their own.
      for (const line of item.broadcast) expect(line.text).not.toMatch(/^I'm /);
    }
    // The player saw the address: it is theirs to bring up at home.
    const other = story.home.memberIds.find((id) => id !== playerId);
    if (other)
      expect(
        subjectsBetween(core, playerId, other).some(
          (row) => row.kind === "address" && row.aboutId === story.id,
        ),
      ).toBe(true);
    // The bench's opening speaks every sentence, in order, over pictures
    // that cut when the subject changes; a place line shows that state.
    const opening = openingFrames(core, playerId, story);
    expect(opening.frames.flatMap((frame) => frame.lines)).toEqual(
      story.address.sentences,
    );
    for (let i = 1; i < opening.frames.length; i += 1)
      expect(opening.frames[i]!.place).not.toBe(opening.frames[i - 1]!.place);
    for (const frame of opening.frames)
      for (const line of frame.lines.filter((row) => row.stateKey))
        expect(frame.place).toMatch(/^state-capitol-/);
    expect(opening.news.stories).toEqual(story.newscast);
  });
});
