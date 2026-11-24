// Replay one policy and print the bill and every law row for the series: tsx one.ts <seed> <level> <policyId> [days]
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { billCatalog, provisionFor } from "../../src/core2/bill-catalog";
import { coreAPI } from "../../src/core2/state";
import { townSeats } from "../../src/core2/modules/offices";
import { bodyOf, chambersOf, draftBill, castMemberVote, holdVote, executiveDecision, members, memberKey, billOf } from "../../src/core2/modules/legislature";
import { LAWS_MODULE_ID } from "../../src/core2/modules/laws";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
setBookkeeping(false);
const [seed, level, pid, days = "75"] = process.argv.slice(2);
let place = drawPlace(seed!, "law-run"); // same draw as law-run (no probe skipping)
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const api = coreAPI(w.core);
const seat = townSeats(api).find((r) => r.office.level === level && r.holder?.personId && bodyOf(api, r.office.id) && (level !== "state" || r.office.kind.startsWith("legislature-")))!;
const p = billCatalog(api, level as never).flatMap((s) => s.topics.flatMap((t) => t.policies)).find((x) => x.id.includes(pid!))!;
const op = p.operations.includes("enact") ? "enact" : "raise";
const bill = draftBill(api, { bodyOfficeId: seat.office.id, sponsorId: seat.holder!.personId!, provisions: [provisionFor({ policyId: p.id, operation: op as never, ...(p.kind === "policy-question" ? {} : { amount: Math.round((p.inForce ?? 1) * 1.2 + 1) }) })] });
console.log("drafted", JSON.stringify(bill.provisions), bill.authority);
for (const ch of chambersOf(api, bill)) for (const m of members(api, ch)) castMemberVote(api, bill.id, memberKey(m), "yes");
executiveDecision(api, bill.id, true);
const b = holdVote(api, bill.id);
console.log("status", b.status, "provisions after", JSON.stringify(billOf(api, bill.id).provisions));
advanceCore(w.core, addDays(makeIsoDate(w.core.date), Number(days)));
const rows = api.moduleState(LAWS_MODULE_ID).table("laws").rows().filter((r: any) => r.series === p.question || r.series === p.series);
console.log(rows.map((r: any) => `${r.level} ${r.value} eff ${r.effectiveDate} by ${r.measureId ?? ""}`).join("\n"));
