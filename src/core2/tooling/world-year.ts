/** One year of the whole economy on the two-level world in a drawn place: the numbers each M1 economy spec checks. */
import { performance } from "node:perf_hooks";
import { advanceCore, createLifeCore } from "../life";
import { residentsRuntime } from "../modules/residents";
import { checkBands, type MacroMonth } from "../macro-model";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../modules/world";
import { townJobsPanel } from "../modules/world-panels";
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
const cashNow = () =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  );
const opening = cashNow();
const outsideSales = () =>
  [...(residentsRuntime(core)?.flows.values() ?? [])]
    .filter((flow) => flow.kind === "outside-sales" && !flow.endedAt)
    .reduce((n, flow) => n + flow.amountMinor, 0);
const outsideSalesOpening = outsideSales();
const t1 = performance.now();
const end = new Date(`${input.startedAt}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + Number(process.argv[4] ?? 1));
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
// The town is the player's place.
const turnover = townJobsPanel(api, core.people.get(input.playerId!)!.placeId);
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
let outsideNet = 0;
for (const row of core.cashJournal.externalFlowsByOwner.values())
  outsideNet += row.netMinor;
console.log(
  JSON.stringify(
    {
      place: input.placeMetadata?.placeName,
      seed,
      start: input.startedAt,
      buildSeconds: Math.round((t1 - t0) / 1000),
      yearSeconds: Math.round((performance.now() - t1) / 1000),
      everyDollarBalances: cashNow() === opening - outsideNet,
      unemploymentClaims: (() => {
        const rows = (jobs.claims ?? []) as unknown as {
          open: boolean;
          paidMinor: number;
          payeeAccountOwnerId: string;
          personId: string;
          endReason?: string;
        }[];
        const ends: Record<string, number> = {};
        for (const row of rows)
          ends[row.endReason ?? "open"] =
            (ends[row.endReason ?? "open"] ?? 0) + 1;
        return {
          filed: rows.length,
          full: rows.filter((row) => row.payeeAccountOwnerId === row.personId)
            .length,
          paidMinor: rows.reduce((n, row) => n + row.paidMinor, 0),
          ends,
        };
      })(),
      townCash: { opening, closing: cashNow(), outsideNet },
      outsideBuyersWeekly: {
        opening: outsideSalesOpening,
        closing: outsideSales(),
      },
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
        owners: (tables("business").owners as unknown[]).length,
        successions: (
          tables("business").successions as unknown as {
            basis: string;
            cause: string;
          }[]
        ).map((row) => `${row.cause}:${row.basis}`),
        founded: (
          tables("business").foundings as unknown as {
            kindId: string;
            date: string;
            loanMinor: number;
            customersMonthlyMinor: number;
          }[]
        ).map(
          (row) =>
            `${row.date} ${row.kindId} loan ${row.loanMinor} customers ${row.customersMonthlyMinor}`,
        ),
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
      metrics: (() => {
        const months = [
          ...(tables("world-metrics").months as unknown as { date: string }[]),
        ].sort((a, b) => a.date.localeCompare(b.date));
        return { first: months[0], last: months.at(-1), count: months.length };
      })(),
      mortgages: (() => {
        const rows = tables("housing").mortgages as unknown as {
          balanceMinor: number;
          paymentMinor: number;
          monthsLeft: number;
        }[];
        return {
          count: rows.length,
          paidOff: rows.filter((row) => row.monthsLeft <= 0).length,
          balanceMinor: rows.reduce((n, row) => n + row.balanceMinor, 0),
          monthlyPaymentsMinor: rows.reduce(
            (n, row) => n + row.paymentMinor,
            0,
          ),
        };
      })(),
      purchases: (
        tables("housing").purchases as unknown as {
          date: string;
          priceMinor: number;
          loanMinor: number;
        }[]
      ).map(
        (row) =>
          `${row.date} price ${Math.round(row.priceMinor / 100)} loan ${Math.round(row.loanMinor / 100)}`,
      ),
      residentsCash: [...core.organizations.values()]
        .filter((row) => row.kind === "residents")
        .reduce((n, row) => n + row.liquidMinor, 0),
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
