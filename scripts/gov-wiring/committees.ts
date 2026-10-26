/**
 * One played year of committees: which subject committee heard each bill,
 * how many different members sat on them, and how varied the state floor's
 * tallies were (the audit found one "general" committee and repeated tallies).
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/gov-wiring/committees.ts [seed] [days]
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
  type CommitteeRecord,
} from "../../src/core2/modules/legislature";

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
const hearings = leg.table("committees").rows() as unknown as CommitteeRecord[];
const votes = leg.table("votes").rows() as unknown as {
  billId: string;
  chamber: string;
  vote: string;
}[];
const byChamber = new Map<string, CommitteeRecord[]>();
for (const h of hearings)
  byChamber.set(h.chamber, [...(byChamber.get(h.chamber) ?? []), h]);
const floor = (chamber: string) => {
  const byBill = new Map<string, { yes: number; no: number }>();
  for (const v of votes.filter((x) => x.chamber === chamber)) {
    const t = byBill.get(v.billId) ?? { yes: 0, no: 0 };
    if (v.vote === "yes") t.yes += 1;
    if (v.vote === "no") t.no += 1;
    byBill.set(v.billId, t);
  }
  const counts = new Map<string, number>();
  for (const t of byBill.values()) {
    const k = `${t.yes}-${t.no}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return {
    bills: byBill.size,
    distinctTallies: counts.size,
    mostCommon: [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null,
  };
};
console.log(
  JSON.stringify(
    {
      seed,
      place: `${place.name} (${place.key})`,
      days,
      chambers: [...byChamber.entries()].map(([chamber, list]) => ({
        chamber,
        hearings: list.length,
        byCommittee: Object.fromEntries(
          [...new Set(list.map((h) => h.committee))].map((c) => [
            c,
            list.filter((h) => h.committee === c).length,
          ]),
        ),
        distinctMembers: new Set(list.flatMap((h) => h.memberIds)).size,
        distinctChairs: new Set(list.map((h) => h.chairId)).size,
        floor: floor(chamber),
      })),
    },
    null,
    1,
  ),
);
