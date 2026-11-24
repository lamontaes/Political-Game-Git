/**
 * Dev Tester, Phase 1: pass one catalog policy through the body that has the
 * power (draft, every member votes yes, the vote is held, the executive
 * signs), then read what the law engine says. Usage:
 *   tsx scripts/dev-tests/law-pass.ts <seed> <level> [policyIdSubstring]
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { billCatalog, provisionFor } from "../../src/core2/bill-catalog";
import { coreAPI } from "../../src/core2/state";
import { townSeats } from "../../src/core2/modules/offices";
import {
  billOf, bodyOf, draftBill, castMemberVote, holdVote, executiveDecision,
  members, memberKey,
} from "../../src/core2/modules/legislature";
import { lawChain, lawInForce } from "../../src/core2/modules/laws";
import { setBookkeeping } from "../../src/core2/bookkeeping";

setBookkeeping(false);
const [seed = "t1", level = "city", pick = ""] = process.argv.slice(2);
const place = drawPlace(seed, "law-pass");
const world = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const api = coreAPI(world.core);
console.log("PLACE", place.name, place.key, "seed", place.seed);
const seat = townSeats(api).find(
  (r) => r.office.level === level && r.holder?.personId && bodyOf(api, r.office.id) &&
    (level === "state" ? r.office.kind.startsWith("legislature-") : true),
);
console.log("SEAT", seat?.office.id, seat?.office.kind);
if (!seat) process.exit(0);
const policies = billCatalog(api, level as never).flatMap((s) => s.topics.flatMap((t) => t.policies))
  .filter((p) => p.authority.allowed && p.id.includes(pick));
console.log("allowed policies", policies.length);
for (const p of policies.slice(0, 3)) {
  const op = p.operations.includes("enact") ? "enact" : p.operations.includes("raise") ? "raise" : p.operations[0]!;
  console.log("POLICY", p.id, op, "inForce", p.inForce);
  try {
    const amount = p.kind === "policy-question" ? undefined : (p.inForce ?? 1) * 1.1 + 1;
    const bill = draftBill(api, { bodyOfficeId: seat.office.id, sponsorId: seat.holder!.personId!,
      provisions: [provisionFor({ policyId: p.id, operation: op, ...(amount !== undefined ? { amount } : {}) })] });
    console.log(" drafted", bill.id, bill.status);
    for (const m of members(api, seat.office.id)) castMemberVote(api, bill.id, memberKey(m), "yes");
    let b = holdVote(api, bill.id);
    console.log(" after vote", b.status);
    if (b.status === "awaiting-signature") { b = executiveDecision(api, bill.id, true); console.log(" after sign", b.status); }
    const series = p.series ?? p.question ?? "";
    if (series) console.log(" law", JSON.stringify(lawInForce(api, series).governing));
  } catch (e) { console.log(" ERR", (e as Error).message); }
}
