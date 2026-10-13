/**
 * PW-5 step 4: the player votes. In a place drawn with the golden path's
 * `drawPlace` (printed with its seed):
 * - left alone, the player's character votes or stays home on its own
 *   reasons through the ballot path everyone uses, and its ballot and reasons
 *   are in the `chosen` table for every contest it could vote in that day;
 * - controlled in the bench, a skip across Election Day stops there, at the
 *   hour the polls open, with today's ballot readable for the screen.
 */
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices } from "./modules/offices";
import {
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import {
  VOTING_MODULE_ID,
  contestsOnBallotFor,
  openVoting,
  playerBallotV1,
} from "./modules/voting";
import { electionParameter } from "./term-rules";
import { createDirector } from "../director/ledger";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { BenchPlayer } from "../bench/player";
import type { CoreState } from "./types";
import { lifePlaceByKey } from "../simulation/life-places";

const OPENING = "2026-10-12";
const commit =
  process.env.GOLDEN_PATH_COMMIT ??
  (() => {
    try {
      return execSync("git rev-parse HEAD", { stdio: "pipe" })
        .toString()
        .trim();
    } catch {
      return "no-commit";
    }
  })();

function world(specId: string, withDirector = false) {
  const drawn = drawPlace(commit, specId);
  console.log(
    `${specId}: ${drawn.name}, ${drawn.state} (${drawn.key}), seed ${drawn.seed}`,
  );
  const director = createDirector();
  const core = createLifeCore(
    buildPopulation({
      seed: drawn.seed,
      placeKey: drawn.key,
      startedAt: OPENING,
      minimumPeople: 60,
    }),
    withDirector ? { modules: [director.module] } : undefined,
  );
  if (withDirector) director.start(core);
  // The player: the youngest adult of the town (the bench's entrant rule is
  // PW-6's; any adult resident serves here).
  const townPlaceId = lifePlaceByKey(drawn.key)!.context.jurisdiction.id;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === townPlaceId &&
        Number(OPENING.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 19,
    )
    .sort(
      (a, b) =>
        b.birthDate.localeCompare(a.birthDate) || a.id.localeCompare(b.id),
    );
  (core as CoreState).playerId = adults[0]!.id;
  openOffices(core, drawn.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  const api = coreAPI(core);
  const contests = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
  const day = contests
    .map((c) => c.electionDate)
    .filter((d) => d > OPENING)
    .sort()[0]!;
  return { core, api, director, playerId: adults[0]!.id, day };
}

const after = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

describe("PW-5 the player votes", () => {
  it("an uncontrolled player's ballot and reasons are recorded for every contest they could vote in", () => {
    const { core, api, playerId, day } = world("PW-5-player-uncontrolled");
    const eligible = contestsOnBallotFor(api, playerId, day);
    expect(eligible.length).toBeGreaterThan(0);
    advanceCore(core, after(day));
    const chosen = api.moduleState(VOTING_MODULE_ID).table("chosen");
    for (const contest of eligible) {
      const row = chosen.get(`${contest.id}|${playerId}`) as unknown as
        | {
            by: string;
            voted: boolean;
            candidateId: string | null;
            turnoutReasons: { duty: number; interest: number; cost: number };
            appeal: Record<string, unknown>;
          }
        | undefined;
      expect(row, contest.id).toBeDefined();
      expect(row!.by).toBe("own-reasons");
      expect(typeof row!.voted).toBe("boolean");
      expect(row!.turnoutReasons).toBeDefined();
      // Its ballot is the one the count used.
      const ballot = api
        .moduleState(VOTING_MODULE_ID)
        .table("ballots")
        .get(`ballot:${contest.id}:${playerId}`) as unknown as {
        voted: boolean;
        choice: string | null;
      };
      expect(ballot.voted).toBe(row!.voted);
      expect(ballot.choice).toBe(row!.candidateId);
    }
  });

  it("a controlled player's skip stops on Election Day with the ballot open", () => {
    const { core, api, director, playerId, day } = world(
      "PW-5-player-controlled",
      true,
    );
    const player = new BenchPlayer(core, director);
    player.select(playerId);
    const { packet } = player.advance("calendar", after(after(day)));
    expect(packet.kind).toBe("stop");
    const stop = (
      packet as unknown as {
        stop: { modules: { reasonKey: string; moduleId: string }[] };
        at: { date: string; minuteOfDay: number };
      }
    ).stop.modules.find((row) => row.reasonKey === "election-day");
    expect(stop, "the Election Day stop").toBeDefined();
    expect(stop!.moduleId).toBe(VOTING_MODULE_ID);
    expect((packet as unknown as { at: { date: string } }).at.date).toBe(day);
    expect(
      (packet as unknown as { at: { minuteOfDay: number } }).at.minuteOfDay,
    ).toBe(electionParameter("pollsOpenMinuteOfDay"));
    // Today's ballot, from the records, for the screen.
    const ballot = playerBallotV1(api, playerId);
    expect(ballot.length).toBeGreaterThan(0);
    expect(ballot.every((race) => race.candidates.length > 0)).toBe(true);
  });
});
