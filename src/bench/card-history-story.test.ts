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

  // The legislator with the most terms in one seat, opened from the term
  // they serve now.
  const terms = coreAPI(core)
    .moduleState("core2-offices-v1")
    .table("terms")
    .rows() as unknown as TermRow[];
  const runs = new Map<string, TermRow[]>();
  for (const term of terms) {
    if (!term.identity || term.personId || !/:(lower|upper):/.test(term.seatId))
      continue;
    const key = `${term.identity.givenName}|${term.identity.familyName}|${term.identity.birthDate}|${term.seatId}`;
    runs.set(key, [...(runs.get(key) ?? []), term]);
  }
  const longest = [...runs.values()].sort(
    (a, b) => b.length - a.length || a[0]!.id.localeCompare(b[0]!.id),
  )[0];
  expect(
    longest?.length,
    `${where}: a legislator with three terms or more`,
  ).toBeGreaterThanOrEqual(3);
  const byStart = [...longest!].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  const official = knownCard(core, me, `official:${byStart.at(-1)!.id}`);
  show("official", official);
  const name = `${byStart[0]!.identity!.givenName} ${byStart[0]!.identity!.familyName}`;
  expectSentences(`${where} official`, official.history);
  expect(official.history[0]!.text.startsWith(name), where).toBe(true);
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
  expect(
    card.history[0]!.text.startsWith(
      `${person.givenName} ${person.familyName}`,
    ),
    where,
  ).toBe(true);
  for (const line of card.history.slice(1))
    expect(line.text, `${where}: after the first sentence`).toMatch(
      /^(She|He|They|You) /,
    );
  expect(card.summary.length, where).toBeGreaterThanOrEqual(2);

  // The player's own card, said to them.
  const own = knownCard(core, me, me);
  show("player", own);
  expectSentences(`${where} player`, own.history);
  expect(own.history.length, where).toBeGreaterThan(0);
  for (const line of own.history)
    expect(line.text, `${where}: your own story`).toMatch(/^You /);
  expect(own.summary.length, where).toBeGreaterThanOrEqual(2);
  for (const line of own.summary)
    expect(line, `${where}: under your name`).toMatch(/^You /);
}, 600_000);
