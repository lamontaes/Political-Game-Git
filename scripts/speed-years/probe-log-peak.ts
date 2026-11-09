/** The durable log by kind and visibility on one date of the Dev Tester's drift world. */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const [seed = "dpA", until = "2030-10-16"] = process.argv.slice(2);
setBookkeeping(false);
const place = drawPlace(seed, "drift-played");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
advanceCore(w.core, makeIsoDate(until));
const kinds = new Map<string, number>();
const vis = new Map<string, number>();
const bytes = new Map<string, number>();
let n = 0;
for (const row of w.core.durableLog.values()) {
  kinds.set(row.kind, (kinds.get(row.kind) ?? 0) + 1);
  const v = `${row.visibility}${row.publicRecord ? "+pub" : ""}${row.news ? "+news" : ""}${row.decision ? "+decision" : ""}`;
  vis.set(v, (vis.get(v) ?? 0) + 1);
  if (n++ % 40 === 0) {
    const size = JSON.stringify(row, (_k, x) =>
      x instanceof Map ? [...x] : x,
    ).length;
    bytes.set(row.kind, (bytes.get(row.kind) ?? 0) + size * 40);
  }
}
const reasons = new Map<string, number>();
const actors = new Map<string, number>();
const dates = new Map<string, number>();
const driveBy = new Map<string, number>();
for (const row of w.core.durableLog.values()) {
  if (row.kind === "person.weighed") {
    reasons.set(
      row.reasonKey ?? "-",
      (reasons.get(row.reasonKey ?? "-") ?? 0) + 1,
    );
    actors.set(row.actorId ?? "-", (actors.get(row.actorId ?? "-") ?? 0) + 1);
    dates.set(row.date, (dates.get(row.date) ?? 0) + 1);
  }
  if (row.kind === "drive.strengthened") {
    const k = `${row.topic ?? "-"}|${row.source.citation.slice(0, 40)}`;
    driveBy.set(k, (driveBy.get(k) ?? 0) + 1);
  }
}
const heavy = [...actors].sort((a, b) => b[1] - a[1])[0]?.[0];
const sample = [...w.core.durableLog.values()].filter(
  (r) => r.kind === "person.weighed" && r.actorId === heavy,
);
const byReason = new Map<string, number>();
for (const r of sample)
  byReason.set(r.reasonKey ?? "-", (byReason.get(r.reasonKey ?? "-") ?? 0) + 1);
console.log(
  "heaviest actor",
  heavy,
  "is player",
  heavy === w.core.playerId,
  "reasons",
  JSON.stringify([...byReason]),
);
for (const r of sample.slice(0, 2))
  console.log(
    "sample",
    JSON.stringify({
      ...r,
      decision: r.decision
        ? { reasonKey: r.decision.reasonKey, scores: r.decision.scores?.length }
        : undefined,
    }).slice(0, 700),
  );
const day = [...w.core.durableLog.values()].filter(
  (r) =>
    r.kind === "person.weighed" &&
    r.date === "2030-10-12" &&
    r.actorId !== heavy,
);
console.log(
  "2030-10-12 non-player weighed",
  day.length,
  "distinct actors",
  new Set(day.map((r) => r.actorId)).size,
);
for (const r of day.slice(0, 3))
  console.log(
    "day sample",
    JSON.stringify({
      id: r.id,
      actionId: r.actionId,
      reasonKey: r.reasonKey,
      vis: r.visibility,
      ids: r.personIds.length,
      witnesses: r.witnessIds?.length,
    }).slice(0, 400),
  );
const perActor = new Map<string, number>();
for (const r of day)
  perActor.set(r.actorId ?? "-", (perActor.get(r.actorId ?? "-") ?? 0) + 1);
console.log(
  "per actor top",
  JSON.stringify([...perActor].sort((a, b) => b[1] - a[1]).slice(0, 5)),
);
const top = (m: Map<string, number>, k = 14) =>
  [...m].sort((a, b) => b[1] - a[1]).slice(0, k);
const player = w.core.playerId ? w.core.people.get(w.core.playerId) : undefined;
console.log(
  `focus ${w.core.focusPersonIds.size} of ${w.core.people.size} people; player knows ${player?.knownIds.size ?? "-"}`,
);
console.log(`${place.name} ${w.core.date}: log ${w.core.durableLog.size}`);
console.log("weighed reasonKey", JSON.stringify(top(reasons, 8)));
console.log(
  "weighed actors",
  JSON.stringify(top(actors, 5)),
  "distinct",
  actors.size,
);
console.log("weighed dates", JSON.stringify(top(dates, 6)));
console.log("strengthened by topic|source", JSON.stringify(top(driveBy, 6)));
console.log("kinds", JSON.stringify(top(kinds)));
console.log("visibility", JSON.stringify(top(vis)));
console.log(
  "MB by kind",
  JSON.stringify(top(bytes).map(([k, b]) => [k, Math.round(b / 1048576)])),
);
