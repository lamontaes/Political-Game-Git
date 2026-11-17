/**
 * Pins, the grudge rule breaks (#9747, CTO 05:10Z). At three drawn places: the
 * world plays a year; then, since a grudge is rare in a small town's year, up to
 * 40 of its employed full adults are laid off through dev mode's own call
 * (forceLayoff, the game's layoff path) and the world plays 90 days more.
 * Every grudge a full person holds is listed with its own half-life (from the
 * holder's traits), and every confrontation with the tie's closeness before
 * and after.
 * Run: node --import tsx scripts/core2-year/pins-grudge-proof.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { heldDrivesOf } from "../../src/core2/modules/drives";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { drawPlace } from "./place";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(20).toString("hex");
const out = (line: string) => process.stdout.write(`${line}\n`);
out(`Pins grudge proof, seed ${seed}`);

for (let draw = 0; draw < 3; draw += 1) {
  const place = drawPlace(seed, `pins-grudge-proof:${draw}`);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const confronted: string[] = [];
  api.subscribeEvents(
    "pins-grudge-proof",
    ["grievance.confronted"],
    (event) => {
      const f = event.facts ?? {};
      confronted.push(
        `${event.id}: closeness ${f.levelBefore} to ${f.levelAfter}`,
      );
    },
  );
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  const dev = new DevMode(
    core,
    world.director,
    new BenchPlayer(core, world.director),
    world.placeId,
  );
  let laidOff = 0;
  for (const person of [...core.people.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    if (laidOff >= 40) break;
    if (!person.alive || !person.jobId || person.id === core.playerId) continue;
    try {
      dev.forceLayoff(person.id);
      laidOff += 1;
    } catch {
      // Not someone the layoff path can reach (no recorded employer): passed over.
    }
  }
  advanceCore(core, addDays(makeIsoDate(core.date), 90));
  out(`laid off through dev mode: ${laidOff}`);
  const grudges = [...core.people.keys()].flatMap((id) =>
    heldDrivesOf(api, id)
      .filter((d) => d.kind === "grudge")
      .map((d) => ({ holder: id, ...d })),
  );
  const days = grudges.map((g) => g.halfLifeDays).sort((a, b) => a - b);
  out(`\n== ${place.name} (${place.key}), place seed ${place.seed}`);
  out(
    `grudges held at year end: ${grudges.length}; half-life days min ${days[0]?.toFixed(0) ?? "-"} median ${days[Math.floor(days.length / 2)]?.toFixed(0) ?? "-"} max ${days.at(-1)?.toFixed(0) ?? "-"}; distinct ${new Set(days.map((d) => d.toFixed(1))).size}`,
  );
  for (const g of grudges.slice(0, 5))
    out(
      `  ${g.id}: held by ${g.holder} against ${g.targetId ?? "-"}, formed ${g.formedAt}, half-life ${g.halfLifeDays.toFixed(0)} days (from ${g.sourceEventId})`,
    );
  out(
    `confrontations: ${confronted.length}${confronted.length ? `; ${confronted.slice(0, 5).join("; ")}` : ""}`,
  );
}
