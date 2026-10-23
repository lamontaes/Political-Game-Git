/** A territory's prior delegate and governor races follow the returns its election office certified. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import territoryReturns from "../../data/research/elections/territory-returns-2024.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { partySide } from "./appointments";
import { gameStartDate } from "./game-start";
import { CAMPAIGNS_MODULE_ID, type PromiseRow } from "./modules/campaigns";
import {
  PAST_MODULE_ID,
  pastParameter,
  type PastElectionRow,
} from "./past-module";
import { coreAPI } from "./state";

interface Returned {
  year: number;
  totalVotes: number;
  candidates: { party: string; votes: number }[];
}
const places = territoryReturns.places as Record<
  string,
  { delegate: Returned; governor: Returned }
>;

it("keeps a territory's prior delegate and governor races on its certified returns", () => {
  const seed = randomBytes(8).toString("hex");
  const tried: string[] = [];
  for (let i = 0; i < 400; i += 1) {
    const draw = drawPlace(`${seed}:${i}`, "past-territory-returns");
    const usps = draw.state.replace(/^US-/, "");
    tried.push(`${draw.key} (${usps}) seed ${draw.seed}`);
    const returns = places[usps];
    if (!returns) continue;
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
    const drift = pastParameter(api, "pastRealShareDrift");
    const promises = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("promises")
      .rows() as unknown as PromiseRow[];
    const residents = [...api.state.people.keys()];
    let checked = 0;
    let heardTotal = 0;
    for (const [kind, pattern] of [
      ["delegate", /us-house|delegate/],
      ["governor", /governor/],
    ] as const) {
      const certified = returns[kind];
      const races = elections.filter((e) => pattern.test(e.seatId));
      for (const race of races) {
        const label = `${where}: ${race.id}`;
        expect(race.totalVotes, label).toBeGreaterThan(0);
        expect(race.totalVotes, label).toBeLessThanOrEqual(
          certified.totalVotes,
        );
        const top = certified.candidates.reduce((a, b) =>
          b.votes > a.votes ? b : a,
        );
        if (race.date.startsWith(String(certified.year))) {
          // The certified race itself: its total, and the winner's share
          // within the drift of the certified share.
          expect(race.totalVotes, label).toBe(certified.totalVotes);
          const winner = race.candidates.find((c) => c.personId !== null)!;
          if (
            partySide(winner.party) !== 0 &&
            partySide(winner.party) === partySide(top.party)
          ) {
            // A past race holds two candidates and a strict-majority winner,
            // so a plurality share is held between the parameters' bounds.
            const certifiedShare = Math.min(
              pastParameter(api, "pastWinnerShareMax"),
              Math.max(
                pastParameter(api, "pastWinnerShareMin"),
                top.votes / certified.totalVotes,
              ),
            );
            expect(
              Math.abs(winner.share - certifiedShare),
              label,
            ).toBeLessThanOrEqual(drift + 1 / race.totalVotes);
          }
        }
        // Another engine reads the race: the campaigns promise rows carry its
        // electorate as their audience, and the town's residents learned the
        // promises with the race as the source.
        const own = promises.filter((p) => p.contestId === race.id);
        for (const p of own) expect(p.audience, label).toBe(race.totalVotes);
        const heard = own.flatMap((p) =>
          residents
            .map((id) => api.knows(id, p.id))
            .filter((f) => f?.sourceId === race.id),
        );
        process.stdout.write(
          `${label} total ${race.totalVotes} of ${certified.totalVotes} (${certified.year} ${kind}); promises ${own.length}; residents who heard ${heard.length}\n`,
        );
        heardTotal += heard.length;
        checked += 1;
      }
    }
    expect(checked, where).toBeGreaterThan(0);
    expect(heardTotal, where).toBeGreaterThan(0);
    return;
  }
  throw new Error(
    `No territory drawn in 400 tries: ${tried.join("; ")} (seed ${seed})`,
  );
}, 600_000);
