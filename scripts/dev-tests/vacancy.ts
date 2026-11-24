// Why a special-election seat stays vacant: tsx vacancy.ts <worldSeed> <placeKey> <days>
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
setBookkeeping(false);
const [seed, key, days] = process.argv.slice(2);
const w = buildBenchWorld(seed!, gameStartDate(), {
  twoLevel: true,
  placeKey: key!,
});
advanceCore(w.core, addDays(makeIsoDate(w.core.date), Number(days)));
const api = coreAPI(w.core);
const vac = api
  .moduleState("core2-offices-v1")
  .table("vacancies")
  .rows() as any[];
console.log("date", w.core.date, "vacancies", vac.length);
for (const v of vac.filter((v) => v.status !== "filled").slice(0, 6))
  console.log(JSON.stringify(v));
const hits = [...w.core.durableLog.values()].filter((r) =>
  JSON.stringify(r).includes("US-RI:lower:057"),
);
console.log(
  "records naming RI lower 057:",
  hits.map((r) => `${r.date} ${r.kind}`).join("; "),
);
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
const contests = (
  api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as any[]
).filter((c) => JSON.stringify(c).includes("US-RI:lower:057"));
console.log(
  "contests naming it:",
  contests.length,
  contests.map((c) => `${c.id} ${c.electionDate} ${c.status ?? ""}`).join("; "),
);
const wr = api.moduleState("core2-voting-v1").table("world").rows();
console.log("world open rows", JSON.stringify(wr));
const v0 = vac.find((v) => v.seatId === "seat:US-RI:lower:057:0")!;
console.log(
  "voting cal",
  JSON.stringify(
    api
      .moduleCalendar("core2-voting-v1")
      .get(`special:${v0.id}:${v0.electionDate}`),
  ),
);
console.log(
  "offices cal",
  JSON.stringify(
    api
      .moduleCalendar("core2-offices-v1")
      .get(`special:${v0.seatId}:${v0.since}`),
  ),
);
const races = (
  api.moduleState("core2-voting-v1").table("races").rows() as any[]
).filter((r) => r.seatId === v0.seatId);
console.log(
  "races for seat",
  JSON.stringify(
    races.map((r) => ({
      id: r.id,
      win: r.winnerParty,
      seated: r.seatedOn,
      offices: !!r.offices,
    })),
  ),
);
for (const r of races)
  console.log(
    "seat cal",
    JSON.stringify(api.moduleCalendar("core2-voting-v1").get(`seat:${r.id}`)),
  );
