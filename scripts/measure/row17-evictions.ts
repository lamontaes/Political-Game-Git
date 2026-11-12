/* eslint-disable @typescript-eslint/no-explicit-any */
// Row 17: relatives evicted with the same notice date; a host evicted after taking a relative in.
// tsx scripts/measure/row17-evictions.ts <placeKey> <seedHex> [days]
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
setBookkeeping(false);
const [placeKey = "4767760", seedHex = "r17a", daysArg = "150"] =
  process.argv.slice(2);
const w: any = buildBenchWorld(seedHex, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const core: any = w.core;
const api: any = coreAPI(core);
const t = (n: string) => api.moduleState("housing").table(n);
const start = core.date;
const firstSeen = new Map<string, any>(); // status rows by household, first seen
const statusDay = new Map<string, string>();
const caseFirst = new Map<string, any>();
for (let d = 1; d <= Number(daysArg); d++) {
  advanceCore(core, addDays(makeIsoDate(start), d));
  for (const r of t("statuses").rows() as any[])
    if (!firstSeen.has(r.id + "|" + r.since)) {
      firstSeen.set(r.id + "|" + r.since, { ...r });
      statusDay.set(r.id + "|" + r.since, core.date);
    }
  for (const c of t("cases").rows() as any[])
    if (!caseFirst.has(c.id)) caseFirst.set(c.id, { ...c, seenOn: core.date });
}
const cases = [...caseFirst.values()];
const byHouse = new Map<string, any[]>();
for (const c of cases)
  (
    byHouse.get(c.householdId) ??
    byHouse.set(c.householdId, []).get(c.householdId)!
  ).push(c);
const noticeDates = new Map<string, number>();
for (const c of cases)
  noticeDates.set(c.noticeAt, (noticeDates.get(c.noticeAt) ?? 0) + 1);
const dob = [...firstSeen.values()].filter((s) => s.status === "doubled-up");
const rows: any[] = [];
for (const s of dob) {
  const hostCases = byHouse.get(s.hostHouseholdId) ?? [];
  const own = caseFirst.get(s.caseId);
  const hostFirst = hostCases.map((c) => c.noticeAt).sort()[0];
  rows.push({
    household: s.id.slice(-8),
    counted: s.counted,
    evictedStatusSince: s.since,
    ownNotice: own?.noticeAt,
    hostHouseholdHasCase: hostCases.length > 0,
    hostNoticeAt: hostFirst,
    hostCaseBeforeRelativeMovedIn: hostFirst ? hostFirst <= s.since : false,
    hostNoticeAfterMoveIn: hostFirst ? hostFirst > s.since : false,
    hostNoticeSameDayAsRelative: hostFirst === own?.noticeAt,
    hostCaseStages: hostCases.map((c) => c.stage),
    sameHostAndRelativeHousehold: s.hostHouseholdId === s.id,
  });
}
const sum = (f: (r: any) => boolean) => rows.filter(f).length;
console.log(
  JSON.stringify(
    {
      placeKey,
      seedHex,
      start,
      daysRun: daysArg,
      households: core.households.size,
      casesOpened: cases.length,
      householdsWithCase: byHouse.size,
      noticeDatesTop: [...noticeDates].sort((a, b) => b[1] - a[1]).slice(0, 6),
      statuses: {
        total: firstSeen.size,
        byStatus: Object.fromEntries(
          [...firstSeen.values()].reduce(
            (m, s) => m.set(s.status, (m.get(s.status) ?? 0) + 1),
            new Map(),
          ),
        ),
      },
      doubledUp: rows.length,
      hostHasAnyCase: sum((r) => r.hostHouseholdHasCase),
      hostCaseBeforeOrOnMoveIn: sum((r) => r.hostCaseBeforeRelativeMovedIn),
      hostNoticeAfterMoveIn: sum((r) => r.hostNoticeAfterMoveIn),
      hostSameNoticeDay: sum((r) => r.hostNoticeSameDayAsRelative),
      examples: rows.filter((r) => r.hostHouseholdHasCase).slice(0, 6),
    },
    null,
    1,
  ),
);
