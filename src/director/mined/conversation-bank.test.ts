import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../../core2/kernel/dates";
import { enrichCivicInputs } from "../../core2/civic-inputs";
import { buildDeepPast } from "../../core2/deep-past";
import { initialFocusPeople } from "../../core2/focus";
import { advanceCore, createLifeCore } from "../../core2/life";
import { buildPopulation } from "../../core2/population";
import {
  beliefsModule,
  openConversation,
  say,
  type Conversation,
} from "../conversation";
import { createDirector } from "../ledger";
import {
  CONVERSATION_BANK,
  MINED_CONVERSATION,
  STANCE_BANK,
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
  it("records a public-domain source for every mined part and an author for every authored one", () => {
    for (const part of CONVERSATION_BANK.parts) {
      if (part.origin === "authored") {
        // An authored piece names who wrote it and when.
        expect(part.author?.trim(), part.key).toBeTruthy();
        expect(part.date ?? "", part.key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        expect(part.source?.url, part.key).toMatch(/^https:\/\/[^/]+\.gov\//);
        expect(part.source?.license ?? "", part.key).toMatch(/public domain/i);
      }
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
      const data = MINED_CONVERSATION;
      const talk = openConversation(core, player.id, otherId, { data });
      for (let turn = 0; turn < 4 && talk.choices.length > 0; turn += 1) {
        for (const choice of talk.choices) {
          expect(minedLine(choice.text), choice.text).toBe(true);
          expect(choice.sourceRecordIds.length, choice.text).toBeGreaterThan(0);
          choices += 1;
        }
        // The scales' set: a mined lie, or a mined answer with a false fact.
        for (const lie of talk.lies) {
          expect(minedLine(lie.text), lie.text).toBe(true);
          expect(lie.claim, lie.text).toBeDefined();
        }
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

  it("keeps no hand-written conversation bank", () => {
    // Every wording names the bank part it came from (the conversation
    // bank's or the stance bank's).
    for (const roles of Object.values(MINED_CONVERSATION.subjects))
      for (const moves of Object.values(roles))
        for (const move of moves ?? [])
          expect(
            [...CONVERSATION_BANK.parts, ...STANCE_BANK.parts].some(
              (part) => part.key === move.part,
            ),
            move.text,
          ).toBe(true);
  });
});
