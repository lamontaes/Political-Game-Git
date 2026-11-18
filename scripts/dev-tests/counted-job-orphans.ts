/* eslint-disable @typescript-eslint/no-explicit-any */
// Weekly: every open counted job whose worker is no longer in the counts (the press fill-in would throw on it),
// and each year, the living people marked returned to the counts whom no counted household holds, by why.
// node --max-old-space-size=8000 --import tsx scripts/dev-tests/counted-job-orphans.ts <seed> <placeKey> <years>
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { isDemoted } from "../../src/core2/counted-groups";
import { residentsRuntime } from "../../src/core2/modules/residents";
setBookkeeping(false);
const [seed = "mont1", key = "5046000", years = "3"] = process.argv.slice(2);
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
const core = w.core as any;
const seen = new Set<string>();
const end = addDays(makeIsoDate(core.date), 365 * Number(years));
const STATE = ["counted", "filled", "dead", "moved"];
while (core.date < end) {
  advanceCore(core, addDays(makeIsoDate(core.date), 7));
  if (core.date.slice(5, 7) === "01" && Number(core.date.slice(8)) <= 7)
    returnedWithoutHousehold();
  const rt = residentsRuntime(core) as any;
  if (!rt) continue;
  for (const [jobId, job] of rt.jobs as Map<string, any>) {
    if (job.endsAt !== undefined) continue;
    const flow = rt.wageFlowByJob.get(jobId);
    if (!flow || flow.endedAt) continue;
    if (rt.store.countedMember(job.personId) !== undefined) continue;
    const p = core.people.get(job.personId);
    if (p && !isDemoted(p)) continue; // a full person: fillInPerson returns them
    if (seen.has(jobId)) continue;
    seen.add(jobId);
    const m = rt.store.memberOf.get(job.personId);
    console.log(
      JSON.stringify({
        date: core.date,
        jobId,
        personId: job.personId,
        org: job.organizationId,
        title: job.title,
        memberState: m === undefined ? "none" : STATE[rt.store.state[m]],
        full: p
          ? {
              alive: p.alive,
              placeId: p.placeId,
              householdId: p.householdId,
              tier: p.tier,
            }
          : null,
        husk: core.husks?.has(job.personId) ?? false,
      }),
    );
  }
}
function returnedWithoutHousehold(): void {
  const rt = residentsRuntime(core) as any;
  const why = new Map<string, number>();
  const examples: string[] = [];
  for (const p of core.people.values()) {
    if (!p.alive || !isDemoted(p)) continue;
    if (rt.store.countedMember(p.id) !== undefined) continue;
    const m = rt.store.memberOf.get(p.id);
    const k = m === undefined ? "never-in-store" : STATE[rt.store.state[m]];
    why.set(k, (why.get(k) ?? 0) + 1);
    if (examples.length < 5) examples.push(`${p.id}:${k}:${p.placeId}`);
  }
  console.log(
    `RETURNED-NO-HOUSEHOLD ${core.date} ${JSON.stringify(Object.fromEntries(why))} ${examples.join(" ")}`,
  );
}
console.log(`done ${core.date} orphans=${seen.size}`);
returnedWithoutHousehold();
