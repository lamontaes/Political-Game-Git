import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { electionResults } from "../bench/results";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { gameStartDate } from "./game-start";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { drawPlace } from "../../tests/golden-path/place";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  `winners:${Date.now()}:${Math.random().toString(16).slice(2)}`;
const place = drawPlace(seed, "winner-names");

// A winner is the person who holds the seat, never the seat's or term's record id.
it(`election night names each winner as a person in ${place.name} (seed ${seed})`, () => {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
  // The town's first election day, then a few days for the count and the swearing in.
  const first = contests
    .map((c) => c.electionDate)
    .filter((d) => d > core.date)
    .sort()[0]!;
  advanceCore(
    core,
    new Date(Date.parse(`${first}T00:00:00Z`) + 3 * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );
  const viewer =
    [...core.people.values()].find((p) => p.alive && p.placeId === place.key) ??
    [...core.people.values()][0]!;
  const races = electionResults(core, viewer.id);
  expect(races.length, `races counted on ${first}`).toBeGreaterThan(0);
  for (const race of races) {
    const shown = JSON.stringify([
      race.winner,
      race.candidates.map((c) => c.name),
    ]);
    expect(shown, race.contestId).not.toMatch(/official:|seat:|term:|contest:/);
    if (race.winner) expect(race.winner, race.contestId).toMatch(/\s/);
  }
}, 600_000);
