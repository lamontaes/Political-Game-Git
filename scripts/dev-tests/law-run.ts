/**
 * Dev Tester, Phase 1 runner. One place, one level: for every policy the
 * level's body may draft, build the same generated world twice (control and
 * with the law), pass the bill through the real body, run past the lag and a
 * month, repeal it by a second bill, run again, and print one JSON line per
 * policy: what the law engine did, who was reached, what moved against the
 * control. Usage:
 *   tsx scripts/dev-tests/law-run.ts <seed> <level> [idSubstring] [days]
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { billCatalog, provisionFor } from "../../src/core2/bill-catalog";
import { coreAPI } from "../../src/core2/state";
import { townSeats } from "../../src/core2/modules/offices";
import {
  bodyOf, draftBill, castMemberVote, holdVote, executiveDecision, members, memberKey, billOf,
} from "../../src/core2/modules/legislature";
import { lawChain, lawInForce, LAWS_MODULE_ID } from "../../src/core2/modules/laws";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState } from "../../src/core2/types";

setBookkeeping(false);
const [seed = "t1", level = "city", pick = "", daysArg = "90"] = process.argv.slice(2);
const DAYS = Number(daysArg);
let place = drawPlace(seed, "law-run");
const hasBody = (core: CoreState) => townSeats(coreAPI(core)).some(
  (r) => r.office.level === level && r.holder?.personId && bodyOf(coreAPI(core), r.office.id) &&
    (level === "state" ? r.office.kind.startsWith("legislature-") : true));
const skipped: string[] = [];
for (let a = 0; a < 12; a++) {
  place = drawPlace(a ? `${seed}:${a}` : seed, "law-run");
  const probe = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
  if (hasBody(probe.core)) break;
  skipped.push(`${place.name} (${place.key})`);
}
if (skipped.length) console.error("SKIPPED places with no", level, "body:", skipped.join("; "));
const build = () => buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const run = (core: CoreState, days: number) => advanceCore(core, addDays(makeIsoDate(core.date), days));

function totals(core: CoreState) {
  let cash = 0, orgCash = 0, alive = 0, employed = 0;
  for (const p of core.people.values()) { if (!p.alive) continue; alive++; cash += p.liquidMinor; if (p.jobId) employed++; }
  for (const o of core.organizations.values()) orgCash += o.liquidMinor;
  const kinds: Record<string, number> = {};
  for (const [k, s] of core.logByKind) kinds[k] = s.size;
  return { cash, orgCash, alive, employed, kinds };
}
function diffKinds(a: Record<string, number>, b: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = (a[k] ?? 0) - (b[k] ?? 0); if (d) out[k] = d; }
  return Object.fromEntries(Object.entries(out).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 12));
}
function citing(core: CoreState, ...needles: string[]) {
  const out: Record<string, number> = {};
  for (const row of core.durableLog.values()) {
    const s = JSON.stringify(row.facts ?? {});
    if (needles.some((n) => n && s.includes(n))) out[row.kind] = (out[row.kind] ?? 0) + 1;
  }
  return out;
}
function pass(core: CoreState, bodyId: string, sponsor: string, policyId: string, op: string, amount?: number) {
  const api = coreAPI(core);
  const bill = draftBill(api, { bodyOfficeId: bodyId, sponsorId: sponsor,
    provisions: [provisionFor({ policyId, operation: op as never, ...(amount !== undefined ? { amount } : {}) })] });
  for (const m of members(api, bodyId)) castMemberVote(api, bill.id, memberKey(m), "yes");
  let b = holdVote(api, bill.id);
  const trail = [b.status];
  if (b.status === "awaiting-signature") { b = executiveDecision(api, bill.id, true); trail.push(b.status); }
  return { billId: bill.id, status: b.status, trail };
}

const control = build();
const seatOf = (core: CoreState) => townSeats(coreAPI(core)).find(
  (r) => r.office.level === level && r.holder?.personId && bodyOf(coreAPI(core), r.office.id) &&
    (level === "state" ? r.office.kind.startsWith("legislature-") : true));
const seat0 = seatOf(control.core);
if (!seat0) { console.log(JSON.stringify({ place: place.name, key: place.key, seed: place.seed, level, error: "no body at this level" })); process.exit(0); }
const policies = billCatalog(coreAPI(control.core), level as never).flatMap((s) => s.topics.flatMap((t) => t.policies.map((p) => ({ ...p, subject: s.name }))))
  .filter((p) => p.id.includes(pick));
run(control.core, DAYS); const ctlAfterPass = totals(control.core);
run(control.core, DAYS); const ctlAfterRepeal = totals(control.core);

for (const p of policies) {
  const rec: Record<string, unknown> = { place: place.name, key: place.key, seed: place.seed, level, policy: p.id, kind: p.kind, allowed: p.authority.allowed, why: p.authority.reason };
  try {
    const w = build(); const core = w.core; const api = coreAPI(core);
    const seat = seatOf(core)!;
    const op = p.operations.includes("enact") ? "enact" : p.operations.includes("raise") ? "raise" : p.operations[0]!;
    const amount = p.kind === "policy-question" ? undefined : Math.max(1, Math.round((p.inForce ?? 1) * 1.2 + 1));
    rec.op = op; rec.inForce = p.inForce;
    const series = p.series ?? p.question ?? p.line;
    const before = series ? lawInForce(api, p.kind === "budget-line" ? `budget-line:${p.line}` : series).governing : null;
    const r = pass(core, seat.office.id, seat.holder!.personId!, p.id, op, amount);
    rec.pass = r.trail; rec.billId = r.billId;
    const after = series ? lawInForce(api, p.kind === "budget-line" ? `budget-line:${p.line}` : series).governing : null;
    rec.lawBefore = before && { id: before.id, level: before.level, value: before.value };
    rec.lawAfter = after && { id: after.id, level: after.level, value: after.value, eff: after.effectiveDate };
    rec.changed = !!after && (!before || before.id !== after.id || before.value !== after.value);
    run(core, DAYS);
    const t = totals(core);
    rec.cashDeltaMinor = t.cash - ctlAfterPass.cash; rec.orgCashDeltaMinor = t.orgCash - ctlAfterPass.orgCash;
    rec.alive = t.alive - ctlAfterPass.alive; rec.employed = t.employed - ctlAfterPass.employed;
    rec.kindDiff = diffKinds(t.kinds, ctlAfterPass.kinds);
    rec.citing = citing(core, after?.id ?? "", r.billId);
    // repeal
    if (r.status === "enacted" && p.operations.some((o) => ["repeal", "lower", "restrict"].includes(o))) {
      const rop = p.operations.includes("repeal") ? "repeal" : p.operations.includes("lower") ? "lower" : "restrict";
      const ramount = p.kind === "policy-question" ? undefined : before ? before.value : 0;
      const rr = pass(core, seat.office.id, seat.holder!.personId!, p.id, rop, ramount);
      rec.repeal = rr.trail;
      const re = series ? lawInForce(api, p.kind === "budget-line" ? `budget-line:${p.line}` : series).governing : null;
      rec.lawAfterRepeal = re && { id: re.id, level: re.level, value: re.value };
      run(core, DAYS);
      const t2 = totals(core);
      rec.cashDeltaAfterRepealMinor = t2.cash - ctlAfterRepeal.cash;
    }
  } catch (e) { rec.error = (e as Error).message.slice(0, 200); }
  console.log(JSON.stringify(rec));
}
