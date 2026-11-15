/* eslint-disable @typescript-eslint/no-explicit-any */
// Every posting opened after a day, with the job it copies: pay, template pay, the floor in force and the ratio.
// node --max-old-space-size=8000 --import tsx scripts/dev-tests/posting-pay-trace.ts <seed> <placeKey> <shiftDay> <days>
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { coreAPI } from "../../src/core2/state";
import { JOBS_MODULE_ID } from "../../src/core2/modules/jobs";
import { residentsRuntime } from "../../src/core2/modules/residents";
setBookkeeping(false);
const [seed, key, shift = "41", days = "80"] = process.argv.slice(2);
const w = buildBenchWorld(seed!, gameStartDate(), {
  twoLevel: true,
  placeKey: key!,
});
const c = w.core as any;
advanceCore(c, addDays(makeIsoDate(c.date), Number(shift)));
const shiftDay = c.date;
advanceCore(c, addDays(makeIsoDate(c.date), Number(days)));
const rows = coreAPI(c)
  .moduleState(JOBS_MODULE_ID)
  .table("positions")
  .rows() as any[];
console.log(
  `PLACE ${w.place.displayName} shift ${shiftDay} now ${c.date} positions ${rows.length}`,
);
for (const row of rows) {
  const late = row.openedAt > shiftDay;
  const full = c.jobs.get(row.templateJobId);
  const counted = residentsRuntime(c)?.jobs.get(row.templateJobId);
  const t = full ?? counted;
  console.log(
    `${late ? "AFTER" : "before"} ${row.id} ${row.status} ${row.reasonKey} title=${row.title} org=${c.organizations.get(row.organizationId)?.name} pay=${row.hourlyMinor} first=${row.firstHourlyMinor ?? "-"} template=${row.templateJobId} ${full ? "full" : counted ? "counted" : "missing"} tPay=${t?.hourlyMinor} tWage=${t?.wageDailyMinor} tHours=${t?.hoursDaily} ratio=${full?.hourlyMinor ? (row.hourlyMinor / full.hourlyMinor).toFixed(3) : "-"}`,
  );
}
// Each raised posting's employer: its trading month, its staff in heads and in records, and what one seat carries.
import("../../src/core2/modules/business").then(({ businessTradingMonth }) =>
  import("../../src/core2/modules/jobs").then(({ staffCount, currentJobs }) => {
    const api = coreAPI(c);
    for (const row of rows.filter((r) => r.firstHourlyMinor)) {
      const t = businessTradingMonth(api, row.organizationId) as any;
      const heads = staffCount(api, row.organizationId);
      const records = currentJobs(api, row.organizationId).length;
      const book = c.finance.businesses.get(row.organizationId);
      const emp = moduleStateRow(row.organizationId);
      const perMonth = 365 / 12 / (t?.days || 1);
      const carries = t
        ? ((t.salesMinor - t.costsMinor + t.payrollMinor) * perMonth) / heads
        : 0;
      console.log(
        `RAISED ${row.title} at ${c.organizations.get(row.organizationId)?.name}: heads ${heads.toFixed(1)} records ${records} openingScale ${emp?.openingScale ?? 1} kind ${book?.kindId} trading ${JSON.stringify(t)} carriesMonthly ${Math.round(carries)} = ${(carries / ((6 * 365) / 12) / 100).toFixed(2)} dollars an hour at 6 hours a day`,
      );
    }
  }),
);
function moduleStateRow(id: string): any {
  return coreAPI(c).moduleState(JOBS_MODULE_ID).table("employers").get(id);
}
