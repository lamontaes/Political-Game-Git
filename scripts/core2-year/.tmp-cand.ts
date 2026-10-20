import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { gameStartDate } from "../../src/core2/game-start";
import { coreAPI } from "../../src/core2/state";
import { ballot, ELECTIONS_MODULE_ID, type ContestRow } from "../../src/core2/modules/elections";
import { drawPlace } from "./place";
setBookkeeping(false);
const out: unknown[] = [];
for (const label of ["c1", "c2", "c3", "c4", "c5", "c6"]) {
  const place = drawPlace(createHash("sha256").update(label).digest("hex"), "candidacy-calibration");
  const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
  advanceCore(w.core, addDays(makeIsoDate(w.core.date), 400));
  const api = coreAPI(w.core);
  const rows = api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as unknown as ContestRow[];
  const local = rows.filter((c) => c.level !== "state" && c.level !== "federal" && c.electionDate <= w.core.date);
  const stat = local.map((c) => ({ id: c.id, family: c.family, seats: (c as any).seats ?? 1, candidates: ballot(api, c.id).length }));
  out.push({ label, place: place.name, state: place.state, contests: stat.length, uncontested: stat.filter((s) => s.candidates <= s.seats).length, empty: stat.filter((s) => s.candidates === 0).length, perSeat: stat.length ? stat.reduce((n, s) => n + s.candidates / s.seats, 0) / stat.length : 0 });
  writeFileSync("/tmp/cand.json", JSON.stringify(out, null, 1));
}
