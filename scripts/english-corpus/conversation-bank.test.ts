import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../../src/simulation/dates";
import { enrichCivicInputs } from "../../src/core2/civic-inputs";
import { buildDeepPast } from "../../src/core2/deep-past";
import { initialFocusPeople } from "../../src/core2/focus";
import { advanceCore, createLifeCore } from "../../src/core2/life";
import { buildPopulation } from "../../src/core2/population";
import {
  beliefsModule,
  openConversation,
  say,
  type Conversation,
} from "../../src/director/conversation";
import { createDirector } from "../../src/director/ledger";
import {
  CONVERSATION_BANK,
  conversationDataFromBank,
  pickBy,
  uncovered,
} from "./conversation-bank";

/**
 * The mined conversation bank, run through the story director's real
 * conversation code in a generated place: every line and every choice is a
 * mined sentence (or a mined answer followed by a mined raise) with its slots
 * filled from records, and each carries the records behind it.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? "words-conversation";
const base = enrichCivicInputs(
  buildDeepPast(
    buildPopulation({
      seed,
      ...(process.env.GOLDEN_PATH_SEED
        ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
        : {}),
      startedAt: "2021-01-01",
      minimumPeople: 500,
    }),
  ),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const players = base.people.filter(
  (person) =>
    person.tier !== "husk" &&
    age(person.birthDate) >= 18 &&
    age(person.birthDate) < 70 &&
    person.knownIds.length > 3,
);

/** Each mined sentence as a pattern its filled line must match. */
const minedPatterns = CONVERSATION_BANK.parts.map(
  (part) =>
    new RegExp(
      `^${part.text
        .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
        .replace(/\{\w+\}/g, ".+")}$`,
      "i",
    ),
);
const isMined = (sentence: string) =>
  minedPatterns.some((pattern) => pattern.test(sentence));
/** A line is one mined sentence, or two said one after the other. */
const minedLine = (text: string) =>
  isMined(text) ||
  [...text.matchAll(/[.?!] /g)].some((match) => {
    const cut = match.index! + 1;
    return isMined(text.slice(0, cut)) && isMined(text.slice(cut + 1));
  });

describe("the mined conversation bank in the director", () => {
  it("records a public-domain source for every part", () => {
    for (const part of CONVERSATION_BANK.parts) {
      expect(part.source.url, part.key).toMatch(/^https:\/\/[^/]+\.gov\//);
      expect(part.source.license ?? "", part.key).toMatch(/public domain/i);
      expect(part.uses.length, part.key).toBeGreaterThan(0);
    }
  });

  it("words whole conversations in a generated place, every line from a record", () => {
    const player = players[0]!;
    const input = { ...base, playerId: player.id };
    const director = createDirector({
      watch: [...initialFocusPeople(input)],
    });
    const core = createLifeCore(input, {
      modules: [beliefsModule, director.module],
    });
    director.start(core);
    advanceCore(core, "2021-01-03");
    const me = core.people.get(player.id)!;
    const others = [...me.knownIds]
      .filter((id) => core.people.get(id)?.alive)
      .slice(0, 12);
    let lines = 0;
    let choices = 0;
    const conversations: Conversation[] = [];
    for (const otherId of others) {
      const data = conversationDataFromBank(
        CONVERSATION_BANK,
        pickBy(`${seed}:${otherId}`),
      );
      const talk = openConversation(core, player.id, otherId, { data });
      for (let turn = 0; turn < 4 && talk.choices.length > 0; turn += 1) {
        for (const choice of talk.choices) {
          expect(minedLine(choice.text), choice.text).toBe(true);
          expect(choice.sourceRecordIds.length, choice.text).toBeGreaterThan(0);
          choices += 1;
        }
        if (talk.lie)
          expect(minedLine(talk.lie.text), talk.lie.text).toBe(true);
        say(core, talk, talk.choices[turn % talk.choices.length]!.key, data);
      }
      for (const line of talk.lines) {
        expect(minedLine(line.text), line.text).toBe(true);
        expect(line.sourceRecordIds.length, line.text).toBeGreaterThan(0);
        lines += 1;
      }
      conversations.push(talk);
    }
    expect(conversations.some((talk) => talk.lines.length > 1)).toBe(true);
    expect(lines).toBeGreaterThan(others.length);
    expect(choices).toBeGreaterThan(0);
  }, 240_000);

  it("lists the director's slots it cannot word yet", () => {
    // Reported, not required: a gap is a subject the director leaves unasked.
    expect(Array.isArray(uncovered())).toBe(true);
  });
});
