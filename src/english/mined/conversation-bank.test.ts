import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../../core2/kernel/dates";
import { enrichCivicInputs } from "../../core2/civic-inputs";
import { initialFocusPeople } from "../../core2/focus";
import { advanceCore, createLifeCore } from "../../core2/life";
import { buildPopulation } from "../../core2/population";
import {
  beliefsModule,
  openConversation,
  say,
  type Conversation,
} from "../../director/conversation";
import { createDirector } from "../../director/ledger";
import { CONVERSATION_BANK, MINED_CONVERSATION } from "./conversation-bank";
import sceneTalkJson from "../../../data/english/parts/scene-talk.json" with { type: "json" };

/**
 * The mined conversation bank, run through the story director's real
 * conversation code in a generated place: every line and every choice is a
 * mined sentence (or a mined answer followed by a mined raise) with its slots
 * filled from records, and each carries the records behind it.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? "words-conversation";
const base = enrichCivicInputs(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 500,
  }),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
// A husk (a relative living elsewhere, kept minimal until met) opens an
// empty talk today, and in some places everyone the first adult knows is one
// (Davenport, Florida, seed chk2-a; Point Clear, Alabama, chk2-c): the bank is
// read with people who have lines of their own until a husk is filled in when
// a talk opens (pool item words-talk-husk-acquaintances-empty).
// Housemates don't greet each other at home, so a talk with one opens only
// on a scene's occasion; the bank is read with people from other households.
const byId = new Map(base.people.map((person) => [person.id, person]));
const talkable = (id: string) => byId.get(id as never)?.tier !== "husk";
// The adult with the widest circle reads the bank.
const circle = (person: (typeof base.people)[number]) =>
  person.knownIds.filter(talkable).length;
const players = base.people
  .filter(
    (person) =>
      person.tier !== "husk" &&
      age(person.birthDate) >= 18 &&
      age(person.birthDate) < 70 &&
      circle(person) > 3,
  )
  .sort((a, b) => circle(b) - circle(a) || a.id.localeCompare(b.id));

/**
 * Each bank sentence as a pattern its filled line must match: the mined
 * conversation bank, and the scene engine's everyday talk, which words the
 * other person's answer to the move the player's answer made ("Get some
 * rest.", Davenport, Florida, seed chk2-a).
 */
const talkParts = (
  sceneTalkJson as unknown as {
    parts: { text: string; uses: { purpose?: string }[] }[];
  }
).parts.filter((part) => part.uses.some((use) => use.purpose === "talk"));
const minedPatterns = [...CONVERSATION_BANK.parts, ...talkParts].map(
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
      .filter(
        (id) =>
          core.people.get(id)?.alive &&
          talkable(id) &&
          core.people.get(id)!.householdId !== me.householdId,
      )
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
    // Every wording names the mined part it came from.
    for (const roles of Object.values(MINED_CONVERSATION.subjects))
      for (const moves of Object.values(roles))
        for (const move of moves ?? [])
          expect(
            CONVERSATION_BANK.parts.some((part) => part.key === move.part),
            move.text,
          ).toBe(true);
  });
});
