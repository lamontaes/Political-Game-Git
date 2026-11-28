/**
 * A card's story tells a stretch of life as one telling, joining the records
 * of different kinds that fall in it (a move, a school year, an office), with
 * every record kept on the telling. Fails when a card tells each record as a
 * sentence of its own. Places are drawn from all 56 (drawn-place-tests); the
 * places a draw passes over (no card with a joined stretch) are named.
 * GOLDEN_PATH_SEED=<seed> replays a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { knownCard } from "./card";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;

type Row = {
  text: string;
  records: string[];
  kinds?: string[];
  stretch?: number;
};

it(`an official's, a resident's and the player's cards each join records of different kinds in a stretch (seed ${seed})`, () => {
  setBookkeeping(false);
  const seen = { official: 0, resident: 0, player: 0 };
  const passed: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(seed, `card-history-stretches:${draw}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const me = core.people.get(playerId!)!;
    const terms = coreAPI(core)
      .moduleState("core2-offices-v1")
      .table("terms")
      .rows() as unknown as {
      status: string;
      personId?: string;
    }[];
    const holders = terms
      .filter((term) => term.status === "serving" && term.personId)
      .map((term) => term.personId!)
      .filter((id) => core.people.get(id as never)?.alive);
    const cards: [keyof typeof seen, string][] = [
      ["player", playerId!],
      ...[...me.familyIds, ...(me.knownIds ?? [])]
        .filter((id) => core.people.get(id as never)?.alive)
        .slice(0, 6)
        .map((id): [keyof typeof seen, string] => ["resident", id as string]),
      ...holders
        .slice(0, 6)
        .map((id): [keyof typeof seen, string] => ["official", id]),
    ];
    for (const [role, id] of cards) {
      const rows = knownCard(core, playerId!, id).history as Row[];
      // Every sentence is a stretch's, and a stretch's records are all kept.
      for (const row of rows) {
        expect(row.stretch, `${where} ${role}`).toBeTypeOf("number");
        expect(
          row.records.length,
          `${where} ${role}: ${row.text}`,
        ).toBeGreaterThan(0);
      }
      // Two stretches in a row are never the same stretch.
      const numbers = rows.map((row) => row.stretch);
      expect(new Set(numbers).size, `${where} ${role}`).toBe(numbers.length);
      if (rows.some((row) => (row.kinds?.length ?? 0) > 1)) seen[role] += 1;
    }
    if (!seen.official || !seen.resident || !seen.player) passed.push(where);
  }
  expect(
    seen,
    `no card told a stretch joining kinds in ${DRAWS} places (${passed.join("; ")})`,
  ).toEqual({
    official: expect.any(Number),
    resident: expect.any(Number),
    player: expect.any(Number),
  });
  expect(seen.official, "an official's card").toBeGreaterThan(0);
  expect(seen.resident, "a resident's card").toBeGreaterThan(0);
  expect(seen.player, "the player's card").toBeGreaterThan(0);
}, 600_000);
