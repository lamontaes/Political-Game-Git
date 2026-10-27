/**
 * The home talks' rewritten lines (words-home-talks-rewritten) play from the
 * packets the director builds today: a housemate's goodbye on the home stage,
 * a plain acknowledgment, and a news answer that says what the speaker thinks.
 * One played world (buildBenchWorld, every module) in a place drawn from all
 * 56, seed from GOLDEN_PATH_SEED (random when unset), printed with the place.
 * Talks run between full people, housemates and others, as the bench's Talk
 * does, and every line and offered reply is read.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import bank from "../../data/english/parts/conversation.json";
import { openConversation, say, type Conversation } from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(20).toString("hex");

/** This item's pieces, by move, from the bank itself. */
const NEW = new Map<string, Set<string>>();
for (const part of (
  bank as { parts: { move: string; text: string; author?: string }[] }
).parts)
  if (part.author?.includes("words-home-talks-rewritten"))
    NEW.set(part.move, (NEW.get(part.move) ?? new Set()).add(part.text));

describe("home talks", () => {
  it("plays the rewritten goodbyes, acknowledgments and news answers in a played world", () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "home-talks");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    console.log(`home-talks: ${where}`);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    // A month in, so people have news to pass on.
    advanceCore(core, addDays(makeIsoDate(core.date), 30));
    const adults = [...core.people.values()].filter(
      (person) => person.alive && ageOnDate(person.birthDate, core.date) >= 18,
    );
    const byHousehold = new Map<string, PersonId[]>();
    for (const person of adults)
      if (person.householdId)
        byHousehold.set(person.householdId, [
          ...(byHousehold.get(person.householdId) ?? []),
          person.id as PersonId,
        ]);
    const pairs: [PersonId, PersonId][] = [];
    for (const members of byHousehold.values())
      if (members.length > 1) pairs.push([members[0]!, members[1]!]);
    // Others: neighbors in the list who share no household.
    for (let i = 0; i + 1 < adults.length && pairs.length < 400; i += 2)
      if (adults[i]!.householdId !== adults[i + 1]!.householdId)
        pairs.push([adults[i]!.id as PersonId, adults[i + 1]!.id as PersonId]);
    expect(pairs.length, where).toBeGreaterThan(0);
    const heard = new Map<string, string>();
    const read = (talk: Conversation) => {
      for (const line of talk.lines) heard.set(line.text, line.kind);
      for (const choice of talk.choices) heard.set(choice.text, "choice");
    };
    for (const [playerId, otherId] of pairs.slice(0, 400)) {
      // With the director, as the bench's Talk opens it: the story words
      // that give a news subject its headline come from it.
      let talk = openConversation(core, playerId, otherId, {
        director: world.director,
      });
      read(talk);
      for (let turn = 0; turn < 8 && talk.choices.length; turn += 1) {
        // An opinion when one is offered, else the first reply.
        const pick =
          talk.choices.find((row) =>
            NEW.get("news-answer-opinion")?.has(row.text),
          ) ?? talk.choices[turn % talk.choices.length]!;
        talk = say(core, talk, pick.key);
        read(talk);
      }
    }
    // A piece with slots plays when a heard line matches it with every slot
    // filled (the headline, the outlet, the weekday).
    const pattern = (text: string) =>
      new RegExp(
        `^${text
          .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
          .replace(/\{\w+\}/g, "[^{}]+")}$`,
      );
    const lines = [...heard.keys()];
    for (const [move, texts] of NEW) {
      const played = [...texts].filter((text) =>
        lines.some((line) => pattern(text).test(line)),
      );
      console.log(
        `home-talks ${move}: ${
          played
            .map((text) => lines.find((line) => pattern(text).test(line)))
            .join(" / ") || "none"
        }`,
      );
      expect(played.length, `${move} in ${where}`).toBeGreaterThan(0);
    }
    const plays = (move: string, slot: string) =>
      [...(NEW.get(move) ?? [])]
        .filter((text) => text.includes(`{${slot}}`))
        .some((text) => lines.some((line) => pattern(text).test(line)));
    // News is raised by its headline, and a quiet day opens on the day itself.
    expect(plays("news-raise-heard", "headline"), where).toBe(true);
    expect(plays("quiet-raise-day", "weekday"), where).toBe(true);
  }, 900_000);
});
