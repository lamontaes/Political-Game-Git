/**
 * Why a chamber's floor votes come out as they do: for each state bill voted
 * in a played year, the tally by party and the mean of each part of the
 * members' positions (views, district, party, wing, ambition, press).
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/gov-wiring/vote-parts.ts [seed] [days]
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { drawPlace } from "../core2-year/place";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  LEGISLATURE_MODULE_ID,
  type BillRow,
  type MemberPosition,
} from "../../src/core2/modules/legislature";
import { officialOf } from "../../src/core2/modules/officials";

setBookkeeping(false);
const seed =
  process.argv[2] ??
  createHash("sha256").update(String(Date.now())).digest("hex");
const days = Number(process.argv[3] ?? 365);
const place = drawPlace(seed, "committees");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
advanceCore(core, addDays(makeIsoDate(core.date), days));
const leg = api.moduleState(LEGISLATURE_MODULE_ID);
const bills = leg.table("bills").rows() as unknown as BillRow[];
const votes = leg.table("votes").rows() as unknown as {
  billId: string;
  chamber: string;
  memberId: string;
  vote: string;
  position: MemberPosition;
}[];
const parts = [
  "views",
  "constituents",
  "party",
  "wing",
  "ambition",
  "press",
  "sponsor",
  "deal",
  "lobby",
  "trait",
  "consistency",
] as const;
const out = [];
for (const chamber of [...new Set(votes.map((v) => v.chamber))].filter((c) =>
  /legislature-/.test(c),
)) {
  for (const bill of bills) {
    const vs = votes.filter(
      (v) => v.billId === bill.id && v.chamber === chamber,
    );
    if (!vs.length) continue;
    const byParty: Record<string, string> = {};
    for (const v of vs) {
      const party = officialOf(api, v.memberId)?.party ?? "none";
      byParty[party] = byParty[party] ?? "";
      byParty[party] += v.vote === "yes" ? "Y" : v.vote === "no" ? "N" : "-";
    }
    const mean = Object.fromEntries(
      parts.map((p) => [
        p,
        Number(
          (
            vs.reduce((s, v) => s + Math.abs(Number(v.position[p] ?? 0)), 0) /
            vs.length
          ).toFixed(3),
        ),
      ]),
    );
    out.push({
      chamber: chamber.split(":").pop(),
      bill: bill.number,
      subject:
        bill.provisions[0]?.question ??
        bill.provisions[0]?.series ??
        bill.provisions[0]?.line,
      byParty: Object.fromEntries(
        Object.entries(byParty).map(([k, s]) => [
          k,
          `${[...s].filter((c) => c === "Y").length}Y ${[...s].filter((c) => c === "N").length}N`,
        ]),
      ),
      meanAbs: mean,
    });
  }
}
console.log(
  JSON.stringify({ place: `${place.name} (${place.key})`, out }, null, 1),
);
