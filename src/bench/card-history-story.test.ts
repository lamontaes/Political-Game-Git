/**
 * A person's card tells their life as a story (owner, Nov 1: "Elected
 * legislator, it needs to be told like a story. How many times do I have to
 * say that?"). In a drawn place, the cards of a long-serving legislator, a
 * resident and the player each read as sentences that name the person once
 * and then use their pronouns (or speak to the player), carry at least two
 * lines under the name, tell a run of terms in one office once, and date the
 * header's "since" from the same first term the story tells.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { knownCard } from "./card";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");

interface TermRow {
  id: string;
  seatId: string;
  status: string;
  startDate: string;
  personId?: string | null;
  identity?: { givenName: string; familyName: string; birthDate?: string };
}

/**
 * A sentence after the time it opens on, when it opens on one ("In 1985,",
 * "At 14,", "That same year,"; words-life-story-has-one-wording-for-each-
 * kind-of-event).
 */
const afterTime = (text: string) =>
  text.replace(
    /^(?:(?:In|Back in|Then in|Later, in) \d{4}|At (?:age )?\d+|That same year), /,
    "",
  );

/** Sentences, not fragments: a capital first letter and a closing period. */
function expectSentences(where: string, lines: readonly { text: string }[]) {
  for (const line of lines)
    expect(line.text, `${where}: "${line.text}"`).toMatch(/^[A-Z].*[.]$/);
}

it("tells an official, a resident and the player as stories, with the header's since from the first term", () => {
  const place = drawPlace(seed, "card-history-story");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const me = playerId!;
  const show = (role: string, card: ReturnType<typeof knownCard>) =>
    process.stdout.write(
      `${where} ${role} ${card.name}: ${(card.summary ?? []).join(" / ")} || ${card.history.map((line) => `${line.date.slice(0, 4)} ${line.text}`).join(" | ")}\n`,
    );

  // The longest-serving legislator, opened from the term they serve now: a
  // holder from another place has their earlier terms of the seat written
  // the first time their card opens (offices.ts openPastTerms).
  const offices = coreAPI(core).moduleState("core2-offices-v1").table("terms");
  const legislators = (offices.rows() as unknown as TermRow[])
    .filter(
      (term) =>
        term.status === "serving" &&
        term.identity &&
        !term.personId &&
        /:(lower|upper):/.test(term.seatId),
    )
    .sort(
      (a, b) =>
        (a.serviceStart ?? a.startDate).localeCompare(
          b.serviceStart ?? b.startDate,
        ) || a.id.localeCompare(b.id),
    );
  const serving = legislators[0]!;
  const official = knownCard(core, me, `official:${serving.id}`);
  const key = (term: TermRow) =>
    `${term.identity!.givenName}|${term.identity!.familyName}|${term.identity!.birthDate}|${term.seatId}`;
  const longest = (offices.rows() as unknown as TermRow[]).filter(
    (term) => term.identity && key(term) === key(serving),
  );
  expect(
    longest.length,
    `${where}: a legislator with three terms or more`,
  ).toBeGreaterThanOrEqual(3);
  const byStart = [...longest].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  show("official", official);
  const name = `${byStart[0]!.identity!.givenName} ${byStart[0]!.identity!.familyName}`;
  expectSentences(`${where} official`, official.history);
  expect(afterTime(official.history[0]!.text).startsWith(name), where).toBe(
    true,
  );
  // Their terms in the seat are one sentence, told on every term's record.
  const told = official.history.filter(
    (line) =>
      line.kind === "office" &&
      byStart.some((term) => line.records.includes(term.id)),
  );
  expect(told, `${where}: one sentence for the run`).toHaveLength(1);
  for (const term of byStart)
    expect(told[0]!.records, `${where}: ${term.id}`).toContain(term.id);
  // The header, the public record and the lines under the name all date the
  // seat from the first term the story tells.
  const first = byStart[0]!.startDate.slice(0, 4);
  expect(told[0]!.date.slice(0, 4), where).toBe(first);
  expect(
    official.seats.map((seat) => String(seat.year)),
    `${where}: the header's since`,
  ).toEqual([first]);
  expect(official.publicKnowledge?.serviceStart.slice(0, 4), where).toBe(first);
  expect(official.summary.length, where).toBeGreaterThanOrEqual(2);
  expect(official.summary[0], where).toContain(`since ${first}`);

  // A resident of the player's town with a life on record: named once, then
  // their pronouns.
  const player = core.people.get(me)!;
  const resident = [...core.people.values()]
    .filter(
      (person) =>
        person.id !== me &&
        person.alive &&
        person.placeId === player.placeId &&
        person.householdId !== player.householdId,
    )
    .map((person) => ({ person, card: knownCard(core, me, person.id) }))
    .find(({ card }) => card.history.length >= 3);
  expect(
    resident,
    `${where}: a resident with three lines of history`,
  ).toBeDefined();
  const { person, card } = resident!;
  show("resident", card);
  expectSentences(`${where} resident`, card.history);
  // A child is born by their first name ("Jeremiah was born in 1996."); the
  // first sentence about the person themself names them, the rest say
  // "she", "he" or "they".
  const theirs = card.history.filter((line) => !line.piece.includes(".child."));
  expect(
    afterTime(theirs[0]!.text).startsWith(
      `${person.givenName} ${person.familyName}`,
    ),
    where,
  ).toBe(true);
  for (const line of theirs.slice(1))
    expect(afterTime(line.text), `${where}: after the first sentence`).toMatch(
      /^(She|He|They|You|she|he|they|you) /,
    );
  expect(card.summary.length, where).toBeGreaterThanOrEqual(2);

  // The player's own card, said to them.
  const own = knownCard(core, me, me);
  show("player", own);
  expectSentences(`${where} player`, own.history);
  expect(own.history.length, where).toBeGreaterThan(0);
  for (const line of own.history)
    expect(afterTime(line.text), `${where}: your own story`).toMatch(/^I /);
  expect(own.summary.length, where).toBeGreaterThanOrEqual(2);
  for (const line of own.summary)
    expect(line, `${where}: under your name`).toMatch(/^You /);
}, 600_000);
