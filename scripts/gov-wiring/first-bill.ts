/**
 * Which change each town's own body takes up first, across several drawn
 * places: its first local bill, with the share of the town's adults whose
 * life the question touches and how many members backed it. The owner saw
 * "partner with federal immigration enforcement" first in every town.
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/gov-wiring/first-bill.ts [seed] [places] [days]
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { drawPlace } from "../core2-year/place";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  billTitle,
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "../../src/core2/modules/legislature";
import { townConcernShare } from "../../src/core2/modules/meetings";

setBookkeeping(false);
const seed =
  process.argv[2] ??
  createHash("sha256").update(String(Date.now())).digest("hex");
const count = Number(process.argv[3] ?? 4);
const days = Number(process.argv[4] ?? 90);
const out = [];
for (let i = 0; i < count; i += 1) {
  const place = drawPlace(`${seed}:${i}`, "first-bill");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  advanceCore(core, addDays(makeIsoDate(core.date), days));
  const local = (
    api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as BillRow[]
  )
    .filter((b) => b.form.kind === "ordinance")
    .sort(
      (a, b) =>
        a.introduced.localeCompare(b.introduced) || a.id.localeCompare(b.id),
    );
  out.push({
    place: `${place.name} (${place.key})`,
    seed: place.seed,
    firstThree: local.slice(0, 3).map((b) => ({
      id: b.id,
      number: b.number,
      introduced: b.introduced,
      subjects: billTitle(b).subjects.map((s) => s.key),
      touches: b.provisions.map((p) =>
        p.question ? Number(townConcernShare(api, p.question).toFixed(2)) : 0,
      ),
      enactingClause: b.form.enactingClause,
    })),
  });
}
console.log(JSON.stringify({ seed, days, places: out }, null, 2));
