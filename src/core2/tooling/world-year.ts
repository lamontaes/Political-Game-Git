/** One year of the whole economy on the two-level world in a drawn place: the numbers each M1 economy spec checks. */
import { performance } from "node:perf_hooks";
import { advanceCore, createLifeCore } from "../life";
import { checkBands, type MacroMonth } from "../macro-model";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../modules/world";
import { turnoverPanel } from "../modules/world-panels";
import { parameter } from "../parameters";
import { coreAPI } from "../state";
import { generatedOpening } from "./generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? process.argv[2]!,
  key = process.env.GOLDEN_PATH_PLACE_KEY ?? process.argv[3]!;
const t0 = performance.now();
const input = generatedOpening({ seed, key }, { twoLevel: true });
const data = worldCoreData();
const core = createLifeCore(withWorldEconomy(input), {
  data,
  modules: [...WORLD_MODULES],
});
const t1 = performance.now();
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + 1);
advanceCore(core, end.toISOString().slice(0, 10));
const api = coreAPI(core);
const tables = (id: string) => api.moduleState(id).snapshot().tables;
const macro = tables("macro"),
  credit = tables("credit"),
  housing = tables("housing"),
  jobs = tables("jobs");
const p = (k: string) => parameter(k, data.parameters);
const bands = checkBands(macro.months as unknown as MacroMonth[], p).filter(
  (row) => !row.baseIsHistory,
);
const turnover = turnoverPanel(api);
const changes = jobs.changes as unknown as {
  kind: string;
  reasonKey: string;
  decidedBy: string;
}[];
const byKind: Record<string, number> = {};
for (const row of changes)
  byKind[`${row.kind}:${row.reasonKey}`] =
    (byKind[`${row.kind}:${row.reasonKey}`] ?? 0) + 1;
const books = [...core.finance.businesses.values()];
console.log(
  JSON.stringify(
    {
      place: input.placeMetadata?.placeName,
      seed,
      start: input.startedAt,
      buildSeconds: Math.round((t1 - t0) / 1000),
      yearSeconds: Math.round((performance.now() - t1) / 1000),
      national: {
        bandRows: bands.length,
        outside: bands.filter((row) => !row.inside).length,
      },
      meetings: (
        macro.meetings as unknown as {
          toRatePct: number;
          fromRatePct: number;
          date: string;
        }[]
      ).map((m) => `${m.date} ${m.fromRatePct}->${m.toRatePct}`),
      jobs: {
        employed: turnover.employed,
        seekers: turnover.seekers,
        changes: byKind,
        everyChangeHasReason: changes.every(
          (row) => row.reasonKey && row.decidedBy,
        ),
      },
      businesses: {
        open: books.filter((b) => !b.closedAt).length,
        closed: books.filter((b) => b.closedAt).length,
      },
      credit: {
        businessLines: (
          credit.applications as unknown as {
            organizationId: string | null;
            approved: boolean;
          }[]
        ).filter((a) => a.organizationId && a.approved).length,
        householdLoans: (credit.loans as unknown[]).length,
        chargedOff: (credit.loans as unknown as { standing: string }[]).filter(
          (l) => l.standing === "charged-off",
        ).length,
        lastBook: (credit.books as unknown[]).at(-1),
      },
      housing: {
        cases: (housing.cases as unknown as { stage: string }[]).reduce<
          Record<string, number>
        >(
          (acc, row) => ({ ...acc, [row.stage]: (acc[row.stage] ?? 0) + 1 }),
          {},
        ),
        renewals: (housing.renewals as unknown[]).length,
      },
    },
    null,
    1,
  ),
);
