/**
 * The home talks' rewritten lines (words-home-talks-rewritten) play from the
 * packets the director builds today: a housemate's goodbye on the home stage
 * and a news answer that says what the speaker thinks. How the other person
 * takes in the player's answer is the scene engine's answer from the scene
 * bank (words-everyday-talk-one-engine), so the old acknowledgments are read
 * there, not as the conversation bank's.
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
import {
  openConversation,
  replyMoveOf,
  say,
  type Conversation,
} from "./conversation";
import arcs from "./data/purpose-arcs.json";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(20).toString("hex");

/** This item's pieces, by move, from the bank itself. */
const NEW = new Map<string, Set<string>>();
for (const part of (
  bank as { parts: { move: string; text: string; author?: string }[] }
).parts)
  if (part.author?.includes("words-home-talks-rewritten"))
    NEW.set(part.move, (NEW.get(part.move) ?? new Set()).add(part.text));

describe("home talks", () => {
  /** How the scene engine answers each reply move in a talk (purpose-arcs.json `talk.follow`). */
  const FOLLOW = arcs.purposes.talk.follow as Record<string, string | string[]>;
  /** A reply the talk can only take in ("Okay."): every answer to it accepts it, and it asked for nothing. */
  const onlyTakenIn = (move: string) =>
    move !== "request" &&
    Array.isArray(FOLLOW[move]) &&
    (FOLLOW[move] as string[]).every((answer) => answer === "accept");
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
    /** Requests made ("Sit with me a minute?", "Why?"): each is answered. */
    let requests = 0;
    /** Requests the other person said nothing to. */
    const unanswered: string[] = [];
    /** Takings-in heard after a reply that asked nothing. */
    const bareTakes: string[] = [];
    /** The other person's answers to the player that the scene bank worded. */
    const takes = new Set<string>();
    const read = (talk: Conversation) => {
      for (const line of talk.lines) {
        heard.set(line.text, line.kind);
        if (line.kind === "ack" && line.wording?.bank === "scene-talk")
          takes.add(line.text);
      }
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
        const move = talk.last
          ? replyMoveOf(talk.last.kind, pick.move)
          : undefined;
        const before = talk.lines.length;
        talk = say(core, talk, pick.key);
        const taken = talk.lines
          .slice(before)
          .filter(
            (line) =>
              line.kind === "ack" && line.wording?.bank === "scene-talk",
          );
        if (move === "request") {
          requests += 1;
          if (
            !talk.lines
              .slice(before + 1)
              .some((line) => line.speakerId === otherId)
          )
            unanswered.push(pick.text);
        }
        if (move && onlyTakenIn(move) && taken.length)
          bareTakes.push(`${pick.text} / ${taken[0]!.text}`);
        read(talk);
      }
    }
    // A piece with slots plays when a heard line matches it with every slot
    // filled (the headline, the outlet).
    const pattern = (text: string) =>
      new RegExp(
        `^${text
          .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
          .replace(/\{\w+\}/g, "[^{}]+")}$`,
      );
    const lines = [...heard.keys()];
    // The other person takes the player's answer in with the scene engine's
    // answer for the move it made.
    // A reply that asked nothing gets no bare taking-in ("Okay.", "I see."):
    // that is a non-reply (owner, Nov 12: "a useless interaction"), and the
    // talk carries on from its records instead. A request is always answered:
    // taken up ("Sit with me a minute?" "Sure.") or told from their records
    // ("Why?"), so no talk ends on the player's request.
    console.log(
      `home-talks takes: ${[...takes].join(" / ") || "none"} (${requests} requests)`,
    );
    expect(bareTakes, where).toEqual([]);
    expect(requests, where).toBeGreaterThan(0);
    expect(unanswered, where).toEqual([]);
    // Small talk is only the last thing a talk reaches: it never leads while
    // the speaker has anything on record (words composer, unit 2: filler
    // talk replaced by talk from records). Its lines are read where a talk
    // came to it; a world where every talk had a record to tell is named.
    const quietHeard = [...heard.values()].includes("quiet");
    if (!quietHeard)
      console.log(
        `home-talks: no talk in ${where} came to small talk; its lines are passed over`,
      );
    for (const [move, texts] of NEW) {
      if (move === "ack-reply-right") continue;
      if (move.startsWith("quiet-") && !quietHeard) continue;
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
    // News is never read out as a headline (owner, Nov 12: "sworn in, gives
    // inaugural address. What do you make of that?"): a story is told by what
    // it is about and where the teller stands, or not at all. A quiet day
    // opens on a record of the day: a work day, by the job's own hours.
    // (Lines naming the weekday went with the owner's sitting bans of Oct 28.)
    expect(
      lines.filter((line) =>
        /What do you make of that\?$|story\? What did you think\?$/.test(line),
      ),
      where,
    ).toEqual([]);
    void plays;
    const workDay = (
      bank as {
        parts: {
          move: string;
          text: string;
          uses: { requiresFacts?: string[] }[];
        }[];
      }
    ).parts
      .filter(
        (part) =>
          part.move === "quiet-raise-day" &&
          part.uses.some((use) => use.requiresFacts?.includes("dayDone")),
      )
      .map((part) => part.text);
    if (quietHeard)
      expect(
        workDay.some((text) => lines.includes(text)),
        where,
      ).toBe(true);
  }, 900_000);
});
