// Played-world proof for the one term writer (wire-elections-and-campaigns):
// every seating, town, state or federal, leaves its term and its took-office
// record through offices.ts seatWinner, and the elections engine reads it.
// Usage: SEED=<hex> MONTHS=15 node --max-old-space-size=8192 --import tsx scripts/trace/one-term-writer-proof.ts
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { BenchPlayer } from "../../src/bench/player";
import { DevMode } from "../../src/bench/dev-mode";
import { coreAPI } from "../../src/core2/state";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";

const seed = process.env.SEED ?? randomBytes(6).toString("hex");
const months = Number(process.env.MONTHS ?? 15);
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const player = new BenchPlayer(core, world.director);
if (world.playerId) player.select(world.playerId);
const dev = new DevMode(core, world.director, player, world.placeId);
const start = core.date;
const d = new Date(`${start}T00:00:00Z`);
d.setUTCMonth(d.getUTCMonth() + months);
const target = d.toISOString().slice(0, 10);
const t0 = Date.now();
dev.advance(target);
console.log(
  `# ${world.place.displayName} seed ${seed} ${start} -> ${core.date} in ${((Date.now() - t0) / 1000).toFixed(0)}s`,
);
const api = coreAPI(core);
const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
const took = [...core.durableLog.values()].filter(
  (r) => r.kind === "took-office" && r.facts?.["resultId"],
);
const level = (seatId: string) =>
  seatId.startsWith("seat:US:")
    ? "federal"
    : /us-house|us-senate|:US-[A-Z]{2}:(us-)/.test(seatId)
      ? "federal"
      : /seat:US-[A-Z]{2}:/.test(seatId)
        ? "state"
        : "town";
const byLevel = new Map<string, number>();
for (const r of took) {
  const seatId = String(r.facts!["seatId"]);
  const termId = String(r.facts!["termId"]);
  const term = terms.get(termId) as unknown as
    { status: string; reached: string; party: string | null } | undefined;
  const lvl = level(seatId);
  byLevel.set(lvl, (byLevel.get(lvl) ?? 0) + 1);
  // The elections engine's reader: an open contest for the seat whose
  // incumbent is the new term (syncSeatContests on took-office).
  const reader = contests
    .rows()
    .find(
      (c) =>
        (c as { seatId?: string }).seatId === seatId &&
        JSON.stringify(c).includes(termId),
    ) as { id?: string } | undefined;
  console.log(
    [
      lvl,
      r.date,
      r.id,
      `result ${r.facts!["resultId"]}`,
      `term ${termId} (${term?.status ?? "missing"}, ${term?.reached ?? "?"}, ${term?.party ?? "-"})`,
      reader ? `read by contest ${reader.id}` : "no open contest reads it yet",
    ].join(" | "),
  );
}
console.log(
  `took-office with a result: ${took.length} (${[...byLevel].map(([k, v]) => `${k} ${v}`).join(", ")})`,
);
