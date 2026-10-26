import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { lawChain } from "../core2/modules/laws";
import { MOVED_AWAY_EVENT } from "../core2/modules/moves";
import { countedMoves } from "../core2/modules/counted-moves";
import { townFacts } from "../core2/law-reach/group-b-people";
import { coreAPI } from "../core2/state";
import { knownDepartures, townMoves } from "./town-moves";
import { buildBenchWorld } from "./world";

// Who you are shows the town's people and this year's moves in and out: after
// a played year in a drawn place, the three figures equal the move records
// counted here, and a person the player knows who moved away is in their news
// by the moved-away record's id.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("the town's people and moves on Who you are are the move records counted, and a known person's move is in the news", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "town-moves");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    const from = `${core.date.slice(0, 4)}-01-01`;
    let arrivals = 0;
    let departures = 0;
    for (const move of countedMoves(api)) {
      if (move.date < from) continue;
      if (move.direction === "in" && move.toPlace === town)
        arrivals += move.people;
      if (move.direction === "out" && move.fromPlace === town)
        departures += move.people;
    }
    const movedAway = [...(core.logByKind.get(MOVED_AWAY_EVENT) ?? [])]
      .map((id) => core.durableLog.get(id))
      .filter((row) => row && row.placeId === town && row.date >= from);
    for (const row of movedAway) departures += row!.personIds?.length ?? 0;
    const shown = townMoves(core);
    expect(shown.population, where).toBe(
      Math.round(townFacts(api, town).modeled),
    );
    expect(shown.population, where).toBeGreaterThan(0);
    expect(shown.arrivals, where).toBe(Math.round(arrivals));
    expect(shown.departures, where).toBe(Math.round(departures));
    const viewer = core.people.get(playerId!)!;
    const known = movedAway.flatMap((row) =>
      (row!.personIds ?? [])
        .filter(
          (id) =>
            viewer.knownIds.has(id as never) ||
            viewer.familyIds.has(id as never),
        )
        .map((id) => ({ recordId: row!.id, personId: id })),
    );
    if (!known.length) {
      tried.push(
        `${where}: ${shown.arrivals} in, ${shown.departures} out, no one the player knows moved away`,
      );
      continue;
    }
    const news = knownDepartures(core, playerId!);
    for (const { recordId, personId } of known) {
      const story = news.find(
        (row) => row.recordId === recordId && row.personId === personId,
      );
      expect(story, `${where}: ${recordId}`).toBeDefined();
      const person = core.people.get(personId)!;
      expect(story!.lede ?? story!.headline, where).toContain(
        `${person.givenName} ${person.familyName}`,
      );
      expect(story!.sourceRecordIds, where).toContain(recordId);
    }
    console.log(
      `${where}: ${shown.population} people, ${shown.arrivals} moved in, ${shown.departures} moved out in ${shown.year}; known moves ${known
        .map(({ recordId }) => recordId)
        .join(
          ", ",
        )}: ${news.map((row) => row.lede ?? row.headline).join(" | ")}`,
    );
    return;
  }
  throw new Error(
    `no drawn town had a known person move away: ${tried.join("; ")}`,
  );
}, 1_800_000);
