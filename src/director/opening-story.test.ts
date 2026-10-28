import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { openingFrames, OPENING_EVENING_MINUTE } from "../bench/opening";
import { homeOf } from "../bench/scene";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { PRESS_MODULE_ID } from "../core2/modules/press";
import { PRESIDENT_FACT } from "../core2/officials-president";
import { OPENING_SPEECH_BANK } from "../english/english-opening-speech";
import { NEWSCAST_BANK } from "../english/english-newscast";
import { keyPeopleOf } from "../core2/opening-key-people";
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

  it("is a public record the news carries, the evening news, and a subject at home", () => {
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
    expect(
      opening.frames
        .filter((frame) => !frame.speaker)
        .flatMap((frame) => frame.lines),
    ).toEqual(story.address.sentences);
    for (let i = 1; i < opening.frames.length; i += 1)
      expect(opening.frames[i]!.place).not.toBe(opening.frames[i - 1]!.place);
    for (const frame of opening.frames)
      if (frame.lines.some((row) => row.stateKey))
        expect(frame.place).toMatch(/^state-capitol-/);
    expect(opening.news.stories).toEqual(story.newscast);
  });

  it("leads the news with a news story: the swearing-in, a lede, the figures and one quote", () => {
    const lead = story.newscast[0]!;
    const where = `${place.name}, seed ${seed}, ${date}`;
    expect(lead.kind, where).toBe("address");
    expect(lead.headline, where).toBeTruthy();
    // The election was in November: on Inauguration Day no headline or
    // sentence claims a win, and the headline names the swearing-in.
    expect(lead.headline, where).not.toMatch(
      /\b(?:won|wins|elected|beats|victory)\b/i,
    );
    for (const text of lead.paragraphs ?? [])
      expect(text, where).not.toMatch(/\b(?:won|wins|elected)\b/i);
    if (story.speechKind === "inaugural") {
      expect(lead.headline, where).toMatch(/sworn in|oath/i);
      expect(lead.sourceRecordIds, where).toContain(story.president.id);
    }
    // A lede, then two or three sentences, at most one of them a quote.
    const paragraphs = lead.paragraphs ?? [];
    expect(paragraphs[0], where).toBe(lead.lede);
    expect(paragraphs.length, where).toBeGreaterThanOrEqual(3);
    expect(paragraphs.length, where).toBeLessThanOrEqual(4);
    expect(
      paragraphs.filter((text) => text.includes('"')).length,
      where,
    ).toBeLessThanOrEqual(1);
    // No anchor's sign-off, and no line that only says where someone was.
    const closes = new Set(
      NEWSCAST_BANK.parts
        .filter((part) =>
          part.uses.some(
            (use) => use.subject === "anchor" && use.role === "close",
          ),
        )
        .map((part) => part.text),
    );
    for (const text of paragraphs) {
      expect(closes.has(text), `${where}: ${text}`).toBe(false);
      expect(text, where).not.toMatch(/^(?:I was in|I'm from) /);
    }
    console.log(`${where}: ${lead.headline} | ${paragraphs.join(" | ")}`);
  });

  it("plays over the sequence: the President's stage, Congress, the state, the family, then home", () => {
    const order = story.sequence.map((row) => row.stage);
    // No town stage: the opening points out national people, not the player's
    // council or state legislators (owner, Oct 27).
    expect(order).toEqual(["president", "congress", "state", "family"]);
    const opening = openingFrames(core, playerId, story);
    // The stages come in order; a cutaway never goes back to an earlier one.
    // The first frame is the address itself, the President at the lectern
    // (owner, Oct 26): no stage at the player's home comes before the address
    // or the state's chapter.
    const { frames } = opening;
    const household = new Set(
      core.households.get(core.people.get(playerId)!.householdId)?.memberIds,
    );
    expect(frames[0]!.stage).toBe("president");
    expect(frames[0]!.lines.length).toBeGreaterThan(0);
    const home = homeOf(core, playerId, OPENING_EVENING_MINUTE);
    // Everything before the family's frame (home) is away from home; the state's
    // stage shows only where it has a line or a person to point out.
    const homeAt = frames.findIndex(
      (frame) => frame.stage === "state" || frame.stage === "family",
    );
    for (const frame of frames.slice(0, homeAt < 0 ? frames.length : homeAt)) {
      expect(
        frame.place,
        `${frame.stage} frame is at the player's home`,
      ).not.toBe(home);
      expect(frame.people.some((row) => household.has(row.personId))).toBe(
        false,
      );
    }
    const address = frames;
    const keyIds = new Set(keyPeopleOf(core, playerId).map((row) => row.id));
    const reached = address.map((frame) => order.indexOf(frame.stage));
    expect(reached).toEqual([...reached].sort((a, b) => a - b));
    expect(reached[0]).toBe(0);
    // Everyone pointed out is there for a recorded reason the scene names:
    // the player's household, or the sentence that names them, which plays
    // in the frame where they are pointed out.
    for (const frame of opening.frames)
      for (const row of frame.pointOut) {
        if (row.role === "household") {
          expect(household.has(row.id)).toBe(true);
          continue;
        }
        // A key person (owner, Oct 15) is there for being on the key list;
        // the sentence that names them, if the address does, is their line.
        if (row.namedBy === undefined) {
          expect(row.role.startsWith("key:"), row.name).toBe(true);
          expect(keyIds.has(row.id), `${row.name} is not on the key list`).toBe(
            true,
          );
          continue;
        }
        const said = story.address.sentences[row.namedBy!]!;
        expect(frame.lines[row.line!], row.name).toBe(said);
        expect(frame.cast.map((member) => member.id)).toContain(row.id);
      }
    // A name the address says belongs to someone pointed out in that scene.
    for (const sentence of story.address.sentences.filter((row) =>
      row.facts.includes("name"),
    ))
      expect(
        opening.frames.some(
          (frame) =>
            frame.lines.includes(sentence) &&
            frame.pointOut.some((row) =>
              sentence.sourceRecordIds.includes(row.id),
            ),
        ),
        sentence.text,
      ).toBe(true);
    // Everyone a stage points out is named from a record, once.
    const pointed = opening.frames.flatMap((frame) => frame.pointOut);
    expect(new Set(pointed.map((row) => row.id)).size).toBe(pointed.length);
    for (const row of pointed) {
      expect(row.name.trim()).not.toBe("");
      expect(row.sourceRecordIds.length).toBeGreaterThan(0);
    }
    // The family stage shows only when the player has family.
    const family = story.sequence.find((row) => row.stage === "family")!;
    expect(opening.frames.some((frame) => frame.stage === "family")).toBe(
      family.people.length > 0,
    );
    console.log(
      opening.frames
        .map(
          (frame) =>
            `${frame.stage} ${frame.place}: ${frame.pointOut
              .map((row) =>
                [row.name, row.relation, row.post, row.office, row.state]
                  .filter(Boolean)
                  .join(", "),
              )
              .join("; ")}`,
        )
        .join("\n"),
    );
    console.log(
      [
        ...story.address.sentences.map((row) => `${row.level}: ${row.text}`),
      ].join("\n"),
    );
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
