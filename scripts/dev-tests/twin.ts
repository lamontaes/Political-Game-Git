/**
 * Twin worlds: the same generated world with and without one law, passed the
 * real way (draft, every chamber votes yes, the executive's signature on
 * record, vote held), run year by year; vitals and record counts for both.
 *   tsx scripts/dev-tests/twin.ts <seed> <level> <policyIdSubstring> [years]
 * The pair differs by chance chains the law starts, as the owner said it should.
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { billCatalog, provisionFor } from "../../src/core2/bill-catalog";
import { coreAPI } from "../../src/core2/state";
import { townSeats } from "../../src/core2/modules/offices";
import { bodyOf, chambersOf, draftBill, castMemberVote, holdVote, executiveDecision, members, memberKey } from "../../src/core2/modules/legislature";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState } from "../../src/core2/types";
import { vitals } from "./vitals";

setBookkeeping(false);
const [seed = "tw1", level = "state", pick = "", yearsArg = "3"] = process.argv.slice(2);
const years = Number(yearsArg);
const place = drawPlace(seed, "twin");
const build = () => buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const seatOf = (core: CoreState) => townSeats(coreAPI(core)).find((r) => r.office.level === level && r.holder?.personId && bodyOf(coreAPI(core), r.office.id) && (level !== "state" || r.office.kind.startsWith("legislature-")));
const a = build(), b = build();
const api = coreAPI(a.core);
const seat = seatOf(a.core);
const p = billCatalog(api, level as never).flatMap((s) => s.topics.flatMap((t) => t.policies)).find((x) => x.id.includes(pick));
if (!seat || !p || !p.authority.allowed) {
  console.log(JSON.stringify({ place: place.name, key: place.key, seed: place.seed, skipped: !seat ? "no body" : !p ? "no policy" : `barred: ${p.authority.reason}` }));
  process.exit(0);
}
const op = p.operations.includes("enact") ? "enact" : "raise";
const amount = p.kind === "policy-question" ? undefined : Math.max(1, Math.round((p.inForce ?? 1) * 1.5 + 1));
const bill = draftBill(api, { bodyOfficeId: seat.office.id, sponsorId: seat.holder!.personId!, provisions: [provisionFor({ policyId: p.id, operation: op as never, ...(amount !== undefined ? { amount } : {}) })] });
for (const ch of chambersOf(api, bill)) for (const m of members(api, ch)) castMemberVote(api, bill.id, memberKey(m), "yes");
executiveDecision(api, bill.id, true);
const result = holdVote(api, bill.id);
const out: any = { place: place.name, key: place.key, seed: place.seed, level, policy: p.id, op, amount, billStatus: result.status, years, rows: [] };
if (result.status !== "enacted" && result.status !== "overridden") { console.log(JSON.stringify(out)); process.exit(0); }
const snap = (core: CoreState) => ({ v: vitals(core), kinds: Object.fromEntries([...core.logByKind].map(([k, s]) => [k, s.size])) });
out.rows.push({ year: 0, withLaw: snap(a.core).v, control: snap(b.core).v });
for (let y = 1; y <= years; y++) {
  advanceCore(a.core, addDays(makeIsoDate(a.core.date), 365));
  advanceCore(b.core, addDays(makeIsoDate(b.core.date), 365));
  const sa = snap(a.core), sb = snap(b.core);
  const diff: Record<string, number> = {};
  for (const k of new Set([...Object.keys(sa.kinds), ...Object.keys(sb.kinds)])) { const d = (sa.kinds[k] ?? 0) - (sb.kinds[k] ?? 0); if (d) diff[k] = d; }
  out.rows.push({ year: y, withLaw: sa.v, control: sb.v, recordDiff: Object.fromEntries(Object.entries(diff).sort((x, y2) => Math.abs(y2[1]) - Math.abs(x[1])).slice(0, 10)) });
}
console.log(JSON.stringify(out));
