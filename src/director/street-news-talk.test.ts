/**
 * A scene's opening line and its talk come from the same cause (Fable A,
 * Nov 13, rule 6; P1's "Riley has news for you", Curtisville PA). A street
 * scene a story someone read caused opens its talk on that story, and a
 * greeting says when the two last met only from a talk on record, never from
 * a tie's contact date, which moves for more than a meeting. One played world
 * (buildBenchWorld) in a place drawn from all 56, seed from GOLDEN_PATH_SEED
 * (random when unset).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { storiesHeard, storyOfReadEvent } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import { changesKnownTo } from "./bring-it-up";
import { openConversation } from "./conversation";
import type { Moment } from "./types";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(20).toString("hex");

it(`a street scene a story caused opens on that story, and no greeting reads a tie's contact date (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "street-news-talk");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  advanceCore(core, addDays(makeIsoDate(core.date), 60));
  const player = playerId as PersonId;
  const adults = [...core.people.values()]
    .filter(
      (person) =>
        person.alive &&
        person.tier !== "husk" &&
        person.id !== player &&
        ageOnDate(person.birthDate, core.date) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  // A greeting's "when" is a talk on record, never a tie (a relationship
  // id): everyone the player has a tie with, whose contact dates move.
  let greeted = 0;
  const tied = [...(core.relationshipsByPerson.get(player) ?? [])].flatMap(
    (id) => {
      const row = core.relationships.get(id)!;
      const otherId = row.actorId === player ? row.otherId : row.actorId;
      const other = core.people.get(otherId);
      return other?.alive ? [other] : [];
    },
  );
  for (const other of tied) {
    const talk = openConversation(core, player, other.id as PersonId, {
      director,
      look: true,
    });
    for (const line of talk.lines.filter((row) => row.kind === "greet")) {
      greeted += 1;
      for (const id of line.sourceRecordIds)
        expect(
          core.relationships.has(id),
          `${where}: ${other.id}'s greeting "${line.text}" cites the tie ${id}`,
        ).toBe(false);
    }
  }
  // Someone who read a printed story, cast in a street scene it caused.
  director.watch(core, player);
  const book = director.ledger.people.get(player)!;
  let checked = 0;
  for (const other of adults) {
    const heard = new Set(
      storiesHeard(coreAPI(core), other.id as PersonId).map((row) => row.id),
    );
    const read = changesKnownTo(core, other.id as PersonId).find(
      (change) =>
        change.kind === "news.read" &&
        heard.has(storyOfReadEvent(change.eventId) ?? ""),
    );
    if (!read) continue;
    const storyId = storyOfReadEvent(read.eventId)!;
    const moment: Moment = {
      id: `test:${read.eventId}`,
      personId: player,
      date: makeIsoDate(core.date),
      label: "circumstance:rent-news-street",
      causeId: read.eventId,
      causeKind: "news.read",
      counterpartIds: [other.id as PersonId],
      impact: 1,
      channels: [],
      hindsight: 1,
      hindsightAt: makeIsoDate(core.date),
      echoes: [],
    };
    book.momentsById.set(moment.id, moment);
    const talk = openConversation(core, player, other.id as PersonId, {
      director,
      occasionId: moment.id,
      look: true,
    });
    book.momentsById.delete(moment.id);
    const said = talk.lines.filter((line) => line.speakerId === other.id);
    if (!said.length) continue;
    expect(
      said.some((line) => line.sourceRecordIds.includes(storyId)),
      `${where}: ${other.id}'s talk on ${read.eventId} says ${JSON.stringify(said.map((l) => l.text))}`,
    ).toBe(true);
    checked += 1;
    if (checked >= 5) break;
  }
  process.stdout.write(
    `street news in ${where}: ${greeted} greeting lines to ${tied.length} people the player has a tie with, none from a tie; ${checked} talks opened on the story that caused them.\n`,
  );
  expect(
    checked,
    `${where}: nobody read a story they could tell`,
  ).toBeGreaterThan(0);
}, 900_000);
