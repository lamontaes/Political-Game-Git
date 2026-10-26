/** Played-world proof of filing records after retiring assumed registration. */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { drawPlace } from "../core2-year/place";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  type FilingRow,
} from "../../src/core2/modules/elections";
setBookkeeping(false);
const seed = process.argv[2]!;
if (!seed) throw new Error("Provide a randomly drawn seed");
const place = drawPlace(seed, "office-federal");
const start = Date.now();
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const buildSeconds = (Date.now() - start) / 1000;
const from = world.core.date;
const api = coreAPI(world.core);
const run = Date.now();
advanceCore(world.core, addDays(makeIsoDate(from), 365));
const filings = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("filings")
  .rows() as unknown as FilingRow[];
const actual = filings.filter((f) => world.core.people.has(f.personId));
console.log(
  JSON.stringify({
    seed,
    place,
    from,
    through: world.core.date,
    buildSeconds,
    seconds: (Date.now() - run) / 1000,
    filings: actual,
    checks: actual.map((f) => ({
      filingId: f.id,
      checks: checkEligibility(api, f.personId, f.contestId, f.party),
    })),
    campaigns: api.moduleState("core2-campaigns-v1").table("campaigns").rows(),
    results: api.moduleState("core2-voting-v1").table("results").rows(),
  }),
);
