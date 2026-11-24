/* eslint-disable @typescript-eslint/no-explicit-any */
// Who is full after N years, by what keeps them full: tsx tiers-whofull.ts <seed> <placeKey> <years>
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { isDemoted } from "../../src/core2/counted-groups";
import { coreAPI } from "../../src/core2/state";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
import { isSchoolDistrict } from "../../src/core2/residents";
import { OUTSIDE_MARKET_KIND } from "../../src/core2/opening-outside-market";
setBookkeeping(false);
const [seed = "k7", key = "0179944", years = "2"] = process.argv.slice(2);
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
const core = w.core as any;
advanceCore(core, addDays(makeIsoDate(core.date), 365 * Number(years)));
const api = coreAPI(core);
const player = core.people.get(core.playerId);
const playerSet = new Set<string>([
  player.id,
  ...(core.households.get(player.householdId)?.memberIds ?? []),
  ...player.familyIds,
  ...player.knownIds,
]);
const serving = new Set<string>();
for (const t of api
  .moduleState(OFFICES_MODULE_ID)
  .table("terms")
  .query("byStatus", ["serving"]) as any[])
  if (t.personId) serving.add(t.personId);
const publicWorker = new Set<string>();
for (const job of core.jobs.values()) {
  if (job.endsAt !== undefined) continue;
  const e = core.organizations.get(job.organizationId);
  if (
    e &&
    e.kind !== OUTSIDE_MARKET_KIND &&
    (e.kind !== "employer" || (e.publicPayAuthority && !isSchoolDistrict(e)))
  )
    publicWorker.add(job.personId);
}
const owners = new Set<string>();
if (core.modules.has("business"))
  for (const r of api.moduleState("business").table("owners").rows() as any[])
    owners.add(r.ownerId);
const tally: Record<string, number> = {};
let full = 0;
for (const p of core.people.values()) {
  if (!p.alive || p.tier === "husk" || isDemoted(p)) continue;
  full++;
  const reasons = [];
  if (playerSet.has(p.id)) reasons.push("player-circle");
  if (serving.has(p.id)) reasons.push("official");
  if (publicWorker.has(p.id)) reasons.push("public-worker");
  if (owners.has(p.id)) reasons.push("owner");
  const k = reasons.length ? reasons.sort().join("+") : "none";
  tally[k] = (tally[k] ?? 0) + 1;
}
console.log("WHOFULL", years, "years full", full, JSON.stringify(tally));
