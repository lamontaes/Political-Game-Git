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
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import { openConversation } from "./conversation";
import circumstancesJson from "./data/circumstances.json" with { type: "json" };
import { SITUATION_LIBRARY } from "./scheduling";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(20).toString("hex");

it(`no greeting says when two last met from a tie's contact date, only from a talk on record (seed ${seed})`, () => {
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
  process.stdout.write(
    `street news in ${where}: ${greeted} greeting lines to ${tied.length} people the player has a tie with, none from a tie.\n`,
  );
}, 900_000);

it("a street stop a story someone read caused plays the story scene, which tells the story", () => {
  const rows = (
    circumstancesJson as unknown as {
      rows: {
        id: string;
        recordKinds: string[];
        place: string;
        typeKey: string;
      }[];
    }
  ).rows.filter(
    (row) => row.place === "public" && row.recordKinds.includes("news.read"),
  );
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    const type = SITUATION_LIBRARY.types.find((t) => t.key === row.typeKey) as
      | { purpose?: string; causes: { match?: { label?: string } }[] }
      | undefined;
    // A type with a purpose plays its own exchange about the record; one
    // without falls back to small talk ("Riley has news for you", then a
    // question about a relative).
    expect(type?.purpose, `${row.id} stages ${row.typeKey}`).toBeTruthy();
    expect(
      type!.causes.some(
        (cause) => cause.match?.label === `circumstance:${row.id}`,
      ),
      `${row.typeKey} has a cause for ${row.id}`,
    ).toBe(true);
  }
});
