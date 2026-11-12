import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { countedMoves } from "../core2/modules/people";
import { coreAPI } from "../core2/state";
import { personCard } from "./card";
import { buildBenchWorld } from "./world";

// Who you are shows the town's size and this year's moves (path 10), as
// sums of the move records in a played world: after most of a year, the
// counts on the player's card equal the counted moves' records into and out
// of the town plus the named residents' moved-away records.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("the card's town counts are the year's move records", () => {
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "town-moves");
    const where = `${place.name}, seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const town = core.people.get(playerId!)!.placeId;
    advanceCore(core, addDays(makeIsoDate(core.date), 300));
    const card = personCard(core, playerId!);
    const from = `${core.date.slice(0, 4)}-01-01`;
    const moves = countedMoves(coreAPI(core)).filter(
      (m) => m.date >= from && (m.toPlace === town || m.fromPlace === town),
    );
    const arrivals = moves
      .filter((m) => m.direction === "in" && m.toPlace === town)
      .reduce((n, m) => n + m.people, 0);
    const counted = moves
      .filter((m) => m.direction === "out" && m.fromPlace === town)
      .reduce((n, m) => n + m.people, 0);
    expect(card.town.population, where).toBeGreaterThan(0);
    expect(card.town.arrivals, where).toBe(Math.round(arrivals));
    // Departures: the counted moves out, plus named residents who left.
    expect(card.town.departures, where).toBeGreaterThanOrEqual(
      Math.round(counted),
    );
    for (const m of moves)
      expect(card.town.recordIds, `${where}: ${m.id}`).toContain(m.id);
    if (!moves.length) continue;
    console.log(
      `${where}: population ${card.town.population}, ${card.town.arrivals} in, ${card.town.departures} out by ${core.date} (${card.town.recordIds.slice(0, 3).join(", ")})`,
    );
    return;
  }
  throw new Error(`no town with a move in six draws, seed ${seed}`);
}, 1_800_000);
