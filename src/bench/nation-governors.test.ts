import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { racesOf, raceVotes } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import { governorRacesTonight } from "./results";
import { buildBenchWorld } from "./world";

// Election night's Nation page: after the November 2026 general election in
// a drawn place, every other state's governor race on record that night,
// with the winning party and the margin from its own votes, by race id.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("the night after the 2026 election, the Nation page lists every governor race on record with its winner and margin", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 4; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "nation-governors");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    expect(governorRacesTonight(core), `${where}: none before`).toEqual([]);
    advanceCore(core, "2026-11-04" as never);
    const records = racesOf(coreAPI(core)).filter(
      (race) => race.office === "governor" && race.date === "2026-11-03",
    );
    if (!records.length) {
      tried.push(`${where}: no governor race recorded on 2026-11-03`);
      continue;
    }
    const shown = governorRacesTonight(core);
    expect(shown.map((row) => row.id).sort(), where).toEqual(
      records.map((race) => race.id).sort(),
    );
    for (const row of shown) {
      const race = records.find((r) => r.id === row.id)!;
      expect(row.winnerParty, `${where}: ${row.id}`).toBe(race.winnerParty);
      const { republican, democratic } = raceVotes(coreAPI(core), race);
      expect(row.marginPoints, `${where}: ${row.id}`).toBeCloseTo(
        (100 * Math.abs(republican - democratic)) / (republican + democratic),
        9,
      );
      // The winner is the party with more votes.
      expect(
        race.winnerParty === "Republican"
          ? republican >= democratic
          : democratic >= republican,
        `${where}: ${row.id} ${race.winnerParty} ${republican}-${democratic}`,
      ).toBe(true);
      expect(row.state, `${where}: ${row.id}`).not.toMatch(/^US-/);
    }
    console.log(
      `${where}: ${shown.length} governor races, e.g. ${shown
        .slice(0, 3)
        .map(
          (row) =>
            `${row.state} ${row.winnerParty} by ${row.marginPoints.toFixed(1)} (${row.id})`,
        )
        .join("; ")}`,
    );
    return;
  }
  throw new Error(
    `no drawn place recorded a governor race: ${tried.join("; ")}`,
  );
}, 1_800_000);
