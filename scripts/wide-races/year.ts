/** Played-year proof: drawn place, every bench module, ordinary producers. */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { BenchPlayer } from "../../src/bench/player";
import { drawPlace } from "../core2-year/place";
import { playThrough } from "../office-day-federal/drive";
import { standingPool, raceScope } from "../../src/core2/candidate-pool";
import {
  type ContestRow,
  ELECTIONS_MODULE_ID,
} from "../../src/core2/modules/elections";
import {
  CANDIDACY_MODULE_ID,
  type WeighedContest,
} from "../../src/core2/modules/candidacy";
import {
  OFFICES_MODULE_ID,
  type TermRow,
} from "../../src/core2/modules/offices";
import { VOTING_MODULE_ID } from "../../src/core2/modules/voting";
setBookkeeping(false);
const seed = process.argv[2]!;
if (!seed) throw new Error("Provide a randomly drawn seed");
const place = drawPlace(seed, "office-federal");
const start = Date.now();
const world = buildBenchWorld(seed, "2026-01-20", {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(world.core);
const contests = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("contests")
  .rows() as unknown as ContestRow[];
const pools = contests
  .filter((c) => c.level === "federal")
  .map((c) => ({
    contestId: c.id,
    pool: standingPool(api, raceScope(api, c)).map((p) => ({
      id: p.personId,
      place: world.core.people.get(p.personId)?.placeId,
      sourceIds: p.sourceIds,
    })),
  }));
const buildSeconds = (Date.now() - start) / 1000;
const president = (
  api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("bySeatStatus", [
      "seat:US:president",
      "serving",
    ])[0] as unknown as TermRow
).personId!;
const player = new BenchPlayer(world.core, world.director);
player.select(president);
console.log(
  JSON.stringify({
    stage: "built",
    people: world.core.people.size,
    buildSeconds,
  }),
);
const run = Date.now();
playThrough(player, api, "2027-01-20", () => {}, "skip");
const wide = new Set(
  (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((c) => c.level === "state" || c.level === "federal")
    .map((c) => c.id),
);
console.log(
  JSON.stringify({
    seed,
    place,
    buildSeconds,
    seconds: (Date.now() - run) / 1000,
    from: "2026-01-20",
    through: world.core.date,
    president,
    pools,
    decisions: api
      .moduleState(CANDIDACY_MODULE_ID)
      .table("decisions")
      .rows()
      .filter((r) => wide.has(String(r.contestId))),
    weighed: (
      api
        .moduleState(CANDIDACY_MODULE_ID)
        .table("weighed")
        .rows() as unknown as WeighedContest[]
    ).filter((r) => wide.has(r.contestId)),
    filings: api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows()
      .filter((r) => wide.has(String(r.contestId))),
    ballots: api
      .moduleState(VOTING_MODULE_ID)
      .table("ballots")
      .rows()
      .filter((r) => wide.has(String(r.contestId))),
    empty: api.moduleState(VOTING_MODULE_ID).table("emptyRaces").rows(),
    vacancies: api.moduleState(OFFICES_MODULE_ID).table("vacancies").rows(),
    campaigns: api.moduleState("core2-campaigns-v1").table("campaigns").rows(),
    results: api
      .moduleState(VOTING_MODULE_ID)
      .table("results")
      .rows()
      .filter((r) => wide.has(String(r.contestId))),
  }),
);
