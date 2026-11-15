// Counts, over a played year at named places and seeds, the law stories and
// law effects that would call a stop on the street (the records the rows
// `law-news-street` and `law-reached-street` read), and which of them reach the
// player: the law is of their town's chain, the nation's, or an office they hold
// (src/director/circumstance.ts `lawReaches`). Usage:
//   node --import tsx scripts/play-walks/whose-business.mts <seed> <label>
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { LAWS_MODULE_ID } from "../../src/core2/modules/laws";
import { coreAPI, registerModule } from "../../src/core2/state";
import { lawReaches } from "../../src/director/circumstance";

const [seed, label] = process.argv.slice(2) as [string, string];
setBookkeeping(false);
const place = drawPlace(seed, label);
const { core } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(core);
const seen = new Map<string, { kind: string; lawId: string }>();
registerModule(core, {
  id: "whose-business-tap",
  eventKinds: ["news.read", "law.effect-learned"],
  onEvent: (_api, event) => {
    const lawId = (event as { facts?: Record<string, string> }).facts?.lawId;
    if (lawId) seen.set(`${event.kind}|${lawId}`, { kind: event.kind, lawId });
  },
});
advanceCore(core, addDays(makeIsoDate(core.date), 365));
const table = api.moduleState(LAWS_MODULE_ID).table("laws");
const rows = [...seen.values()].map((row) => ({
  ...row,
  jurisdiction:
    (table.get(row.lawId) as { jurisdiction?: string } | undefined)
      ?.jurisdiction ?? "no row",
  reaches: lawReaches(core, { officeIds: new Set() }, row.lawId),
}));
const out = [
  `## ${place.name} (${place.key}), seed ${seed}, label ${label}, one played year from ${gameStartDate()}`,
  `law records that could call a stop: ${rows.length}; reach the player: ${rows.filter((r) => r.reaches).length}; stay on the bench: ${rows.filter((r) => !r.reaches).length}`,
];
for (const row of rows)
  out.push(
    `- ${row.reaches ? "reaches" : "BENCH"} ${row.kind} ${row.lawId} (${row.jurisdiction})`,
  );
console.log(out.join("\n"));
