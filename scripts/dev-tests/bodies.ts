/**
 * Phase 2: bills at every body, through dev mode's own controls
 * (lawmakingBodies, introduce, decideAt). For each body in a drawn place:
 * pass at a margin with the executive signing; defeat; pass, veto and
 * override; report what the bill's status and the law in force say.
 *   tsx scripts/dev-tests/bodies.ts <seed>
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { billCatalog } from "../../src/core2/bill-catalog";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { BenchPlayer } from "../../src/bench/player";
import { DevMode } from "../../src/bench/dev-mode";
import { lawInForce } from "../../src/core2/modules/laws";

setBookkeeping(false);
const seed = process.argv[2] ?? "bd1";
const place = drawPlace(seed, "bodies");
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const dev = new DevMode(w.core, w.director, new BenchPlayer(w.core, w.director), w.placeId);
const api = coreAPI(w.core);
console.log(JSON.stringify({ place: place.name, key: place.key, seed: place.seed }));
const devSeries = new Set(dev.laws().series.map((x) => x.series));
const home = (api.moduleState("core2-laws-v1" as never) as unknown, "");
void home;
const all = dev.lawmakingBodies();
const homeState = place.state;
// The town's own bodies, Congress, the home state's chambers and two other states' chambers.
const others = all.filter((b) => b.level === "state" && !b.id.includes(homeState)).slice(0, 2);
const picked = all.filter((b) => b.level !== "state" || b.id.includes(homeState)).concat(others);
for (const body of picked) {
  const level = body.level === "town" ? "city" : body.level;
  const row: Record<string, unknown> = { body: body.id, kind: body.kind, level, members: body.members.length };
  try {
    if (!body.members.length) { row.skipped = "no members seated"; console.log(JSON.stringify(row)); continue; }
    const menu = billCatalog(api, (level === "federal" || level === "state" || level === "county" || level === "city" ? level : "city") as never)
      .flatMap((s) => s.topics.flatMap((t) => t.policies)).filter((p) => p.kind === "law-amount" && p.authority.allowed && p.series && devSeries.has(p.series));
    const policy = menu[0];
    if (!policy) { row.skipped = "no law-amount a body at this level may draft"; console.log(JSON.stringify(row)); continue; }
    row.series = policy.series;
    const sponsor = body.members[0]!.personId ?? body.members[0]!.key;
    const value = Math.max(1, Math.round((policy.inForce ?? 1) * 1.1 + 1));
    const run = (label: string, margin: number, opts: { sign?: boolean; overrideMargin?: number; discharge?: boolean }) => {
      const { bill } = dev.introduce({ bodyOfficeId: body.id, sponsorId: sponsor, series: policy.series!, value, ...(policy.unit ? { unit: policy.unit } : {}) });
      const d = dev.decideAt(bill.id, margin, opts);
      row[label] = { status: d.bill.status, tallies: d.tallies.map((t) => `${t.yes}-${t.no}`).join(","), veto: d.veto, held: d.held.length, committees: d.committees.map((c: any) => `${c.heard ? "heard" : "unheard"} ${c.yes}-${c.no} ${c.reported ? "reported" : "NOT reported"}`).join("; ") };
    };
    const wide = body.level === "federal" ? 24 : 3;
    run("passSign", wide, { sign: true, discharge: true });
    run("defeat", -wide, {});
    run("vetoOverride", wide, { sign: false, overrideMargin: wide });
    run("vetoNoOverride", wide, { sign: false, overrideMargin: -wide });
    row.lawNow = lawInForce(api, policy.series!).governing?.value ?? null;
  } catch (e) { row.error = (e as Error).message.slice(0, 200); }
  console.log(JSON.stringify(row));
}
