import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { placesOf, returnsOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import controls from "./data/controls.json" with { type: "json" };
import { electionResults } from "./results";
import { buildBenchWorld } from "./world";

// Election night names what the screen shows by control, not typed text, and
// marks a race with one name on the ballot as unopposed. The races are the
// town's own, counted by the elections engine in a year of the played world.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("marks a race with one candidate unopposed and labels the night from controls", () => {
  // A town's races include ones counted across several places (a county,
  // the state): draws go on until a year of the played world counts one.
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "election-night");
    const where = `${place.name}, seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    for (const key of ["you", "yourRace", "won", "lost"])
      expect(
        (controls.results as Record<string, string>)[key],
        key,
      ).toBeTruthy();
    advanceCore(core, addDays(makeIsoDate(core.date), 700));
    const races = electionResults(core, playerId!);
    expect(races.length, `${where}: a counted race`).toBeGreaterThan(0);
    for (const race of races)
      expect(race.unopposed, `${where}: ${race.contestId}`).toBe(
        race.candidates.length === 1,
      );
    // Where each race was won: the view lists the places the engine counted,
    // with the votes cast there, and names each leader, never an id.
    const api = coreAPI(core);
    let counted = 0;
    for (const race of races) {
      const rows = placesOf(api, race.contestId);
      expect(race.places.length, `${where}: ${race.contestId}`).toBe(
        rows.length,
      );
      for (const row of rows) {
        const shown = race.places.find((p) => p.id === row.placeId);
        expect(shown, `${where}: ${row.placeId}`).toBeDefined();
        expect(shown!.cast, `${where}: ${row.placeId}`).toBe(row.cast);
        expect(shown!.name, `${where}: ${row.placeId}`).toBe(row.name);
        if (shown!.leader)
          expect(shown!.leader, `${where}: ${row.placeId}`).not.toMatch(
            /^(official:|person_)/,
          );
        counted += 1;
      }
      // The night's returns are the count's own record: the places that cast
      // a vote, smallest first, ending on the places' totals.
      if (!rows.length) continue;
      const reports = returnsOf(api, race.contestId)?.reports ?? [];
      const cast = rows.filter((row) => row.cast > 0);
      expect(reports.length, `${where}: ${race.contestId} returns`).toBe(
        cast.length,
      );
      for (let i = 1; i < reports.length; i += 1)
        expect(reports[i]!.cast).toBeGreaterThanOrEqual(reports[i - 1]!.cast);
      const totals: Record<string, number> = {};
      for (const row of cast)
        for (const [id, votes] of Object.entries(row.votes))
          totals[id] = (totals[id] ?? 0) + votes;
      if (reports.length)
        expect(reports.at(-1)!.running, `${where}: ${race.contestId}`).toEqual(
          totals,
        );
    }
    if (!counted) continue;
    console.log(`${where}: ${races.length} races, ${counted} places counted`);
    return;
  }
  throw new Error(`no race counted by place in eight draws, seed ${seed}`);
}, 1_800_000);
