import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { makeIsoDate } from "../../src/core2/kernel/dates";
import type { PersonId } from "../../src/core2/types";
import { drawPlace } from "../core2-year/place";
import { gameStartDate } from "../../src/core2/game-start";
const [seed, until, match] = process.argv.slice(2);
const place = drawPlace(seed!, "family-life");
setBookkeeping(false);
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const core = w.core, director = w.director, pid = w.playerId! as PersonId;
const me = core.people.get(pid)!;
director.watch(core, pid);
for (const id of core.households.get(me.householdId)?.memberIds ?? []) if (id !== pid) director.watch(core, id);
advanceCore(core, makeIsoDate(until!));
for (const [who, book] of director.ledger.people) {
  for (const m of book.momentsById.values()) {
    if (!m.causeId.includes(match!)) continue;
    const e = book.schedule.find((s) => s.momentId === m.id);
    console.log(who === pid ? "PLAYER" : who, JSON.stringify({ label: m.label, impact: (m as any).impact, cause: m.causeId, counterpart: (m as any).counterpartId, entry: e ? { date: e.date, outcome: e.outcome, bindings: e.bindings.map((b) => b.typeKey) } : null }).slice(0, 600));
  }
}
const link = [...core.familyLinks.values()].find((l) => l.kind === "partner" && l.personIds.includes(pid));
console.log("link", JSON.stringify(link)?.slice(0, 300));
const couples = (core as any).modules?.get?.("partnerships");
console.log("module keys", couples ? Object.keys(couples) : "none");
if (link) for (const id of link.personIds) { const p = core.people.get(id)!; console.log(id, p.givenName, p.familyName, p.birthDate, "hh", p.householdId, "members", core.households.get(p.householdId)?.memberIds.length, "cash", p.liquidMinor); }
