import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { buildBenchWorldInStages, OPENING_WARMUP_DAYS } from "../../src/bench/world";
import { subjectsBetween } from "../../src/director/conversation";
setBookkeeping(false);
const world = await buildBenchWorldInStages("21", gameStartDate(), { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS }, () => undefined);
const { core, director } = world; const pid = world.playerId as any;
const seen: Record<string, Set<string>> = {};
let n = 0;
for (const p of core.people.values()) { if (p.id === pid || !p.alive || n++ > 150) continue;
  subjectsBetween(core, p.id, pid, director, { refused: (s) => {
    if (s.kind === "news") return;
    const ids = [s.aboutId, ...Object.values(s.facts).flatMap((f: any) => f.sourceRecordIds)];
    const k = (seen[s.kind] ??= new Set());
    for (const id of ids.slice(0, 8)) k.add(`${String(id).replace(/(person|household|job|organization)_[0-9a-f]+/g, "$1_#").slice(0, 80)}`);
  } });
}
for (const [k, v] of Object.entries(seen)) console.log(k, [...v].slice(0, 10));
