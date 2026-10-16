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
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
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
    // A figure with what it is, never a bare claim ("Prices are too high").
    for (const sentence of story.address.sentences.filter(
      (row) => row.level === "country",
    ))
      expect(sentence.text, sentence.text).toMatch(/\d/);
    // Composed from records, the same every time.
    expect(composeOpeningStory(core, playerId)).toEqual(story);
  });

  it("names a place only from a campaign visit to the player's own state", () => {
    const president = core.people.get(story.president.id)!;
    const ownState = corePlaceByJurisdictionId(
      core.people.get(playerId)!.placeId as never,
    )?.stateJurisdictionKey;
    const visits = new Map(
      (president.pastFacts ?? [])
        .filter((row) => row.kind === PRESIDENT_FACT.visit)
        .map((row) => [row.id, row.facts!]),
    );
    expect(visits.size).toBeGreaterThan(0);
    for (const sentence of story.address.sentences.filter(
      (row) => row.level === "towns",
    )) {
      const visit = sentence.sourceRecordIds.find((id) => visits.has(id));
      if (!/\{place\}/.test(sentence.text) && !visit) continue;
      expect(visit, sentence.text).toBeTruthy();
      expect(sentence.text).toContain(visits.get(visit!)!.stateName);
      expect(visits.get(visit!)!.stateKey).toBe(ownState);
    }
    // The name card: office and state, never a bare former office.
    const card = openingFrames(core, playerId, story).speaker;
    expect(card.detail).toEqual(
      story.president.homeState ? [story.president.homeState] : [],
    );
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

  it("plays over the sequence: the President's stage, Congress, the state, the family, then home", () => {
    const order = story.sequence.map((row) => row.stage);
    expect(order).toEqual(["president", "congress", "state", "family"]);
    const opening = openingFrames(core, playerId, story);
    // The stages come in order; a cutaway never goes back to an earlier one.
    // First, what the player is watching: their own household at home, the
    // anchor leading into the address by its title.
    const [lead, ...address] = opening.frames;
    expect(lead!.speaker).toBe("anchor");
    expect(lead!.stage).toBe("home");
    expect(lead!.lines.map((row) => row.text).join(" ")).toMatch(
      /We begin with the (?:State of the Union|inaugural address)\./,
    );
    const household = new Set(
      core.households.get(core.people.get(playerId)!.householdId)?.memberIds,
    );
    for (const row of lead!.pointOut) expect(household.has(row.id)).toBe(true);
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
        ...story.lead.map((row) => `anchor: ${row.text}`),
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
