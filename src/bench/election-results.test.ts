import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import controls from "./data/controls.json" with { type: "json" };
import { electionResults } from "./results";
import { buildBenchWorld } from "./world";

// Election night names what the screen shows by control, not typed text, and
// marks a race with one name on the ballot as unopposed. The races are the
// town's own, counted by the elections engine in a year of the played world.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("marks a race with one candidate unopposed and labels the night from controls", () => {
  const place = drawPlace(seed, "election-night");
  const where = `${place.name}, seed ${seed}`;
  setBookkeeping(false);
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  for (const key of ["turnout", "exitPoll", "you", "unopposed", "abstained"])
    expect((controls.results as Record<string, string>)[key], key).toBeTruthy();
  advanceCore(core, addDays(makeIsoDate(core.date), 700));
  const races = electionResults(core, playerId!);
  expect(races.length, `${where}: a counted race`).toBeGreaterThan(0);
  for (const race of races)
    expect(race.unopposed, `${where}: ${race.contestId}`).toBe(
      race.candidates.length === 1,
    );
}, 900_000);
