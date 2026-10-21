/** A territory's prior delegate and governor races count the ballots its own election office reported. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import territoryBallots from "../../data/research/elections/territory-ballots.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { PAST_MODULE_ID, type PastElectionRow } from "./past-module";
import { coreAPI } from "./state";

const places = territoryBallots.places as Record<
  string,
  { delegate?: { ballots: number }; governor?: { ballots: number } }
>;

it("keeps a territory's prior delegate race within the delegate ballots reported", () => {
  const seed = randomBytes(8).toString("hex");
  // Draw from the 56 until one is a territory with a delegate total on file.
  for (let i = 0; i < 2000; i += 1) {
    const draw = drawPlace(`${seed}:${i}`, "past-territory-ballots");
    const usps = draw.state.replace(/^US-/, "");
    const delegate = places[usps]?.delegate?.ballots;
    if (!delegate) continue;
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const elections = api
      .moduleState(PAST_MODULE_ID)
      .table("elections")
      .rows() as unknown as PastElectionRow[];
    const where = `seed ${draw.seed}, place ${draw.key} (${usps})`;
    const delegateRaces = elections.filter((e) =>
      /us-house|delegate/.test(e.seatId),
    );
    expect(delegateRaces.length, where).toBeGreaterThan(0);
    for (const race of delegateRaces) {
      expect(race.totalVotes, `${where}: ${race.seatId}`).toBeGreaterThan(0);
      expect(race.totalVotes, `${where}: ${race.seatId}`).toBeLessThanOrEqual(
        delegate,
      );
    }
    // The territory's own total is the base, not the town's few ballots: the
    // fullest-turnout race carries a large share of it.
    expect(
      Math.max(...delegateRaces.map((r) => r.totalVotes)),
      where,
    ).toBeGreaterThan(0.4 * delegate);
    return;
  }
  throw new Error(`No drawn territory with delegate ballots (seed ${seed})`);
}, 600_000);
