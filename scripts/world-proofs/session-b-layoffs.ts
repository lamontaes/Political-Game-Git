/** Session B: ordinary played-world turnover, firm reasons and downstream benefit reads. */
import { heardItems } from "../../src/bench/calendar";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { residentsRuntime } from "../../src/core2/modules/residents";
import jobsData from "../../src/core2/data/jobs/jobs.json" with { type: "json" };
import { drawPlace } from "../../tests/golden-path/place";

const seed = process.argv[2]!;
if (!seed)
  throw new Error("Supply an externally determined seed (base commit).");
const place = drawPlace(seed, "world-business");
const start = gameStartDate();
const begin = performance.now();
const world = buildBenchWorld(seed, start, {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
const built = performance.now();
const cashTotal = () =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    0,
  ) +
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (sum, row) => sum + row.netMinor,
    0,
  );
const openingCash = cashTotal();
const excludedJobIds = new Set<string>();
const employed = () => {
  const jobs = new Map(
    [...core.jobs.values()]
      .filter((job) => !job.endsAt && core.people.get(job.personId)?.alive)
      .map((job) => [job.id, job]),
  );
  const rt = residentsRuntime(core);
  for (const job of rt?.jobs.values() ?? []) {
    if (job.endsAt || !core.finance.businesses.has(job.organizationId))
      continue;
    const flow = rt?.wageFlowByJob.get(job.id);
    if (flow && !flow.endedAt && flow.organizationId === job.organizationId)
      jobs.set(job.id, job);
    else excludedJobIds.add(job.id);
  }
  return [...jobs.values()].filter((job) =>
    core.finance.businesses.has(job.organizationId),
  ).length;
};
const months: { date: string; employed: number }[] = [];
const end = new Date(`${start}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + 1);
const rows = (module: string, table: string) =>
  api.moduleState(module).table(table).rows() as unknown as Record<
    string,
    unknown
  >[];
const deliveredStaffing = new Map<string, unknown>();
const publishedStaffing = new Map<string, unknown>();
const staffingWire = new Map<string, Record<string, unknown>>();
const coverageStories = new Map<string, Record<string, unknown>>();
for (let at = new Date(`${start}T00:00:00Z`); at < end;) {
  if (at.getUTCDate() === Number(start.slice(8)))
    months.push({ date: core.date, employed: employed() });
  at.setUTCDate(at.getUTCDate() + 1);
  advanceCore(core, at.toISOString().slice(0, 10));
  for (const row of rows("core2-press-v1", "wire"))
    if (row.kind === "business.staff-reduced")
      staffingWire.set(String(row.id), row);
  for (const row of rows("core2-press-v1", "stories"))
    if (String(row.wireId).includes("business.staff-reduced"))
      coverageStories.set(String(row.id), row);
  for (const row of rows("news", "stories"))
    if (String(row.id).includes("business.staff-reduced"))
      publishedStaffing.set(String(row.id), row);
  for (const row of rows("news", "heard")) {
    if (
      !publishedStaffing.has(String(row.storyId)) ||
      deliveredStaffing.has(String(row.id))
    )
      continue;
    const personId = String(row.personId);
    deliveredStaffing.set(String(row.id), {
      ...row,
      learnedTrading: core.knowledgeByPerson.get(personId)?.get("tradingId"),
      screen: heardItems(core, personId).find(
        (story) => story.id === row.storyId,
      ),
    });
  }
}
const allChanges = rows("jobs", "changes");
const changes = allChanges.filter((row) =>
  core.finance.businesses.has(String(row.organizationId)),
);
const totalExposure = months.reduce((sum, row) => sum + row.employed, 0);
const rates = Object.fromEntries(
  (["hire", "quit", "layoff"] as const).map((kind) => {
    const count = changes.filter(
      (row) =>
        row.kind === kind ||
        (kind === "layoff" && row.kind === "closure") ||
        // JOLTS quits include voluntary departures out of the labor force,
        // but exclude retirement, death and involuntary separation.
        (kind === "quit" &&
          row.kind === "left-work" &&
          row.reasonKey === jobsData.reasons.leftWork),
    ).length;
    const band =
      jobsData.turnover.industries.total[
        kind === "hire" ? "hires" : kind === "quit" ? "quits" : "layoffs"
      ];
    const monthlyPct = (count / totalExposure) * 100;
    return [
      kind,
      {
        count,
        monthlyPct,
        band,
        inside: monthlyPct >= band.p05 && monthlyPct <= band.p95,
      },
    ];
  }),
);
const layoffs = changes.filter((row) => row.kind === "layoff");
const claims = rows("jobs", "claims");
const trading = rows("business", "trading");
console.log(
  JSON.stringify(
    {
      seed,
      place,
      head: process.env.PROOF_HEAD,
      span: [start, core.date],
      buildSeconds: (built - begin) / 1000,
      yearSeconds: (performance.now() - built) / 1000,
      modules: [...core.modules.keys()],
      rates,
      months,
      excludedJobIds: [...excludedJobIds],
      changes,
      closures: [...core.finance.closures.values()],
      openPositions: rows("jobs", "positions").filter(
        (row) => row.status === "open",
      ),
      seekers: [...rows("jobs", "seekers"), ...rows("jobs", "countedSeekers")],
      claims,
      regionalMonths: rows("regional", "months"),
      cashError: cashTotal() - openingCash,
      everyChangeHasReason: changes.every(
        (row) => row.reasonKey && row.decidedBy,
      ),
      coverage:
        "Business payrolls covered by this staffing rule, full and counted; excludes elected officials and other employers outside the business books.",
      everyRecordedChangeHasReason: allChanges.every(
        (row) => row.reasonKey && row.decidedBy,
      ),
      publishedStaffing: [...publishedStaffing.values()],
      deliveredStaffing: [...deliveredStaffing.values()],
      coverageStories: [...coverageStories.values()],
      staffingWire: [...staffingWire.values()],
      layoffs: layoffs.slice(0, 8).map((row) => ({
        change: row,
        trading: trading.find((t) => t.id === row.tradingId),
        claims: claims.filter((c) => c.personId === row.personId),
      })),
      tradingSummary: {
        count: trading.length,
        worst: [...trading]
          .sort((a, b) => Number(b.lossMonths) - Number(a.lossMonths))
          .slice(0, 8),
        employers: rows("jobs", "employers").map((row) => ({
          id: row.id,
          need: row.need,
          openingStaff: row.openingStaff,
          staff: [
            ...core.jobs.values(),
            ...(residentsRuntime(core)?.jobs.values() ?? []),
          ].filter((job) => !job.endsAt && job.organizationId === row.id)
            .length,
        })),
        losing: trading.filter(
          (t) => Number(t.costsMinor) > Number(t.salesMinor),
        ).length,
      },
    },
    null,
    2,
  ),
);

if (cashTotal() !== openingCash) process.exitCode = 1;
