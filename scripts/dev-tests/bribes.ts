/**
 * Phase 2, bribes: dev mode's forceBribe (the game's own considerBribe) from
 * the world's wealthiest people to the town's officials at several stakes;
 * then a year of play: who exposed it, what followed.
 *   tsx scripts/dev-tests/bribes.ts <seed>
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { townSeats } from "../../src/core2/modules/offices";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { BenchPlayer } from "../../src/bench/player";
import { DevMode } from "../../src/bench/dev-mode";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
setBookkeeping(false);
const place = drawPlace(process.argv[2] ?? "br1", "bribes");
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const dev = new DevMode(w.core, w.director, new BenchPlayer(w.core, w.director), w.placeId);
const api = coreAPI(w.core);
console.log(JSON.stringify({ place: place.name, key: place.key, seed: place.seed }));
const rich = dev.wealthiest(3);
const officials = townSeats(api).filter((s) => s.holder?.personId && (s.office.level === "city" || s.office.level === "county" || s.office.level === "state")).slice(0, 80);
const rows: any[] = [];
for (const o of officials) for (const stake of [100_000, 5_000_000]) {
  const offerer = rich[rows.length % rich.length]!;
  try {
    const r = dev.forceBribe({ offererId: offerer.personId, officialId: o.holder!.personId!, subjectId: `permit:${o.seat.id}`, stakeMinor: stake * 100 });
    rows.push({ official: o.office.kind, stakeUsd: stake, record: r.record.kind, moved: r.moved, offered: (r.record as any).offered, taken: (r.record as any).taken, reasons: JSON.stringify((r.record as any).reasons).slice(0, 300) });
  } catch (e) { rows.push({ official: o.office.kind, stakeUsd: stake, error: (e as Error).message.slice(0, 120) }); }
}
console.log('tried', rows.length, 'offered', rows.filter((r) => r.offered).length, 'taken', rows.filter((r) => r.taken).length);
console.log(JSON.stringify(rows.find((r) => r.offered)));
console.log(JSON.stringify(rows.find((r) => r.taken)));
const before = new Map([...w.core.logByKind].map(([k, s]) => [k, s.size]));
advanceCore(w.core, addDays(makeIsoDate(w.core.date), 365));
const after = [...w.core.logByKind].map(([k, s]) => [k, s.size - (before.get(k) ?? 0)] as const).filter(([k, n]) => /brib|corrupt|expos|investig|indict|scandal|resign|recall/i.test(k) && n);
console.log("a year later:", JSON.stringify(after));
